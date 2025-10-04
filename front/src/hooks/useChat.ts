'use client';

import { useState, useTransition } from 'react';
import { sendChatMessage, generateWorkflow } from '@/app/actions/chat';

export function useChat() {
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const sendMessage = async (message: string) => {
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    let result;
    startTransition(async () => {
      result = await sendChatMessage(message);
      
      if (result.success && result.data) {
        // Add assistant response
        setMessages(prev => [...prev, { role: 'assistant', content: result.data.response }]);
      }
    });

    return result;
  };

  const generateWorkflowFromDescription = async (description: string) => {
    let result;
    startTransition(async () => {
      result = await generateWorkflow(description);
    });
    return result;
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    isPending,
    sendMessage,
    generateWorkflow: generateWorkflowFromDescription,
    clearMessages,
  };
}
