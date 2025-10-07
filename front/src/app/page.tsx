"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SendIcon, Sparkles, Command, Mic, Zap, Shield, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Background } from "@/components/layout/Background";
import { useWorkflow } from "@/contexts/WorkflowContext";
import * as React from "react";
import Image from "next/image";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({
  minHeight,
  maxHeight,
}: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      requestAnimationFrame(() => {
        textarea.style.height = "auto";
        const newHeight = Math.max(
          minHeight,
          Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
        );
        textarea.style.height = `${newHeight}px`;
      });
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:outline-none",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

const commandSuggestions = [
  {
    icon: <Sparkles className="w-4 h-4" />,
    label: "Randomize",
    prefix: "/randomize",
  },
];

export default function Home() {
  const router = useRouter();
  const { setMessages } = useWorkflow();
  const [value, setValue] = useState("");
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [email, setEmail] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const handleSendMessage = () => {
    if (value.trim()) {
      // Add the user's first message to context
      setMessages([
        {
          id: Date.now().toString(),
          text: value,
          isUser: true,
          timestamp: new Date(),
        },
      ]);

      // Navigate to editor
      router.push("/editor");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleSuggestionClick = (prefix: string) => {
    setValue(prefix + " ");
    textareaRef.current?.focus();
  };

  const handleVoiceMode = () => {
    // Navigate to editor in voice mode
    router.push("/editor?voice=true");
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // Handle email submission
      console.log("Email submitted:", email);
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 w-full h-full">
        <Background />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar />

        {/* Main Landing Content */}
        <div className="w-full max-w-2xl mx-auto flex-1 flex items-center justify-center px-6 py-12 min-h-[calc(100vh-100px)]">
          <motion.div
            className="relative space-y-12 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="text-center space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-block"
              >
                <h1 className="text-4xl font-light tracking-tight text-foreground/90 pb-1">
                  What would you like to automate today?
                </h1>
                <motion.div
                  className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                />
              </motion.div>
              <motion.div
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Image
                  src="/lovable.svg"
                  alt="Lovable"
                  width={80}
                  height={20}
                  className="inline-block"
                />
                <span>for automations</span>
              </motion.div>
            </div>

            <motion.div
              className="relative backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl"
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="p-4">
                <Textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  containerClassName="w-full"
                  className="w-full px-4 py-3 resize-none bg-transparent border-none text-foreground text-sm focus:outline-none placeholder:text-muted-foreground min-h-[60px]"
                  style={{ overflow: "hidden" }}
                />
              </div>

              <div className="p-4 border-t border-border flex items-center justify-between gap-4">
                <div className="flex items-center gap-1">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors relative group"
                  >
                    <Command className="w-4 h-4" />
                  </motion.button>

                  <div className="relative">
                    <motion.button
                      type="button"
                      onClick={handleVoiceMode}
                      whileTap={{ scale: 0.94 }}
                      onMouseEnter={() => setShowMicTooltip(true)}
                      onMouseLeave={() => setShowMicTooltip(false)}
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors relative group"
                    >
                      <Mic className="w-4 h-4" />
                    </motion.button>

                    <AnimatePresence>
                      {showMicTooltip && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg whitespace-nowrap shadow-lg"
                        >
                          Start voice mode
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="w-2 h-2 bg-black rotate-45"></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={handleSendMessage}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!value.trim()}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    "flex items-center gap-2",
                    value.trim()
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-accent text-muted-foreground"
                  )}
                >
                  <SendIcon className="w-4 h-4" />
                  <span>Send</span>
                </motion.button>
              </div>
            </motion.div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {commandSuggestions.map((suggestion, index) => (
                <motion.button
                  key={suggestion.prefix}
                  onClick={() => handleSuggestionClick(suggestion.prefix)}
                  className="flex items-center gap-2 px-3 py-2 bg-accent/50 hover:bg-accent rounded-lg text-sm text-muted-foreground hover:text-foreground transition-all relative group border border-border/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {suggestion.icon}
                  <span>{suggestion.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>


        {/* Why Choose Us Section */}
        <div className="w-full max-w-6xl mx-auto px-6 py-24">
          <motion.div
            className="text-center space-y-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-3">
              <h2 className="text-3xl font-light tracking-tight text-foreground/90">
                Why building with Mozart?
              </h2>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto max-w-md"
                initial={{ width: 0, opacity: 0 }}
                whileInView={{ width: "100%", opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8 }}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {[
                {
                  icon: <Zap className="w-8 h-8" />,
                  title: "Lightning Fast",
                  description:
                    "Build workflows in minutes, not hours. Our AI understands your needs instantly.",
                },
                {
                  icon: <Shield className="w-8 h-8" />,
                  title: "Secure & Reliable",
                  description:
                    "Enterprise-grade security with 99.9% uptime. Your data is always protected.",
                },
                {
                  icon: <Clock className="w-8 h-8" />,
                  title: "Save Time",
                  description:
                    "Automate repetitive tasks and focus on what matters. Increase productivity by 10x.",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="p-6 rounded-2xl backdrop-blur-xl bg-background/40 border border-border hover:border-primary/50 transition-all group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-primary mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-medium mb-2 text-foreground/90">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Ready to Get Started Section */}
        <div className="w-full max-w-4xl mx-auto px-6 py-24">
          <motion.div
            className="text-center space-y-8 p-12 rounded-3xl backdrop-blur-xl bg-background/40 border border-border"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-3">
              <h2 className="text-3xl font-light tracking-tight text-foreground/90">
                Ready to get started?
              </h2>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent mx-auto max-w-md"
                initial={{ width: 0, opacity: 0 }}
                whileInView={{ width: "100%", opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8 }}
              />
            </div>

            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join thousands of teams already automating their workflows with AI.
            </p>

            <motion.button
              onClick={() => router.push("/editor")}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg text-base font-medium shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </div>

        {/* Footer */}
        <footer className="w-full border-t border-border mt-24">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                ©Mozart Inc. All rights reserved
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
