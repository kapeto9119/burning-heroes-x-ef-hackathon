# 🔐 Credentials Guide

How to add credentials for each service

## 📝 Quick Reference

| Service | Endpoint | Required Fields |
|---------|----------|----------------|
| Slack | `POST /api/auth/credentials/slack` | `token` |
| Gmail | `POST /api/auth/credentials/gmail` | `clientId`, `clientSecret`, `accessToken`, `refreshToken` |
| Email (SMTP) | `POST /api/auth/credentials/email` | `user`, `password`, `host`, `port` |
| HTTP Auth | `POST /api/auth/credentials/http` | `username`, `password` |
| Postgres | `POST /api/auth/credentials/postgres` | `host`, `database`, `user`, `password`, `port` |
| Google Sheets | `POST /api/auth/credentials/googleSheets` | `clientId`, `clientSecret`, `accessToken`, `refreshToken` |

---

## 1️⃣ Slack

```bash
curl -X POST http://localhost:3001/api/auth/credentials/slack \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "xoxb-your-slack-bot-token"
  }'
```

**Get Slack Token:**
1. Go to https://api.slack.com/apps
2. Create app → "From scratch"
3. Add scopes: `chat:write`, `chat:write.public`
4. Install to workspace
5. Copy "Bot User OAuth Token"

---

## 2️⃣ Gmail (OAuth2)

```bash
curl -X POST http://localhost:3001/api/auth/credentials/gmail \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your-google-client-id",
    "clientSecret": "your-google-client-secret",
    "accessToken": "your-access-token",
    "refreshToken": "your-refresh-token"
  }'
```

**Get Gmail OAuth:**
1. Go to https://console.cloud.google.com
2. Create project → Enable Gmail API
3. Create OAuth 2.0 credentials
4. Use OAuth Playground to get tokens

---

## 3️⃣ Email (SMTP)

```bash
curl -X POST http://localhost:3001/api/auth/credentials/email \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user": "your-email@gmail.com",
    "password": "your-app-password",
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false
  }'
```

**For Gmail SMTP:**
1. Enable 2FA on Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate app password
4. Use that password (not your regular password)

---

## 4️⃣ HTTP Basic Auth

```bash
curl -X POST http://localhost:3001/api/auth/credentials/http \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "api-username",
    "password": "api-password"
  }'
```

---

## 5️⃣ Postgres Database

```bash
curl -X POST http://localhost:3001/api/auth/credentials/postgres \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
    "user": "postgres",
    "password": "password",
    "ssl": false
  }'
```

---

## 6️⃣ Google Sheets (OAuth2)

```bash
curl -X POST http://localhost:3001/api/auth/credentials/googleSheets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your-google-client-id",
    "clientSecret": "your-google-client-secret",
    "accessToken": "your-access-token",
    "refreshToken": "your-refresh-token"
  }'
```

**Same as Gmail OAuth** - uses Google Cloud Console

---

## 🧪 Testing

After adding credentials, generate a workflow:

```bash
./test-interactive.sh

# Examples:
"Send Gmail to test@example.com when webhook triggers"
"Insert data into Postgres when webhook receives data"
"Make HTTP POST with auth to API when webhook triggers"
"Append to Google Sheets when webhook receives data"
```

---

## 📝 Notes

- **Slack**: Easiest to set up, works immediately
- **HTTP**: No OAuth needed, just username/password
- **Email (SMTP)**: Use app passwords for Gmail
- **Gmail/Sheets**: Requires OAuth flow (more complex)
- **Postgres**: Need database access

---

## 🎯 For Hackathon Demo

**Recommended setup:**
1. ✅ Slack (already working)
2. ✅ HTTP (no auth or basic auth)
3. ⚠️ Email (use SMTP with app password)
4. ⚠️ Postgres (if you have a test DB)
5. ❌ Gmail/Sheets (skip OAuth for demo)

**Demo workflow:**
```
"When webhook triggers, send Slack to #alerts and make HTTP POST to API"
```

This works without complex OAuth!
