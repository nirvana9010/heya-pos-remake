/**
 * Script to identify merchants with problematic email addresses
 * (admin@heyapos.com or duplicates) and help fix them.
 *
 * Usage:
 *   npx ts-node src/scripts/fix-merchant-emails.ts
 *
 * For production, run via Fly.io SSH:
 *   flyctl ssh console -a heya-pos-api
 *   cd /app && node dist/scripts/fix-merchant-emails.js
 *
 * Or run locally with production DATABASE_URL:
 *   DATABASE_URL="postgres://..." npx ts-node src/scripts/fix-merchant-emails.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@heyapos.com";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes("--fix");

  console.log("\n=== Merchant Email Audit ===\n");

  // Find all merchants with admin email
  const merchantsWithAdminEmail = await prisma.merchant.findMany({
    where: {
      email: {
        equals: ADMIN_EMAIL,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      subdomain: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  if (merchantsWithAdminEmail.length === 0) {
    console.log("✅ No merchants found with admin@heyapos.com as their email.");
    console.log("\nThe email routing issue may be caused by something else.");
    console.log("Check the notification logs for more details.\n");
    return;
  }

  console.log(
    `⚠️  Found ${merchantsWithAdminEmail.length} merchant(s) with admin@heyapos.com:\n`,
  );

  for (const merchant of merchantsWithAdminEmail) {
    console.log(`  ID: ${merchant.id}`);
    console.log(`  Name: ${merchant.name}`);
    console.log(`  Subdomain: ${merchant.subdomain}`);
    console.log(`  Email: ${merchant.email}`);
    console.log(`  Phone: ${merchant.phone || "N/A"}`);
    console.log(`  Created: ${merchant.createdAt.toISOString()}`);
    console.log("");
  }

  if (isDryRun) {
    console.log("---");
    console.log("This is a DRY RUN. No changes were made.");
    console.log("");
    console.log("To fix these merchants, you have two options:");
    console.log("");
    console.log("1. Update via Admin Dashboard:");
    console.log("   - Go to the admin dashboard");
    console.log("   - Find each merchant and update their email address");
    console.log("");
    console.log("2. Update via Database (if you know the correct emails):");
    console.log("   Run this SQL for each merchant:");
    console.log("");
    for (const merchant of merchantsWithAdminEmail) {
      console.log(`   UPDATE "Merchant" SET email = 'correct@email.com'`);
      console.log(`   WHERE id = '${merchant.id}';`);
      console.log("");
    }
    console.log("");
    console.log(
      "⚠️  IMPORTANT: Each merchant should have their own unique email address",
    );
    console.log(
      "   for receiving booking notifications, confirmations, etc.\n",
    );
  }

  // Also check for duplicate emails (multiple merchants sharing same email)
  console.log("\n=== Checking for Duplicate Merchant Emails ===\n");

  const duplicateEmails = await prisma.$queryRaw<
    Array<{ email: string; count: bigint }>
  >`
    SELECT email, COUNT(*) as count
    FROM "Merchant"
    WHERE email IS NOT NULL
    GROUP BY email
    HAVING COUNT(*) > 1
  `;

  if (duplicateEmails.length === 0) {
    console.log("✅ No duplicate merchant emails found.\n");
  } else {
    console.log(
      `⚠️  Found ${duplicateEmails.length} email(s) used by multiple merchants:\n`,
    );

    for (const dup of duplicateEmails) {
      console.log(`  Email: ${dup.email}`);
      console.log(`  Used by: ${dup.count} merchants`);

      const merchants = await prisma.merchant.findMany({
        where: { email: dup.email },
        select: { id: true, name: true, subdomain: true },
      });

      for (const m of merchants) {
        console.log(`    - ${m.name} (${m.subdomain})`);
      }
      console.log("");
    }

    console.log("Each merchant should have a unique email address.\n");
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
