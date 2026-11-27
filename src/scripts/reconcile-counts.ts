import "dotenv/config";
import { prisma } from "../db/client";
import { reconcilePostCounts } from "../lib/counters";

async function main() {
  const reconciled = await reconcilePostCounts();
  console.log(`Reconciled ${reconciled} posts.`);
}

main()
  .catch((error) => {
    console.error("Reconcile failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
