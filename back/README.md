# AI Workflow Builder - Backend API

Express + TypeScript backend for the AI-powered n8n workflow builder.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `back/` directory:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```env
OPENAI_API_KEY=sk-your-actual-openai-key-here
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 📡 API Endpoints

### Health Check
- **GET** `/health` - Check server status

### Chat
- **POST** `/api/chat` - Chat with AI assistant
  ```json
  {
    "message": "Create a Slack notification workflow",
    "conversationHistory": []
  }
  ```

- **POST** `/api/chat/generate-workflow` - Generate workflow from description
  ```json
  {
    "description": "Send Slack message when form is submitted"
  }
  ```

### Workflows
- **GET** `/api/workflows` - List all workflows
- **GET** `/api/workflows/:id` - Get specific workflow
- **POST** `/api/workflows` - Create new workflow
- **PUT** `/api/workflows/:id` - Update workflow
- **DELETE** `/api/workflows/:id` - Delete workflow
- **POST** `/api/workflows/:id/validate` - Validate workflow

## 🏗️ Project Structure

```
back/
├── src/
│   ├── index.ts              # Main server file
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── services/
│   │   ├── ai-service.ts     # OpenAI integration
│   │   ├── n8n-mcp-client.ts # n8n-MCP client wrapper
│   │   └── workflow-generator.ts # Workflow generation logic
│   └── routes/
│       ├── chat.ts           # Chat endpoints
│       └── workflows.ts      # Workflow CRUD endpoints
├── package.json
├── tsconfig.json
└── .env
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

### Testing Endpoints

Use curl or Postman to test:

```bash
# Health check
curl http://localhost:3001/health

# Chat with AI
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, create a Slack workflow"}'

# Generate workflow
curl -X POST http://localhost:3001/api/chat/generate-workflow \
  -H "Content-Type: application/json" \
  -d '{"description": "Send email when form submitted"}'
```

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `PORT` | No | Server port (default: 3001) |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: http://localhost:3000) |
| `N8N_API_URL` | No | n8n instance URL (optional) |
| `N8N_API_KEY` | No | n8n API key (optional) |

## 📦 Dependencies

- **express** - Web framework
- **cors** - CORS middleware
- **openai** - OpenAI API client
- **@modelcontextprotocol/sdk** - MCP protocol support
- **typescript** - Type safety
- **dotenv** - Environment variables

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Railway/Render

1. Push code to GitHub
2. Connect repository to Railway/Render
3. Set environment variables in dashboard
4. Deploy!

## 🐛 Troubleshooting

### "Missing required environment variable: OPENAI_API_KEY"
- Make sure you created `.env` file
- Add your OpenAI API key to `.env`

### Port already in use
- Change `PORT` in `.env` to a different port
- Or kill the process using port 3001

### CORS errors
- Make sure `FRONTEND_URL` in `.env` matches your frontend URL
- Check that frontend is making requests to correct backend URL

## 📝 Notes

- For hackathon: Using in-memory storage for workflows
- In production: Replace with database (PostgreSQL, MongoDB, etc.)
- MCP client currently uses mock data for speed
- In production: Connect to actual n8n-MCP server

## 🎯 Next Steps

1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Add it to `.env` file
3. Run `npm run dev`
4. Test endpoints with curl or Postman
5. Connect frontend to backend!
