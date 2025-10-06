'use client';

/**
 * ⚠️ DEPRECATED: This page is being replaced by /integrations
 * 
 * DIFFERENCE BETWEEN PAGES:
 * 
 * 1. /settings (THIS PAGE) - Old manual credential entry
 *    - Hardcoded 4 services only (Slack, Email, PostgreSQL, Google Sheets)
 *    - Manual form entry for ALL credentials (including OAuth)
 *    - No OAuth flow - user has to manually paste tokens
 *    - Uses /api/credentials endpoint
 *    - Less user-friendly
 * 
 * 2. /integrations (NEW PAGE) - Modern OAuth + API key management
 *    - Dynamic loading of all 23 integrations from backend
 *    - OAuth services: One-click "Connect" button → redirects to provider
 *    - API key services: Modal form for manual entry
 *    - Uses /api/oauth/:service/connect for OAuth
 *    - Uses /api/credentials for API keys
 *    - Auto-refresh tokens via TokenRefreshService
 *    - Better UX with categories, search, connection status
 * 
 * RECOMMENDATION: Use /integrations for all new features
 * TODO: Redirect this page to /integrations or remove entirely
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { Button } from '@/components/ui/button';
import { Zap, Mail, Database, FileSpreadsheet, CheckCircle, Plus, X, AlertTriangle } from 'lucide-react';
import { addCredentials, getCredentials } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';

interface Service {
  id: string;
  name: string;
  icon: any;
  color: string;
  fields: { name: string; label: string; type: string; placeholder: string }[];
}

// DEPRECATED: Only 4 services hardcoded here
// The new /integrations page loads all 23 services dynamically
const services: Service[] = [
  {
    id: 'slack',
    name: 'Slack',
    icon: Zap,
    color: 'from-purple-500 to-pink-500',
    fields: [
      { name: 'token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-your-token' },
    ],
  },
  {
    id: 'email',
    name: 'Email (SMTP)',
    icon: Mail,
    color: 'from-blue-500 to-cyan-500',
    fields: [
      { name: 'user', label: 'Email', type: 'email', placeholder: 'your-email@gmail.com' },
      { name: 'password', label: 'App Password', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx' },
      { name: 'host', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
      { name: 'port', label: 'Port', type: 'number', placeholder: '587' },
    ],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    icon: Database,
    color: 'from-indigo-500 to-blue-500',
    fields: [
      { name: 'host', label: 'Host', type: 'text', placeholder: 'localhost' },
      { name: 'port', label: 'Port', type: 'number', placeholder: '5432' },
      { name: 'database', label: 'Database', type: 'text', placeholder: 'mydb' },
      { name: 'user', label: 'Username', type: 'text', placeholder: 'postgres' },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'password' },
    ],
  },
  {
    id: 'googleSheets',
    name: 'Google Sheets',
    icon: FileSpreadsheet,
    color: 'from-green-500 to-emerald-500',
    fields: [
      { name: 'clientId', label: 'Client ID', type: 'text', placeholder: 'your-client-id' },
      { name: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'your-secret' },
      { name: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'access-token' },
      { name: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'refresh-token' },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [connectedServices, setConnectedServices] = useState<Set<string>>(new Set());
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check which services are already connected
    const checkConnections = async () => {
      const connected = new Set<string>();
      for (const service of services) {
        const result = await getCredentials(service.id);
        if (result.success) {
          connected.add(service.id);
        }
      }
      setConnectedServices(connected);
    };
    checkConnections();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await addCredentials(selectedService.id, formData);
      
      if (result.success) {
        setMessage({ type: 'success', text: `${selectedService.name} connected successfully!` });
        setConnectedServices(prev => new Set(prev).add(selectedService.id));
        setSelectedService(null);
        setFormData({});
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to connect' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 w-full h-full">
        <Background />
      </div>

      <div className="relative z-10">
        <Navbar />

        <div className="container mx-auto px-6 py-12 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Deprecation Warning */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6"
            >
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-500 mb-2">
                    ⚠️ This page is deprecated
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This is the old manual credential entry page with only 4 services. 
                    We now have a new <strong>Integrations page</strong> with 23 services, 
                    one-click OAuth connections, and better UX.
                  </p>
                  <Button
                    onClick={() => router.push('/integrations')}
                    variant="default"
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    Go to New Integrations Page →
                  </Button>
                </div>
              </div>
            </motion.div>

            <div>
              <h1 className="text-4xl font-bold mb-2">Settings (Legacy)</h1>
              <p className="text-muted-foreground">Old manual credential entry - Use /integrations instead</p>
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg ${
                  message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}
              >
                {message.text}
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => {
                const Icon = service.icon;
                const isConnected = connectedServices.has(service.id);

                return (
                  <motion.div
                    key={service.id}
                    whileHover={{ scale: 1.02 }}
                    className="backdrop-blur-xl bg-background/40 rounded-xl border border-border p-6 cursor-pointer"
                    onClick={() => !isConnected && setSelectedService(service)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {isConnected ? 'Connected' : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      {isConnected ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    {!isConnected && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedService(service);
                        }}
                        className="w-full"
                        variant="outline"
                      >
                        Connect
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Connection Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Connect {selectedService.name}</h2>
              <button
                onClick={() => {
                  setSelectedService(null);
                  setFormData({});
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedService.fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium mb-2">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              ))}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Connecting...' : 'Connect'}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
