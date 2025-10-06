# 📧 Notification Service

Email notification microservice for AI Workflow Builder using Resend.

## Features

- ✅ **Execution Failed** notifications
- ✅ **Workflow Deployed** notifications  
- ✅ **Welcome Email** for new users
- 🔜 **Weekly Summary** digest (coming soon)

## Setup

### 1. Install Dependencies

```bash
cd notifications-service
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your Resend API key:

```bash
cp .env.example .env
```

Required environment variables:
- `RESEND_API_KEY` - Get from https://resend.com/api-keys
- `FROM_EMAIL` - Your verified sender email (e.g., `notifications@yourdomain.com`)
- `FROM_NAME` - Sender name (e.g., `AI Workflow Builder`)

### 3. Verify Domain in Resend

1. Go to https://resend.com/domains
2. Add your domain
3. Add the DNS records to your domain provider
4. Wait for verification

### 4. Run the Service

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## API Endpoints

### POST /send/execution-failed
Send execution failed notification

```json
{
  "to": "user@example.com",
  "data": {
    "workflowName": "My Workflow",
    "workflowId": "wf_123",
    "executionId": "exec_456",
    "errorMessage": "Connection timeout",
    "failedNode": "Send Email",
    "timestamp": "2025-01-06T12:00:00Z",
    "viewUrl": "https://app.example.com/workflows?execution=exec_456"
  }
}
```

### POST /send/workflow-deployed
Send workflow deployed notification

```json
{
  "to": "user@example.com",
  "data": {
    "workflowName": "My Workflow",
    "workflowId": "wf_123",
    "triggerType": "schedule",
    "scheduleInfo": "Every weekday at 9:00 AM",
    "viewUrl": "https://app.example.com/workflows/wf_123",
    "timestamp": "2025-01-06T12:00:00Z"
  }
}
```

### POST /send/welcome
Send welcome email

```json
{
  "to": "user@example.com",
  "data": {
    "userName": "John Doe",
    "userEmail": "user@example.com",
    "dashboardUrl": "https://app.example.com/dashboard"
  }
}
```

### POST /send/test
Send test email

```json
{
  "to": "user@example.com"
}
```

## Integration with Main Backend

The main backend uses `NotificationClient` to send notifications:

```typescript
import { NotificationClient } from './services/notification-client';

const notificationClient = new NotificationClient();

// Send execution failed email
await notificationClient.sendExecutionFailed('user@example.com', {
  workflowName: 'My Workflow',
  workflowId: 'wf_123',
  executionId: 'exec_456',
  errorMessage: 'Connection timeout',
  timestamp: new Date(),
  viewUrl: 'https://app.example.com/workflows'
});
```

## Email Templates

All email templates are in `src/templates/`:
- `execution-failed.ts` - Red-themed error notification
- `workflow-deployed.ts` - Blue-themed success notification
- `welcome.ts` - Purple-themed onboarding email

Templates are fully responsive and work across all email clients.

## Architecture

```
notifications-service/
├── src/
│   ├── index.ts              # Express server
│   ├── services/
│   │   └── email-service.ts  # Resend integration
│   └── templates/
│       ├── execution-failed.ts
│       ├── workflow-deployed.ts
│       └── welcome.ts
├── package.json
├── tsconfig.json
└── .env
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager (PM2, systemd)
3. Set up monitoring (health check endpoint: `/health`)
4. Configure rate limiting if needed

## Troubleshooting

**Emails not sending?**
- Check your Resend API key is valid
- Verify your domain in Resend dashboard
- Check the service logs for errors
- Test with `/send/test` endpoint

**Emails going to spam?**
- Add SPF, DKIM, and DMARC records
- Use a verified domain
- Avoid spam trigger words
- Include unsubscribe link (for marketing emails)

## Future Enhancements

- [ ] Weekly summary digest
- [ ] User notification preferences
- [ ] Email queue with Bull/Redis
- [ ] Email templates with React Email
- [ ] Batch sending for digests
- [ ] Email analytics (open rates, clicks)
