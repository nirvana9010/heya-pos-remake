# Secure Credentials Setup Guide

## ⚠️ IMPORTANT: Never Share API Keys

API keys are like passwords - they give full access to your services and can result in:
- Unauthorized charges on your account
- Spam sent from your domain
- Account suspension
- Data breaches

## Setting Up Credentials Securely

### Local Development

1. Create a `.env.development` file in `apps/api/`:
   ```bash
   cd apps/api
   touch .env.development
   ```

2. Add your credentials to this file:
   ```env
   # SendGrid
   SENDGRID_API_KEY=SG.your-new-key-here
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com

   # Twilio
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your-new-auth-token-here
   TWILIO_PHONE_NUMBER=+1234567890
   ```

3. This file is already in `.gitignore` so it won't be committed

### Production (Railway)

1. Go to your Railway project dashboard
2. Click on your API service
3. Navigate to "Variables" tab
4. Add each variable:
   - Click "New Variable"
   - Add the key name (e.g., `SENDGRID_API_KEY`)
   - Add the value
   - Railway encrypts these at rest

### Vercel (Merchant App)

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add any client-side variables (none needed for SendGrid/Twilio)

## Testing Your Setup

1. Check if credentials are loaded:
   ```bash
   cd apps/api
   npm run start:dev
   ```
   Look for logs like:
   - "SendGrid email service initialized"
   - "Twilio SMS service initialized"

2. Test from the UI:
   - Go to `/test-notifications`
   - Click "Test Email & SMS"
   - Check logs for success/failure

## Security Best Practices

1. **Rotate Keys Regularly**: Change API keys every 90 days
2. **Use Restricted Keys**: Create keys with minimal permissions
3. **Monitor Usage**: Check SendGrid/Twilio dashboards for unusual activity
4. **Use Environment Variables**: Never hardcode credentials
5. **Git Security**: Always check `git status` before committing

## If Keys Are Exposed

1. **Immediately revoke** the exposed keys
2. **Generate new keys**
3. **Check service logs** for unauthorized usage
4. **Update all environments** with new keys
5. **Consider enabling 2FA** on your accounts

## SendGrid Specific Setup

1. **Domain Authentication**:
   - Go to Settings → Sender Authentication
   - Add your domain
   - Add DNS records as instructed
   - This improves deliverability

2. **IP Whitelisting** (optional):
   - Settings → IP Access Management
   - Add your server IPs

## Twilio Specific Setup

1. **Verify Phone Numbers** (for testing):
   - Phone Numbers → Manage → Verified Caller IDs
   - Add numbers you'll test with

2. **Set Geographic Permissions**:
   - Settings → Geo Permissions
   - Only enable countries you'll send to

3. **Configure Webhooks** (optional):
   - For delivery status updates
   - Add `TWILIO_STATUS_CALLBACK_URL` to environment

Remember: Treat API keys like passwords. Never share them in:
- Chat messages
- Code commits  
- Public forums
- Unencrypted files
- Client-side code