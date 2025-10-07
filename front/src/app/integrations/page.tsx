"use client";

/**
 * 🔗 INTEGRATIONS PAGE - Modern OAuth & API Key Management
 *
 * This is the MAIN page for connecting external services to workflows.
 *
 * FEATURES:
 * ✅ 23 integrations loaded dynamically from backend
 * ✅ OAuth services: One-click "Connect" → redirects to provider (Slack, Twitter, Salesforce, etc.)
 * ✅ API key services: Modal form for manual entry (OpenAI, Airtable, Twilio, etc.)
 * ✅ Category filtering (Communication, Productivity, Database, Marketing, etc.)
 * ✅ Search functionality
 * ✅ Connection status tracking
 * ✅ Auto-refresh tokens via TokenRefreshService (backend)
 *
 * BACKEND ENDPOINTS USED:
 * - GET  /api/credentials/services - Fetch all available integrations
 * - GET  /api/credentials - Get user's connected services
 * - GET  /api/oauth/:service/connect - Initiate OAuth flow (redirects to provider)
 * - POST /api/credentials - Add API key credentials
 * - DELETE /api/credentials/:id - Disconnect service
 *
 * HOW IT WORKS:
 * 1. User clicks "Connect" on OAuth service (e.g., Slack)
 * 2. Redirects to /api/oauth/slack/connect?token=xxx
 * 3. Backend redirects to Slack OAuth page
 * 4. User authorizes → Slack redirects to /api/oauth/slack/callback
 * 5. Backend stores tokens in database (encrypted)
 * 6. User redirected back to this page
 * 7. Service shows as "Connected" ✅
 *
 * For API key services (e.g., OpenAI):
 * 1. User clicks "Connect"
 * 2. Modal opens with form fields
 * 3. User enters API key
 * 4. POST /api/credentials stores encrypted key
 * 5. Service shows as "Connected" ✅
 */

import { useState, useEffect } from "react";
import { getClientToken } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Background } from "@/components/layout/Background";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { ApiKeyModal } from "@/components/integrations/ApiKeyModal";
import { useToast } from "@/components/ui/toast";
import {
  LoadingOverlay,
  IntegrationCardSkeleton,
} from "@/components/ui/loading";
import { ErrorMessage } from "@/components/ErrorBoundary";
import { Search, Sparkles } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  category: string;
  authType: "oauth2" | "apiKey" | "basic";
  icon: string;
  color: string;
  description: string;
  fields: any[] | null;
  setupGuideUrl?: string;
}

const CATEGORIES = [
  { id: "all", name: "All Integrations", icon: "🔗" },
  { id: "communication", name: "Communication", icon: "💬" },
  { id: "productivity", name: "Productivity", icon: "📊" },
  { id: "database", name: "Database", icon: "🗄️" },
  { id: "marketing", name: "Marketing", icon: "📢" },
  { id: "development", name: "Development", icon: "⚙️" },
  { id: "crm", name: "CRM", icon: "🤝" },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connectedServices, setConnectedServices] = useState<Set<string>>(
    new Set()
  );
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<Integration | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingService, setConnectingService] = useState<string | null>(
    null
  );
  const toast = useToast();

  // Fetch available integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/credentials/services`
        );
        const data = await response.json();

        if (data.success) {
          setIntegrations(data.data);
        } else {
          setError("Failed to load integrations");
        }
      } catch (error) {
        console.error("Failed to fetch integrations:", error);
        setError("Failed to connect to server");
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntegrations();
  }, []);

  // Fetch connected services
  useEffect(() => {
    const fetchConnected = async () => {
      try {
        const token = getClientToken();
        if (!token) return;

        const credsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/credentials`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const credsData = await credsResponse.json();

        if (credsData.success) {
          const connected = new Set<string>(
            credsData.data.map((cred: any) => cred.service)
          );
          setConnectedServices(connected);
        }
      } catch (error) {
        console.error("Failed to fetch connected services:", error);
      }
    };

    fetchConnected();
  }, []);

  // Handle OAuth connection
  const handleOAuthConnect = (serviceId: string) => {
    const token = getClientToken();
    if (!token) {
      toast.error("Authentication required", "Please login first");
      return;
    }

    setConnectingService(serviceId);
    toast.info(
      "Redirecting to authorization...",
      `Opening ${serviceId} login page`
    );

    // Small delay for toast to show
    setTimeout(() => {
      window.location.href = `${
        process.env.NEXT_PUBLIC_API_URL
      }/api/oauth/${serviceId}/connect?token=${token}&redirect=${encodeURIComponent(
        window.location.href
      )}`;
    }, 500);
  };

  // Handle API key connection
  const handleApiKeyConnect = (service: Integration) => {
    setSelectedService(service);
  };

  // Submit API key credentials
  const handleApiKeySubmit = async (data: Record<string, string>) => {
    if (!selectedService) return;

    const token = getClientToken();
    if (!token) {
      throw new Error("Please login first");
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/credentials`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          service: selectedService.id,
          credentialData: data,
        }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to add credentials");
    }

    // Refresh connected services
    setConnectedServices((prev) => new Set([...prev, selectedService.id]));

    // Show success toast
    toast.success(
      `${selectedService.name} connected!`,
      "Your credentials have been securely stored"
    );
  };

  // Handle disconnect
  const handleDisconnect = async (serviceId: string) => {
    if (!confirm("Are you sure you want to disconnect this service?")) {
      return;
    }

    const token = getClientToken();
    if (!token) return;

    try {
      setConnectingService(serviceId);

      // Find credential ID
      const credsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/credentials`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const credsData = await credsResponse.json();

      const credential = credsData.data.find(
        (c: any) => c.service === serviceId
      );
      if (!credential) {
        toast.error("Credential not found");
        return;
      }

      // Delete credential
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/credentials/${credential.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json();

      if (result.success) {
        setConnectedServices((prev) => {
          const newSet = new Set(prev);
          newSet.delete(serviceId);
          return newSet;
        });

        const integration = integrations.find((i) => i.id === serviceId);
        toast.success(
          `${integration?.name || serviceId} disconnected`,
          "Your credentials have been removed"
        );
      } else {
        toast.error("Failed to disconnect", result.error);
      }
    } catch (error: any) {
      console.error("Failed to disconnect:", error);
      toast.error("Failed to disconnect service", error.message);
    } finally {
      setConnectingService(null);
    }
  };

  // Filter integrations
  const filteredIntegrations = integrations.filter((integration) => {
    const matchesCategory =
      selectedCategory === "all" || integration.category === selectedCategory;
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 w-full h-full">
        <Background />
      </div>
      <Navbar />

      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-black dark:text-white mb-4">
            Integrations
          </h1>
          <p className="text-xl text-gray-700 dark:text-white/70 max-w-2xl mx-auto">
            Connect your favorite tools and services. {integrations.length}{" "}
            integrations available.
          </p>
        </motion.div>

        {/* Search & Filter */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/40" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-white/10 backdrop-blur-md border border-gray-300 dark:border-white/20 rounded-xl text-black dark:text-white placeholder-gray-400 dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white dark:bg-white dark:text-black"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-8 mb-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-black dark:text-white">
              {connectedServices.size}
            </div>
            <div className="text-sm text-gray-600 dark:text-white/60">
              Connected
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-black dark:text-white">
              {integrations.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-white/60">
              Available
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8">
            <ErrorMessage
              message={error}
              onRetry={() => window.location.reload()}
            />
          </div>
        )}

        {/* Integrations Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <IntegrationCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredIntegrations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Sparkles className="w-16 h-16 text-gray-300 dark:text-white/20 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-white/60 text-lg">
              No integrations found
            </p>
            <p className="text-gray-500 dark:text-white/40 text-sm mt-2">
              Try adjusting your search or filters
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration, index) => (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <IntegrationCard
                  id={integration.id}
                  name={integration.name}
                  icon={integration.icon}
                  color={integration.color}
                  description={integration.description}
                  category={integration.category}
                  authType={integration.authType}
                  isConnected={connectedServices.has(integration.id)}
                  onConnect={() => {
                    if (integration.authType === "oauth2") {
                      handleOAuthConnect(integration.id);
                    } else {
                      handleApiKeyConnect(integration);
                    }
                  }}
                  onDisconnect={() => handleDisconnect(integration.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* API Key Modal */}
      {selectedService &&
        selectedService.authType !== "oauth2" &&
        selectedService.fields && (
          <ApiKeyModal
            isOpen={!!selectedService}
            onClose={() => setSelectedService(null)}
            service={{
              ...selectedService,
              fields: selectedService.fields,
            }}
            onSubmit={handleApiKeySubmit}
          />
        )}

      {/* Loading Overlay */}
      <AnimatePresence>
        {connectingService && (
          <LoadingOverlay
            message={`Connecting ${
              integrations.find((i) => i.id === connectingService)?.name ||
              "service"
            }...`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
