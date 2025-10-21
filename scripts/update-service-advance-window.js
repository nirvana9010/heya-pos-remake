#!/usr/bin/env node

/**
 * Bulk-update maxAdvanceBooking for a merchant's services.
 *
 * Usage (defaults shown):
 *   MERCHANT_EMAIL=info.hamiltonbeauty@gmail.com \
 *   MERCHANT_PASSWORD=hamilton12345 \
 *   MAX_ADVANCE_DAYS=30 \
 *   API_BASE=https://heya-pos-api.fly.dev/api \
 *   node scripts/update-service-advance-window.js
 *
 * Requires Node 18+ (global fetch).
 */

const API_BASE = process.env.API_BASE || 'https://heya-pos-api.fly.dev/api';
const MERCHANT_EMAIL = process.env.MERCHANT_EMAIL || 'info.hamiltonbeauty@gmail.com';
const MERCHANT_PASSWORD = process.env.MERCHANT_PASSWORD || 'hamilton12345';
const TARGET_DAYS = Number(process.env.MAX_ADVANCE_DAYS || '30');

if (!Number.isFinite(TARGET_DAYS) || TARGET_DAYS <= 0) {
  console.error('MAX_ADVANCE_DAYS must be a positive number.');
  process.exit(1);
}

async function login() {
  const response = await fetch(`${API_BASE}/v1/auth/merchant/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: MERCHANT_EMAIL, password: MERCHANT_PASSWORD }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Login failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  if (!json?.token) {
    throw new Error('Login succeeded but token missing');
  }
  return json.token;
}

async function fetchServices(token) {
  const params = new URLSearchParams({ limit: '500' });
  const response = await fetch(`${API_BASE}/v1/services?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fetching services failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  if (Array.isArray(json)) {
    return json;
  }
  if (Array.isArray(json?.data)) {
    return json.data;
  }
  throw new Error('Unexpected services response format');
}

async function updateService(token, serviceId) {
  const response = await fetch(`${API_BASE}/v1/services/${serviceId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ maxAdvanceBooking: TARGET_DAYS }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Updating service ${serviceId} failed (${response.status}): ${body}`);
  }
}

async function main() {
  console.log(`Logging in as ${MERCHANT_EMAIL} against ${API_BASE}`);
  const token = await login();
  console.log('Login successful.');

  const services = await fetchServices(token);
  console.log(`Fetched ${services.length} services.`);

  const targets = services.filter(
    (service) => (service.maxAdvanceBooking ?? null) !== TARGET_DAYS,
  );

  if (targets.length === 0) {
    console.log(`All services already set to ${TARGET_DAYS} days. Nothing to update.`);
    return;
  }

  console.log(`Updating ${targets.length} services to ${TARGET_DAYS} days...`);
  for (const service of targets) {
    await updateService(token, service.id);
    console.log(` - ${service.name} (${service.id}) updated.`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
