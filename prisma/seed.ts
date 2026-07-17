import "dotenv/config";
import { syncAllJobSources } from "../lib/sync-jobs";

async function main() {
  const result = await syncAllJobSources(300);
  console.log("Seed complete (live data only)", result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
