"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceButton({
  isConnected,
  isListening,
  isSpeaking,
  onToggle,
  disabled = false,
  className,
}: VoiceButtonProps) {
  const isActive = isConnected;

  return (
    <div className="relative">
      <Button
        onClick={onToggle}
        disabled={disabled}
        size="lg"
        className={cn(
          "relative rounded-full w-16 h-16 transition-all duration-300",
          isActive
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-primary hover:bg-primary/90 text-primary-foreground",
          className
        )}
      >
        <AnimatePresence mode="wait">
          {disabled ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 className="w-6 h-6 animate-spin" />
            </motion.div>
          ) : isActive ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <MicOff className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="inactive"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Mic className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse animation when listening */}
        {isListening && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-500"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-400"
              initial={{ scale: 1, opacity: 0.3 }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
          </>
        )}

        {/* Pulse animation when AI is speaking */}
        {isSpeaking && !isListening && (
          <motion.div
            className="absolute inset-0 rounded-full bg-purple-500"
            initial={{ scale: 1, opacity: 0.4 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </Button>

      {/* Status indicator */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          >
            <span className="text-xs font-medium text-muted-foreground">
              {isListening ? "Listening..." : isSpeaking ? "AI Speaking..." : "Connected"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
