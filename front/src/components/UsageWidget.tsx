'use client';

import { useState, useEffect } from 'react';
import { Zap, TrendingUp, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UsageData {
  plan_tier: string;
  executions_used: number;
  executions_limit: number;
  usage_percentage: number;
  active_workflows_count: number;
  active_workflows_limit: number;
}

export default function UsageWidget() {
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsage = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/usage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUsage(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return null;
  }

  const isNearLimit = usage.usage_percentage >= 80;
  const isAtLimit = usage.usage_percentage >= 100;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-semibold">Usage</span>
        </div>
        <span className="text-xs text-gray-400 uppercase font-bold">
          {usage.plan_tier}
        </span>
      </div>

      {/* Executions Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Executions</span>
          <span className="text-sm text-white font-semibold">
            {usage.executions_used} / {usage.executions_limit}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isAtLimit
                ? 'bg-red-500'
                : isNearLimit
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(usage.usage_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Workflows */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Active Workflows</span>
          <span className="text-sm text-white font-semibold">
            {usage.active_workflows_count} / {usage.active_workflows_limit === 999 ? '∞' : usage.active_workflows_limit}
          </span>
        </div>
      </div>

      {/* Warning/CTA */}
      {isNearLimit && (
        <div className={`rounded-lg p-3 flex items-start gap-2 ${
          isAtLimit ? 'bg-red-500/20 border border-red-500/50' : 'bg-yellow-500/20 border border-yellow-500/50'
        }`}>
          <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
            isAtLimit ? 'text-red-400' : 'text-yellow-400'
          }`} />
          <div className="flex-1">
            <p className={`text-xs ${isAtLimit ? 'text-red-200' : 'text-yellow-200'}`}>
              {isAtLimit
                ? 'Limit reached! Upgrade to continue.'
                : `You've used ${usage.usage_percentage.toFixed(0)}% of your limit.`}
            </p>
            <button
              onClick={() => router.push('/pricing')}
              className={`text-xs font-semibold mt-1 underline ${
                isAtLimit ? 'text-red-300 hover:text-red-200' : 'text-yellow-300 hover:text-yellow-200'
              }`}
            >
              Upgrade Now →
            </button>
          </div>
        </div>
      )}

      {/* View Details */}
      <button
        onClick={() => router.push('/billing')}
        className="w-full mt-3 text-center text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center justify-center gap-1"
      >
        <TrendingUp className="w-4 h-4" />
        View Details
      </button>
    </div>
  );
}
