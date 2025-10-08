"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CreditCard,
  TrendingUp,
  Zap,
  AlertCircle,
  ExternalLink,
  Calendar,
  DollarSign,
  Activity,
  Loader2,
} from "lucide-react";
import { getClientToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { Navbar } from "@/components/layout/Navbar";
import { Background } from "@/components/layout/Background";
import { Button } from "@/components/ui/button";

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [history, setHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [billingConfigured, setBillingConfigured] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        setLoading(false);
      } else {
        fetchData();
      }
    }
  }, [authLoading, isAuthenticated]);

  const fetchData = async () => {
    const token = getClientToken();
    if (!token) {
      setShowAuthModal(true);
      setLoading(false);
      return;
    }

    try {
      // Fetch usage
      const usageRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/billing/usage`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const usageData = await usageRes.json();
      
      // Check if billing is not configured (503 error)
      if (usageRes.status === 503 || usageData.error?.includes('not configured')) {
        setBillingConfigured(false);
        // Set default usage data for display purposes
        setUsage({
          plan_tier: 'free',
          executions_used: 0,
          executions_limit: 100,
          usage_percentage: 0,
          active_workflows_count: 0,
          active_workflows_limit: 3,
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          total_ai_cost_this_period: 0,
          warnings: []
        });
      } else if (usageData.success) {
        setUsage(usageData.data);
        setBillingConfigured(true);
      }

      // Fetch billing history (only if billing is configured)
      if (usageRes.status !== 503) {
        const historyRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/billing/history`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const historyData = await historyRes.json();
        if (historyData.success) {
          setHistory(historyData.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
      // Set default data even on error
      setUsage({
        plan_tier: 'free',
        executions_used: 0,
        executions_limit: 100,
        usage_percentage: 0,
        active_workflows_count: 0,
        active_workflows_limit: 3,
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        total_ai_cost_this_period: 0,
        warnings: []
      });
      setBillingConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const openBillingPortal = async () => {
    setOpeningPortal(true);
    const token = getClientToken();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/billing/portal`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        window.location.href = data.data.portalUrl;
      } else {
        alert(data.error || "Failed to open billing portal");
        setOpeningPortal(false);
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal");
      setOpeningPortal(false);
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPlanBadgeColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-gray-500";
      case "starter":
        return "bg-blue-500";
      case "pro":
        return "bg-purple-500";
      case "business":
        return "bg-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  // Show auth modal if not authenticated
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
        <div className="fixed inset-0 w-full h-full">
          <Background />
        </div>
        <div className="relative z-10">
          <Navbar />
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center backdrop-blur-xl bg-background/40 rounded-2xl border border-border p-12"
            >
              <h1 className="text-3xl font-bold mb-4">Authentication Required</h1>
              <p className="text-muted-foreground mb-6">Please log in to view your billing information</p>
              <Button onClick={() => setShowAuthModal(true)}>
                Log In
              </Button>
            </motion.div>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            router.push('/');
          }}
        />
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
        <div className="fixed inset-0 w-full h-full">
          <Background />
        </div>
        <div className="relative z-10">
          <Navbar />
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
        <div className="fixed inset-0 w-full h-full">
          <Background />
        </div>
        <div className="relative z-10">
          <Navbar />
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center backdrop-blur-xl bg-background/40 rounded-2xl border border-border p-12"
            >
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <p className="text-xl">Failed to load billing data</p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 w-full h-full">
        <Background />
      </div>

      <div className="relative z-10">
        <Navbar />

        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Billing & Usage
                </h1>
                <p className="text-muted-foreground">
                  Manage your subscription and track usage
                </p>
              </div>
              {billingConfigured && (
                <Button
                  onClick={openBillingPortal}
                  disabled={openingPortal}
                  variant="outline"
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  {openingPortal ? "Opening..." : "Manage Billing"}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            {/* Billing Not Configured Notice */}
            {!billingConfigured && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-2">Billing Not Configured</h3>
                    <p className="text-muted-foreground text-sm">
                      Payment processing is currently not configured on this instance. You're using the free tier with default limits.
                      Contact your administrator to set up billing and unlock premium features.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Warnings */}
            {usage.warnings && usage.warnings.length > 0 && (
              <div className="space-y-3">
                {usage.warnings.map((warning, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    className="backdrop-blur-xl bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p>{warning}</p>
                      {billingConfigured && (
                        <Button
                          variant="link"
                          onClick={() => router.push("/pricing")}
                          className="text-yellow-500 hover:text-yellow-600 p-0 h-auto mt-2"
                        >
                          Upgrade Now →
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Current Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="backdrop-blur-xl bg-background/40 rounded-2xl p-8 border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    Current Plan
                  </h2>
                  <div className="flex items-center gap-3">
                    <span
                      className={`${getPlanBadgeColor(
                        usage.plan_tier
                      )} text-white px-4 py-1 rounded-full text-sm font-bold uppercase`}
                    >
                      {usage.plan_tier}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      Resets{" "}
                      {new Date(usage.current_period_end).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {billingConfigured && (
                  <Button
                    onClick={() => router.push("/pricing")}
                  >
                    Upgrade Plan
                  </Button>
                )}
              </div>

              {/* Usage Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Executions */}
                <div className="bg-accent/30 rounded-xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Executions</p>
                      <p className="text-2xl font-bold">
                        {Number(usage.executions_used).toLocaleString()} /{" "}
                        {Number(usage.executions_limit).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getUsageColor(
                        Number(usage.usage_percentage) || 0
                      )}`}
                      style={{ width: `${Math.min(Number(usage.usage_percentage) || 0, 100)}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">
                    {(Number(usage.usage_percentage) || 0).toFixed(1)}% used
                  </p>
                </div>

                {/* Active Workflows */}
                <div className="bg-accent/30 rounded-xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Active Workflows</p>
                      <p className="text-2xl font-bold">
                        {Number(usage.active_workflows_count)} /{" "}
                        {Number(usage.active_workflows_limit) === 999
                          ? "∞"
                          : Number(usage.active_workflows_limit)}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-purple-500 transition-all"
                      style={{
                        width:
                          Number(usage.active_workflows_limit) === 999
                            ? "0%"
                            : `${Math.min(
                                (Number(usage.active_workflows_count) /
                                  Number(usage.active_workflows_limit)) *
                                  100,
                                100
                              )}%`,
                      }}
                    />
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">
                    {Number(usage.active_workflows_limit) === 999
                      ? "Unlimited"
                      : `${Number(usage.active_workflows_count)} active`}
                  </p>
                </div>

                {/* AI Cost */}
                <div className="bg-accent/30 rounded-xl p-6 border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">AI Cost This Period</p>
                      <p className="text-2xl font-bold">
                        ${(Number(usage.total_ai_cost_this_period) || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">Included in your plan</p>
                </div>
              </div>
            </motion.div>

            {/* Billing History */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="backdrop-blur-xl bg-background/40 rounded-2xl p-8 border border-border"
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Billing History
              </h2>

              {history.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No billing history yet</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Your payment history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="bg-accent/30 rounded-lg p-4 flex items-center justify-between hover:bg-accent/50 transition-all border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            invoice.status === "paid"
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }`}
                        />
                        <div>
                          <p className="font-semibold">
                            ${Number(invoice.amount_usd).toFixed(2)} -{" "}
                            {invoice.plan_tier.toUpperCase()}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {new Date(invoice.paid_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {invoice.invoice_url && (
                        <a
                          href={invoice.invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                        >
                          View Invoice
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          router.push('/');
        }}
      />
    </div>
  );
}
