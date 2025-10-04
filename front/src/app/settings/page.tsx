'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { Button } from '@/components/ui/button';
import { Zap, Mail, Database, FileSpreadsheet, CheckCircle, Plus, X } from 'lucide-react';
import { addCredentials, getCredentials } from '@/app/actions/auth';

interface Service {
  id: string;
  name: string;
  icon: any;
  color: string;
  fields: { name: string; label: string; type: string; placeholder: string }[];
}

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
      <div className="absolute inset-0 w-full h-full">
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
            <div>
              <h1 className="text-4xl font-bold mb-2">Settings</h1>
              <p className="text-muted-foreground">Manage your service connections and credentials</p>
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
