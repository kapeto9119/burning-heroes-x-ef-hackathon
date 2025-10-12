"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VoiceProviderToggleProps {
  provider: 'vapi' | 'pipecat';
  onProviderChange: (provider: 'vapi' | 'pipecat') => void;
  disabled?: boolean;
}

export function VoiceProviderToggle({
  provider,
  onProviderChange,
  disabled = false,
}: VoiceProviderToggleProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Button
        variant={provider === 'vapi' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onProviderChange('vapi')}
        disabled={disabled}
        className={cn(
          "relative transition-all",
          provider === 'vapi' && "shadow-sm"
        )}
      >
        {provider === 'vapi' && (
          <motion.div
            layoutId="activeProvider"
            className="absolute inset-0 bg-primary rounded-md"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10">Vapi</span>
      </Button>
      
      <Button
        variant={provider === 'pipecat' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onProviderChange('pipecat')}
        disabled={disabled}
        className={cn(
          "relative transition-all",
          provider === 'pipecat' && "shadow-sm"
        )}
      >
        {provider === 'pipecat' && (
          <motion.div
            layoutId="activeProvider"
            className="absolute inset-0 bg-primary rounded-md"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10">Pipecat</span>
      </Button>
    </div>
  );
}
