'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { ApiKeyModal } from '@/components/integrations/ApiKeyModal';
import { useToast } from '@/components/ui/toast';
import { LoadingOverlay, IntegrationCardSkeleton } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ErrorBoundary';
import { Search, Sparkles } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  category: string;
  authType: 'oauth2' | 'apiKey' | 'basic';
  icon: string;
  color: string;
  description: string;
  fields: any[] | null;
  setupGuideUrl?: string;
}

const CATEGORIES = [
  { id: 'all', name: 'All Integrations', icon: '🔗' },
  { id: 'communication', name: 'Communication', icon: '💬' },
  { id: 'productivity', name: 'Productivity', icon: '📊' },
  { id: 'database', name: 'Database', icon: '🗄️' },
  { id: 'marketing', name: 'Marketing', icon: '📢' },
  { id: 'development', name: 'Development', icon: '⚙️' },
  { id: 'crm', name: 'CRM', icon: '🤝' }
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connectedServices, setConnectedServices] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<Integration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingService, setConnectingService] = useState<string | null>(null);
  const toast = useToast();

  // Fetch available integrations
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/credentials/services`);
        const data = await response.json();
        
        if (data.success) {
          setIntegrations(data.data);
        } else {
          setError('Failed to load integrations');
        }
      } catch (error) {
        console.error('Failed to fetch integrations:', error);
        setError('Failed to connect to server');
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
        const token = localStorage.getItem('token');
        if (!token) return;

        const credsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/credentials`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const credsData = await credsResponse.json();
        
        if (credsData.success) {
          const connected = new Set<string>(credsData.data.map((cred: any) => cred.service));
          setConnectedServices(connected);
        }
      } catch (error) {
        console.error('Failed to fetch connected services:', error);
      }
    };

    fetchConnected();
  }, []);

  // Handle OAuth connection
  const handleOAuthConnect = (serviceId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required', 'Please login first');
      return;
    }

    setConnectingService(serviceId);
    toast.info('Redirecting to authorization...', `Opening ${serviceId} login page`);

    // Small delay for toast to show
    setTimeout(() => {
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/oauth/${serviceId}/connect?redirect=${encodeURIComponent(window.location.href)}`;
    }, 500);
  };

  // Handle API key connection
  const handleApiKeyConnect = (service: Integration) => {
    setSelectedService(service);
  };

  // Submit API key credentials
  const handleApiKeySubmit = async (data: Record<string, string>) => {
    if (!selectedService) return;

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Please login first');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        service: selectedService.id,
        credentialData: data
      })
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to add credentials');
    }

    // Refresh connected services
    setConnectedServices(prev => new Set([...prev, selectedService.id]));
    
    // Show success toast
    toast.success(
      `${selectedService.name} connected!`,
      'Your credentials have been securely stored'
    );
  };

  // Handle disconnect
  const handleDisconnect = async (serviceId: string) => {
    if (!confirm('Are you sure you want to disconnect this service?')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      setConnectingService(serviceId);

      // Find credential ID
      const credsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/credentials`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const credsData = await credsResponse.json();
      
      const credential = credsData.data.find((c: any) => c.service === serviceId);
      if (!credential) {
        toast.error('Credential not found');
        return;
      }

      // Delete credential
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/credentials/${credential.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();

      if (result.success) {
        setConnectedServices(prev => {
          const newSet = new Set(prev);
          newSet.delete(serviceId);
          return newSet;
        });
        
        const integration = integrations.find(i => i.id === serviceId);
        toast.success(
          `${integration?.name || serviceId} disconnected`,
          'Your credentials have been removed'
        );
      } else {
        toast.error('Failed to disconnect', result.error);
      }
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect service', error.message);
    } finally {
      setConnectingService(null);
    }
  };

  // Filter integrations
  const filteredIntegrations = integrations.filter(integration => {
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen relative">
      <Background />
      <Navbar />

      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            Integrations
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Connect your favorite tools and services. {integrations.length} integrations available.
          </p>
        </motion.div>

        {/* Search & Filter */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
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
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
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
            <div className="text-3xl font-bold text-white">{connectedServices.size}</div>
            <div className="text-sm text-white/60">Connected</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{integrations.length}</div>
            <div className="text-sm text-white/60">Available</div>
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
            <Sparkles className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg">No integrations found</p>
            <p className="text-white/40 text-sm mt-2">Try adjusting your search or filters</p>
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
                    if (integration.authType === 'oauth2') {
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
      {selectedService && selectedService.authType !== 'oauth2' && selectedService.fields && (
        <ApiKeyModal
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
          service={{
            ...selectedService,
            fields: selectedService.fields
          }}
          onSubmit={handleApiKeySubmit}
        />
      )}

      {/* Loading Overlay */}
      <AnimatePresence>
        {connectingService && (
          <LoadingOverlay 
            message={`Connecting ${integrations.find(i => i.id === connectingService)?.name || 'service'}...`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
