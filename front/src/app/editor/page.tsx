'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { SendIcon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { useWorkflow } from '@/contexts/WorkflowContext';
import * as React from 'react';

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
        textarea.style.height = 'auto';
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
      <div className={cn('relative', containerClassName)}>
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'transition-all duration-200 ease-in-out',
            'placeholder:text-muted-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'focus-visible:outline-none',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="w-1.5 h-1.5 bg-foreground rounded-full mx-0.5"
          initial={{ opacity: 0.3 }}
          animate={{
            opacity: [0.3, 0.9, 0.3],
            scale: [0.85, 1.1, 0.85],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function EditorPage() {
  const { messages, setMessages } = useWorkflow();
  const [value, setValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const hasRespondedRef = useRef(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  // Auto-respond to first message from landing page
  useEffect(() => {
    // Check if we have exactly 1 message (the user's first message) and haven't responded yet
    if (messages.length === 1 && messages[0].isUser && !hasRespondedRef.current) {
      hasRespondedRef.current = true;
      setIsTyping(true);
      
      setTimeout(() => {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          text: "I'm analyzing your workflow request and generating the automation nodes...",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1500);
    }
  }, [messages, setMessages]);

  const handleSendMessage = () => {
    if (value.trim()) {
      const userMessage = {
        id: Date.now().toString(),
        text: value,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      setValue('');
      adjustHeight(true);
      setIsTyping(true);
      
      setTimeout(() => {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          text: "I'm analyzing your workflow request and generating the automation nodes...",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
      }, 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        handleSendMessage();
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 w-full h-full">
        <Background />
      </div>

      <div className="relative z-10">
        <Navbar />

        <motion.div 
          className="w-full h-[calc(100vh-120px)] relative z-10 px-6 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="container mx-auto h-full max-w-7xl">
            <div className="grid grid-cols-2 gap-6 h-full">
              {/* Left Column - Chat */}
              <div className="flex flex-col h-full backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex',
                        message.isUser ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                          message.isUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent text-foreground'
                        )}
                      >
                        {message.text}
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-accent rounded-2xl px-4 py-3">
                        <TypingDots />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border p-4">
                  <div className="flex items-end gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value);
                        adjustHeight();
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder="Continue the conversation..."
                      containerClassName="flex-1"
                      className="resize-none bg-transparent border-none focus:outline-none min-h-[60px] max-h-[120px]"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isTyping || !value.trim()}
                      size="sm"
                      className="rounded-full bg-black text-white hover:bg-gray-800"
                    >
                      <SendIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column - Node Graph */}
              <div className="flex flex-col h-full backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-semibold">Workflow Graph</h2>
                  <p className="text-sm text-muted-foreground">Your automation nodes will appear here</p>
                </div>
                <div 
                  className="flex-1 p-6 flex items-center justify-center relative overflow-hidden"
                  style={{
                    backgroundImage: `
                      linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '24px 24px',
                    backgroundPosition: '0 0'
                  }}
                >
                  <div className="text-center space-y-4 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-accent mx-auto flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-2">Cooking up your workflow...</h3>
                      <p className="text-sm text-muted-foreground">The AI is generating automation nodes based on your request</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
