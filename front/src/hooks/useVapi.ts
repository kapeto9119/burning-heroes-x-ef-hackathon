import { useState, useEffect, useCallback, useRef } from 'react';
import { VapiCallStatus, VapiTranscript, VapiMessageEvent } from '@/types/vapi';

// Type definition for Vapi SDK (will be installed)
interface VapiClient {
  start: (assistantId: string) => Promise<void>;
  stop: () => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
}

interface UseVapiProps {
  publicKey: string;
  assistantId: string;
  onWorkflowGenerated?: (workflow: any) => void;
  onWorkflowUpdated?: (workflow: any) => void;
  onDeployReady?: (workflow: any) => void;
}

export function useVapi({
  publicKey,
  assistantId,
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
    const initVapi = async () => {
      try {
        // Dynamically import Vapi SDK
        const { default: Vapi } = await import('@vapi-ai/web');
        vapiClientRef.current = new Vapi(publicKey);
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

      // Transcripts - use speech-update event for better control
      client.on('speech-update', (update: any) => {
        console.log('[Vapi] Speech update:', update);
        
        // Only add final transcripts (when user/assistant finishes speaking)
        if (update.status === 'complete' && update.transcript) {
          const transcript: VapiTranscript = {
            role: update.role || 'user',
            text: update.transcript,
            timestamp: new Date(),
          };
          setTranscripts(prev => [...prev, transcript]);
        }
      });

      // Also listen to message events for function calls
      client.on('message', (message: VapiMessageEvent) => {
        console.log('[Vapi] Message:', message);

        // Handle function calls
        if (message.type === 'function-call' && message.functionCall) {
          handleFunctionCall(message.functionCall);
        }

        // Fallback: If speech-update doesn't work, use message transcripts
        if (message.type === 'transcript' && message.transcript) {
          // Check if it's a final transcript (not partial)
          const isFinal = (message as any).isFinal !== false;
          
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

      // Start the call
      await client.start(assistantId);
      
    } catch (error: any) {
      console.error('[Vapi] Failed to start call:', error);
      setCallStatus({ status: 'error', error: error.message });
    }
  }, [assistantId]);

  // Stop voice call
  const stopCall = useCallback(() => {
    if (vapiClientRef.current) {
      vapiClientRef.current.stop();
      setCallStatus({ status: 'disconnected' });
      setIsListening(false);
      setIsSpeaking(false);
    }
  }, []);

  // Handle function calls from Vapi
  const handleFunctionCall = useCallback((functionCall: { name: string; parameters: any }) => {
    console.log('[Vapi] Function call:', functionCall.name, functionCall.parameters);

    switch (functionCall.name) {
      case 'generateWorkflow':
        if (onWorkflowGenerated && functionCall.parameters.workflow) {
          onWorkflowGenerated(functionCall.parameters.workflow);
        }
        break;

      case 'updateWorkflow':
        if (onWorkflowUpdated && functionCall.parameters.workflow) {
          onWorkflowUpdated(functionCall.parameters.workflow);
        }
        break;

      case 'deployWorkflow':
        if (onDeployReady && functionCall.parameters.workflow) {
          onDeployReady(functionCall.parameters.workflow);
        }
        break;

      default:
        console.log('[Vapi] Unknown function:', functionCall.name);
    }
  }, [onWorkflowGenerated, onWorkflowUpdated, onDeployReady]);

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
