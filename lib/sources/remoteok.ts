import { detectCountryFromText } from "@/lib/city-country";
import {
  extractSkillsFromText,
  runSourceSync,
  upsertIngestedJob,
  type SyncResult,
} from "@/lib/ingest/shared";

type RemoteOkJob = {
  id: string;
  position: string;
  company: string;
  description: string;
  url: string;
  tags: string[];
  location: string;
  date: string;
};

export async function syncRemoteOkJobs(): Promise<SyncResult> {
  const response = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "SkillsObservatory/1.0" },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`RemoteOK fetch failed: ${response.status}`);

  const data = (await response.json()) as RemoteOkJob[];
  let inserted = 0;
  let updated = 0;

  for (const job of data.slice(1, 200)) {
    if (!job?.position) continue;
    const country = detectCountryFromText(`${job.location} ${job.description} ${job.position}`);
    if (!country) continue;

    const skills = extractSkillsFromText(job.position, job.description, job.tags ?? []);
    const { isNew } = await upsertIngestedJob({
      externalId: `remoteok-${job.id}`,
      title: job.position,
      company: job.company || "Unknown",
      country,
      city: job.location?.split(",")[0]?.trim() || "Remote",
      source: "RemoteOK",
      url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
      technologies: (job.tags ?? []).join(", "),
      postedAt: job.date ? new Date(job.date) : new Date(),
      skills,
    });

    if (isNew) inserted += 1;
    else updated += 1;
  }

  return { inserted, updated };
}

export async function syncRemoteOkWithLog() {
  return runSourceSync("RemoteOK", syncRemoteOkJobs);
}
