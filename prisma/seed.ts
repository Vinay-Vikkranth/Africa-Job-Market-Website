import { syncAllJobSources } from "../lib/sync-jobs";
import { ensureBaselineData } from "../lib/seed-baseline";

async function main() {
  const baseline = await ensureBaselineData();
  const result = await syncAllJobSources(300);
  console.log("Seed complete", { baseline, liveSync: result });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
