'use client';

import { MessageSquare, Mail, Database, Calendar, Users, BarChart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TemplateGalleryProps {
  onSelectTemplate: (template: string) => void;
}

const templates = [
  {
    icon: MessageSquare,
    name: "Slack Notifications",
    description: "Send automated messages to Slack channels based on triggers",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-50",
    prompt: "Create a workflow that sends a Slack notification to #general when a new customer signs up"
  },
  {
    icon: Mail,
    name: "Email Automation",
    description: "Automate email campaigns and notifications",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50",
    prompt: "Set up an automated welcome email sequence for new subscribers"
  },
  {
    icon: Database,
    name: "Data Sync",
    description: "Keep your databases and spreadsheets in sync",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    prompt: "Sync data between Google Sheets and my PostgreSQL database every hour"
  },
  {
    icon: Calendar,
    name: "Meeting Scheduler",
    description: "Automate meeting scheduling and reminders",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
    prompt: "Create a workflow that schedules meetings and sends calendar invites automatically"
  },
  {
    icon: Users,
    name: "Customer Support",
    description: "Streamline customer support workflows",
    color: "from-indigo-500 to-purple-500",
    bgColor: "bg-indigo-50",
    prompt: "Build a customer support workflow that creates tickets from emails and assigns them to team members"
  },
  {
    icon: BarChart,
    name: "Analytics Reports",
    description: "Generate and distribute automated reports",
    color: "from-teal-500 to-green-500",
    bgColor: "bg-teal-50",
    prompt: "Generate a weekly analytics report and email it to stakeholders every Monday"
  }
];

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Popular Templates</h2>
        <p className="text-gray-600">Start with a pre-built template or create your own</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template, index) => {
          const Icon = template.icon;
          return (
            <Card 
              key={index}
              className="p-6 hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-300 group cursor-pointer"
            >
              <div className="space-y-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon size={28} className="text-white" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {template.description}
                  </p>
                </div>

                <Button 
                  onClick={() => onSelectTemplate(template.prompt)}
                  variant="outline" 
                  className="w-full group-hover:bg-blue-50 group-hover:border-blue-400 transition-colors"
                >
                  Use Template
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
