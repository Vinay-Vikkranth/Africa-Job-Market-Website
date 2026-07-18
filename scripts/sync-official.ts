import "dotenv/config";
import { syncUndpWithLog } from "../lib/sources/undp";
import { syncUnCareersWithLog } from "../lib/sources/un-careers";
import { syncUnWomenWithLog } from "../lib/sources/un-women";

async function run() {
  const [undp, unCareers, unWomen] = await Promise.all([
    syncUndpWithLog(),
    syncUnCareersWithLog(),
    syncUnWomenWithLog(),
  ]);
  console.log("Official feeds synced", { undp, unCareers, unWomen });
}

run()
  .catch((error) => {
    console.error("Official feed sync failed", error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
