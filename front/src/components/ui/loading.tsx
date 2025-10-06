'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* Spinning gradient ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-1"
            >
              <div className="w-full h-full bg-gray-900 rounded-full" />
            </motion.div>
            
            {/* Center icon */}
            <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-white animate-spin" />
          </div>
          
          <p className="text-white font-medium">{message}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`${sizes[size]} animate-spin ${className}`} />
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-white/10 rounded ${className}`} />
  );
}

export function IntegrationCardSkeleton() {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-16 h-3" />
          </div>
        </div>
      </div>
      <Skeleton className="w-full h-10 mb-4" />
      <Skeleton className="w-20 h-6 mb-4" />
      <Skeleton className="w-full h-10" />
    </div>
  );
}
