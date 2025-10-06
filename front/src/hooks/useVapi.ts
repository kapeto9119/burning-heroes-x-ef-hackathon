import { useState, useEffect, useCallback, useRef } from 'react';
import { VapiCallStatus, VapiTranscript, VapiMessageEvent } from '@/types/vapi';

// Type definition for Vapi SDK (will be installed)
interface VapiClient {
  start: (assistantId: string, config?: { metadata?: Record<string, any> }) => Promise<any>;
  stop: () => void;
  on: (event: string, callback: (data: any) => void) => any;
  off: (event: string, callback: (data: any) => void) => any;
}

interface UseVapiProps {
  publicKey: string;
  assistantId: string;
  userId?: string; // User ID to pass to backend
  onWorkflowGenerated?: (workflow: any) => void;
  onWorkflowUpdated?: (workflow: any) => void;
  onDeployReady?: (workflow: any) => void;
}

export function useVapi({
  publicKey,
  assistantId,
  userId,
  onWorkflowGenerated,
  onWorkflowUpdated,
  onDeployReady,
}: UseVapiProps) {
  const [callStatus, setCallStatus] = useState<VapiCallStatus>({ status: 'idle' });
  const [transcripts, setTranscripts] = useState<VapiTranscript[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vapiClientRef = useRef<VapiClient | null>(null);

  // Initialize Vapi client
  useEffect(() => {
    // Only initialize if not already initialized
    if (vapiClientRef.current) {
      console.log('[Vapi] Client already initialized, skipping...');
      return;
    }

    const initVapi = async () => {
      try {
        // Dynamically import Vapi SDK
        const { default: Vapi } = await import('@vapi-ai/web');
        vapiClientRef.current = new Vapi(publicKey) as any;
        console.log('[Vapi] Client initialized');
      } catch (error) {
        console.error('[Vapi] Failed to initialize:', error);
        setCallStatus({ status: 'error', error: 'Failed to load Vapi SDK' });
      }
    };

    initVapi();

    return () => {
      if (vapiClientRef.current) {
        vapiClientRef.current.stop();
        vapiClientRef.current = null;
      }
    };
  }, [publicKey]);

  // Start voice call
  const startCall = useCallback(async () => {
    if (!vapiClientRef.current) {
      console.error('[Vapi] Client not initialized');
      return;
    }

    try {
      setCallStatus({ status: 'connecting' });
      
      // Set up event listeners
      const client = vapiClientRef.current;

      // Call started
      client.on('call-start', () => {
        console.log('[Vapi] Call started');
        setCallStatus({ status: 'connected' });
        setIsListening(true);
      });

      // Call ended
      client.on('call-end', () => {
        console.log('[Vapi] Call ended');
        setCallStatus({ status: 'disconnected' });
        setIsListening(false);
        setIsSpeaking(false);
      });

      // Transcripts - only show when speech is complete
      let lastUserTranscript = '';
      let lastAssistantTranscript = '';

      client.on('speech-update', (update: any) => {
        console.log('[Vapi] Speech update:', update);
        
        // Only add final transcripts (when user/assistant finishes speaking)
        if (update.status === 'stopped' && update.transcript) {
          const transcript: VapiTranscript = {
            role: update.role || 'user',
            text: update.transcript,
            timestamp: new Date(),
          };
          
          // Prevent duplicates
          if (update.role === 'user' && update.transcript !== lastUserTranscript) {
            lastUserTranscript = update.transcript;
            setTranscripts(prev => [...prev, transcript]);
          } else if (update.role === 'assistant' && update.transcript !== lastAssistantTranscript) {
            lastAssistantTranscript = update.transcript;
            setTranscripts(prev => [...prev, transcript]);
          }
        }
      });

      // Listen to ALL message events with detailed logging
      client.on('message', async (message: any) => {
        console.log('[Vapi] 📨 RAW MESSAGE:', JSON.stringify(message, null, 2));
        console.log('[Vapi] Message type:', message.type);
        console.log('[Vapi] Message keys:', Object.keys(message));

        // Handle function call results (when backend responds)
        if (message.type === 'function-call-result') {
          console.log('[Vapi] ✅ Function result received!', message);
          const result = message.result || message.functionCallResult;
          
          if (result?.workflow) {
            console.log('[Vapi] 🎉 Workflow received from function result:', result.workflow);
            if (onWorkflowGenerated) {
              onWorkflowGenerated(result.workflow);
            }
          } else {
            console.warn('[Vapi] ⚠️ Function result has no workflow:', result);
          }
        }

        // Handle tool-calls (better way - directly from Vapi)
        if (message.type === 'tool-calls' && (message as any).toolCalls) {
          console.log('[Vapi] 🔧 Tool calls received:', (message as any).toolCalls);
          
          const toolCalls = (message as any).toolCalls;
          for (const toolCall of toolCalls) {
            if (toolCall.function?.name === 'generateWorkflow') {
              console.log('[Vapi] 🎯 Generate workflow tool call!', toolCall.function.arguments);
              
              // Extract parameters from the tool call
              const params = toolCall.function.arguments?.parameters || toolCall.function.arguments;
              
              // Call our backend directly to generate the workflow
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
              console.log('[Vapi] Using API URL:', apiUrl); // Debug log
              try {
                const response = await fetch(`${apiUrl}/api/chat/generate-workflow`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    description: params.description,
                    trigger: params.trigger,
                    services: params.services,
                    schedule: params.schedule
                  })
                });
                
                const data = await response.json();
                console.log('[Vapi] 🎉 Workflow generated!', data);
                
                if (data.success && data.data?.workflow) {
                  if (onWorkflowGenerated) {
                    onWorkflowGenerated(data.data.workflow);
                  }
                }
              } catch (error) {
                console.error('[Vapi] Failed to generate workflow:', error);
              }
            }
          }
        }

        // Log all other message types
        if (message.type !== 'transcript' && message.type !== 'function-call' && message.type !== 'function-call-result') {
          console.log('[Vapi] 📋 Other message type:', message.type, message);
        }

        // Fallback: If speech-update doesn't work, use message transcripts
        if (message.type === 'transcript' && message.transcript) {
          // Only show final transcripts
          const isFinal = (message as any).transcriptType === 'final' || 
                         (message as any).isFinal === true;
          
          if (isFinal) {
            const transcript: VapiTranscript = {
              role: message.role || 'user',
              text: message.transcript,
              timestamp: new Date(),
            };
            
            // Avoid duplicates from speech-update
            setTranscripts(prev => {
              const lastTranscript = prev[prev.length - 1];
              if (lastTranscript?.text === transcript.text) {
                return prev; // Skip duplicate
              }
              return [...prev, transcript];
            });

            // Update speaking state
            if (message.role === 'assistant') {
              setIsSpeaking(true);
              setTimeout(() => setIsSpeaking(false), 2000);
            }
          }
        }
      });

      // Speech started/ended
      client.on('speech-start', () => {
        console.log('[Vapi] User started speaking');
        setIsListening(true);
      });

      client.on('speech-end', () => {
        console.log('[Vapi] User stopped speaking');
        setIsListening(false);
      });

      // Errors
      client.on('error', (error: any) => {
        console.error('[Vapi] Error:', error);
        setCallStatus({ status: 'error', error: error.message });
      });

      // Start the call with user metadata
      await client.start(assistantId, {
        metadata: userId ? { userId } : undefined
      });
      
    } catch (error: any) {
      console.error('[Vapi] Failed to start call:', error);
      setCallStatus({ status: 'error', error: error.message });
    }
  }, [assistantId, userId, onWorkflowGenerated]);

  // Stop voice call
  const stopCall = useCallback(() => {
    if (vapiClientRef.current) {
      vapiClientRef.current.stop();
      setCallStatus({ status: 'disconnected' });
      setIsListening(false);
      setIsSpeaking(false);
    }
  }, []);

  // Handle function calls from Vapi (kept for compatibility)
  const handleFunctionCall = useCallback((functionCall: { name: string; parameters: any }) => {
    console.log('[Vapi] Function call handler (legacy):', functionCall.name, functionCall.parameters);
    // Function results now come through function-call-result event
  }, []);

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  return {
    callStatus,
    transcripts,
    isListening,
    isSpeaking,
    startCall,
    stopCall,
    clearTranscripts,
    isConnected: callStatus.status === 'connected',
  };
}
