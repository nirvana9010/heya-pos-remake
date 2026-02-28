import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkHamilton() {
  console.log("Checking Hamilton Beauty Spa data...\n");

  // Find merchant
  const merchant = await prisma.merchant.findFirst({
    where: {
      OR: [{ subdomain: "hamilton" }, { name: { contains: "Hamilton" } }],
    },
  });

  if (!merchant) {
    console.log("❌ Hamilton Beauty Spa merchant NOT FOUND in database!");
    console.log("You may need to run: npm run prisma:seed");
    return;
  }

  console.log("✅ Found merchant:", {
    id: merchant.id,
    name: merchant.name,
    email: merchant.email,
    subdomain: merchant.subdomain,
  });

  // Find auth
  const auth = await prisma.merchantAuth.findFirst({
    where: { merchantId: merchant.id },
  });

  if (!auth) {
    console.log("❌ No auth record found for Hamilton!");
    return;
  }

  console.log("\n✅ Found auth record:", {
    username: auth.username,
    merchantId: auth.merchantId,
    lastLoginAt: auth.lastLoginAt,
  });

  // Check locations
  const locations = await prisma.location.findMany({
    where: { merchantId: merchant.id, isActive: true },
  });

  console.log(`\n📍 Active locations: ${locations.length}`);
  if (locations.length === 0) {
    console.log(
      "⚠️  WARNING: No active locations found! This will cause order creation issues.",
    );
  } else {
    locations.forEach((loc) => {
      console.log(`   - ${loc.name} (${loc.id})`);
    });
  }

  // List all merchants for reference
  console.log("\n📋 All merchants in database:");
  const allMerchants = await prisma.merchant.findMany({
    select: { name: true, subdomain: true, email: true },
  });

  allMerchants.forEach((m) => {
    console.log(`   - ${m.name} (${m.subdomain}) - ${m.email}`);
  });

  console.log("\n💡 Login instructions for Hamilton:");
  console.log("   Email/Username: admin@hamiltonbeauty.com OR HAMILTON");
  console.log("   Password: (check seed file - usually demo123)");
  console.log("   Subdomain: hamilton");
}

checkHamilton()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
