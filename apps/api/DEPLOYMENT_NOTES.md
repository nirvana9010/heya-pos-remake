# API Deployment Notes

## Notification System Deployment

The notification system includes scheduled jobs for sending appointment reminders. However, some deployment environments may have issues with the `@nestjs/schedule` module due to missing crypto support.

### Deployment Options:

1. **Full Featured (Recommended for VPS/Docker)**
   - The system will automatically use `@nestjs/schedule` if available
   - Provides cron-based scheduling for reminder notifications
   - Works on standard Node.js environments with crypto module

2. **Simple Scheduler Fallback**
   - Automatically activates if `@nestjs/schedule` fails to load
   - Uses native `setInterval` for scheduling
   - No external dependencies required

3. **Disable Scheduled Jobs (Serverless/Lambda)**
   - Set environment variable: `DISABLE_SCHEDULED_JOBS=true`
   - Disables all scheduled notification features
   - Booking confirmations will still be sent immediately
   - Suitable for serverless environments where long-running processes aren't supported

### Environment Variables:

```bash
# Disable scheduled notifications (for serverless deployments)
DISABLE_SCHEDULED_JOBS=true

# Email configuration (required for email notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# SMS configuration (optional - uses mock provider by default)
SMS_PROVIDER=twilio  # or 'messagebird', 'mock'
SMS_API_KEY=your-sms-api-key
```

### Troubleshooting:

If you see the error: `ReferenceError: crypto is not defined`
1. The system will automatically fallback to SimpleSchedulerService
2. Or set `DISABLE_SCHEDULED_JOBS=true` to disable scheduled jobs entirely
3. Consider using a different Node.js base image if using Docker

### Docker Deployment:

The included `Dockerfile.api` uses `node:18-alpine` which includes crypto support. If deploying to a platform with issues:

1. Try using the full Node.js image instead of Alpine:
   ```dockerfile
   FROM node:18 AS builder
   # ... rest of Dockerfile
   FROM node:18
   ```

2. Or disable scheduled jobs for serverless/edge deployments:
   ```bash
   docker run -e DISABLE_SCHEDULED_JOBS=true your-api-image
   ```