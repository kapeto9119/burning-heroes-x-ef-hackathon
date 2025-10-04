# 🚀 Workflow Examples

Test these prompts with `./test-interactive.sh`

## 📥 Webhook Triggers

### Slack Notifications
```
Send Slack message to #alerts when webhook receives data
```

### Email Notifications
```
Send email to admin@company.com when webhook is triggered
```

### HTTP + Database
```
When webhook receives data, make HTTP POST to API and save to Postgres
```

### Multi-step
```
When webhook triggers, send Slack message to #ops and email to team@company.com
```

---

## ⏰ Schedule Triggers

### Daily Reports
```
Send email report every day at 9am
```

### Hourly Sync
```
Fetch data from API every hour and save to Google Sheets
```

### Database Backup
```
Every day at midnight, backup Postgres data to Airtable
```

---

## 🖱️ Manual Triggers

### On-Demand Reports
```
Manually trigger to send Slack message with current stats
```

### Data Export
```
Manual trigger to export database to Google Sheets
```

---

## 🔗 Multi-Action Workflows

### Webhook → Slack + Email
```
When webhook receives order, send Slack notification to #orders and email to sales@company.com
```

### Schedule → API → Database
```
Every hour, fetch data from API and insert into Postgres database
```

### Webhook → HTTP → Sheets
```
When webhook triggers, make HTTP request and append results to Google Sheets
```

---

## 📊 Service-Specific Examples

### Slack
```
Post message to #team-updates when webhook receives deployment notification
```

### Email
```
Send email to support@company.com with subject "New Ticket" when webhook triggers
```

### Gmail
```
Send Gmail to customer@example.com when webhook receives order confirmation
```

### HTTP Request
```
Make POST request to https://api.example.com/webhook when data is received
```

### Postgres
```
Insert webhook data into users table in Postgres database
```

### Google Sheets
```
Append webhook data to "Orders" sheet in Google Sheets
```

### Airtable
```
Create new record in Airtable "Customers" table when webhook triggers
```

---

## 🎯 Complex Workflows

### E-commerce Order Processing
```
When webhook receives order:
1. Send Slack notification to #orders
2. Send email confirmation to customer
3. Save order to Postgres database
4. Update Google Sheets inventory
```

### Daily Analytics Pipeline
```
Every day at 8am:
1. Fetch data from analytics API
2. Process and save to Postgres
3. Generate report and send via email
4. Post summary to #analytics Slack channel
```

### Customer Support Automation
```
When webhook receives support ticket:
1. Create Airtable record
2. Send Slack alert to #support
3. Send auto-reply email to customer
4. Log to Postgres database
```

---

## 💡 Tips

- **Be specific** about channels: `#alerts`, `#team-updates`
- **Include email addresses**: `admin@company.com`
- **Mention timing** for schedules: `every day at 9am`, `every hour`
- **Describe the flow**: `when X happens, do Y and Z`
- **Use action words**: `send`, `post`, `insert`, `append`, `make request`

---

## 🧪 Quick Tests

**Simplest:**
```
Send Slack message to #test when webhook triggers
```

**With Email:**
```
Send email to test@example.com when webhook receives data
```

**With Schedule:**
```
Send Slack message to #daily-report every day at 9am
```

**Multi-action:**
```
When webhook triggers, send Slack message to #alerts and email to admin@company.com
```
