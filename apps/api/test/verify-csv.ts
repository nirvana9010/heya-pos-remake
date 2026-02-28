import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";

console.log("📄 Verifying Hamilton Beauty Services CSV...\n");

try {
  const csvPath = path.join(
    __dirname,
    "../../../test-data/hamilton-beauty-services.csv",
  );
  const csvContent = fs.readFileSync(csvPath, "utf-8");

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`✅ CSV file loaded successfully`);
  console.log(`📊 Total services: ${records.length}\n`);

  // Group by category
  const categories = new Map<string, any[]>();
  records.forEach((record: any) => {
    const category = record.Category;
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(record);
  });

  console.log("📋 Services by Category:");
  console.log("═══════════════════════════════════════\n");

  categories.forEach((services, category) => {
    console.log(`${category} (${services.length} services):`);
    services.forEach((service) => {
      console.log(
        `  - ${service["Service Name"]} ($${service.Price}, ${service["Duration (min)"]} min)`,
      );
    });
    console.log("");
  });

  console.log("💰 Price Analysis:");
  console.log("═══════════════════════════════════════");

  const prices = records.map((r: any) => parseFloat(r.Price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice =
    prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

  console.log(`  Minimum: $${minPrice}`);
  console.log(`  Maximum: $${maxPrice}`);
  console.log(`  Average: $${avgPrice.toFixed(2)}\n`);

  console.log("⏱️  Duration Analysis:");
  console.log("═══════════════════════════════════════");

  const durations = records.map((r: any) => parseInt(r["Duration (min)"]));
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const avgDuration =
    durations.reduce((a: number, b: number) => a + b, 0) / durations.length;

  console.log(`  Minimum: ${minDuration} minutes`);
  console.log(`  Maximum: ${maxDuration} minutes`);
  console.log(`  Average: ${avgDuration.toFixed(0)} minutes\n`);

  console.log("✅ CSV verification complete!");
  console.log("✅ Ready for import into the booking system");
} catch (error) {
  console.error("❌ Error loading CSV:", error.message);
}
