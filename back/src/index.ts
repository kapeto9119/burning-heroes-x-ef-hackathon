// Load environment variables FIRST (before any other imports)
import dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { AIService } from "./services/ai-service";
import { N8nMCPClient } from "./services/n8n-mcp-client";
import { PlatformKnowledgeService } from "./services/platform-knowledge-service";
import { N8nApiClient } from "./services/n8n-api-client";
import { AuthService } from "./services/auth-service";
import { WorkflowGenerator } from "./services/workflow-generator";
import { OAuthService } from "./services/oauth-service";
import { CredentialValidator } from "./services/credential-validator";
import { CredentialRepository } from "./repositories/credential-repository";
import { TokenRefreshService } from "./services/token-refresh-service";
import { WebSocketService } from "./services/websocket-service";
import { ExecutionMonitor } from "./services/execution-monitor";
import { createChatRouter } from "./routes/chat";
import { createWorkflowsRouter } from "./routes/workflows";
import { createAuthRouter } from "./routes/auth";
import { createDeployRouter } from "./routes/deploy";
import { createVoiceRouter } from "./routes/voice";
import { createPipecatRouter } from "./routes/pipecat";
import { createOAuthRouter } from "./routes/oauth";
import { createCredentialsRouter } from "./routes/credentials";
import { createN8nWebhookRouter } from "./routes/n8n-webhooks";
import { VapiService } from "./services/vapi-service";
import billingRouter from "./routes/billing";
import { createManagedAIRouter } from "./routes/managed-ai";
import { pool } from "./db";
import { createPlatformRouter } from "./routes/platform";
import { createTestDataRouter } from "./routes/test-data";
import nodesRouter from "./routes/nodes";

// Validate required environment variables
const requiredEnvVars = ["OPENAI_API_KEY", "JWT_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.error("Please create a .env file based on .env.example");
    process.exit(1);
  }
}

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  "http://localhost:3000",
  "https://front-production-0516.up.railway.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.some((allowed) => origin.startsWith(allowed as string))
      ) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize services
console.log("🚀 Initializing services...");

const mcpClient = new N8nMCPClient();
const platformKnowledge = new PlatformKnowledgeService(mcpClient);
platformKnowledge.startAutoRefresh();
const aiService = new AIService(process.env.OPENAI_API_KEY!, () =>
  platformKnowledge.getSummaryText()
);
const authService = new AuthService(process.env.JWT_SECRET!);
const workflowGenerator = new WorkflowGenerator(mcpClient, aiService);
const oauthService = new OAuthService();
const credentialValidator = new CredentialValidator();
const credentialRepository = new CredentialRepository();

// Initialize n8n API client if configured
let n8nApiClient: N8nApiClient | null = null;
if (process.env.N8N_API_URL && process.env.N8N_API_KEY) {
  n8nApiClient = new N8nApiClient(
    process.env.N8N_API_URL,
    process.env.N8N_API_KEY,
    process.env.N8N_WEBHOOK_URL
  );
  console.log("✅ n8n API client initialized");

  // Test connection
  n8nApiClient.testConnection().then((connected) => {
    if (connected) {
      console.log("✅ n8n connection verified");
    } else {
      console.warn(
        "⚠️  n8n connection failed - deployment features will be disabled"
      );
    }
  });
} else {
  console.warn(
    "⚠️  n8n API not configured - deployment features will be disabled"
  );
}

// Initialize Vapi service with n8n API client and repos
const vapiService = new VapiService(
  workflowGenerator,
  n8nApiClient,
  credentialRepository,
  pool
);

// Initialize token refresh service
const tokenRefreshService = new TokenRefreshService(
  credentialRepository,
  oauthService,
  n8nApiClient
);

// Start token refresh background job
tokenRefreshService.start();

console.log("✅ Services initialized");

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "AI Workflow Builder API",
    version: "2.0.0",
    status: "running",
    features: {
      auth: true,
      deployment: n8nApiClient !== null,
      aiChat: true,
    },
    endpoints: {
      auth: "/api/auth",
      chat: "/api/chat",
      workflows: "/api/workflows",
      deploy: "/api/deploy",
      voice: "/api/voice",
      oauth: "/api/oauth",
      credentials: "/api/credentials",
      billing: "/api/billing",
      managedAi: "/api/managed-ai",
      health: "/health",
    },
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    n8nConnected: n8nApiClient !== null,
  });
});

// API Routes
app.use("/api/auth", createAuthRouter(authService));
app.use("/api/chat", createChatRouter(aiService, mcpClient, workflowGenerator, authService));
app.use("/api/workflows", createWorkflowsRouter(mcpClient, authService));
app.use("/api/voice", createVoiceRouter(vapiService, platformKnowledge));
app.use("/api/pipecat", createPipecatRouter(workflowGenerator));
app.use(
  "/api/oauth",
  createOAuthRouter(oauthService, credentialRepository, authService)
);
app.use(
  "/api/credentials",
  createCredentialsRouter(
    credentialRepository,
    credentialValidator,
    authService
  )
);
app.use("/api/billing", billingRouter);
app.use("/api/managed-ai", createManagedAIRouter(pool));
app.use("/api/platform", createPlatformRouter(platformKnowledge));
app.use("/api/n8n-webhooks", createN8nWebhookRouter(pool));
app.use("/api/test-data", createTestDataRouter(aiService));
app.use("/api/nodes", nodesRouter);

// Deploy routes (only if n8n is configured)
// Note: ExecutionMonitor will be initialized after WebSocket service
if (n8nApiClient) {
  app.use("/api/deploy", createDeployRouter(n8nApiClient, authService, pool));
} else {
  app.use("/api/deploy", (req: Request, res: Response) => {
    res.status(503).json({
      success: false,
      error:
        "Deployment features are not available. Please configure n8n API credentials.",
    });
  });
}

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Create HTTP server and WebSocket service
const httpServer = createServer(app);
const wsService = new WebSocketService(httpServer, authService);

// Make wsService available globally for routes
(app as any).wsService = wsService;

// Initialize ExecutionMonitor for real-time node updates (after wsService is created)
if (n8nApiClient) {
  const executionMonitor = new ExecutionMonitor(n8nApiClient, wsService);
  console.log("✅ Execution Monitor initialized");
  
  // Update deploy router to use executionMonitor
  // We need to re-register the deploy router with executionMonitor
  if (app._router && app._router.stack) {
    app._router.stack = app._router.stack.filter((layer: any) => {
      return !(layer.regexp && layer.regexp.test('/api/deploy'));
    });
  }
  app.use("/api/deploy", createDeployRouter(n8nApiClient, authService, pool, executionMonitor));
}

// Start server
httpServer.listen(PORT, () => {
  console.log("");
  console.log("🔥 ================================================");
  console.log("🔥  AI Workflow Builder Backend");
  console.log("🔥 ================================================");
  console.log("");
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server ready on ws://localhost:${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `✅ Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`
  );
  console.log("");
  console.log("📡 Available endpoints:");
  console.log(`   - GET  http://localhost:${PORT}/`);
  console.log(`   - GET  http://localhost:${PORT}/health`);
  console.log("");
  console.log("🔐 Auth:");
  console.log(`   - POST http://localhost:${PORT}/api/auth/register`);
  console.log(`   - POST http://localhost:${PORT}/api/auth/login`);
  console.log(`   - GET  http://localhost:${PORT}/api/auth/me`);
  console.log("");
  console.log("💬 Chat:");
  console.log(`   - POST http://localhost:${PORT}/api/chat`);
  console.log(`   - POST http://localhost:${PORT}/api/chat/generate-workflow`);
  console.log("");
  console.log("🎙️  Voice AI:");
  console.log(`   - POST http://localhost:${PORT}/api/voice/functions`);
  console.log(`   - GET  http://localhost:${PORT}/api/voice/assistant-config`);
  console.log("");
  console.log("🔐 OAuth (20 Integrations):");
  console.log(`   - GET  http://localhost:${PORT}/api/oauth/:service/connect`);
  console.log(`   - GET  http://localhost:${PORT}/api/oauth/:service/callback`);
  console.log(`   - POST http://localhost:${PORT}/api/oauth/:service/refresh`);
  console.log(
    `   - DEL  http://localhost:${PORT}/api/oauth/:service/disconnect`
  );
  console.log("");
  console.log("🔑 Credentials (API Keys):");
  console.log(`   - GET  http://localhost:${PORT}/api/credentials`);
  console.log(`   - POST http://localhost:${PORT}/api/credentials`);
  console.log(`   - PUT  http://localhost:${PORT}/api/credentials/:id`);
  console.log(`   - DEL  http://localhost:${PORT}/api/credentials/:id`);
  console.log(`   - GET  http://localhost:${PORT}/api/credentials/services`);
  console.log("");
  console.log("📋 Workflows:");
  console.log(`   - GET  http://localhost:${PORT}/api/workflows`);
  console.log(`   - POST http://localhost:${PORT}/api/workflows`);
  console.log("");
  console.log("🤖 Managed AI (Fireworks):");
  console.log(`   - POST http://localhost:${PORT}/api/managed-ai/chat`);
  console.log(`   - POST http://localhost:${PORT}/api/managed-ai/image`);
  console.log(
    `   - POST http://localhost:${PORT}/api/managed-ai/generate-content`
  );
  console.log(
    `   - GET  http://localhost:${PORT}/api/managed-ai/quota/:userId`
  );
  console.log(`   - GET  http://localhost:${PORT}/api/managed-ai/models`);
  console.log("");
  if (n8nApiClient) {
    console.log("🚀 Deployment (n8n):");
    console.log(`   - POST http://localhost:${PORT}/api/deploy`);
    console.log(`   - POST http://localhost:${PORT}/api/deploy/:id/execute`);
    console.log(`   - GET  http://localhost:${PORT}/api/deploy/:id/executions`);
  }
  console.log("");
  console.log("🎯 Ready! 🚀");
  console.log("");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  tokenRefreshService.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, shutting down gracefully...");
  tokenRefreshService.stop();
  process.exit(0);
});
