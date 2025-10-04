'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { SendIcon, Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { useWorkflow } from '@/contexts/WorkflowContext';
import { LoginDialog } from '@/components/LoginDialog';
import { generateWorkflow, sendChatMessage } from '@/app/actions/chat';
import { deployWorkflow, activateWorkflow, saveWorkflow } from '@/app/actions/workflows';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
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
  const [workflow, setWorkflow] = useState<any>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'generating' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentData, setDeploymentData] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const hasRespondedRef = useRef(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  // Auto-send first message to chat API
  useEffect(() => {
    if (messages.length === 1 && messages[0].isUser && !hasRespondedRef.current) {
      hasRespondedRef.current = true;
      
      // Send the first message to the real chat API
      const sendFirstMessage = async () => {
        setIsTyping(true);
        try {
          const result = await sendChatMessage(messages[0].text);
          
          if (result.success && result.data) {
            const aiMessage = {
              id: Date.now().toString(),
              text: result.data.message || result.data.response,
              isUser: false,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMessage]);
            
            // Check if workflow was generated
            if (result.data.workflow) {
              setWorkflow(result.data.workflow);
              setDeploymentStatus('idle');
            }
          }
        } catch (error) {
          console.error('Failed to send first message:', error);
        } finally {
          setIsTyping(false);
        }
      };
      
      sendFirstMessage();
    }
  }, []); // Empty deps - only run once on mount

  const handleGenerateWorkflow = async (description: string) => {
    setIsTyping(true);
    setDeploymentStatus('generating');
    
    try {
      const result = await generateWorkflow(description);
      
      if (result.success && result.data) {
        setWorkflow(result.data);
        const aiMessage = {
          id: Date.now().toString(),
          text: `I've generated a workflow: "${result.data.name}"\n\nNodes: ${result.data.nodes.length}\n\nReady to deploy?`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        setDeploymentStatus('idle');
      } else {
        throw new Error(result.error || 'Failed to generate workflow');
      }
    } catch (error: any) {
      const errorMessage = {
        id: Date.now().toString(),
        text: `Error: ${error.message}. Please try again or rephrase your request.`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setDeploymentStatus('error');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSave = async () => {
    if (!workflow) return;
    
    try {
      const result = await saveWorkflow(workflow);
      if (result.success) {
        const successMessage = {
          id: Date.now().toString(),
          text: '✅ Workflow saved successfully!',
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMessage]);
      }
    } catch (error: any) {
      const errorMessage = {
        id: Date.now().toString(),
        text: `Save error: ${error.message}`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleDeployClick = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    handleDeploy();
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setShowLoginDialog(false);
    // Auto-deploy after login if workflow exists
    if (workflow) {
      handleDeploy();
    }
  };

  const handleDeploy = async () => {
    if (!workflow) return;
    
    setDeploymentStatus('deploying');
    const deployMessage = {
      id: Date.now().toString(),
      text: 'Deploying workflow...',
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, deployMessage]);
    
    try {
      const deployResult = await deployWorkflow(workflow);
      
      if (deployResult.success && deployResult.data) {
        setDeploymentData(deployResult.data);
        
        // Auto-activate
        const activateResult = await activateWorkflow(deployResult.data.workflowId);
        
        if (activateResult.success) {
          const successMessage = {
            id: (Date.now() + 1).toString(),
            text: `🎉 **SUCCESS!** Your workflow is now live and running!\n\n✅ **Workflow ID:** ${deployResult.data.workflowId}\n${deployResult.data.webhookUrl ? `\n🔗 **Webhook URL:**\n\`${deployResult.data.webhookUrl}\`` : ''}\n\n💡 **What's next?**\n- View your workflow in the dashboard\n- Test it by triggering the webhook\n- Monitor executions in real-time`,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, successMessage]);
          setDeploymentStatus('success');
          setShowCelebration(true);
          
          // Hide celebration after 3 seconds
          setTimeout(() => setShowCelebration(false), 3000);
        }
      } else {
        throw new Error(deployResult.error || 'Deployment failed');
      }
    } catch (error: any) {
      const errorMessage = {
        id: Date.now().toString(),
        text: `Deployment error: ${error.message}`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setDeploymentStatus('error');
    }
  };

  const handleSendMessage = async () => {
    if (value.trim()) {
      const userMessage = {
        id: Date.now().toString(),
        text: value,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      const messageText = value;
      setValue('');
      adjustHeight(true);
      setIsTyping(true);
      
      try {
        // Check if user wants to deploy existing workflow
        if (workflow && (messageText.toLowerCase().includes('deploy') || messageText.toLowerCase().includes('yes'))) {
          await handleDeploy();
          return;
        }
        
        // Use the real chat API - it will decide if it should generate a workflow
        const result = await sendChatMessage(messageText);
        
        if (result.success && result.data) {
          // The response format is { message, workflow, suggestions }
          const aiResponse = result.data.message || result.data.response;
          
          // Add AI response to chat
          const aiMessage = {
            id: Date.now().toString(),
            text: aiResponse,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, aiMessage]);
          
          // If the AI generated a workflow, show it
          if (result.data.workflow) {
            setWorkflow(result.data.workflow);
            setDeploymentStatus('idle');
          }
        } else {
          throw new Error(result.error || 'Chat failed');
        }
      } catch (error: any) {
        const errorMessage = {
          id: Date.now().toString(),
          text: `Error: ${error.message}. Please try again.`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsTyping(false);
      }
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
                        {message.isUser ? (
                          message.text
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                code: ({ children }) => <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>,
                                pre: ({ children }) => <pre className="bg-background/50 p-2 rounded overflow-x-auto">{children}</pre>,
                              }}
                            >
                              {message.text}
                            </ReactMarkdown>
                          </div>
                        )}
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
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Workflow Graph</h2>
                    <p className="text-sm text-muted-foreground">
                      {workflow ? `${workflow.nodes?.length || 0} nodes` : 'Waiting for generation...'}
                    </p>
                  </div>
                  {workflow && deploymentStatus !== 'success' && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleSave}
                        variant="outline"
                        size="sm"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={handleDeployClick}
                        disabled={deploymentStatus === 'deploying'}
                        className="bg-primary text-primary-foreground"
                      >
                        {deploymentStatus === 'deploying' ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Deploy Workflow
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {deploymentStatus === 'success' && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', duration: 0.5 }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500 rounded-lg"
                    >
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 0.5 }}
                      >
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </motion.div>
                      <div>
                        <span className="text-sm font-bold text-green-600">Deployed Successfully!</span>
                        <p className="text-xs text-green-600/80">Your workflow is now live</p>
                      </div>
                    </motion.div>
                  )}
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
                <div className="flex-1 relative overflow-hidden">
                  {workflow && workflow.nodes && workflow.nodes.length > 0 ? (
                    <WorkflowCanvas 
                      workflow={workflow} 
                      isGenerating={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center space-y-4 relative z-10">
                        <div className="w-16 h-16 rounded-full bg-accent mx-auto flex items-center justify-center">
                          {deploymentStatus === 'generating' ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          ) : (
                            <Sparkles className="w-8 h-8 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground mb-2">
                            {deploymentStatus === 'generating' ? 'Generating workflow...' : 'Waiting for workflow'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {deploymentStatus === 'generating' 
                              ? 'The AI is creating automation nodes' 
                              : 'Chat with the AI to describe your automation'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Success Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', duration: 0.8 }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-3xl p-12 shadow-2xl"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-8xl mb-4"
                >
                  🎉
                </motion.div>
                <h2 className="text-4xl font-bold mb-2">Success!</h2>
                <p className="text-xl">Your workflow is now live!</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Dialog */}
      <LoginDialog
        isOpen={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
