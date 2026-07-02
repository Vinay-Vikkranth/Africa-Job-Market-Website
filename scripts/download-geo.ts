import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ISO_CODES = ["KEN", "GHA", "NGA", "RWA", "ZAF", "TZA"];

async function main() {
  const features = [];
  for (const code of ISO_CODES) {
    const res = await fetch(
      `https://raw.githubusercontent.com/johan/world.geo.json/master/countries/${code}.geo.json`,
    );
    if (!res.ok) throw new Error(`Failed ${code}`);
    const data = (await res.json()) as { features: unknown[] };
    features.push(...data.features);
  }

  const outDir = path.join(process.cwd(), "public", "data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    path.join(outDir, "africa-countries.geojson"),
    JSON.stringify({ type: "FeatureCollection", features }),
  );
  console.log("Wrote", features.length, "features");
}

main().catch(console.error);
