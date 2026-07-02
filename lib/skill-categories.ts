export const TECH_SKILLS = new Set([
  "SQL",
  "Python",
  "Cloud Computing",
  "Machine Learning",
  "Artificial Intelligence",
  "Cybersecurity",
  "Salesforce",
]);

export const DIGITAL_SKILLS = new Set([
  "Excel",
  "Power BI",
  "Data Analysis",
  "Digital Marketing",
]);

export const SOFT_SKILLS = new Set(["Communication", "Project Management"]);

export const BUSINESS_SKILLS = new Set(["Digital Marketing", "Salesforce", "Project Management"]);

export const TECH_KEYWORDS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Cloud Computing",
  "Cybersecurity",
  "Data Science",
  "Devops",
  "Blockchain",
  "Prompt Engineering",
];

export function categorizeSkill(name: string): "technical" | "digital" | "soft" | "business" | "other" {
  if (TECH_SKILLS.has(name)) return "technical";
  if (DIGITAL_SKILLS.has(name)) return "digital";
  if (SOFT_SKILLS.has(name)) return "soft";
  if (BUSINESS_SKILLS.has(name)) return "business";
  const lower = name.toLowerCase();
  if (lower.includes("ai") || lower.includes("cloud") || lower.includes("security")) return "technical";
  if (lower.includes("data") || lower.includes("excel") || lower.includes("bi")) return "digital";
  if (lower.includes("communication") || lower.includes("management")) return "soft";
  return "other";
}
