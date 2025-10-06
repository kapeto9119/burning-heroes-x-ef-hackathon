"use client";

import { motion, AnimatePresence } from "framer-motion";
import { VapiTranscript } from "@/types/vapi";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface VoiceTranscriptProps {
  transcripts: VapiTranscript[];
  className?: string;
}

export function VoiceTranscript({ transcripts, className }: VoiceTranscriptProps) {
  if (transcripts.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-sm text-muted-foreground">
          Start speaking to see the conversation...
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3 overflow-y-auto p-4", className)}>
      <AnimatePresence initial={false}>
        {transcripts.map((transcript, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex gap-3",
              transcript.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {transcript.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
            )}
            
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                transcript.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-foreground"
              )}
            >
              <p>{transcript.text}</p>
              <span className="text-xs opacity-60 mt-1 block">
                {transcript.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {transcript.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
