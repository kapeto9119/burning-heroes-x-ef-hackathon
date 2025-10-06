'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle, Zap, Mail, Database, FileSpreadsheet, Key, ExternalLink, BookOpen } from 'lucide-react';
import { addCredentials } from '@/app/actions/auth';
import { CredentialTutorial } from '@/components/CredentialTutorials';

export interface CredentialRequirement {
  service: string;
  n8nCredentialType: string;
  required: boolean;
  fields: CredentialField[];
  nodeType: string;
}

export interface CredentialField {
  name: string;
  type: 'string' | 'password' | 'number' | 'boolean' | 'oauth';
  required: boolean;
  description?: string;
  placeholder?: string;
}

interface CredentialSetupModalProps {
  requirements: CredentialRequirement[];
  onComplete: () => void;
  onSkip?: () => void;
}

// Map service names to icons and colors
const serviceConfig: Record<string, { icon: any; color: string; setupGuide?: string }> = {
  'Slack': {
    icon: Zap,
    color: 'from-purple-500 to-pink-500',
    setupGuide: 'https://api.slack.com/apps'
  },
  'Gmail': {
    icon: Mail,
    color: 'from-red-500 to-orange-500',
    setupGuide: 'https://myaccount.google.com/apppasswords'
  },
  'Email (SMTP)': {
    icon: Mail,
    color: 'from-blue-500 to-cyan-500'
  },
  'PostgreSQL': {
    icon: Database,
    color: 'from-indigo-500 to-blue-500'
  },
  'Google Sheets': {
    icon: FileSpreadsheet,
    color: 'from-green-500 to-emerald-500',
    setupGuide: 'https://console.cloud.google.com/apis/credentials'
  },
};

export function CredentialSetupModal({ requirements, onComplete, onSkip }: CredentialSetupModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedServices, setCompletedServices] = useState<Set<string>>(new Set());
  const [showTutorial, setShowTutorial] = useState(true);

  const currentRequirement = requirements[currentStep];
  const isLastStep = currentStep === requirements.length - 1;
  const allCompleted = completedServices.size === requirements.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Map service name to credential ID (lowercase, no spaces)
      const serviceId = currentRequirement.service.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
      
      const result = await addCredentials(serviceId, formData);
      
      if (result.success) {
        setCompletedServices(prev => new Set(prev).add(currentRequirement.service));
        setFormData({});
        
        if (isLastStep) {
          // All credentials added
          onComplete();
        } else {
          // Move to next credential
          setCurrentStep(prev => prev + 1);
        }
      } else {
        setError(result.error || 'Failed to add credentials');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipCurrent = () => {
    setFormData({});
    setError(null);
    
    if (isLastStep) {
      onSkip?.();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  if (!currentRequirement) {
    return null;
  }

  const config = serviceConfig[currentRequirement.service] || {
    icon: Key,
    color: 'from-gray-500 to-slate-500'
  };
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Connect {currentRequirement.service}</h2>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {requirements.length}
              </p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex gap-2">
            {requirements.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  index < currentStep
                    ? 'bg-green-500'
                    : index === currentStep
                    ? 'bg-primary'
                    : 'bg-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Tutorial Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowTutorial(!showTutorial)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <BookOpen className="w-4 h-4" />
            {showTutorial ? 'Hide' : 'Show'} setup tutorial
          </button>
        </div>

        {/* Tutorial Section */}
        <AnimatePresence>
          {showTutorial && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-4 rounded-lg bg-accent/50 border border-border">
                <CredentialTutorial service={currentRequirement.service} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Enter Credentials</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {currentRequirement.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-2">
                {field.description || field.name}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              {field.type === 'oauth' ? (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-500">
                  OAuth tokens require authentication flow. Please use the full setup guide.
                </div>
              ) : (
                <input
                  type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  required={field.required}
                />
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipCurrent}
              className="flex-1"
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                'Connecting...'
              ) : isLastStep ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Setup
                </>
              ) : (
                'Next'
              )}
            </Button>
          </div>
        </form>

        {/* Completed Services */}
        {completedServices.size > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Completed:</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(completedServices).map((service) => (
                <div
                  key={service}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs"
                >
                  <CheckCircle className="w-3 h-3" />
                  {service}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
