# 🔥 Burning Heroes x EF Hackathon - AI Workflow Builder

An AI-powered workflow automation platform that lets you create n8n workflows through natural language conversations. Built with Next.js, Express, OpenAI, and n8n.

![Project Banner](./logo.jpg)

## 🎯 What is This?

This is an intelligent workflow builder that combines the power of AI with n8n's automation capabilities. Simply describe what you want to automate in plain English, and the AI will generate, visualize, and deploy a working n8n workflow for you.

**Key Features:**
- 💬 Natural language workflow creation via AI chat
- 🎨 Beautiful React Flow visualization of workflows
- 🚀 One-click deployment to n8n
- 🔐 Secure credentials management
- 📊 Workflow dashboard with execution history
- 🎭 Support for multiple integrations (Slack, Email, HTTP, Postgres, Google Sheets)

## 🏗️ Architecture

```
├── front/          # Next.js 15 frontend with React Flow
├── back/           # Express.js backend with OpenAI integration
└── n8n/            # n8n instance (external)
```

**Tech Stack:**
- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS, React Flow, Framer Motion
- **Backend**: Express.js, OpenAI GPT-4o-mini, TypeScript
- **Automation**: n8n (self-hosted or cloud)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- n8n instance (local or cloud)
- OpenAI API key

### 1. Clone the Repository

```bash
git clone <repository-url>
cd burning-heroes-x-ef-hackathon
```

### 2. Setup Backend

```bash
cd back
npm install

# Create .env file
cp .env.example .env
```

Edit `back/.env` with your credentials:

```env
OPENAI_API_KEY=sk-...                    # Required: Your OpenAI API key
N8N_API_URL=http://localhost:5678        # Required: Your n8n instance URL
N8N_API_KEY=your_n8n_api_key             # Required: n8n API key
PORT=3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_secret_key
```

**Getting n8n API Key:**
1. Open n8n → Settings → API
2. Create new API key
3. Copy and paste into `.env`

Start the backend:

```bash
npm run dev
```

Backend will run on `http://localhost:3001`

### 3. Setup Frontend

```bash
cd ../front
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

### 4. Setup n8n (if not already running)

**Option A: Docker (Recommended)**
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Option B: npm**
```bash
npm install -g n8n
n8n start
```

n8n will run on `http://localhost:5678`

## 📖 Usage

### Creating Your First Workflow

1. **Open the app**: Navigate to `http://localhost:3000`

2. **Start chatting**: Type a workflow description, for example:
   ```
   Send a Slack message to #alerts when a webhook triggers
   ```

3. **Watch the magic**: The AI will:
   - Understand your intent
   - Generate a workflow structure
   - Visualize it with animated nodes
   - Provide a "Deploy to n8n" button

4. **Deploy**: Click "Deploy to n8n" to activate your workflow

5. **Manage**: Visit `/workflows` to see all your workflows and execution history

### Example Workflow Prompts

```
"Send an email notification when a webhook receives data"

"When webhook triggers, insert data into Postgres and send Slack message"

"Create a scheduled workflow that runs every hour and makes an HTTP request"

"Append data to Google Sheets when webhook receives a POST request"
```

## 🎨 Pages & Features

### `/` - Landing Page
- Hero section with quick start
- Feature highlights
- Direct workflow creation input

### `/editor` - Workflow Builder
- AI chat interface
- Real-time workflow visualization
- Node details panel
- Deploy functionality

### `/workflows` - Dashboard
- List of all deployed workflows
- Execution history viewer
- Status indicators
- Quick actions (open in n8n, view details)

### `/settings` - Credentials Management
- Visual service cards
- Connection modals for each service
- Secure credential storage
- Connection status indicators

## 🔐 Adding Credentials

Before using certain integrations, add credentials via the Settings page (`/settings`):

### Slack
1. Go to https://api.slack.com/apps
2. Create app → Add scopes: `chat:write`, `chat:write.public`
3. Install to workspace
4. Copy Bot User OAuth Token
5. Add in Settings page

### Email (SMTP)
1. For Gmail: Enable 2FA
2. Generate app password at https://myaccount.google.com/apppasswords
3. Add credentials in Settings page

### PostgreSQL
1. Have database credentials ready
2. Add host, port, database name, user, password

See [CREDENTIALS_GUIDE.md](./back/CREDENTIALS_GUIDE.md) for detailed instructions.

## 🛠️ Development

### Backend Development

```bash
cd back
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm start            # Run production build
```

### Frontend Development

```bash
cd front
npm run dev          # Start with Turbopack
npm run build        # Build for production
npm start            # Run production server
npm run lint         # Run ESLint
```

## 📁 Project Structure

```
back/
├── src/
│   ├── index.ts              # Express server entry
│   ├── routes/               # API routes
│   ├── services/             # Business logic (OpenAI, n8n)
│   └── middleware/           # Auth & validation
├── .env.example              # Environment template
└── package.json

front/
├── src/
│   ├── app/                  # Next.js pages
│   │   ├── page.tsx          # Landing page
│   │   ├── editor/           # Workflow builder
│   │   ├── workflows/        # Dashboard
│   │   └── settings/         # Credentials
│   ├── components/           # React components
│   │   ├── chat/             # Chat interface
│   │   ├── workflow/         # React Flow canvas
│   │   └── ui/               # UI primitives
│   ├── hooks/                # Custom React hooks
│   └── contexts/             # React contexts
└── package.json
```

## 🎯 Key Features Explained

### AI-Powered Intent Detection
The backend uses OpenAI to analyze your natural language input and extract:
- Trigger type (webhook, schedule, manual)
- Actions to perform (Slack, Email, HTTP, etc.)
- Required parameters and configurations

### Workflow Visualization
React Flow renders your workflow as an interactive graph with:
- Animated node transitions
- Custom styled nodes with icons
- Connection arrows
- Click-to-view details

### One-Click Deployment
The platform automatically:
- Converts AI-generated workflow to n8n format
- Attaches required credentials
- Deploys via n8n API
- Activates the workflow
- Returns webhook URL (if applicable)

### Execution Tracking
Monitor your workflows with:
- Real-time execution status
- Success/error indicators
- Execution history
- Direct links to n8n UI

## 🚨 Troubleshooting

### Backend won't start
- Check `.env` file exists and has required variables
- Verify OpenAI API key is valid
- Ensure port 3001 is available

### Frontend won't start
- Run `npm install` in front directory
- Check port 3000 is available
- Clear `.next` cache: `rm -rf .next`

### n8n connection fails
- Verify n8n is running on specified port
- Check n8n API key is correct
- Ensure n8n API is enabled in settings

### Workflow deployment fails
- Check n8n API credentials
- Verify required service credentials are added
- Check backend logs for detailed errors

## 📚 Additional Documentation

- [Quick Start Guide](./QUICK_START.md) - Detailed setup instructions
- [Complete Features](./COMPLETE_FEATURES.md) - Full feature list
- [Demo Script](./DEMO_SCRIPT.md) - Presentation guide
- [Credentials Guide](./back/CREDENTIALS_GUIDE.md) - Service setup instructions

## 🎥 Demo

Check out [video.mp4](./video.mp4) for a quick demo of the platform in action!

## 🏆 Hackathon Project

Built for the Burning Heroes x EF Hackathon. This project demonstrates:
- ✅ Full-stack TypeScript development
- ✅ AI integration with OpenAI
- ✅ Modern React patterns and hooks
- ✅ API integration with n8n
- ✅ Beautiful, responsive UI/UX
- ✅ Production-ready architecture

## 📝 License

This project is licensed under the ISC License.

## 🤝 Contributing

This is a hackathon project, but contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 👥 Team

Built with ❤️ for the Burning Heroes x EF Hackathon.

---

**Ready to automate?** Start the servers and visit `http://localhost:3000` to begin! 🚀
