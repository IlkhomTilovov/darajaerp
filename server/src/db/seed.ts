import "dotenv/config";
import { db, schema } from "./index.js";

async function seed() {
  const existing = await db.select().from(schema.stages).limit(1);
  if (existing.length > 0) {
    console.log("Stages already seeded, skipping.");
    process.exit(0);
  }

  await db.insert(schema.stages).values([
    { name: "Yengi Mijoz", displayOrder: 1, color: "bg-blue-500" },
    { name: "Ko'tarmagan", displayOrder: 2, color: "bg-orange-500" },
    { name: "Ma'lumot berildi", displayOrder: 3, color: "bg-purple-500" },
    { name: "Sotildi", displayOrder: 4, color: "bg-green-500" },
    { name: "Muhim", displayOrder: 5, color: "bg-red-500" },
  ]);

  console.log("Seeded default stages.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
