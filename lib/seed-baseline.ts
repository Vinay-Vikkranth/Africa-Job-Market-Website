import { prisma } from "@/lib/prisma";

type BaselineJob = {
  externalId: string;
  title: string;
  company: string;
  country: string;
  city: string;
  salaryMinUsd: number;
  salaryMaxUsd: number;
  url: string;
  technologies: string;
  skills: string[];
};

const BASELINE_JOBS: BaselineJob[] = [
  {
    externalId: "baseline-ke-1",
    title: "Data Analyst",
    company: "Nairobi Fintech Labs",
    country: "Kenya",
    city: "Nairobi",
    salaryMinUsd: 18000,
    salaryMaxUsd: 26000,
    url: "https://example.com/jobs/ke-1",
    technologies: "SQL, Power BI, Excel",
    skills: ["Data Analysis", "SQL", "Power BI", "Excel", "Communication"],
  },
  {
    externalId: "baseline-ke-2",
    title: "Cloud Support Engineer",
    company: "EastCloud Systems",
    country: "Kenya",
    city: "Mombasa",
    salaryMinUsd: 22000,
    salaryMaxUsd: 34000,
    url: "https://example.com/jobs/ke-2",
    technologies: "AWS, Linux, Python",
    skills: ["Cloud Computing", "Python", "Communication"],
  },
  {
    externalId: "baseline-ng-1",
    title: "Business Intelligence Analyst",
    company: "Lagos Retail Group",
    country: "Nigeria",
    city: "Lagos",
    salaryMinUsd: 20000,
    salaryMaxUsd: 32000,
    url: "https://example.com/jobs/ng-1",
    technologies: "Excel, Power BI, SQL",
    skills: ["Excel", "Power BI", "SQL", "Data Analysis"],
  },
  {
    externalId: "baseline-ng-2",
    title: "Junior Software Developer",
    company: "Naija Health Tech",
    country: "Nigeria",
    city: "Abuja",
    salaryMinUsd: 17000,
    salaryMaxUsd: 29000,
    url: "https://example.com/jobs/ng-2",
    technologies: "Python, SQL, Git",
    skills: ["Python", "SQL", "Project Management", "Communication"],
  },
  {
    externalId: "baseline-gh-1",
    title: "Project Coordinator",
    company: "Accra Digital Services",
    country: "Ghana",
    city: "Accra",
    salaryMinUsd: 14000,
    salaryMaxUsd: 22000,
    url: "https://example.com/jobs/gh-1",
    technologies: "Excel, Notion, Slack",
    skills: ["Project Management", "Excel", "Communication"],
  },
  {
    externalId: "baseline-gh-2",
    title: "Digital Marketing Specialist",
    company: "Gold Coast Commerce",
    country: "Ghana",
    city: "Kumasi",
    salaryMinUsd: 13000,
    salaryMaxUsd: 21000,
    url: "https://example.com/jobs/gh-2",
    technologies: "SEO, Ads, Analytics",
    skills: ["Digital Marketing", "Data Analysis", "Communication"],
  },
  {
    externalId: "baseline-rw-1",
    title: "Data Engineer Intern",
    company: "Kigali Data Hub",
    country: "Rwanda",
    city: "Kigali",
    salaryMinUsd: 12000,
    salaryMaxUsd: 18000,
    url: "https://example.com/jobs/rw-1",
    technologies: "Python, SQL, ETL",
    skills: ["Python", "SQL", "Data Analysis"],
  },
  {
    externalId: "baseline-rw-2",
    title: "Cybersecurity Analyst",
    company: "Rwanda Secure Networks",
    country: "Rwanda",
    city: "Kigali",
    salaryMinUsd: 21000,
    salaryMaxUsd: 33000,
    url: "https://example.com/jobs/rw-2",
    technologies: "SIEM, SOC, Cloud",
    skills: ["Cybersecurity", "Cloud Computing", "Communication"],
  },
  {
    externalId: "baseline-za-1",
    title: "AI Solutions Engineer",
    company: "Cape AI Works",
    country: "South Africa",
    city: "Cape Town",
    salaryMinUsd: 32000,
    salaryMaxUsd: 52000,
    url: "https://example.com/jobs/za-1",
    technologies: "Python, LLM, Cloud",
    skills: ["Artificial Intelligence", "Machine Learning", "Cloud Computing", "Python"],
  },
  {
    externalId: "baseline-za-2",
    title: "Cloud Architect",
    company: "Johannesburg Infra Partners",
    country: "South Africa",
    city: "Johannesburg",
    salaryMinUsd: 42000,
    salaryMaxUsd: 68000,
    url: "https://example.com/jobs/za-2",
    technologies: "AWS, Terraform, Kubernetes",
    skills: ["Cloud Computing", "Project Management", "Communication"],
  },
  {
    externalId: "baseline-tz-1",
    title: "Data Reporting Officer",
    company: "Dar Commerce Analytics",
    country: "Tanzania",
    city: "Dar es Salaam",
    salaryMinUsd: 11000,
    salaryMaxUsd: 19000,
    url: "https://example.com/jobs/tz-1",
    technologies: "Excel, SQL, Dashboarding",
    skills: ["Excel", "SQL", "Data Analysis"],
  },
  {
    externalId: "baseline-tz-2",
    title: "IT Support Technician",
    company: "Tanzania Logistics Grid",
    country: "Tanzania",
    city: "Arusha",
    salaryMinUsd: 9000,
    salaryMaxUsd: 15000,
    url: "https://example.com/jobs/tz-2",
    technologies: "Networking, Security, Helpdesk",
    skills: ["Communication", "Cybersecurity"],
  },
];

export async function ensureBaselineData() {
  const existing = await prisma.job.count();
  if (existing > 0) return { inserted: 0 };

  for (const job of BASELINE_JOBS) {
    const createdJob = await prisma.job.create({
      data: {
        externalId: job.externalId,
        title: job.title,
        company: job.company,
        country: job.country,
        city: job.city,
        salaryMinUsd: job.salaryMinUsd,
        salaryMaxUsd: job.salaryMaxUsd,
        currency: "USD",
        source: "Baseline Dataset",
        url: job.url,
        technologies: job.technologies,
        postedAt: new Date(Date.now() - Math.floor(Math.random() * 45) * 24 * 60 * 60 * 1000),
      },
    });

    for (const skillName of job.skills) {
      const skill = await prisma.skill.upsert({
        where: { name: skillName },
        create: { name: skillName },
        update: {},
      });

      await prisma.jobSkill.create({
        data: {
          jobId: createdJob.id,
          skillId: skill.id,
          weight: 1,
        },
      });
    }
  }

  return { inserted: BASELINE_JOBS.length };
}
