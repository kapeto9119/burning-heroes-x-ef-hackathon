'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Workflow, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateGallery } from '@/components/TemplateGallery';

export default function TemplatesPage() {
  const router = useRouter();

  const handleSelectTemplate = (prompt: string) => {
    // In a real app, you'd pass this to the chat page
    // For now, navigate to chat
    router.push('/chat');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
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
          <Link href="/chat">
            <Button variant="outline" size="sm">
              Create Custom
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <TemplateGallery onSelectTemplate={handleSelectTemplate} />
      </main>
    </div>
  );
}
