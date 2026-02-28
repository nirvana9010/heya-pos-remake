import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function verifyHamiltonAuth() {
  try {
    console.log("🔍 Checking Hamilton Beauty Spa authentication...\n");

    // Method 1: Check by merchant email
    const merchantByEmail = await prisma.merchant.findFirst({
      where: {
        OR: [
          { email: "admin@hamiltonbeauty.com" },
          { name: { contains: "Hamilton" } },
        ],
      },
      include: {
        locations: true,
        merchantAuth: true,
      },
    });

    if (merchantByEmail) {
      console.log("✅ Found merchant:");
      console.log("   ID:", merchantByEmail.id);
      console.log("   Name:", merchantByEmail.name);
      console.log("   Email:", merchantByEmail.email);
      console.log("   Username:", merchantByEmail.username);
      console.log(
        "   Locations:",
        merchantByEmail.locations.map((l) => l.name).join(", "),
      );

      if (merchantByEmail.merchantAuth) {
        console.log("\n📋 Auth record found:");
        console.log("   Username:", merchantByEmail.merchantAuth.username);
        console.log(
          "   Has password:",
          !!merchantByEmail.merchantAuth.passwordHash,
        );
      } else {
        console.log("\n❌ No auth record found!");
      }
    } else {
      console.log(
        '❌ No merchant found by email or name containing "Hamilton"',
      );
    }

    // Method 2: Check by MerchantAuth username
    console.log("\n🔍 Checking MerchantAuth table directly...");
    const authByUsername = await prisma.merchantAuth.findMany({
      where: {
        OR: [
          { username: "HAMILTON" },
          { username: "admin@hamiltonbeauty.com" },
          { username: { contains: "hamilton", mode: "insensitive" } },
        ],
      },
      include: { merchant: true },
    });

    if (authByUsername.length > 0) {
      console.log(`\n✅ Found ${authByUsername.length} auth record(s):`);
      authByUsername.forEach((auth, index) => {
        console.log(`\n   Auth ${index + 1}:`);
        console.log("   Username:", auth.username);
        console.log("   Merchant:", auth.merchant?.name);
        console.log("   Merchant Email:", auth.merchant?.email);
      });
    } else {
      console.log("❌ No auth records found with Hamilton-related usernames");
    }

    // Show all merchants for reference
    console.log("\n📋 All merchants in database:");
    const allMerchants = await prisma.merchant.findMany({
      select: { id: true, name: true, email: true, username: true },
    });

    allMerchants.forEach((m) => {
      console.log(
        `   - ${m.name} (email: ${m.email}, username: ${m.username})`,
      );
    });

    // Reset password option
    console.log("\n💡 To reset Hamilton's password, run:");
    console.log("   npm run script:reset-hamilton-password");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script to reset password (can be run separately)
async function resetHamiltonPassword() {
  try {
    console.log("🔐 Resetting Hamilton Beauty Spa password...\n");

    // Find merchant
    const merchant = await prisma.merchant.findFirst({
      where: {
        OR: [
          { email: "admin@hamiltonbeauty.com" },
          { name: { contains: "Hamilton" } },
        ],
      },
    });

    if (!merchant) {
      console.error("❌ Hamilton Beauty Spa merchant not found!");
      return;
    }

    console.log("✅ Found merchant:", merchant.name);

    // Check for existing auth
    const existingAuth = await prisma.merchantAuth.findUnique({
      where: { merchantId: merchant.id },
    });

    const newPassword = "hamilton123";
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (existingAuth) {
      // Update existing auth
      await prisma.merchantAuth.update({
        where: { merchantId: merchant.id },
        data: {
          passwordHash: hashedPassword,
          username: merchant.email, // ensure username matches email
        },
      });
      console.log("✅ Updated existing auth record");
    } else {
      // Create new auth
      await prisma.merchantAuth.create({
        data: {
          merchantId: merchant.id,
          username: merchant.email,
          passwordHash: hashedPassword,
        },
      });
      console.log("✅ Created new auth record");
    }

    console.log("\n🎉 Password reset successful!");
    console.log("   Email/Username:", merchant.email);
    console.log("   New Password:", newPassword);
    console.log("\n📝 Login endpoint: POST /api/v1/auth/merchant/login");
    console.log(
      '   Body: { "email": "' +
        merchant.email +
        '", "password": "' +
        newPassword +
        '" }',
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check if script is run with reset flag
if (process.argv.includes("--reset")) {
  resetHamiltonPassword();
} else {
  verifyHamiltonAuth();
}
