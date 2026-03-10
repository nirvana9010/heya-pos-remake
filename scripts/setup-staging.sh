#!/bin/bash
set -euo pipefail

# =============================================================================
# Staging Environment Setup Script
#
# Run this once to create the staging infrastructure on Fly.io.
# After this, pushes to the `staging` branch auto-deploy via GitHub Actions.
# =============================================================================

echo "========================================="
echo "  Heya POS — Staging Setup"
echo "========================================="
echo ""

# --- Pre-flight checks ---
if ! command -v flyctl &> /dev/null; then
  echo "ERROR: flyctl not found. Install from https://fly.io/docs/flyctl/install/"
  exit 1
fi

if ! flyctl auth whoami &> /dev/null; then
  echo "ERROR: Not authenticated. Run: flyctl auth login"
  exit 1
fi

STAGING_APP="heya-pos-api-staging"
PROD_APP="heya-pos-api"

# =============================================================================
# STEP 1: Create the staging app
# =============================================================================
echo ""
echo "--- Step 1: Create staging app ---"

if flyctl apps list | grep -q "$STAGING_APP"; then
  echo "App $STAGING_APP already exists, skipping creation."
else
  echo "Creating $STAGING_APP in Sydney..."
  flyctl apps create "$STAGING_APP" --org personal
  echo "Created."
fi

# =============================================================================
# STEP 2: Create staging database (Fly Postgres)
# =============================================================================
echo ""
echo "--- Step 2: Create staging database ---"

STAGING_DB="heya-pos-db-staging"

if flyctl apps list | grep -q "$STAGING_DB"; then
  echo "Database app $STAGING_DB already exists, skipping creation."
else
  echo "Creating Postgres cluster: $STAGING_DB (Sydney, minimal size)..."
  flyctl postgres create \
    --name "$STAGING_DB" \
    --region syd \
    --vm-size shared-cpu-1x \
    --initial-cluster-size 1 \
    --volume-size 1
  echo "Created."
fi

# Attach DB to staging app (sets DATABASE_URL automatically)
echo "Attaching database to staging app..."
flyctl postgres attach "$STAGING_DB" --app "$STAGING_APP" 2>/dev/null || echo "Already attached or attach completed."

# =============================================================================
# STEP 3: Clone production data
# =============================================================================
echo ""
echo "--- Step 3: Clone production data ---"
echo ""
echo "To clone prod data into staging, run these commands manually:"
echo ""
echo "  # 1. Open a proxy to the PROD database (in a separate terminal):"
echo "  flyctl proxy 15432:5432 -a heya-pos-prod"
echo ""
echo "  # 2. Dump prod data:"
echo "  pg_dump 'postgres://postgres:<PROD_PASSWORD>@localhost:15432/postgres' \\"
echo "    --no-owner --no-acl --clean --if-exists > /tmp/prod-dump.sql"
echo ""
echo "  # 3. Open a proxy to the STAGING database (in another terminal):"
echo "  flyctl proxy 15433:5432 -a $STAGING_DB"
echo ""
echo "  # 4. Restore into staging:"
echo "  psql 'postgres://postgres:<STAGING_PASSWORD>@localhost:15433/postgres' \\"
echo "    < /tmp/prod-dump.sql"
echo ""
echo "  # 5. Clean up the dump file:"
echo "  rm /tmp/prod-dump.sql"
echo ""
echo "  TIP: Get the prod DB password from: flyctl ssh console -a heya-pos-prod -C 'printenv DATABASE_URL'"
echo "  TIP: Get the staging DB password from the output of 'flyctl postgres attach' above,"
echo "       or run: flyctl ssh console -a $STAGING_DB -C 'printenv DATABASE_URL'"
echo ""

# =============================================================================
# STEP 4: Set staging secrets
# =============================================================================
echo ""
echo "--- Step 4: Set staging secrets ---"

echo "Setting secrets on $STAGING_APP..."

# Generate new JWT secrets for staging (don't reuse prod!)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

flyctl secrets set \
  JWT_SECRET="$JWT_SECRET" \
  JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
  FRONTEND_URLS="https://heya-pos-staging-merchant-app.vercel.app,https://heya-pos-staging-booking-app.vercel.app,http://localhost:3002" \
  REDIS_ENABLED=false \
  --app "$STAGING_APP"

echo "Secrets set."

# Copy optional secrets from prod (SendGrid, etc.) if you want staging emails
echo ""
echo "Optional: To copy SendGrid/Twilio secrets from prod, run:"
echo "  flyctl secrets set SENDGRID_API_KEY=<value> SENDGRID_FROM_EMAIL=<value> --app $STAGING_APP"
echo ""

# =============================================================================
# STEP 5: Create staging branch
# =============================================================================
echo ""
echo "--- Step 5: Git branch setup ---"
echo ""
echo "Create and push the staging branch:"
echo ""
echo "  git checkout -b staging"
echo "  git push -u origin staging"
echo ""
echo "After that, the GitHub Actions workflow will auto-deploy the API to staging"
echo "on every push to the staging branch."
echo ""

# =============================================================================
# STEP 6: Vercel staging setup
# =============================================================================
echo ""
echo "--- Step 6: Vercel staging (manual) ---"
echo ""
echo "Option A — Use Vercel preview deployments (automatic):"
echo "  Every push to 'staging' generates a preview URL."
echo "  No config needed, but URLs change each deploy."
echo ""
echo "Option B — Create dedicated staging projects on Vercel:"
echo "  1. Go to vercel.com/new → Import your repo"
echo "  2. Set project name: heya-pos-staging-merchant-app"
echo "  3. Root directory: apps/merchant-app"
echo "  4. Set branch: staging"
echo "  5. Add env var: NEXT_PUBLIC_API_URL = https://$STAGING_APP.fly.dev/api"
echo "  6. Repeat for booking-app and admin-dashboard if needed."
echo ""

echo "========================================="
echo "  Setup complete!"
echo ""
echo "  Staging API URL:  https://$STAGING_APP.fly.dev"
echo "  Deploy workflow:  .github/workflows/staging-deploy.yml"
echo "  Fly config:       apps/api/fly.staging.toml"
echo ""
echo "  Workflow:"
echo "    1. Work on feature branches"
echo "    2. Merge to 'staging' → auto-deploys staging API"
echo "    3. Test on staging"
echo "    4. Merge to 'main' → auto-deploys production"
echo "========================================="
