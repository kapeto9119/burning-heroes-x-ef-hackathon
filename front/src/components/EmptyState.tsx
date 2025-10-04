'use client';

import { Sparkles } from 'lucide-react';
import { PromptSuggestions } from './PromptSuggestions';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 space-y-8">
      <div className="text-center space-y-4 max-w-2xl">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
          <Sparkles size={40} className="text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          Let's Build Your Workflow
        </h2>
        <p className="text-lg text-gray-600">
          Describe what you want to automate in plain English, and our AI will create the complete workflow for you.
        </p>
      </div>
      
      <PromptSuggestions onSelect={onSelectPrompt} />
    </div>
  );
}
