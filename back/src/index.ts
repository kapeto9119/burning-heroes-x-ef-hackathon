import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { AIService } from './services/ai-service';
import { N8nMCPClient } from './services/n8n-mcp-client';
import { N8nApiClient } from './services/n8n-api-client';
import { AuthService } from './services/auth-service';
import { WorkflowGenerator } from './services/workflow-generator';
import { createChatRouter } from './routes/chat';
import { createWorkflowsRouter } from './routes/workflows';
import { createAuthRouter } from './routes/auth';
import { createDeployRouter } from './routes/deploy';
import { createVoiceRouter } from './routes/voice';
import { VapiService } from './services/vapi-service';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error('Please create a .env file based on .env.example');
    process.exit(1);
  }
}

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize services
console.log('🚀 Initializing services...');

const aiService = new AIService(process.env.OPENAI_API_KEY!);
const authService = new AuthService(process.env.JWT_SECRET!);
const mcpClient = new N8nMCPClient();
const workflowGenerator = new WorkflowGenerator(mcpClient, aiService);
const vapiService = new VapiService(workflowGenerator);

// Initialize n8n API client if configured
let n8nApiClient: N8nApiClient | null = null;
if (process.env.N8N_API_URL && process.env.N8N_API_KEY) {
  n8nApiClient = new N8nApiClient(
    process.env.N8N_API_URL,
    process.env.N8N_API_KEY,
    process.env.N8N_WEBHOOK_URL
  );
  console.log('✅ n8n API client initialized');
  
  // Test connection
  n8nApiClient.testConnection().then(connected => {
    if (connected) {
      console.log('✅ n8n connection verified');
    } else {
      console.warn('⚠️  n8n connection failed - deployment features will be disabled');
    }
  });
} else {
  console.warn('⚠️  n8n API not configured - deployment features will be disabled');
}

console.log('✅ Services initialized');

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI Workflow Builder API',
    version: '2.0.0',
    status: 'running',
    features: {
      auth: true,
      deployment: n8nApiClient !== null,
      aiChat: true
    },
    endpoints: {
      auth: '/api/auth',
      chat: '/api/chat',
      workflows: '/api/workflows',
      deploy: '/api/deploy',
      voice: '/api/voice',
      health: '/health'
    }
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    n8nConnected: n8nApiClient !== null
  });
});

// API Routes
app.use('/api/auth', createAuthRouter(authService));
app.use('/api/chat', createChatRouter(aiService, mcpClient, workflowGenerator));
app.use('/api/workflows', createWorkflowsRouter(mcpClient));
app.use('/api/voice', createVoiceRouter(vapiService));

// Deploy routes (only if n8n is configured)
if (n8nApiClient) {
  app.use('/api/deploy', createDeployRouter(n8nApiClient, authService));
} else {
  app.use('/api/deploy', (req: Request, res: Response) => {
    res.status(503).json({
      success: false,
      error: 'Deployment features are not available. Please configure n8n API credentials.'
    });
  });
}

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🔥 ================================================');
  console.log('🔥  AI Workflow Builder Backend');
  console.log('🔥 ================================================');
  console.log('');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('');
  console.log('📡 Available endpoints:');
  console.log(`   - GET  http://localhost:${PORT}/`);
  console.log(`   - GET  http://localhost:${PORT}/health`);
  console.log('');
  console.log('🔐 Auth:');
  console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   - GET  http://localhost:${PORT}/api/auth/me`);
  console.log('');
  console.log('💬 Chat:');
  console.log(`   - POST http://localhost:${PORT}/api/chat`);
  console.log(`   - POST http://localhost:${PORT}/api/chat/generate-workflow`);
  console.log('');
  console.log('🎙️  Voice AI:');
  console.log(`   - POST http://localhost:${PORT}/api/voice/functions`);
  console.log(`   - GET  http://localhost:${PORT}/api/voice/assistant-config`);
  console.log('');
  console.log('📋 Workflows:');
  console.log(`   - GET  http://localhost:${PORT}/api/workflows`);
  console.log(`   - POST http://localhost:${PORT}/api/workflows`);
  console.log('');
  if (n8nApiClient) {
    console.log('🚀 Deployment (n8n):');
    console.log(`   - POST http://localhost:${PORT}/api/deploy`);
    console.log(`   - POST http://localhost:${PORT}/api/deploy/:id/execute`);
    console.log(`   - GET  http://localhost:${PORT}/api/deploy/:id/executions`);
  }
  console.log('');
  console.log('🎯 Ready for hackathon! 🚀');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
