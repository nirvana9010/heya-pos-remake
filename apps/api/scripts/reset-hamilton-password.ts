import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function resetHamiltonPassword() {
  console.log("Resetting Hamilton Beauty Spa password...\n");

  // Find merchant
  const merchant = await prisma.merchant.findFirst({
    where: { subdomain: "hamilton" },
  });

  if (!merchant) {
    console.log("❌ Hamilton Beauty Spa merchant NOT FOUND!");
    return;
  }

  console.log("✅ Found merchant:", merchant.name);

  // Find auth
  const auth = await prisma.merchantAuth.findFirst({
    where: { merchantId: merchant.id },
  });

  if (!auth) {
    console.log("❌ No auth record found!");
    return;
  }

  console.log("✅ Found auth record for username:", auth.username);

  // Reset password to demo123
  const newPassword = "demo123";
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.merchantAuth.update({
    where: { id: auth.id },
    data: { passwordHash: hashedPassword },
  });

  console.log("\n✅ Password reset successfully!");
  console.log("\n📋 Login details:");
  console.log("   Email: admin@hamiltonbeauty.com");
  console.log("   Username: HAMILTON");
  console.log("   Password: demo123");
  console.log("   Subdomain: hamilton");
}

resetHamiltonPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
