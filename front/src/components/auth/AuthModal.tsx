'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
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
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl rounded-3xl" />
              
              {/* Content */}
              <div className="relative bg-gradient-to-br from-gray-900 to-black dark:from-gray-900 dark:to-black from-white to-gray-50 border border-white/10 dark:border-white/10 border-gray-200 rounded-3xl shadow-2xl overflow-hidden">
                {/* Close button */}
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/10 dark:bg-white/10 bg-black/5 hover:bg-white/20 dark:hover:bg-white/20 hover:bg-black/10 rounded-full transition-colors backdrop-blur-sm"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-white dark:text-white text-gray-900" />
                </motion.button>

                {/* Form Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {mode === 'login' ? (
                      <LoginForm onSwitchToRegister={() => setMode('register')} />
                    ) : (
                      <RegisterForm onSwitchToLogin={() => setMode('login')} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
