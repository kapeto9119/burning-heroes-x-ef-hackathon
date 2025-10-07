"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClientToken } from "@/lib/auth";
import { Check, Zap, Sparkles, Rocket, Crown } from "lucide-react";

interface Plan {
  planTier: string;
  displayName: string;
  priceUsd: number;
  executionsPerMonth: number;
  activeWorkflowsLimit: number;
  allowedModels: string[];
  features: string[];
  description: string;
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/billing/plans`
      );
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planTier: string) => {
    if (planTier === "free") {
      return; // Can't upgrade to free
    }

    setUpgrading(planTier);

    try {
      const token = getClientToken();
      if (!token) {
        router.push("/login?redirect=/pricing");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/billing/checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ planTier }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Redirect to Stripe checkout
        window.location.href = data.data.checkoutUrl;
      } else {
        alert(data.error || "Failed to create checkout session");
        setUpgrading(null);
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to start upgrade process");
      setUpgrading(null);
    }
  };

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case "free":
        return <Zap className="w-8 h-8" />;
      case "starter":
        return <Sparkles className="w-8 h-8" />;
      case "pro":
        return <Rocket className="w-8 h-8" />;
      case "business":
        return <Crown className="w-8 h-8" />;
      default:
        return <Zap className="w-8 h-8" />;
    }
  };

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "from-gray-500 to-gray-600";
      case "starter":
        return "from-blue-500 to-blue-600";
      case "pro":
        return "from-purple-500 to-purple-600";
      case "business":
        return "from-amber-500 to-amber-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const formatFeature = (feature: string) => {
    const featureMap: Record<string, string> = {
      community_support: "Community Support",
      email_support: "Email Support",
      priority_support: "Priority Support",
      dedicated_support: "Dedicated Support",
      all_templates: "All Templates",
      priority_execution: "Priority Execution",
      advanced_analytics: "Advanced Analytics",
      team_features: "Team Features",
      custom_branding: "Custom Branding",
      sla_guarantee: "SLA Guarantee",
    };
    return featureMap[feature] || feature;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Start free, upgrade as you grow. All plans include AI-powered
            workflow automation.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const isPopular = plan.planTier === "pro";
            const isFree = plan.planTier === "free";

            return (
              <div
                key={plan.planTier}
                className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 transition-all hover:scale-105 ${
                  isPopular
                    ? "border-purple-500 shadow-2xl shadow-purple-500/50"
                    : "border-white/20"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getPlanColor(
                    plan.planTier
                  )} flex items-center justify-center text-white mb-6`}
                >
                  {getPlanIcon(plan.planTier)}
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-white mb-2">
                  {plan.displayName}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">
                    ${plan.priceUsd}
                  </span>
                  <span className="text-gray-400">/month</span>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-sm mb-6">{plan.description}</p>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-gray-300">
                    <Check className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-sm">
                      {plan.executionsPerMonth.toLocaleString()}{" "}
                      executions/month
                    </span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Check className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-sm">
                      {plan.activeWorkflowsLimit === 999
                        ? "Unlimited"
                        : plan.activeWorkflowsLimit}{" "}
                      active workflows
                    </span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <Check className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                    <span className="text-sm">
                      {plan.allowedModels.length} AI models
                    </span>
                  </div>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center text-gray-300">
                      <Check className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" />
                      <span className="text-sm">{formatFeature(feature)}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan.planTier)}
                  disabled={isFree || upgrading === plan.planTier}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isFree
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : isPopular
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {upgrading === plan.planTier
                    ? "Processing..."
                    : isFree
                    ? "Current Plan"
                    : `Upgrade to ${plan.displayName}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-left">
              <h3 className="text-xl font-bold text-white mb-2">
                What happens when I hit my limit?
              </h3>
              <p className="text-gray-300">
                Your workflows will pause until you upgrade or your monthly
                limit resets. You can upgrade anytime to continue immediately.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-left">
              <h3 className="text-xl font-bold text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-300">
                Yes! Cancel anytime from your billing dashboard. You'll keep
                access until the end of your billing period.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-left">
              <h3 className="text-xl font-bold text-white mb-2">
                Do I need my own API keys?
              </h3>
              <p className="text-gray-300">
                No! We provide all AI capabilities. Just create workflows and we
                handle the rest.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-left">
              <h3 className="text-xl font-bold text-white mb-2">
                What AI models are included?
              </h3>
              <p className="text-gray-300">
                Free includes GPT-4o-mini. Paid plans include GPT-4, Claude,
                DALL-E, and more depending on your tier.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
