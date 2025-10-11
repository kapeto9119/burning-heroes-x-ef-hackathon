'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Zap, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeploySuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  deploymentData?: {
    workflowId?: string;
    n8nWorkflowId?: string;
    webhookUrl?: string;
  };
}

export function DeploySuccessModal({ 
  isOpen, 
  onClose, 
  workflowName,
  deploymentData 
}: DeploySuccessModalProps) {
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-md pointer-events-auto"
            >
              {/* Content */}
              <div className="relative backdrop-blur-xl bg-background/95 border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent pointer-events-none" />
                
                {/* Close button */}
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-accent hover:bg-accent/80 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-foreground" />
                </motion.button>

                {/* Content */}
                <div className="relative p-8">
                  {/* Success Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center"
                  >
                    <CheckCircle className="w-8 h-8 text-white" />
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent"
                  >
                    Deployment Successful!
                  </motion.h2>

                  {/* Workflow name */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-center text-muted-foreground mb-6"
                  >
                    <span className="font-semibold text-foreground">"{workflowName}"</span> has been deployed to n8n and is ready to use.
                  </motion.p>

                  {/* Deployment details */}
                  {deploymentData && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="space-y-3 mb-6"
                    >
                      {deploymentData.n8nWorkflowId && (
                        <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg border border-border/50">
                          <span className="text-sm text-muted-foreground">n8n Workflow ID</span>
                          <span className="text-sm font-mono text-foreground">{deploymentData.n8nWorkflowId}</span>
                        </div>
                      )}
                      
                      {deploymentData.webhookUrl && (
                        <div className="p-3 bg-accent/50 rounded-lg border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Webhook URL</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(deploymentData.webhookUrl!);
                              }}
                              className="text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              Copy
                            </button>
                          </div>
                          <code className="text-xs font-mono text-foreground break-all">
                            {deploymentData.webhookUrl}
                          </code>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Actions */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-3"
                  >
                    <Button
                      onClick={onClose}
                      variant="outline"
                      className="flex-1"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        window.open(process.env.NEXT_PUBLIC_N8N_URL || 'http://localhost:5678', '_blank');
                      }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in n8n
                    </Button>
                  </motion.div>

                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
