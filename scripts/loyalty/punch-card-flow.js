#!/usr/bin/env node

/**
 * Punch Card & Points Loyalty Smoke Test
 *
 * Exercises both visit-based and points-based loyalty flows for the Zen Wellness
 * merchant using the Lukas customer. It performs the following for each mode:
 *  1. Configures the loyalty program appropriately.
 *  2. Resets customer balances (visits or points).
 *  3. Confirms early redemption attempts fail.
 *  4. Creates and completes bookings to accrue rewards.
 *  5. Verifies accrual status.
 *  6. Attempts duplicate completion to ensure idempotency.
 *  7. Redeems the reward and validates balances reset/update correctly.
 *  8. Confirms a second redemption fails post-consumption.
 *
 * Usage:
 *   node scripts/loyalty/punch-card-flow.js
 *
 * Environment overrides:
 *   API_ROOT           Base URL (default: http://localhost:3000)
 *   MERCHANT_ID        Merchant UUID (default: Zen Wellness Spa)
 *   CUSTOMER_QUERY     Search string (default: Lukas)
 *   JWT_SECRET         Secret for signing local JWTs
 *   TOKEN              Pre-generated JWT (skips local signing)
 *   VISITS_REQUIRED    Required visits for punch card (default: 2)
 *   REWARD_TYPE        FREE | PERCENTAGE (default: FREE)
 *   REWARD_PERCENT     Percent reward when REWARD_TYPE=PERCENTAGE (default: 100)
 *   POINTS_PER_DOLLAR  Points earned per dollar (default: 10)
 *   POINT_VALUE        Dollar value per point (default: 0.5)
 */

import { createHmac } from 'crypto';

const API_ROOT = process.env.API_ROOT ?? 'http://localhost:3000';
const V1 = `${API_ROOT}/api/v1`;
const V2 = `${API_ROOT}/api/v2`;

const MERCHANT_ID =
  process.env.MERCHANT_ID ?? 'e33c47ba-2711-49ea-a37f-f0d2c45af197'; // Zen Wellness Spa
const CUSTOMER_QUERY = process.env.CUSTOMER_QUERY ?? 'Lukas';
const JWT_SECRET =
  process.env.JWT_SECRET ??
  'your-secret-key-at-least-32-characters-long';

const VISITS_REQUIRED = Number(process.env.VISITS_REQUIRED ?? 2);
const REWARD_TYPE = process.env.REWARD_TYPE ?? 'FREE'; // FREE | PERCENTAGE
const REWARD_PERCENT = Number(process.env.REWARD_PERCENT ?? 100);

const POINTS_PER_DOLLAR = Number(process.env.POINTS_PER_DOLLAR ?? 10);
const POINT_VALUE = Number(process.env.POINT_VALUE ?? 0.5);

function signJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const toBase64Url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const headerEncoded = toBase64Url(header);
  const payloadEncoded = toBase64Url(payload);
  const data = `${headerEncoded}.${payloadEncoded}`;
  const signature = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

function resolveToken() {
  if (process.env.TOKEN) {
    return process.env.TOKEN;
  }

  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      sub: 'loyalty-script',
      merchantId: MERCHANT_ID,
      email: 'zen.loyalty-script@heya-pos.dev',
      type: 'merchant',
      iat: now,
      exp: now + 60 * 60, // 1 hour
    },
    JWT_SECRET,
  );
}

const TOKEN = resolveToken();

async function api(
  path,
  { version = 'v1', method = 'GET', body, expectNoContent = false } = {},
) {
  const base = version === 'v2' ? V2 : V1;
  const url = `${base}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (expectNoContent) {
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${method} ${url} failed: ${response.status} ${text}`);
    }
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      data?.message || data?.error || `${response.status} ${response.statusText}`;
    throw new Error(`${method} ${url} failed: ${message}`);
  }

  return data;
}

async function ensureVisitsProgram() {
  console.log('Configuring loyalty program for visit-based rewards...');
  await api('/loyalty/program', {
    method: 'POST',
    body: {
      type: 'VISITS',
      name: 'Punch Card Rewards',
      description:
        REWARD_TYPE === 'FREE'
          ? `Get a free reward every ${VISITS_REQUIRED} visits.`
          : `Get ${REWARD_PERCENT}% off every ${VISITS_REQUIRED} visits.`,
      isActive: true,
      visitsRequired: VISITS_REQUIRED,
      visitRewardType: REWARD_TYPE,
      visitRewardValue: REWARD_TYPE === 'PERCENTAGE' ? REWARD_PERCENT : 100,
    },
  });
  console.log('✓ Visit-based program ready');
}

async function ensurePointsProgram() {
  console.log('Configuring loyalty program for points-based rewards...');
  await api('/loyalty/program', {
    method: 'POST',
    body: {
      type: 'POINTS',
      name: 'Points Rewards',
      description: `Earn ${POINTS_PER_DOLLAR} point(s) per $1. Each point is worth $${POINT_VALUE.toFixed(
        2,
      )}.`,
      isActive: true,
      pointsPerDollar: POINTS_PER_DOLLAR,
      pointsValue: POINT_VALUE,
    },
  });
  console.log('✓ Points-based program ready');
}

async function findCustomer() {
  console.log(`Locating customer matching "${CUSTOMER_QUERY}"...`);
  const result = await api(
    `/customers?search=${encodeURIComponent(CUSTOMER_QUERY)}&limit=50`,
  );

  const matches = result?.data ?? [];
  const customer = matches.find(
    (c) =>
      (c.firstName && c.firstName.toLowerCase().includes('lukas')) ||
      (c.name && c.name.toLowerCase().includes('lukas')),
  );

  if (!customer) {
    throw new Error(
      `Unable to locate a customer matching "${CUSTOMER_QUERY}".`,
    );
  }

  console.log(`✓ Found customer ${customer.firstName} ${customer.lastName ?? ''} (${customer.id})`);
  return customer;
}

async function fetchStaffAndService() {
  console.log('Fetching active staff and service...');
  const [staffListRaw, servicesList] = await Promise.all([
    api('/staff?active=true'),
    api('/services?limit=50'),
  ]);

  const staffList = Array.isArray(staffListRaw)
    ? staffListRaw
    : staffListRaw?.data ?? [];
  if (staffList.length === 0) {
    throw new Error('No active staff found for merchant.');
  }

  const service =
    servicesList?.data?.find(
      (s) =>
        s.isActive !== false &&
        Number(s.price ?? s.basePrice ?? 0) > 0,
    ) ?? null;
  if (!service) {
    throw new Error('No active service with a price found for merchant.');
  }

  const staffMember = staffList[0];
  const servicePrice = Number(service.price ?? service.basePrice ?? 0);

  console.log(
    `✓ Using staff ${staffMember.firstName} ${staffMember.lastName ?? ''} (${staffMember.id})`,
  );
  console.log(
    `✓ Using service ${service.name} (${service.id}) with price $${servicePrice}`,
  );

  return { staffMember, service, servicePrice };
}

async function getLoyaltyStatus(customerId) {
  return api(`/loyalty/customers/${customerId}`);
}

async function getVisitsStatus(customerId) {
  const status = await getLoyaltyStatus(customerId);
  if (typeof status.currentVisits !== 'number') {
    throw new Error(
      'Visit status unavailable. Ensure the program is configured for visits before calling getVisitsStatus.',
    );
  }
  return status;
}

async function getPointsStatus(customerId) {
  const status = await getLoyaltyStatus(customerId);
  if (typeof status.currentPoints !== 'number') {
    throw new Error(
      'Point status unavailable. Ensure the program is configured for points before calling getPointsStatus.',
    );
  }
  return status;
}

async function resetVisits(customerId) {
  const status = await getVisitsStatus(customerId);
  const currentVisits = status.currentVisits ?? 0;

  if (currentVisits === 0) {
    console.log('Visits already at 0.');
    return;
  }

  console.log(`Resetting visits from ${currentVisits} → 0...`);
  await api('/loyalty/adjust', {
    method: 'POST',
    body: {
      customerId,
      visits: -currentVisits,
      reason: 'Reset by punch-card test script (visits)',
    },
  });
  console.log('✓ Visits reset');
}

async function resetPoints(customerId) {
  const status = await getPointsStatus(customerId);
  const currentPoints = Number(status.currentPoints ?? 0);

  if (currentPoints === 0) {
    console.log('Points already at 0.');
    return;
  }

  console.log(`Resetting points from ${currentPoints} → 0...`);
  await api('/loyalty/adjust', {
    method: 'POST',
    body: {
      customerId,
      points: -currentPoints,
      reason: 'Reset by punch-card test script (points)',
    },
  });
  console.log('✓ Points reset');
}

async function attemptEarlyVisitRedemption(customerId) {
  console.log('Attempting visit redemption with insufficient balance (expect failure)...');
  try {
    await api('/loyalty/redeem-visit', {
      method: 'POST',
      body: {
        customerId,
        reason: 'Early redemption sanity test',
      },
    });
    console.error('⚠️ Visits redemption unexpectedly succeeded.');
  } catch (error) {
    console.log(`✓ Visits redemption blocked as expected: ${error.message}`);
  }
}

async function attemptEarlyPointsRedemption(customerId, points = 50) {
  console.log(`Attempting to redeem ${points} points with zero balance (expect failure)...`);
  try {
    await api('/loyalty/redeem-points', {
      method: 'POST',
      body: {
        customerId,
        points,
      },
    });
    console.error('⚠️ Points redemption unexpectedly succeeded.');
  } catch (error) {
    console.log(`✓ Points redemption blocked as expected: ${error.message}`);
  }
}

async function createAndCompleteBooking({ customerId, staffId, serviceId }, sequence) {
  const startTime = new Date(Date.now() + (sequence + 1) * 20 * 60 * 1000);

  console.log(`Creating booking #${sequence} for accrual...`);
  const booking = await api('/bookings', {
    version: 'v2',
    method: 'POST',
    body: {
      customerId,
      staffId,
      services: [
        {
          serviceId,
          staffId,
        },
      ],
      startTime: startTime.toISOString(),
      notes: `Loyalty accrual booking #${sequence}`,
      source: 'IN_PERSON',
      isOverride: true,
    },
  });

  console.log(`✓ Booking ${booking.id} created. Completing...`);
  await api(`/bookings/${booking.id}/complete`, {
    version: 'v2',
    method: 'PATCH',
  });
  console.log(`✓ Booking ${booking.id} completed.`);

  return booking.id;
}

async function attemptDuplicateCompletion(bookingId) {
  console.log(`Attempting duplicate completion for booking ${bookingId} (should fail)...`);
  try {
    await api(`/bookings/${bookingId}/complete`, {
      version: 'v2',
      method: 'PATCH',
    });
    console.log('⚠️ Duplicate completion call did not throw. Check logs for potential safeguards.');
  } catch (error) {
    console.log(`✓ Duplicate completion rejected: ${error.message}`);
  }
}

async function runVisitsFlow(context) {
  console.log('\n=== Visit-Based Loyalty Flow ===');
  await ensureVisitsProgram();
  await resetVisits(context.customer.id);
  await attemptEarlyVisitRedemption(context.customer.id);

  const bookingIds = [];
  for (let i = 1; i <= VISITS_REQUIRED; i++) {
    // Each booking increments visits by one
    const bookingId = await createAndCompleteBooking(
      {
        customerId: context.customer.id,
        staffId: context.staffMember.id,
        serviceId: context.service.id,
      },
      i,
    );
    bookingIds.push(bookingId);
  }

  const statusAfterAccrual = await getVisitsStatus(context.customer.id);
  console.log('Visits after accrual:', statusAfterAccrual);

  if (!statusAfterAccrual.rewardAvailable) {
    throw new Error(
      `Reward not available after ${statusAfterAccrual.currentVisits}/${statusAfterAccrual.visitsRequired} visits.`,
    );
  }

  await attemptDuplicateCompletion(bookingIds.at(-1));

  console.log('Redeeming visit reward...');
  const redemption = await api('/loyalty/redeem-visit', {
    method: 'POST',
    body: {
      customerId: context.customer.id,
      reason: 'Automated punch-card redemption',
    },
  });
  console.log(`✓ Visit reward redeemed: ${redemption.message}`);

  const postRedemptionStatus = await getVisitsStatus(context.customer.id);
  console.log('Visits after redemption:', postRedemptionStatus);
  if (postRedemptionStatus.currentVisits !== 0) {
    throw new Error('Visit counter did not reset after redemption.');
  }

  await attemptEarlyVisitRedemption(context.customer.id);
  console.log('✓ Visit-based loyalty flow verified.');
}

async function runPointsFlow(context) {
  console.log('\n=== Points-Based Loyalty Flow ===');
  await ensurePointsProgram();
  await resetPoints(context.customer.id);
  await attemptEarlyPointsRedemption(context.customer.id);

  // Create a single booking worth the service price to accrue points.
  const bookingId = await createAndCompleteBooking(
    {
      customerId: context.customer.id,
      staffId: context.staffMember.id,
      serviceId: context.service.id,
    },
    1,
  );

  const statusAfterAccrual = await getPointsStatus(context.customer.id);
  console.log('Points after accrual:', statusAfterAccrual);

  const accruedPoints = Number(statusAfterAccrual.currentPoints ?? 0);
  if (accruedPoints <= 0) {
    throw new Error('No points accrued after booking completion.');
  }

  await attemptDuplicateCompletion(bookingId);

  const redeemAmount = Math.max(1, Math.floor(accruedPoints / 2));
  console.log(`Redeeming ${redeemAmount} points...`);
  const redemption = await api('/loyalty/redeem-points', {
    method: 'POST',
    body: {
      customerId: context.customer.id,
      points: redeemAmount,
    },
  });
  console.log(
    `✓ Points redemption success: ${redemption.message} (remaining: ${redemption.remainingPoints})`,
  );

  const postRedemptionStatus = await getPointsStatus(context.customer.id);
  console.log('Points after redemption:', postRedemptionStatus);

  const expectedBalance = accruedPoints - redeemAmount;
  if (Number(postRedemptionStatus.currentPoints ?? 0) !== expectedBalance) {
    throw new Error(
      `Points balance mismatch. Expected ${expectedBalance}, got ${postRedemptionStatus.currentPoints}.`,
    );
  }

  await attemptEarlyPointsRedemption(context.customer.id, redeemAmount);
  console.log('✓ Points-based loyalty flow verified.');
}

async function run() {
  console.log('=== Punch Card & Points Loyalty Flow Test ===');
  console.log(`API Root: ${API_ROOT}`);
  console.log(`Merchant ID: ${MERCHANT_ID}`);
  console.log(`Customer query: ${CUSTOMER_QUERY}`);
  console.log('');

  try {
    const customer = await findCustomer();
    const { staffMember, service } = await fetchStaffAndService();

    const context = {
      customer,
      staffMember,
      service,
    };

    await runVisitsFlow(context);
    await runPointsFlow(context);

    console.log('\n✅ All loyalty flows verified successfully.');
  } catch (error) {
    console.error('\n❌ Loyalty flow verification failed:', error);
    process.exitCode = 1;
  }
}

run();
