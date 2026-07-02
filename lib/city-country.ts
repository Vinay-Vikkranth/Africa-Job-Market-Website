export const CITY_TO_COUNTRY: Record<string, string> = {
  nairobi: "Kenya",
  mombasa: "Kenya",
  kisumu: "Kenya",
  lagos: "Nigeria",
  abuja: "Nigeria",
  port: "Nigeria",
  accra: "Ghana",
  kumasi: "Ghana",
  kigali: "Rwanda",
  "cape town": "South Africa",
  johannesburg: "South Africa",
  durban: "South Africa",
  pretoria: "South Africa",
  "dar es salaam": "Tanzania",
  arusha: "Tanzania",
  dodoma: "Tanzania",
};

export function detectCountryFromText(text: string): string | null {
  const lower = text.toLowerCase();
  const countries = ["Kenya", "Ghana", "Nigeria", "Rwanda", "South Africa", "Tanzania"];
  for (const country of countries) {
    if (lower.includes(country.toLowerCase())) return country;
  }
  for (const [city, country] of Object.entries(CITY_TO_COUNTRY)) {
    if (lower.includes(city)) return country;
  }
  return null;
}
