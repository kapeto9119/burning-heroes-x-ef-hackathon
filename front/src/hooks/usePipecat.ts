import { useState, useCallback, useRef, useEffect } from 'react';
import { PipecatClient } from '@pipecat-ai/client-js';
import { DailyTransport } from '@pipecat-ai/daily-transport';

interface UsePipecatProps {
  userId?: string;
  onWorkflowGenerated?: (workflow: any) => void;
  onAgentSwitch?: (agent: string) => void;
}

interface PipecatSession {
  room_url: string;
  room_name: string;
  token: string;
}

interface PipecatTranscript {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export function usePipecat({
  userId,
  onWorkflowGenerated,
  onAgentSwitch,
}: UsePipecatProps) {
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'>('idle');
  const [transcripts, setTranscripts] = useState<PipecatTranscript[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string>('orchestrator');
  const [error, setError] = useState<string | null>(null);
  
  const clientRef = useRef<PipecatClient | null>(null);
  const sessionRef = useRef<PipecatSession | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Start voice call
  const startCall = useCallback(async () => {
    try {
      setCallStatus('connecting');
      
      // Create session via backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/pipecat/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to start session');
      }

      const session = data.data;
      sessionRef.current = session;
      console.log('[Pipecat] Session created:', session.room_name);

      // Create Pipecat client with Daily transport
      const transport = new DailyTransport();
      const client = new PipecatClient({
        transport,
        enableMic: true,
        enableCam: false,
      });

      clientRef.current = client;

      // Set up event listeners
      client.on('connected', () => {
        console.log('[Pipecat] ✅ Connected - audio enabled!');
        setCallStatus('connected');
      });

      client.on('disconnected', () => {
        console.log('[Pipecat] Disconnected');
        setCallStatus('disconnected');
        setIsListening(false);
        setIsSpeaking(false);
      });

      client.on('botStartedSpeaking', () => {
        console.log('[Pipecat] 🔊 Bot started speaking - YOU SHOULD HEAR THIS!');
        setIsSpeaking(true);
      });

      client.on('botStoppedSpeaking', () => {
        console.log('[Pipecat] Bot stopped speaking');
        setIsSpeaking(false);
      });

      client.on('userStartedSpeaking', () => {
        console.log('[Pipecat] User started speaking');
        setIsListening(true);
      });

      client.on('userStoppedSpeaking', () => {
        console.log('[Pipecat] User stopped speaking');
        setIsListening(false);
      });

      client.on('error', (err: any) => {
        console.error('[Pipecat] Error:', err);
        setError(err.message || 'Connection error');
        setCallStatus('error');
      });

      // Listen for server messages (agent switches, workflow updates, etc.)
      client.on('serverMessage', (data: any) => {
        console.log('[Pipecat] Server message:', data);
        
        // Handle agent switch
        if (data.type === 'agent_switch' && data.agent) {
          console.log('[Pipecat] 🔄 Agent switched to:', data.agent);
          setCurrentAgent(data.agent);
          onAgentSwitch?.(data.agent);
        }
        
        // Handle workflow generation
        if (data.type === 'workflow_generated' && data.workflow) {
          console.log('[Pipecat] Workflow generated');
          onWorkflowGenerated?.(data.workflow);
        }
      });

      // CRITICAL: Handle audio tracks manually to play bot audio
      const clientTransport = client.transport;
      if (clientTransport && (clientTransport as any).dailyCallClient) {
        const daily = (clientTransport as any).dailyCallClient;
        
        // Listen for Daily app messages (agent switches)
        daily.on('app-message', (event: any) => {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            console.log('[Pipecat] Daily app message:', data);
            
            if (data.type === 'agent_switch' && data.agent) {
              console.log('[Pipecat] 🔄 Agent switched via Daily to:', data.agent);
              setCurrentAgent(data.agent);
              onAgentSwitch?.(data.agent);
            }
          } catch (err) {
            console.error('[Pipecat] Failed to parse app message:', err);
          }
        });

        // CRITICAL FIX: Listen for bot audio tracks and play them!
        daily.on('track-started', async (event: any) => {
          console.log('[Pipecat] Daily track started:', event.track.kind, 'from:', event.participant?.user_name);
          
          // If it's bot audio (remote, not local)
          if (event.track.kind === 'audio' && !event.participant?.local) {
            console.log('[Pipecat] 🔊 BOT AUDIO TRACK DETECTED!');
            
            // Create audio element if doesn't exist
            if (!audioElementRef.current) {
              audioElementRef.current = document.createElement('audio');
              audioElementRef.current.autoplay = true;
              document.body.appendChild(audioElementRef.current);
              console.log('[Pipecat] ✅ Audio element created');
            }
            
            // USE THE TRACK FROM THE EVENT DIRECTLY!
            const track = event.track;
            console.log('[Pipecat] Creating MediaStream from track:', track);
            
            const stream = new MediaStream([track]);
            audioElementRef.current.srcObject = stream;
            console.log('[Pipecat] Stream attached to audio element');
            
            try {
              await audioElementRef.current.play();
              console.log('[Pipecat] ✅✅✅ AUDIO IS NOW PLAYING! ✅✅✅');
            } catch (playErr) {
              console.error('[Pipecat] ❌ Play failed:', playErr);
            }
          }
        });
      }

      // Connect with Daily room URL
      await client.connect({ url: session.room_url, token: session.token });
      console.log('[Pipecat] ✅ Connected - Pipecat SDK handling audio!');

    } catch (error: any) {
      console.error('[Pipecat] Failed to start call:', error);
      setError(error.message);
      setCallStatus('error');
    }
  }, [userId]);

  // Stop voice call
  const stopCall = useCallback(async () => {
    try {
      // Clean up audio element
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.srcObject = null;
        if (document.body.contains(audioElementRef.current)) {
          document.body.removeChild(audioElementRef.current);
        }
        audioElementRef.current = null;
      }

      if (clientRef.current) {
        await clientRef.current.disconnect();
        clientRef.current = null;
      }

      if (sessionRef.current) {
        const roomName = sessionRef.current.room_name;
        // End session on backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        await fetch(`${apiUrl}/api/pipecat/end-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName }),
        });
        
        sessionRef.current = null;
      }

      setCallStatus('disconnected');
      setIsListening(false);
      setIsSpeaking(false);
    } catch (error) {
      console.error('[Pipecat] Failed to stop call:', error);
    }
  }, []);

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current && document.body.contains(audioElementRef.current)) {
        document.body.removeChild(audioElementRef.current);
      }
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, []);

  return {
    callStatus: { status: callStatus, error },
    transcripts,
    isListening,
    isSpeaking,
    currentAgent,
    startCall,
    stopCall,
    clearTranscripts,
    isConnected: callStatus === 'connected',
    client: clientRef.current,
  };
}
