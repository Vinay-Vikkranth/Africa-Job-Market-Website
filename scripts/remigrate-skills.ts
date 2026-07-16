/**
 * Re-extracts skills for all existing jobs using the ESCO taxonomy.
 * Deletes all old Skill + JobSkill rows, then re-inserts with canonical names.
 * Run with: npx tsx scripts/remigrate-skills.ts
 */
import { prisma } from "@/lib/prisma";
import { extractSkillsFromText } from "@/lib/esco-extractor";

async function main() {
  const jobs = await prisma.job.findMany({
    select: { id: true, title: true, technologies: true },
  });

  console.log(`Re-migrating skills for ${jobs.length} jobs…`);

  // Wipe existing skill data — will be rebuilt cleanly
  await prisma.jobSkill.deleteMany({});
  await prisma.skill.deleteMany({});
  console.log("Cleared old Skill + JobSkill rows.");

  let processed = 0;
  let skillsInserted = 0;

  for (const job of jobs) {
    const tags = (job.technologies ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const extracted = extractSkillsFromText(job.title, "", tags, "");

    for (const s of extracted) {
      const skill = await prisma.skill.upsert({
        where: { name: s.tier2 },
        create: { name: s.tier2, tier1: s.tier1, escoUri: s.uri },
        update: { tier1: s.tier1, escoUri: s.uri },
      });
      await prisma.jobSkill.upsert({
        where: { jobId_skillId: { jobId: job.id, skillId: skill.id } },
        create: { jobId: job.id, skillId: skill.id, weight: 1 },
        update: {},
      });
      skillsInserted++;
    }

    processed++;
    if (processed % 50 === 0) {
      console.log(`  ${processed}/${jobs.length} jobs processed…`);
    }
  }

  const totalSkills = await prisma.skill.count();
  console.log(`\n✓ Done. ${processed} jobs re-processed, ${totalSkills} unique skills, ${skillsInserted} job-skill links.`);

  // Print top 20 skills in new taxonomy
  const top = await prisma.jobSkill.groupBy({
    by: ["skillId"],
    _count: { skillId: true },
    orderBy: { _count: { skillId: "desc" } },
    take: 20,
  });
  const skillNames = await prisma.skill.findMany({
    where: { id: { in: top.map((r) => r.skillId) } },
    select: { id: true, name: true, tier1: true },
  });
  const nameMap = new Map(skillNames.map((s) => [s.id, s]));

  console.log("\nTop 20 skills (new taxonomy):");
  for (const r of top) {
    const s = nameMap.get(r.skillId);
    if (s) console.log(`  ${r._count.skillId}\t${s.name}\t[${s.tier1}]`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
