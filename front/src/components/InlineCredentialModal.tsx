'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle, Loader2, Key, ExternalLink, BookOpen, Lock } from 'lucide-react';
import { addCredentials, getCredentials } from '@/app/actions/auth';
import { CredentialTutorial } from '@/components/CredentialTutorials';

export interface CredentialRequirement {
  service: string;
  n8nCredentialType: string;
  required: boolean;
  fields: CredentialField[];
  nodeType: string;
  nodeName: string;
}

export interface CredentialField {
  name: string;
  type: 'string' | 'password' | 'number' | 'boolean' | 'oauth';
  required: boolean;
  description?: string;
  placeholder?: string;
}

interface InlineCredentialModalProps {
  missingCredentials: CredentialRequirement[];
  onComplete: () => void;
  onCancel: () => void;
}

// Service configuration for UI
const serviceConfig: Record<string, { color: string; setupGuide?: string }> = {
  'Slack': {
    color: 'from-purple-500 to-pink-500',
    setupGuide: 'https://api.slack.com/apps'
  },
  'Gmail': {
    color: 'from-red-500 to-orange-500',
    setupGuide: 'https://myaccount.google.com/apppasswords'
  },
  'Email (SMTP)': {
    color: 'from-blue-500 to-cyan-500'
  },
  'PostgreSQL': {
    color: 'from-indigo-500 to-blue-500'
  },
  'Google Sheets': {
    color: 'from-green-500 to-emerald-500',
    setupGuide: 'https://console.cloud.google.com/apis/credentials'
  },
  'HubSpot': {
    color: 'from-orange-500 to-red-500',
    setupGuide: 'https://app.hubspot.com/private-apps'
  },
  'SendGrid': {
    color: 'from-blue-600 to-cyan-600',
    setupGuide: 'https://app.sendgrid.com/settings/api_keys'
  },
};

export function InlineCredentialModal({ 
  missingCredentials, 
  onComplete, 
  onCancel 
}: InlineCredentialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedServices, setCompletedServices] = useState<Set<string>>(new Set());
  const [showTutorial, setShowTutorial] = useState(true);
  const [isCheckingExisting, setIsCheckingExisting] = useState(true);

  const currentRequirement = missingCredentials[currentStep];
  const isLastStep = currentStep === missingCredentials.length - 1;

  // Check if user already has credentials for this service
  useEffect(() => {
    const checkExistingCredentials = async () => {
      if (!currentRequirement) return;
      
      setIsCheckingExisting(true);
      try {
        const serviceId = currentRequirement.service.toLowerCase().replace(/\s+/g, '').replace(/[()]/g, '');
        const result = await getCredentials(serviceId);
        
        if (result.success && result.data) {
          // User already has credentials for this service
          console.log(`[InlineCredentialModal] User already has ${currentRequirement.service} credentials`);
          setCompletedServices(prev => new Set(prev).add(currentRequirement.service));
          
          // Auto-skip to next
          if (isLastStep) {
            onComplete();
          } else {
            setTimeout(() => setCurrentStep(prev => prev + 1), 500);
          }
        }
      } catch (err) {
        console.log(`[InlineCredentialModal] No existing credentials for ${currentRequirement.service}`);
      } finally {
        setIsCheckingExisting(false);
      }
    };

    checkExistingCredentials();
  }, [currentStep, currentRequirement]);

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
          // All credentials added - proceed with deployment
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
      // Skip and deploy anyway (may fail if credentials are truly required)
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  if (!currentRequirement) {
    return null;
  }

  const config = serviceConfig[currentRequirement.service] || {
    color: 'from-gray-500 to-slate-500'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-background border border-border rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-lg`}>
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Authenticate {currentRequirement.service}</h2>
                <p className="text-sm text-muted-foreground">
                  Required for deployment • Step {currentStep + 1} of {missingCredentials.length}
                </p>
              </div>
            </div>
            
            {/* Node Info */}
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong>{currentRequirement.nodeName}</strong> requires {currentRequirement.service} credentials to function
              </p>
            </div>
          </div>
          
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex gap-2">
            {missingCredentials.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
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

        {/* Checking existing credentials */}
        {isCheckingExisting ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Checking existing credentials...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tutorial Toggle */}
            <div className="mb-4">
              <button
                onClick={() => setShowTutorial(!showTutorial)}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <BookOpen className="w-4 h-4" />
                {showTutorial ? 'Hide' : 'Show'} setup guide
              </button>
            </div>

            {/* Tutorial Section */}
            <AnimatePresence>
              {showTutorial && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="p-4 rounded-xl bg-accent/50 border border-border">
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
                  className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-500 mb-1">Authentication Failed</p>
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-accent/30 rounded-xl p-4 border border-border">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  Enter Credentials
                </h3>
                
                {currentRequirement.fields.map((field) => (
                  <div key={field.name} className="mb-4 last:mb-0">
                    <label className="block text-sm font-medium mb-2">
                      {field.description || field.name}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'oauth' ? (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-500">
                        ⚠️ OAuth authentication requires a separate flow. Please set up credentials in Settings first.
                      </div>
                    ) : (
                      <input
                        type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Setup Guide Link */}
              {config.setupGuide && (
                <a
                  href={config.setupGuide}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open {currentRequirement.service} setup guide
                </a>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkipCurrent}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Skip for now
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : isLastStep ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete & Deploy
                    </>
                  ) : (
                    <>
                      Continue
                      <span className="ml-2">→</span>
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Completed Services */}
            {completedServices.size > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-3">Authenticated Services:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(completedServices).map((service) => (
                    <div
                      key={service}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-medium"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {service}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
