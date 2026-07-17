import { AFRICAN_COUNTRIES } from "@/lib/constants";

// Alternate names/spellings mapped to canonical display names.
// Longer phrases are matched before shorter ones (see detectCountryFromText).
const COUNTRY_ALIASES: Record<string, string> = {
  "cote d'ivoire": "Ivory Coast",
  "côte d'ivoire": "Ivory Coast",
  "cote divoire": "Ivory Coast",
  "democratic republic of congo": "Democratic Republic of the Congo",
  "dr congo": "Democratic Republic of the Congo",
  "congo-kinshasa": "Democratic Republic of the Congo",
  "congo, the democratic republic": "Democratic Republic of the Congo",
  drc: "Democratic Republic of the Congo",
  "congo-brazzaville": "Republic of the Congo",
  "republic of congo": "Republic of the Congo",
  "cape verde": "Cabo Verde",
  swaziland: "Eswatini",
  "the gambia": "Gambia",
  "guinea bissau": "Guinea-Bissau",
  "sao tome": "Sao Tome and Principe",
  "são tomé": "Sao Tome and Principe",
  "united republic of tanzania": "Tanzania",
};

// Capital and major cities. Deliberately conservative: only names that are
// unambiguous enough in job-posting text (no generic words, no cities that are
// better known outside Africa).
export const CITY_TO_COUNTRY: Record<string, string> = {
  // Algeria
  algiers: "Algeria",
  oran: "Algeria",
  // Angola
  luanda: "Angola",
  // Benin
  cotonou: "Benin",
  "porto-novo": "Benin",
  // Botswana
  gaborone: "Botswana",
  // Burkina Faso
  ouagadougou: "Burkina Faso",
  // Burundi
  bujumbura: "Burundi",
  gitega: "Burundi",
  // Cabo Verde
  praia: "Cabo Verde",
  // Cameroon
  yaounde: "Cameroon",
  yaoundé: "Cameroon",
  douala: "Cameroon",
  // Central African Republic
  bangui: "Central African Republic",
  // Chad
  "n'djamena": "Chad",
  ndjamena: "Chad",
  // Comoros
  moroni: "Comoros",
  // DRC
  kinshasa: "Democratic Republic of the Congo",
  lubumbashi: "Democratic Republic of the Congo",
  goma: "Democratic Republic of the Congo",
  // Republic of the Congo
  brazzaville: "Republic of the Congo",
  "pointe-noire": "Republic of the Congo",
  // Ivory Coast
  abidjan: "Ivory Coast",
  yamoussoukro: "Ivory Coast",
  // Djibouti city == country name, handled by country match
  // Egypt
  cairo: "Egypt",
  giza: "Egypt",
  // Equatorial Guinea
  malabo: "Equatorial Guinea",
  // Eritrea
  asmara: "Eritrea",
  // Eswatini
  mbabane: "Eswatini",
  // Ethiopia
  "addis ababa": "Ethiopia",
  // Gabon
  libreville: "Gabon",
  // Gambia
  banjul: "Gambia",
  // Ghana
  accra: "Ghana",
  kumasi: "Ghana",
  // Guinea
  conakry: "Guinea",
  // Guinea-Bissau
  bissau: "Guinea-Bissau",
  // Kenya
  nairobi: "Kenya",
  mombasa: "Kenya",
  kisumu: "Kenya",
  // Lesotho
  maseru: "Lesotho",
  // Liberia
  monrovia: "Liberia",
  // Libya
  tripoli: "Libya",
  benghazi: "Libya",
  // Madagascar
  antananarivo: "Madagascar",
  // Malawi
  lilongwe: "Malawi",
  blantyre: "Malawi",
  // Mali
  bamako: "Mali",
  // Mauritania
  nouakchott: "Mauritania",
  // Mauritius
  "port louis": "Mauritius",
  ebene: "Mauritius",
  ebène: "Mauritius",
  // Morocco
  rabat: "Morocco",
  casablanca: "Morocco",
  marrakech: "Morocco",
  marrakesh: "Morocco",
  tangier: "Morocco",
  // Mozambique
  maputo: "Mozambique",
  // Namibia
  windhoek: "Namibia",
  // Niger
  niamey: "Niger",
  // Nigeria
  lagos: "Nigeria",
  abuja: "Nigeria",
  "port harcourt": "Nigeria",
  kano: "Nigeria",
  ibadan: "Nigeria",
  // Rwanda
  kigali: "Rwanda",
  // Senegal
  dakar: "Senegal",
  // Sierra Leone
  freetown: "Sierra Leone",
  // Somalia
  mogadishu: "Somalia",
  hargeisa: "Somalia",
  // South Africa
  "cape town": "South Africa",
  johannesburg: "South Africa",
  durban: "South Africa",
  pretoria: "South Africa",
  "port elizabeth": "South Africa",
  gqeberha: "South Africa",
  stellenbosch: "South Africa",
  // South Sudan
  juba: "South Sudan",
  // Sudan
  khartoum: "Sudan",
  // Tanzania
  "dar es salaam": "Tanzania",
  arusha: "Tanzania",
  dodoma: "Tanzania",
  zanzibar: "Tanzania",
  // Togo
  lome: "Togo",
  lomé: "Togo",
  // Tunisia
  tunis: "Tunisia",
  sfax: "Tunisia",
  // Uganda
  kampala: "Uganda",
  entebbe: "Uganda",
  // Zambia
  lusaka: "Zambia",
  ndola: "Zambia",
  // Zimbabwe
  harare: "Zimbabwe",
  bulawayo: "Zimbabwe",
};

type Pattern = { regex: RegExp; country: string };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordPattern(phrase: string): RegExp {
  // Word-boundary match so "port" never matches "support" and
  // "niger" never matches inside "nigeria".
  return new RegExp(`(?:^|[^a-z])${escapeRegex(phrase)}(?:[^a-z]|$)`, "i");
}

// "Guinea" alone must not match "Equatorial Guinea", "Guinea-Bissau", or
// "Papua New Guinea"; "Niger" alone must not match "Nigeria" (handled by word
// boundaries) — so longer phrases are checked first.
const COUNTRY_PATTERNS: Pattern[] = [
  ...AFRICAN_COUNTRIES.map((country) => ({ phrase: country.toLowerCase(), country })),
  ...Object.entries(COUNTRY_ALIASES).map(([phrase, country]) => ({ phrase, country })),
]
  .sort((a, b) => b.phrase.length - a.phrase.length)
  .map(({ phrase, country }) => ({ regex: wordPattern(phrase), country }));

// Non-African phrases that contain African country words.
const EXCLUSIONS = [/papua new guinea/i, /new guinea/i, /equatoguinean/i];

const CITY_PATTERNS: Pattern[] = Object.entries(CITY_TO_COUNTRY)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([phrase, country]) => ({ regex: wordPattern(phrase), country }));

export function detectCountryFromText(text: string): string | null {
  if (!text) return null;
  const cleaned = EXCLUSIONS.reduce((acc, ex) => acc.replace(ex, " "), text);

  for (const { regex, country } of COUNTRY_PATTERNS) {
    if (regex.test(cleaned)) return country;
  }
  for (const { regex, country } of CITY_PATTERNS) {
    if (regex.test(cleaned)) return country;
  }
  return null;
}

// Checks each text in order and returns the first match, so a structured
// location field takes priority over free-form description text.
export function detectCountry(...texts: (string | null | undefined)[]): string | null {
  for (const text of texts) {
    if (!text) continue;
    const match = detectCountryFromText(text);
    if (match) return match;
  }
  return null;
}
