import { useState, useCallback, useRef, useEffect } from "react";
import { PipecatClient } from "@pipecat-ai/client-js";
import { DailyTransport } from "@pipecat-ai/daily-transport";
import { useWebSocket } from "./useWebSocket";
import { useAuth } from "@/contexts/AuthContext";

interface UsePipecatProps {
  userId?: string;
  onWorkflowGenerated?: (workflow: any, credentialRequirements?: any[]) => void;
  onAgentSwitch?: (agent: string) => void;
}

interface PipecatSession {
  room_url: string;
  room_name: string;
  token: string;
}

interface PipecatTranscript {
  role: "user" | "assistant";
  text: string;
  timestamp: Date | string;
}

export function usePipecat({
  userId: userIdProp,
  onWorkflowGenerated,
  onAgentSwitch,
}: UsePipecatProps) {
  // Get user from AuthContext as fallback
  const { user, isLoading: authLoading } = useAuth();

  // Use prop userId if provided, otherwise fall back to user?.id from context
  const userId = userIdProp || user?.id;

  const [callStatus, setCallStatus] = useState<
    "idle" | "connecting" | "connected" | "disconnected" | "error"
  >("idle");
  const [transcripts, setTranscripts] = useState<PipecatTranscript[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string>("orchestrator");
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<PipecatClient | null>(null);
  const sessionRef = useRef<PipecatSession | null>(null);

  // WebSocket for transcripts
  const { addEventListener } = useWebSocket();

  // Listen for voice transcripts via WebSocket
  useEffect(() => {
    const unsubscribe = addEventListener("voice:transcript", (event: any) => {
      const transcript: PipecatTranscript = {
        role: event.role,
        text: event.content,
        timestamp: event.timestamp,
      };
      setTranscripts((prev) => [...prev, transcript]);
    });

    return () => {
      unsubscribe();
    };
  }, [addEventListener]);

  // Start voice call
  const startCall = useCallback(async () => {
    try {
      setCallStatus("connecting");

      // Clear old transcripts when starting a new call
      setTranscripts([]);

      // Wait for auth to finish loading
      if (authLoading) {
        setError("Loading user data...");
        setCallStatus("idle");
        return;
      }

      // Validate userId before starting
      if (!userId) {
        setError("Please log in to use voice chat");
        setCallStatus("error");
        return;
      }

      // Create session via backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/pipecat/start-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to start session");
      }

      const session = data.data;
      sessionRef.current = session;

      // Create Pipecat client with Daily transport
      const transport = new DailyTransport();
      const client = new PipecatClient({
        transport,
        enableMic: true,
        enableCam: false,
      });

      clientRef.current = client;

      console.log("[Pipecat] 🎧 Client created with mic enabled");

      // Set up event listeners BEFORE connecting
      // This ensures we don't miss any events

      // Connection events
      client.on("connected", () => {
        console.log("[Pipecat] ✅ Connected - audio enabled!");
        setCallStatus("connected");
        setError(null); // Clear any previous errors
      });

      client.on("disconnected", () => {
        console.log("[Pipecat] Disconnected");
        setCallStatus("disconnected");
        setIsListening(false);
        setIsSpeaking(false);
      });

      // Speaking state events
      client.on("botStartedSpeaking", () => {
        console.log("[Pipecat] 🔊 Bot started speaking");
        setIsSpeaking(true);
        setIsListening(false); // User shouldn't interrupt immediately
      });

      client.on("botStoppedSpeaking", () => {
        console.log("[Pipecat] 🤫 Bot stopped speaking");
        setIsSpeaking(false);
      });

      client.on("userStartedSpeaking", () => {
        console.log("[Pipecat] 🎤 User started speaking");
        setIsListening(true);
        // Note: Bot will auto-stop if user interrupts (VAD handles this)
      });

      client.on("userStoppedSpeaking", () => {
        console.log("[Pipecat] User stopped speaking");
        setIsListening(false);
      });

      // Error handling with auto-recovery
      client.on("error", (err: any) => {
        console.error("[Pipecat] Error:", err);
        const errorMessage = err.message || "Connection error";
        setError(errorMessage);

        // Don't immediately set to error state - might recover
        if (callStatus === "connected") {
          console.warn("[Pipecat] Error during active call, may auto-recover");
        } else {
          setCallStatus("error");
        }
      });

      // Listen for server messages (agent switches, workflow updates, etc.)
      client.on("serverMessage", (data: any) => {
        console.log("[Pipecat] Server message:", data);

        // Handle agent switch
        if (data.type === "agent_switch" && data.agent) {
          console.log("[Pipecat] 🔄 Agent switched to:", data.agent);
          setCurrentAgent(data.agent);
          onAgentSwitch?.(data.agent);
        }

        // Handle workflow generation
        if (data.type === "workflow_generated" && data.workflow) {
          console.log("[Pipecat] Workflow generated");
          onWorkflowGenerated?.(data.workflow);
        }
      });

      // Access Daily client for additional monitoring
      // Note: Audio/video is handled automatically by Pipecat SDK!
      const clientTransport = client.transport;
      if (clientTransport && (clientTransport as any).dailyCallClient) {
        const daily = (clientTransport as any).dailyCallClient;

        // Handle app messages (agent switches, custom events)
        daily.on("app-message", (event: any) => {
          try {
            const data =
              typeof event.data === "string"
                ? JSON.parse(event.data)
                : event.data;
            console.log("[Pipecat] Daily app message:", data);

            if (data.type === "agent_switch" && data.agent) {
              console.log(
                "[Pipecat] 🔄 Agent switched via Daily to:",
                data.agent
              );
              setCurrentAgent(data.agent);
              onAgentSwitch?.(data.agent);
            } else if (data.type === "workflow_generated" && data.workflow) {
              console.log(
                "[Pipecat] 🎉 Workflow received from bot!",
                data.workflow
              );
              // Trigger callback to display workflow in editor
              if (onWorkflowGenerated) {
                onWorkflowGenerated(data.workflow, data.credentialRequirements);
              }
            }
          } catch (err) {
            console.error("[Pipecat] Failed to parse app message:", err);
          }
        });

        // Monitor audio tracks and MANUALLY RENDER bot audio
        // Critical: Daily.co doesn't automatically play remote audio in all cases
        // We need to create an <audio> element and play it explicitly
        daily.on("track-started", (event: any) => {
          console.log(
            `[Pipecat] 🎵 Track started: ${event.track?.kind} from ${
              event.participant?.user_name || "unknown"
            }`
          );

          // Check if this is the bot's audio track
          if (event.track?.kind === "audio" && !event.participant?.local) {
            console.log("[Pipecat] 🔊 Bot audio track detected!");

            const track = event.track as MediaStreamTrack;

            // Create MediaStream from track
            const stream = new MediaStream([track]);

            // Create or reuse audio element
            let audioElement = document.getElementById(
              "pipecat-bot-audio"
            ) as HTMLAudioElement;

            if (!audioElement) {
              audioElement = document.createElement("audio");
              audioElement.id = "pipecat-bot-audio";
              audioElement.autoplay = true;
              document.body.appendChild(audioElement);
              console.log("[Pipecat] 🎧 Created audio element");
            }

            // Attach stream and play
            audioElement.srcObject = stream;
            audioElement
              .play()
              .then(() => {
                console.log("[Pipecat] ✅ BOT AUDIO IS NOW PLAYING!");
              })
              .catch((err) => {
                console.error("[Pipecat] ❌ Failed to play audio:", err);
                console.log(
                  "[Pipecat] 💡 Try clicking on the page to enable audio"
                );
              });
          }
        });

        // Monitor network connection
        daily.on("network-connection", (event: any) => {
          console.log(`[Pipecat] 🌐 Network: ${event.type} - ${event.state}`);
          if (event.state === "failed" || event.state === "disconnected") {
            setError(
              "Network connection lost. Please check your internet connection."
            );
          }
        });

        // Monitor bot connection
        daily.on("participant-left", (event: any) => {
          console.log(
            `[Pipecat] 👋 Participant left: ${event.participant?.user_name}`
          );
          if (!event.participant?.local) {
            setError("Bot disconnected from the call");
          }
        });

        // Monitor participant joined
        daily.on("participant-joined", (event: any) => {
          console.log(
            `[Pipecat] 👋 Participant joined: ${event.participant?.user_name}`
          );
        });
      }

      // Connect with Daily room URL
      console.log("[Pipecat] 🔌 Connecting to Daily room...");
      await client.connect({ url: session.room_url, token: session.token });

      // Check audio settings after connection
      const daily = (client.transport as any).dailyCallClient;
      if (daily) {
        const participants = daily.participants();
        console.log(
          "[Pipecat] 📊 Participants:",
          Object.keys(participants).length
        );

        // Check local audio settings
        const localParticipant = participants.local;
        if (localParticipant) {
          console.log("[Pipecat] 🎤 Local audio:", localParticipant.audio);
        }
      }
    } catch (error: any) {
      console.error("[Pipecat] Failed to start call:", error);
      setError(error.message);
      setCallStatus("error");
    }
  }, [userId, authLoading]);

  // Stop voice call
  const stopCall = useCallback(async () => {
    try {
      // Disconnect client first
      if (clientRef.current) {
        await clientRef.current.disconnect();
        clientRef.current.removeAllListeners();
        clientRef.current = null;
      }

      // End backend session
      if (sessionRef.current) {
        try {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          await fetch(`${apiUrl}/api/pipecat/end-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roomName: sessionRef.current.room_name }),
          });
        } catch (apiError) {
          console.error("[Pipecat] Failed to end backend session:", apiError);
        }
        sessionRef.current = null;
      }

      // Clean up audio element
      const audioElement = document.getElementById("pipecat-bot-audio");
      if (audioElement) {
        audioElement.remove();
        console.log("[Pipecat] 🗑️ Removed audio element");
      }

      // Reset all state
      setCallStatus("disconnected");
      setIsListening(false);
      setIsSpeaking(false);
      setError(null);
      setCurrentAgent("orchestrator");
    } catch (error) {
      console.error("[Pipecat] Error during stop call:", error);
      // Force reset state even on error
      setCallStatus("disconnected");
      setIsListening(false);
      setIsSpeaking(false);
    }
  }, []);

  // Clear transcripts
  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  // Cleanup on unmount - ensure proper disconnection
  useEffect(() => {
    return () => {
      console.log("[Pipecat] Component unmounting - cleaning up...");
      if (clientRef.current) {
        clientRef.current.disconnect().catch((err) => {
          console.error("[Pipecat] Error during cleanup:", err);
        });
        clientRef.current.removeAllListeners();
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
    isConnected: callStatus === "connected",
    client: clientRef.current,
  };
}
