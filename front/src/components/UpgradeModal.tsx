'use client';

import { useState } from 'react';
import { X, Zap, ArrowRight, AlertCircle } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  currentPlan?: string;
  executionsUsed?: number;
  executionsLimit?: number;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  reason,
  currentPlan = 'free',
  executionsUsed = 0,
  executionsLimit = 10
}: UpgradeModalProps) {
  const [upgrading, setUpgrading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async (planTier: string) => {
    setUpgrading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planTier })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to create checkout session');
        setUpgrading(false);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start upgrade process');
      setUpgrading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-2xl max-w-2xl w-full p-8 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Execution Limit Reached
          </h2>
          <p className="text-gray-300">
            {reason || `You've used ${executionsUsed}/${executionsLimit} executions this month`}
          </p>
        </div>

        {/* Current Usage */}
        <div className="bg-white/10 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300">Current Plan</span>
            <span className="text-white font-bold uppercase">{currentPlan}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500"
              style={{ width: `${Math.min((executionsUsed / executionsLimit) * 100, 100)}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm">
            {executionsUsed} / {executionsLimit} executions used
          </p>
        </div>

        {/* Upgrade Options */}
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Choose a plan to continue:</h3>

          {/* Starter */}
          <button
            onClick={() => handleUpgrade('starter')}
            disabled={upgrading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-6 text-left transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold mb-1">Starter</h4>
                <p className="text-blue-100 text-sm mb-2">Perfect for individuals</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">$9</span>
                  <span className="text-blue-200">/month</span>
                </div>
              </div>
              <ArrowRight className="w-6 h-6" />
            </div>
            <div className="mt-4 pt-4 border-t border-blue-400/30">
              <ul className="space-y-2 text-sm text-blue-100">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  100 executions/month
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  5 active workflows
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  GPT-4o, DALL-E 3
                </li>
              </ul>
            </div>
          </button>

          {/* Pro */}
          <button
            onClick={() => handleUpgrade('pro')}
            disabled={upgrading}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-6 text-left transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-purple-400"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xl font-bold">Pro</h4>
                  <span className="bg-yellow-400 text-purple-900 px-2 py-0.5 rounded-full text-xs font-bold">
                    POPULAR
                  </span>
                </div>
                <p className="text-purple-100 text-sm mb-2">For power users</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-purple-200">/month</span>
                </div>
              </div>
              <ArrowRight className="w-6 h-6" />
            </div>
            <div className="mt-4 pt-4 border-t border-purple-400/30">
              <ul className="space-y-2 text-sm text-purple-100">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  500 executions/month
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  20 active workflows
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  All AI models + Priority support
                </li>
              </ul>
            </div>
          </button>

          {/* Business */}
          <button
            onClick={() => handleUpgrade('business')}
            disabled={upgrading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl p-6 text-left transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold mb-1">Business</h4>
                <p className="text-amber-100 text-sm mb-2">For teams & enterprises</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">$99</span>
                  <span className="text-amber-200">/month</span>
                </div>
              </div>
              <ArrowRight className="w-6 h-6" />
            </div>
            <div className="mt-4 pt-4 border-t border-amber-400/30">
              <ul className="space-y-2 text-sm text-amber-100">
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  2,000 executions/month
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Unlimited workflows
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  All models + Dedicated support
                </li>
              </ul>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
