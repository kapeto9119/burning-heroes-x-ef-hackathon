'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, Plus, Settings, Trash2 } from 'lucide-react';

interface IntegrationCardProps {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  category: string;
  authType: 'oauth2' | 'apiKey' | 'basic';
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  onConfigure?: () => void;
}

export function IntegrationCard({
  id,
  name,
  icon,
  color,
  description,
  category,
  authType,
  isConnected,
  onConnect,
  onDisconnect,
  onConfigure
}: IntegrationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity rounded-xl blur-xl"
           style={{ background: `linear-gradient(to right, ${color}, ${color}40)` }} />
      
      <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:border-white/40 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${color}20` }}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-white">{name}</h3>
              <p className="text-xs text-white/60 capitalize">{category}</p>
            </div>
          </div>
          
          {isConnected && (
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Connected</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-white/70 mb-4 line-clamp-2">
          {description}
        </p>

        {/* Auth Type Badge */}
        <div className="mb-4">
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/10 text-white/80">
            {authType === 'oauth2' ? '🔐 OAuth' : '🔑 API Key'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button
              onClick={onConnect}
              className="flex-1"
              style={{ background: color }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Connect
            </Button>
          ) : (
            <>
              {onConfigure && (
                <Button
                  onClick={onConfigure}
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/20 hover:bg-white/10"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              )}
              {onDisconnect && (
                <Button
                  onClick={onDisconnect}
                  variant="outline"
                  className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
