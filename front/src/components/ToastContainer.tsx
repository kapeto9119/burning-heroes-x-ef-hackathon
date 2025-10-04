'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkflow } from '@/contexts/WorkflowContext';

export function ToastContainer() {
  const { toasts, removeToast } = useWorkflow();

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={cn(
              'backdrop-blur-xl rounded-lg shadow-lg border p-4',
              toast.type === 'success' && 'bg-green-500/90 border-green-600 text-white',
              toast.type === 'error' && 'bg-red-500/90 border-red-600 text-white',
              toast.type === 'confirm' && 'bg-background/95 border-border'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{toast.message}</p>
              </div>
              {toast.type === 'confirm' ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.onConfirm?.();
                      removeToast(toast.id);
                    }}
                    className="h-7 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeToast(toast.id)}
                    className="h-7 px-3"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-current hover:opacity-70 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
