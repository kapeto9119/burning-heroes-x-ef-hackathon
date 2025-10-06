"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  className?: string;
}

export function VoiceVisualizer({
  isListening,
  isSpeaking,
  className,
}: VoiceVisualizerProps) {
  const bars = Array.from({ length: 5 }, (_, i) => i);
  const isActive = isListening || isSpeaking;

  return (
    <div className={cn("flex items-center justify-center gap-1 h-12", className)}>
      {bars.map((bar) => (
        <motion.div
          key={bar}
          className={cn(
            "w-1 rounded-full",
            isListening ? "bg-blue-500" : isSpeaking ? "bg-purple-500" : "bg-gray-400"
          )}
          initial={{ height: 4 }}
          animate={{
            height: isActive ? [4, 32, 4] : 4,
          }}
          transition={{
            duration: 0.6,
            repeat: isActive ? Infinity : 0,
            delay: bar * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
