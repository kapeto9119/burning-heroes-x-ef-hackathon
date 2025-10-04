# 🧪 Testing the Integration

## ✅ Setup Complete!

Your frontend is now connected to the backend with server actions.

---

## 🚀 Start Both Servers:

### Terminal 1 - Backend:
```bash
cd ../back
npm run dev
```

### Terminal 2 - Frontend:
```bash
npm run dev
```

---

## 🧪 Test Flow:

### 1. **Register a User** (First time only)
You'll need to register through the backend first:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

### 2. **Add Slack Credentials**
```bash
# Get the token from the register response, then:
curl -X POST http://localhost:3001/api/auth/credentials/slack \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "xoxb-your-slack-token"
  }'
```

### 3. **Test the Frontend**
1. Open http://localhost:3000
2. Type: "Send Slack message to #all-fluida when webhook triggers"
3. Click Send
4. Watch it generate the workflow!
5. Click "Deploy to n8n" button
6. See it deploy and activate!

---

## 🎯 What Should Happen:

1. **Home Page** → Type your workflow request
2. **Editor Page** → AI generates workflow automatically
3. **Workflow appears** → Shows nodes in right panel
4. **Click Deploy** → Deploys to n8n
5. **Success!** → Shows webhook URL and n8n ID

---

## 🐛 Troubleshooting:

**"Not authenticated" error:**
- Frontend uses cookies for auth
- For now, you need to login through backend first
- We'll add a login page next!

**"Failed to generate workflow":**
- Check backend is running on port 3001
- Check `.env.local` has correct API_URL
- Check backend logs for errors

**"Deployment failed":**
- Make sure n8n is running
- Check backend has N8N_API_KEY in .env
- Check Slack credentials are added

---

## 🎨 Next Steps:

1. Add login/register UI
2. Add credentials management page
3. Add workflow list page
4. Add execution history

---

**Your app is now functional! Test it out!** 🎉
