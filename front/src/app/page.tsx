'use client';

import Link from "next/link";
import { Sparkles, Zap, Shield, ArrowRight, Workflow, MessageSquare, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    generateBackgroundVideo();
  }, []);

  const generateBackgroundVideo = async () => {
    setIsGenerating(true);
    try {
      // Use the provided cyberpunk image
      const imageUrl = 'https://thumbnews.nateimg.co.kr/view610///news.nateimg.co.kr/orgImg/ch/2025/07/17/ch_1752730630861_328230_0.jpg';
      
      // Step 1: Request video generation
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl })
      });

      const { jobId, error } = await response.json();
      
      if (error) {
        console.error('Failed to start video generation:', error);
        return;
      }

      // Step 2: Poll for results
      const pollInterval = setInterval(async () => {
        const checkResponse = await fetch(`/api/check-video?jobId=${jobId}`);
        const result = await checkResponse.json();

        if (result.status === 'completed' && result.result_url) {
          setVideoUrl(result.result_url);
          setIsGenerating(false);
          clearInterval(pollInterval);
        } else if (result.status === 'failed') {
          console.error('Video generation failed:', result.error);
          setIsGenerating(false);
          clearInterval(pollInterval);
        }
      }, 3000); // Check every 3 seconds

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsGenerating(false);
      }, 120000);
    } catch (error) {
      console.error('Error generating video:', error);
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Background Video */}
      {videoUrl && (
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-40"
            src={videoUrl}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        </div>
      )}

      {/* Fallback gradient while video loads */}
      {!videoUrl && (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-orange-600/20 via-red-600/20 to-yellow-600/20 animate-pulse" />
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              WorkflowAI
            </span>
          </div>
          <Link href="/chat">
            <Button variant="outline" size="sm">
              Try It Now
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            AI-Powered Automation
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Build Workflows with{" "}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              AI in Seconds
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Just describe what you want. Our AI creates the complete automation workflow for you. 
            No coding required.
          </p>
          
          <div className="flex gap-4 items-center justify-center flex-col sm:flex-row pt-4">
            <Link href="/chat">
              <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/templates">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                View Examples
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Automation Made Simple
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful features that make workflow creation effortless
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Natural Language</h3>
            <p className="text-gray-600">
              Describe your workflow in plain English. No technical jargon needed.
            </p>
          </Card>

          {/* Feature 2 */}
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-purple-200">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Generation</h3>
            <p className="text-gray-600">
              AI generates complete workflows in seconds, ready to deploy.
            </p>
          </Card>

          {/* Feature 3 */}
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-green-200">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
              <Workflow className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Visual Editor</h3>
            <p className="text-gray-600">
              See your workflow visualized as a graph. Edit and customize easily.
            </p>
          </Card>

          {/* Feature 4 */}
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-orange-200">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure & Reliable</h3>
            <p className="text-gray-600">
              Enterprise-grade security with reliable execution every time.
            </p>
          </Card>

          {/* Feature 5 */}
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-pink-200">
            <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center mb-4">
              <Code2 className="w-6 h-6 text-pink-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Powered by n8n</h3>
            <p className="text-gray-600">
              Built on n8n's powerful automation platform with 400+ integrations.
            </p>
          </Card>

          {/* Feature 6 */}
          <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-teal-200">
            <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Templates</h3>
            <p className="text-gray-600">
              Start from pre-built templates or create custom workflows from scratch.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Automate Your Workflows?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of users who are building smarter, faster with AI
          </p>
          <Link href="/chat">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Start Building Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Workflow className="w-6 h-6 text-blue-600" />
                <span className="text-lg font-bold">WorkflowAI</span>
              </div>
              <p className="text-sm text-gray-600">
                AI-powered workflow automation for everyone
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/chat" className="hover:text-blue-600 transition">Get Started</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition">Templates</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition">Pricing</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="#" className="hover:text-blue-600 transition">Documentation</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition">API Reference</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="#" className="hover:text-blue-600 transition">About</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-blue-600 transition">GitHub</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
            <p>Built with n8n-MCP • © 2025 WorkflowAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
