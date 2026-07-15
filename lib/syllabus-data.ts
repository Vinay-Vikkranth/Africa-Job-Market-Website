export type SyllabusSkill = {
  name: string;
  terms: string[]; // lowercase substrings to match against job skill names
  programs: string[];
};

export type CountrySyllabus = {
  country: string;
  source: string;
  programs: string[];
  skills: SyllabusSkill[];
};

// Nigeria NUC CCMAS 2022 — Core Curriculum and Minimum Academic Standards
// for Computing and ICT programmes (B.Sc. level).
const NIGERIA_SKILLS: SyllabusSkill[] = [
  {
    name: "Communication",
    terms: ["communication"],
    programs: ["Computer Science", "Cybersecurity", "Data Science", "ICT", "Information Systems", "Information Technology", "Software Engineering"],
  },
  {
    name: "Teamwork & Collaboration",
    terms: ["teamwork", "collaboration", "team"],
    programs: ["Computer Science", "Cybersecurity", "Data Science", "ICT", "Information Systems", "Information Technology", "Software Engineering"],
  },
  {
    name: "Critical Thinking & Problem Solving",
    terms: ["critical thinking", "problem solving", "problem-solving"],
    programs: ["Computer Science", "Cybersecurity", "Data Science", "ICT", "Information Systems", "Information Technology", "Software Engineering"],
  },
  {
    name: "Leadership & Organisation",
    terms: ["leadership", "organisation", "organization"],
    programs: ["Computer Science", "ICT", "Information Systems", "Information Technology", "Software Engineering"],
  },
  {
    name: "Project Management",
    terms: ["project management"],
    programs: ["Computer Science", "Information Systems", "Software Engineering"],
  },
  {
    name: "Research & Digital Literacy",
    terms: ["research", "digital literacy"],
    programs: ["Data Science"],
  },
  {
    name: "Cybersecurity & Network Defense",
    terms: ["cybersecurity", "cyber security", "infosec", "information security", "network security", "network defense", "firewall"],
    programs: ["Cybersecurity", "Information Systems"],
  },
  {
    name: "Vulnerability Assessment & Threat Management",
    terms: ["vulnerability assessment", "penetration testing", "threat modeling", "threat management"],
    programs: ["Cybersecurity"],
  },
  {
    name: "Systems Administration",
    terms: ["sys admin", "systems administration", "sysadmin", "system admin"],
    programs: ["Cybersecurity", "ICT"],
  },
  {
    name: "Automation & Scripting",
    terms: ["automation", "scripting"],
    programs: ["Cybersecurity", "Software Engineering"],
  },
  {
    name: "Data Analysis & Statistical Thinking",
    terms: ["data analysis", "data analytics", "analytics", "statistics", "statistical"],
    programs: ["Data Science", "Information Systems"],
  },
  {
    name: "Machine Learning & AI",
    terms: ["machine learning", "artificial intelligence", "ai/ml", "deep learning", "neural network"],
    programs: ["Data Science"],
  },
  {
    name: "Database Design & SQL",
    terms: ["sql", "database", "db"],
    programs: ["Information Systems", "Data Science"],
  },
  {
    name: "Cloud Platforms",
    terms: ["cloud computing", "cloud platform"],
    programs: ["Cybersecurity", "ICT"],
  },
  {
    name: "Networking & ICT Infrastructure",
    terms: ["networking", "network administration", "ict"],
    programs: ["Cybersecurity", "ICT", "Information Technology"],
  },
  {
    name: "Python / Scripting",
    terms: ["python"],
    programs: ["Data Science", "Cybersecurity", "Computer Science"],
  },
  {
    name: "Software Engineering & Testing",
    terms: ["software engineering", "software development", "software lifecycle", "testing", "ci/cd", "devops", "agile", "scrum"],
    programs: ["Software Engineering", "Computer Science"],
  },
  {
    name: "Business Strategy Alignment",
    terms: ["business strategy", "business analysis"],
    programs: ["Information Systems"],
  },
  {
    name: "Analyst Roles",
    terms: ["analyst"],
    programs: ["Data Science", "Information Systems"],
  },
];

export const COUNTRY_SYLLABUSES: Record<string, CountrySyllabus> = {
  Nigeria: {
    country: "Nigeria",
    source: "NUC CCMAS 2022",
    programs: [
      "Computer Science",
      "Cybersecurity",
      "Data Science",
      "ICT",
      "Information Systems",
      "Information Technology",
      "Software Engineering",
    ],
    skills: NIGERIA_SKILLS,
  },
};

export function hasSyllabus(country: string): boolean {
  return country in COUNTRY_SYLLABUSES;
}

/** Returns the syllabus skill whose terms match this job-market skill name. */
export function findCurriculumMatch(
  skillName: string,
  syllabus: CountrySyllabus,
): SyllabusSkill | null {
  const lower = skillName.toLowerCase();
  for (const s of syllabus.skills) {
    if (s.terms.some((t) => lower.includes(t) || t.includes(lower))) {
      return s;
    }
  }
  return null;
}
