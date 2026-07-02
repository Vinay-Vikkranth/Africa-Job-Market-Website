import { readFileSync, writeFileSync } from "node:fs";

const raw = readFileSync("public/data/africa-countries.geojson", "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw) as {
  features: Array<{ features?: unknown[] } & Record<string, unknown>>;
};

const features = data.features.flatMap((f) =>
  Array.isArray(f.features) ? f.features : [f],
);

writeFileSync(
  "public/data/africa-countries.geojson",
  JSON.stringify({ type: "FeatureCollection", features }),
);

console.log("Fixed", features.length, "features");
