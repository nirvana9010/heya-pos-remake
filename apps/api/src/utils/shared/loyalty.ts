import type {
  LoyaltyProgram,
  LoyaltyCard,
  LoyaltyTransaction,
} from "../../types";

export function calculatePointsEarned(
  amount: number,
  program: LoyaltyProgram,
  tier?: { multiplier: number },
): number {
  let points = 0;

  if (program.type === "SPEND" && program.pointsPerDollar) {
    points = Math.floor(amount * program.pointsPerDollar);
  } else if (program.type === "VISIT" && program.pointsPerVisit) {
    points = program.pointsPerVisit;
  } else if (program.pointsPerCurrency) {
    points = Math.floor(amount * program.pointsPerCurrency);
  }

  // Apply tier multiplier if applicable
  if (tier && tier.multiplier > 1) {
    points = Math.floor(points * tier.multiplier);
  }

  return points;
}

export function calculateRewardValue(
  points: number,
  program: LoyaltyProgram,
): number {
  if (points < program.rewardThreshold) return 0;

  const rewards = Math.floor(points / program.rewardThreshold);
  return rewards * program.rewardValue;
}

export function canRedeemPoints(
  card: LoyaltyCard,
  pointsToRedeem: number,
): boolean {
  return card.status === "ACTIVE" && card.points >= pointsToRedeem;
}

export function getPointsBalance(transactions: LoyaltyTransaction[]): number {
  return transactions.reduce((balance, tx) => balance + tx.points, 0);
}

export function getExpiringPoints(
  transactions: LoyaltyTransaction[],
  daysAhead: number = 30,
): { points: number; expiryDate: Date }[] {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const expiringGroups = new Map<
    string,
    { points: number; expiryDate: Date }
  >();

  for (const tx of transactions) {
    if (!tx.expiresAt || tx.points <= 0) continue;

    const expiryDate = new Date(tx.expiresAt);
    if (expiryDate <= futureDate) {
      const dateKey = expiryDate.toISOString().split("T")[0];
      const existing = expiringGroups.get(dateKey) || { points: 0, expiryDate };
      existing.points += tx.points;
      expiringGroups.set(dateKey, existing);
    }
  }

  return Array.from(expiringGroups.values()).sort(
    (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime(),
  );
}

export function getTierProgress(
  card: LoyaltyCard,
  tiers: Array<{ requiredPoints: number; name: string }>,
): {
  currentTier?: string;
  nextTier?: string;
  pointsToNext: number;
  progressPercentage: number;
} {
  const sortedTiers = [...tiers].sort(
    (a, b) => a.requiredPoints - b.requiredPoints,
  );

  let currentTier;
  let nextTier;
  let previousPoints = 0;

  for (let i = 0; i < sortedTiers.length; i++) {
    const tier = sortedTiers[i];

    if (card.lifetimePoints >= tier.requiredPoints) {
      currentTier = tier.name;
      previousPoints = tier.requiredPoints;
    } else {
      nextTier = tier.name;
      const pointsNeeded = tier.requiredPoints - previousPoints;
      const pointsProgress = card.lifetimePoints - previousPoints;

      return {
        currentTier,
        nextTier,
        pointsToNext: tier.requiredPoints - card.lifetimePoints,
        progressPercentage: Math.round((pointsProgress / pointsNeeded) * 100),
      };
    }
  }

  // At highest tier
  return {
    currentTier,
    nextTier: undefined,
    pointsToNext: 0,
    progressPercentage: 100,
  };
}

export function generateLoyaltyCardNumber(): string {
  const prefix = "LC";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `${prefix}${timestamp}${random}`;
}

export function formatLoyaltyBalance(
  points: number,
  program: LoyaltyProgram,
): string {
  const rewardValue = calculateRewardValue(points, program);

  if (rewardValue > 0) {
    return `${points} points ($${rewardValue.toFixed(2)} available)`;
  }

  const pointsToReward =
    program.rewardThreshold - (points % program.rewardThreshold);
  return `${points} points (${pointsToReward} to next reward)`;
}

export interface LoyaltyAnalytics {
  totalMembers: number;
  activeMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  averagePointsPerMember: number;
  engagementRate: number;
}

export function calculateLoyaltyAnalytics(
  cards: LoyaltyCard[],
  transactions: LoyaltyTransaction[],
): LoyaltyAnalytics {
  const activeCards = cards.filter((c) => c.status === "ACTIVE");
  const totalMembers = cards.length;
  const activeMembers = activeCards.length;

  const pointsIssued = transactions
    .filter((tx) => tx.type === "EARNED" && tx.points > 0)
    .reduce((sum, tx) => sum + tx.points, 0);

  const pointsRedeemed = transactions
    .filter((tx) => tx.type === "REDEEMED" && tx.points < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.points), 0);

  const averagePointsPerMember =
    totalMembers > 0 ? Math.round(pointsIssued / totalMembers) : 0;

  // Members who had activity in last 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentlyActive = new Set(
    transactions
      .filter((tx) => new Date(tx.createdAt) > ninetyDaysAgo)
      .map((tx) => tx.customerId),
  ).size;

  const engagementRate =
    activeMembers > 0 ? Math.round((recentlyActive / activeMembers) * 100) : 0;

  return {
    totalMembers,
    activeMembers,
    totalPointsIssued: pointsIssued,
    totalPointsRedeemed: pointsRedeemed,
    averagePointsPerMember,
    engagementRate,
  };
}
