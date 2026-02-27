/**
 * Canonical walk-in customer resolution.
 *
 * Every code path that needs "the" walk-in placeholder customer for a merchant
 * should call this function.  It uses the deterministic email
 * `walkin@{subdomain}.local` as the primary key and falls back to any customer
 * whose email matches `walkin@%.local` (handles subdomain renames).
 *
 * IMPORTANT: The public check-in flow creates *real* customers with
 * `source: "WALK_IN"` — those are NOT the placeholder.  Do NOT look up by
 * `source` alone, or you'll match real people.
 */

interface PrismaLike {
  merchant: {
    findUnique(args: any): Promise<any>;
  };
  customer: {
    findFirst(args: any): Promise<any>;
    create(args: any): Promise<any>;
  };
}

/**
 * Returns the walk-in placeholder customer for a merchant, creating it if it
 * doesn't exist.  Works with both `PrismaService` and a transaction client.
 */
export async function getOrCreateWalkInCustomer(
  prisma: PrismaLike,
  merchantId: string,
): Promise<{ id: string }> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { subdomain: true },
  });

  const subdomain = merchant?.subdomain || merchantId;
  const walkInEmail = `walkin@${subdomain}.local`;

  // 1. Exact email match (fast path — covers the normal case)
  let customer = await prisma.customer.findFirst({
    where: { merchantId, email: walkInEmail },
    select: { id: true },
  });
  if (customer) return customer;

  // 2. Pattern match for any walkin@*.local email (handles subdomain changes)
  customer = await prisma.customer.findFirst({
    where: {
      merchantId,
      email: { startsWith: "walkin@", endsWith: ".local" },
    },
    select: { id: true },
  });
  if (customer) return customer;

  // 3. Create new placeholder
  customer = await prisma.customer.create({
    data: {
      merchantId,
      firstName: "Walk-in",
      lastName: "Customer",
      email: walkInEmail,
      source: "WALK_IN",
      status: "ACTIVE",
      marketingConsent: false,
      loyaltyPoints: 0,
      visitCount: 0,
      totalSpent: 0,
      tags: [],
    },
    select: { id: true },
  });

  return customer;
}
