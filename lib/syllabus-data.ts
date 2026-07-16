export type CurriculumEntry = {
  skill: string;       // exact canonical ESCO tier2 name (matches DB Skill.name)
  programs: string[];  // which of the country's programmes cover this skill
};

export type CountryCurriculum = {
  country: string;
  source: string;
  totalPrograms: number;
  programNames: string[];
  curriculum: CurriculumEntry[];
};

// Nigeria NUC CCMAS 2022 — Core Curriculum and Minimum Academic Standards
// 7 B.Sc. Computing & ICT programmes: CS · Cyb · DS · ICT · IS · IT · SE
const NIGERIA: CountryCurriculum = {
  country: "Nigeria",
  source: "NUC CCMAS 2022",
  totalPrograms: 7,
  programNames: [
    "Computer Science",
    "Cybersecurity",
    "Data Science",
    "ICT",
    "Information Systems",
    "Information Technology",
    "Software Engineering",
  ],
  curriculum: [
    // General competencies — all 7 programmes
    { skill: "Communication",     programs: ["Computer Science","Cybersecurity","Data Science","ICT","Information Systems","Information Technology","Software Engineering"] },
    { skill: "Leadership",        programs: ["Computer Science","Cybersecurity","Data Science","ICT","Information Systems","Information Technology","Software Engineering"] },

    // Core computing / programming
    { skill: "Python",             programs: ["Computer Science","Cybersecurity","Data Science"] },
    { skill: "Java",               programs: ["Computer Science","Software Engineering"] },
    { skill: "JavaScript",        programs: ["Computer Science","Software Engineering"] },
    { skill: "C++",                programs: ["Computer Science"] },
    { skill: "REST APIs",         programs: ["Computer Science","Software Engineering"] },
    { skill: "Microservices",      programs: ["Computer Science","Software Engineering"] },
    { skill: "Git",                programs: ["Computer Science","Software Engineering"] },
    { skill: "Agile",              programs: ["Computer Science","Software Engineering"] },
    { skill: "Software Testing",   programs: ["Computer Science","Software Engineering"] },
    { skill: "DevOps",             programs: ["Software Engineering"] },
    { skill: "Docker",             programs: ["Software Engineering"] },
    { skill: "Project Management", programs: ["Computer Science","Information Systems","Software Engineering"] },

    // Data & AI
    { skill: "SQL",                programs: ["Computer Science","Data Science","Information Systems"] },
    { skill: "Data Analysis",      programs: ["Data Science","Information Systems"] },
    { skill: "Data Science",       programs: ["Data Science"] },
    { skill: "Machine Learning",   programs: ["Computer Science","Data Science"] },
    { skill: "Artificial Intelligence", programs: ["Computer Science","Data Science"] },
    { skill: "Microsoft Excel",    programs: ["ICT","Information Systems","Information Technology"] },

    // Infrastructure / cloud
    { skill: "Linux",              programs: ["Cybersecurity","ICT","Information Technology"] },
    { skill: "Network Administration", programs: ["Cybersecurity","ICT","Information Technology"] },
    { skill: "Systems Administration", programs: ["Cybersecurity","ICT","Information Technology"] },
    { skill: "Cybersecurity",      programs: ["Cybersecurity","Information Systems"] },
    { skill: "Amazon Web Services", programs: ["ICT","Information Technology"] },
    { skill: "Microsoft Azure",    programs: ["ICT","Information Technology"] },
    { skill: "Google Cloud Platform", programs: ["ICT","Information Technology"] },
  ],
};

export const COUNTRY_CURRICULA: Record<string, CountryCurriculum> = {
  Nigeria: NIGERIA,
};

export function hasSyllabus(country: string): boolean {
  return country in COUNTRY_CURRICULA;
}

/** Returns Supply% (0-100) and covering programmes for a canonical skill name. */
export function getCurriculumCoverage(
  skillName: string,
  curriculum: CountryCurriculum,
): { supplyPct: number; programs: string[] } {
  const entry = curriculum.curriculum.find(
    (e) => e.skill.toLowerCase() === skillName.toLowerCase(),
  );
  if (!entry) return { supplyPct: 0, programs: [] };
  return {
    supplyPct: Math.round((entry.programs.length / curriculum.totalPrograms) * 100),
    programs: entry.programs,
  };
}
