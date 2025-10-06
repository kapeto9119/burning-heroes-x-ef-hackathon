// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  workflow?: N8nWorkflow;
  suggestions?: string[];
}

// n8n Workflow types
export interface N8nNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
}

export interface N8nConnection {
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

export interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: N8nNode[];
  connections: Record<string, any>;
  active?: boolean;
  settings?: Record<string, any>;
}

// MCP types
export interface MCPSearchResult {
  nodeName: string;
  nodeType: string;
  description: string;
  category: string;
  examples?: any[];
}

export interface MCPNodeDetails {
  name: string;
  type: string;
  properties: Record<string, any>;
  operations?: string[];
  credentials?: string[];
  examples?: any[]; // Real-world configuration examples from templates
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User & Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  credentials?: UserCredentials;
}

export interface UserCredentials {
  slack?: {
    token: string;
    teamId?: string;
    teamName?: string;
    n8nCredentialId?: string; // Store n8n credential ID for reuse
  };
  twitter?: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
    n8nCredentialId?: string;
  };
  email?: {
    host: string;
    port: number;
    user: string;
    password: string;
    n8nCredentialId?: string;
  };
  gmail?: {
    accessToken: string;
    refreshToken: string;
    n8nCredentialId?: string;
  };
  // Add more services as needed
}

export interface AuthRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: Omit<User, 'credentials'>;
  token: string;
}

// n8n Deployment types
export interface DeploymentRequest {
  workflowId: string;
  userId: string;
}

export interface DeploymentResponse {
  n8nWorkflowId: string;
  webhookUrl?: string;
  status: 'active' | 'inactive';
  deployedAt: Date;
}

export interface NodeExecutionStatus {
  nodeName: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  executionTime?: number;
  error?: string;
}

export interface ExecutionResult {
  id: string;
  status: 'success' | 'error' | 'running';
  startedAt: Date;
  finishedAt?: Date;
  data?: any;
  error?: string;
  nodeExecutions?: NodeExecutionStatus[];
}
