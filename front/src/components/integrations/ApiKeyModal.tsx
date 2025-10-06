'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Loader2 } from 'lucide-react';

interface Field {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  description?: string;
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    fields: Field[];
    setupGuideUrl?: string;
  };
  onSubmit: (data: Record<string, string>) => Promise<void>;
}

export function ApiKeyModal({ isOpen, onClose, service, onSubmit }: ApiKeyModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setFormData({});
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:to-black border border-gray-300 dark:border-white/20 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${service.color}20` }}
                    >
                      {service.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-black dark:text-white">Connect {service.name}</h2>
                      <p className="text-sm text-gray-600 dark:text-white/60">Enter your API credentials</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-black dark:text-white/60 dark:hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {service.setupGuideUrl && (
                  <a
                    href={service.setupGuideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View setup guide
                  </a>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {service.fields.map((field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-black dark:text-white/90 mb-2">
                        {field.label}
                        {field.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                      </label>
                      {field.description && (
                        <p className="text-xs text-gray-600 dark:text-white/60 mb-2">{field.description}</p>
                      )}
                      <input
                        type={field.type}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="w-full px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-black dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
                      />
                    </div>
                  ))}

                  {error && (
                    <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      onClick={onClose}
                      variant="outline"
                      className="flex-1 bg-gray-100 border-gray-300 hover:bg-gray-200 dark:bg-white/5 dark:border-white/20 dark:hover:bg-white/10"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      style={{ background: service.color }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
