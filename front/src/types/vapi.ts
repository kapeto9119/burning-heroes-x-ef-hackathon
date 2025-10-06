/**
 * Vapi Voice AI Type Definitions (Frontend)
 */

export interface VapiConfig {
  publicKey: string;
  assistantId?: string;
}

export interface VapiCallStatus {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
}

export interface VapiTranscript {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface VapiFunctionCallMessage {
  type: 'function-call';
  functionCall: {
    name: string;
    parameters: Record<string, any>;
  };
}

export interface VapiMessageEvent {
  type: 'transcript' | 'function-call' | 'status-update';
  transcript?: string;
  role?: 'user' | 'assistant';
  functionCall?: {
    name: string;
    parameters: Record<string, any>;
  };
}
