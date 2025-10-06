/**
 * Vapi Voice AI Type Definitions
 */

export interface VapiFunctionCall {
  name: string;
  parameters: Record<string, any>;
}

export interface VapiMessage {
  type: 'function-call' | 'transcript' | 'status-update' | 'end-of-call-report';
  functionCall?: VapiFunctionCall;
  transcript?: string;
  role?: 'user' | 'assistant';
  status?: string;
  call?: VapiCallData;
}

export interface VapiCallData {
  id: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  endedReason?: string;
  startedAt?: string;
  endedAt?: string;
  metadata?: {
    userId?: string;
    [key: string]: any;
  };
}

export interface VapiWebhookRequest {
  message: VapiMessage;
  call?: VapiCallData;
}

export interface VapiFunctionResponse {
  result: any;
  error?: string;
}

export interface VoiceWorkflowSession {
  sessionId: string;
  userId: string;
  callId?: string;
  currentWorkflow?: any;
  n8nWorkflowId?: string; // ID of the deployed workflow in n8n
  conversationContext: {
    trigger?: string;
    services: string[];
    schedule?: string;
    channels?: string[];
    recipients?: string[];
    description?: string;
  };
  status: 'collecting' | 'generating' | 'ready' | 'deployed' | 'error';
  lastUpdated: Date;
  createdAt: Date;
}

export interface VapiAssistantConfig {
  name: string;
  model: {
    provider: string;
    model: string;
    temperature?: number;
    messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }>;
    functions: VapiFunctionDefinition[];
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage?: string;
  serverUrl?: string;
  serverUrlSecret?: string;
  endCallFunctionEnabled?: boolean;
  recordingEnabled?: boolean;
}

export interface VapiFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
