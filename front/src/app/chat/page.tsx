'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Workflow, ArrowLeft, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInput } from '@/components/ChatInput';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusMessage } from '@/components/StatusMessage';
import { OnboardingModal } from '@/components/OnboardingModal';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; message: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Show onboarding on first visit
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  const handleSendMessage = async (text: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setStatus(null);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I'll help you create that workflow! Here's what I understand:\n\n${text}\n\nI'm generating the workflow nodes and connections now. This will include the necessary triggers, actions, and data transformations.`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      setStatus({ 
        type: 'success', 
        message: 'Workflow generated successfully! Review it below.' 
      });
    }, 2000);
  };

  return (
    <>
      <OnboardingModal isOpen={showOnboarding} onClose={handleCloseOnboarding} />
      
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
        {/* Header */}
        <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Workflow className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                WorkflowAI
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Save Workflow
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          {/* Status Message */}
          {status && (
            <div className="p-4 border-b">
              <StatusMessage type={status.type} message={status.message} />
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <EmptyState onSelectPrompt={handleSendMessage} />
            ) : (
              <>
                {messages.map((message) => (
                  <div 
                    key={message.id}
                    className={`flex gap-3 mb-6 ${message.isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                      message.isUser 
                        ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
                        : 'bg-gradient-to-br from-gray-200 to-gray-300'
                    }`}>
                      {message.isUser ? (
                        <User size={20} className="text-white" />
                      ) : (
                        <Bot size={20} className="text-gray-700" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className={`max-w-[75%] ${message.isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`rounded-2xl px-5 py-3 shadow-sm ${
                        message.isUser 
                          ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-br-md' 
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                      </div>
                      {message.timestamp && (
                        <span className={`text-xs text-gray-500 px-2 ${message.isUser ? 'text-right' : 'text-left'}`}>
                          {message.timestamp}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <LoadingSpinner />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-gray-50 p-6">
            <ChatInput 
              onSend={handleSendMessage} 
              isLoading={isLoading}
            />
          </div>
        </div>
      </main>
      </div>
    </>
  );
}
