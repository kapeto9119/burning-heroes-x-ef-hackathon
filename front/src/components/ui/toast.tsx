'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, description?: string) => void;
  success: (message: string, description?: string) => void;
  error: (message: string, description?: string) => void;
  warning: (message: string, description?: string) => void;
  info: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, description?: string) => {
    const id = Math.random().toString(36).substring(7);
    const toast: Toast = { id, type, message, description };
    
    setToasts(prev => [...prev, toast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const success = useCallback((message: string, description?: string) => {
    showToast('success', message, description);
  }, [showToast]);

  const error = useCallback((message: string, description?: string) => {
    showToast('error', message, description);
  }, [showToast]);

  const warning = useCallback((message: string, description?: string) => {
    showToast('warning', message, description);
  }, [showToast]);

  const info = useCallback((message: string, description?: string) => {
    showToast('info', message, description);
  }, [showToast]);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  };

  const colors = {
    success: 'from-green-500 to-emerald-500',
    error: 'from-red-500 to-rose-500',
    warning: 'from-yellow-500 to-orange-500',
    info: 'from-blue-500 to-cyan-500'
  };

  const Icon = icons[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      className="pointer-events-auto"
    >
      <div className="relative group">
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${colors[toast.type]} opacity-20 blur-xl rounded-xl`} />
        
        {/* Toast content */}
        <div className="relative bg-gray-900/95 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-2xl min-w-[320px] max-w-md">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-5 h-5 bg-gradient-to-r ${colors[toast.type]} rounded-full p-0.5`}>
              <Icon className="w-full h-full text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">
                {toast.message}
              </p>
              {toast.description && (
                <p className="text-white/70 text-xs mt-1">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="flex-shrink-0 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: 'linear' }}
            className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${colors[toast.type]} rounded-b-xl`}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
