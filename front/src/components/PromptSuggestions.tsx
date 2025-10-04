'use client';

import { Mail, MessageSquare, Database, Twitter, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
}

const suggestions = [
  {
    icon: Mail,
    text: "Send email when form is submitted",
    prompt: "Create a workflow that sends an email notification whenever someone submits a contact form on my website"
  },
  {
    icon: MessageSquare,
    text: "Post to Slack channel daily at 9am",
    prompt: "Set up a workflow that posts a daily standup reminder to our #general Slack channel every weekday at 9am"
  },
  {
    icon: Database,
    text: "Sync Google Sheets to database",
    prompt: "Build a workflow that automatically syncs new rows from a Google Sheet to my database every hour"
  },
  {
    icon: Twitter,
    text: "Tweet when new blog post is published",
    prompt: "Create a workflow that automatically tweets a summary when I publish a new blog post on my website"
  },
  {
    icon: Calendar,
    text: "Create calendar events from emails",
    prompt: "Set up a workflow that scans my emails for meeting requests and automatically creates calendar events"
  },
  {
    icon: FileText,
    text: "Generate weekly reports",
    prompt: "Build a workflow that generates and emails a weekly analytics report every Monday morning"
  }
];

export function PromptSuggestions({ onSelect }: PromptSuggestionsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-600 text-center">
        Try one of these examples:
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <Button
              key={index}
              variant="outline"
              onClick={() => onSelect(suggestion.prompt)}
              className="h-auto p-4 flex items-start gap-3 hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-purple-200 transition-colors">
                <Icon size={16} className="text-blue-600" />
              </div>
              <span className="text-sm text-left font-normal text-gray-700 group-hover:text-gray-900">
                {suggestion.text}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
