import "dotenv/config";
import { syncAllJobSources } from "../lib/sync-jobs";

async function run() {
  const result = await syncAllJobSources(300);
  console.log(`Sync completed. Inserted: ${result.inserted}, Updated: ${result.updated}`);
}

run().catch((error) => {
  console.error("Sync failed", error);
  process.exit(1);
});
