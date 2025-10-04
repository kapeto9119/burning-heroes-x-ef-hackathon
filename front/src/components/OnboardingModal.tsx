'use client';

import { useState } from 'react';
import { MessageSquare, Sparkles, CheckCircle2, ArrowRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: MessageSquare,
    title: "Describe Your Workflow",
    description: "Tell us what you want to automate in plain English. No technical knowledge required.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Sparkles,
    title: "AI Generates It",
    description: "Our AI analyzes your request and creates a complete workflow with all necessary steps and connections.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: CheckCircle2,
    title: "Review & Deploy",
    description: "Review the generated workflow, make any adjustments, and deploy it with a single click.",
    color: "from-green-500 to-emerald-500"
  }
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <div className="relative">
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>

          {/* Progress indicator */}
          <div className="flex gap-2 p-6 pb-0">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  index <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="p-8 text-center">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${steps[currentStep].color} flex items-center justify-center shadow-lg`}>
              {(() => {
                const Icon = steps[currentStep].icon;
                return <Icon size={40} className="text-white" />;
              })()}
            </div>

            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold text-center">
                {steps[currentStep].title}
              </DialogTitle>
            </DialogHeader>

            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              {steps[currentStep].description}
            </p>

            {/* Navigation */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="px-6"
              >
                Skip
              </Button>
              <Button
                onClick={handleNext}
                className="px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>

            {/* Step indicator */}
            <p className="text-sm text-gray-500 mt-6">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
