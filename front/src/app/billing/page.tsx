'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  TrendingUp,
  Zap,
  AlertCircle,
  ExternalLink,
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react';

interface UsageData {
  plan_tier: string;
  executions_used: number;
  executions_limit: number;
  usage_percentage: number;
  active_workflows_count: number;
  active_workflows_limit: number;
  current_period_end: string;
  total_ai_cost_this_period: number;
  warnings: string[];
}

interface BillingHistory {
  id: string;
  amount_usd: number;
  plan_tier: string;
  status: string;
  paid_at: string;
  invoice_url: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [history, setHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login?redirect=/billing');
      return;
    }

    try {
      // Fetch usage
      const usageRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/usage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usageData = await usageRes.json();
      if (usageData.success) {
        setUsage(usageData.data);
      }

      // Fetch billing history
      const historyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const historyData = await historyRes.json();
      if (historyData.success) {
        setHistory(historyData.data);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openBillingPortal = async () => {
    setOpeningPortal(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/billing/portal`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        window.location.href = data.data.portalUrl;
      } else {
        alert(data.error || 'Failed to open billing portal');
        setOpeningPortal(false);
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal');
      setOpeningPortal(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPlanBadgeColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-gray-500';
      case 'starter': return 'bg-blue-500';
      case 'pro': return 'bg-purple-500';
      case 'business': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading billing data...</div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Failed to load billing data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Billing & Usage</h1>
            <p className="text-gray-300">Manage your subscription and track usage</p>
          </div>
          <button
            onClick={openBillingPortal}
            disabled={openingPortal}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            <CreditCard className="w-5 h-5" />
            {openingPortal ? 'Opening...' : 'Manage Billing'}
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Warnings */}
        {usage.warnings && usage.warnings.length > 0 && (
          <div className="mb-8 space-y-3">
            {usage.warnings.map((warning, idx) => (
              <div key={idx} className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-200">{warning}</p>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="text-yellow-400 hover:text-yellow-300 text-sm font-semibold mt-2 underline"
                  >
                    Upgrade Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Current Plan</h2>
              <div className="flex items-center gap-3">
                <span className={`${getPlanBadgeColor(usage.plan_tier)} text-white px-4 py-1 rounded-full text-sm font-bold uppercase`}>
                  {usage.plan_tier}
                </span>
                <span className="text-gray-400 text-sm">
                  Resets {new Date(usage.current_period_end).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push('/pricing')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Upgrade Plan
            </button>
          </div>

          {/* Usage Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Executions */}
            <div className="bg-white/5 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Executions</p>
                  <p className="text-white text-2xl font-bold">
                    {usage.executions_used.toLocaleString()} / {usage.executions_limit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getUsageColor(usage.usage_percentage)}`}
                  style={{ width: `${Math.min(usage.usage_percentage, 100)}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {usage.usage_percentage.toFixed(1)}% used
              </p>
            </div>

            {/* Active Workflows */}
            <div className="bg-white/5 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Active Workflows</p>
                  <p className="text-white text-2xl font-bold">
                    {usage.active_workflows_count} / {usage.active_workflows_limit === 999 ? '∞' : usage.active_workflows_limit}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-purple-500 transition-all"
                  style={{ 
                    width: usage.active_workflows_limit === 999 
                      ? '0%' 
                      : `${Math.min((usage.active_workflows_count / usage.active_workflows_limit) * 100, 100)}%` 
                  }}
                />
              </div>
              <p className="text-gray-400 text-sm mt-2">
                {usage.active_workflows_limit === 999 ? 'Unlimited' : `${usage.active_workflows_count} active`}
              </p>
            </div>

            {/* AI Cost */}
            <div className="bg-white/5 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">AI Cost This Period</p>
                  <p className="text-white text-2xl font-bold">
                    ${usage.total_ai_cost_this_period?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Included in your plan
              </p>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Billing History
          </h2>

          {history.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No billing history yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Your payment history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-white/5 rounded-lg p-4 flex items-center justify-between hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${
                      invoice.status === 'paid' ? 'bg-green-400' : 'bg-yellow-400'
                    }`} />
                    <div>
                      <p className="text-white font-semibold">
                        ${invoice.amount_usd} - {invoice.plan_tier.toUpperCase()}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {new Date(invoice.paid_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {invoice.invoice_url && (
                    <a
                      href={invoice.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
                    >
                      View Invoice
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
