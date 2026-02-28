import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function resetZenPassword() {
  console.log("Resetting Zen Wellness password...\n");

  // Find merchant
  const merchant = await prisma.merchant.findFirst({
    where: { subdomain: "zen-wellness" },
  });

  if (!merchant) {
    console.log("❌ Zen Wellness merchant NOT FOUND!");
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

  // Reset password to demo456
  const newPassword = "demo456";
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.merchantAuth.update({
    where: { id: auth.id },
    data: { passwordHash: hashedPassword },
  });

  console.log("\n✅ Password reset successfully!");
  console.log("\n📋 Login details:");
  console.log("   Username:", auth.username);
  console.log("   Password: demo456");
  console.log("   Subdomain: zen-wellness");
}

resetZenPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
