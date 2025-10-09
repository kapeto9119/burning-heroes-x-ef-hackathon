'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { NodeDefinition } from '@/hooks/useNodes';

interface NodeConfigPanelProps {
  node: any;
  nodeDefinition?: NodeDefinition;
  onSave: (nodeId: string, parameters: any) => void;
  onClose: () => void;
  onGetDetails?: (nodeType: string) => Promise<any>;
}

export function NodeConfigPanel({ 
  node, 
  nodeDefinition, 
  onSave, 
  onClose,
  onGetDetails 
}: NodeConfigPanelProps) {
  const [parameters, setParameters] = useState<any>(node.data.parameters || {});
  const [nodeDetails, setNodeDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load node details when panel opens
  useEffect(() => {
    if (node.data.nodeType && onGetDetails) {
      loadNodeDetails();
    }
  }, [node.data.nodeType]);

  const loadNodeDetails = async () => {
    if (!onGetDetails || !node.data.nodeType) return;

    setIsLoadingDetails(true);
    try {
      const details = await onGetDetails(node.data.nodeType);
      setNodeDetails(details);
    } catch (error) {
      console.error('Failed to load node details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    onSave(node.id, parameters);
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 500);
  };

  // Helper: Get user-friendly field label
  const getFieldLabel = (fieldName: string): string => {
    const labels: Record<string, string> = {
      'channelId': 'Channel',
      'toEmail': 'To Email',
      'fromEmail': 'From Email',
      'httpMethod': 'Method',
      'responseMode': 'Response Mode',
      'resource': 'What to do',
      'operation': 'Action',
    };
    return labels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  };

  // Helper: Get user-friendly placeholder
  const getFieldPlaceholder = (fieldName: string, fieldConfig: any): string => {
    if (fieldConfig.placeholder) return fieldConfig.placeholder;
    
    const placeholders: Record<string, string> = {
      'channelId': 'e.g., #general or #alerts',
      'text': 'Your message here...',
      'message': 'Your message here...',
      'to': 'recipient@example.com',
      'toEmail': 'recipient@example.com',
      'fromEmail': 'sender@example.com',
      'subject': 'Email subject',
      'url': 'https://api.example.com/endpoint',
      'path': 'webhook-path',
      'query': 'SELECT * FROM table',
    };
    return placeholders[fieldName] || `Enter ${getFieldLabel(fieldName).toLowerCase()}`;
  };

  const renderField = (fieldName: string, fieldConfig: any) => {
    const value = parameters[fieldName] || '';
    const placeholder = getFieldPlaceholder(fieldName, fieldConfig);

    switch (fieldConfig.type) {
      case 'string':
      case 'text':
        // Use textarea for longer text fields
        if (fieldName === 'text' || fieldName === 'message' || fieldName === 'query') {
          return (
            <textarea
              value={value}
              onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.value })}
              placeholder={placeholder}
              rows={4}
              className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          );
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.value })}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        );

      case 'password':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.value })}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: parseInt(e.target.value) || 0 })}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.value })}
            className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Choose an option...</option>
            {(fieldConfig.options || []).map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.value })}
            placeholder={placeholder}
            rows={4}
            className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.checked })}
              className="w-4 h-4 rounded border-border"
            />
            <span className="text-sm">Enable this option</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.value })}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      className="w-80 h-full bg-background border-l border-border flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          {nodeDefinition && (
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xl"
              style={{ backgroundColor: nodeDefinition.color + '20' }}
            >
              {nodeDefinition.icon}
            </div>
          )}
          <div>
            <h3 className="font-semibold">{node.data.label}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {node.data.nodeType || 'Configure node'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingDetails ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : nodeDetails && nodeDetails.properties ? (
          <>
            {nodeDefinition && (
              <div className="p-3 bg-accent/30 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{nodeDefinition.description}</p>
                </div>
              </div>
            )}

            {Object.entries(nodeDetails.properties).map(([fieldName, fieldConfig]: [string, any]) => (
              <div key={fieldName}>
                <label className="block text-sm font-medium mb-2">
                  {getFieldLabel(fieldName)}
                  {fieldConfig.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(fieldName, fieldConfig)}
                {fieldConfig.description && (
                  <p className="text-xs text-muted-foreground mt-1">{fieldConfig.description}</p>
                )}
              </div>
            ))}

            {nodeDetails.credentials && nodeDetails.credentials.length > 0 && (
              <div className="pt-4 border-t border-border">
                <label className="block text-sm font-medium mb-2">Credentials Required</label>
                <div className="space-y-2">
                  {nodeDetails.credentials.map((cred: string) => (
                    <div key={cred} className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm font-medium">{cred}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure in Settings → Credentials
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {nodeDefinition && (
              <div className="p-3 bg-accent/30 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{nodeDefinition.description}</p>
                </div>
              </div>
            )}

            {/* Show existing parameters from defaults */}
            {Object.keys(parameters).length > 0 && (
              <>
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    💡 Configure your node settings below
                  </p>
                </div>

                {Object.entries(parameters).map(([key, value]) => {
                  if (key === 'description') return null; // Skip description field
                  
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2">
                        {getFieldLabel(key)}
                      </label>
                      {key === 'text' || key === 'message' || key === 'query' ? (
                        <textarea
                          value={value as string || ''}
                          onChange={(e) => setParameters({ ...parameters, [key]: e.target.value })}
                          placeholder={getFieldPlaceholder(key, {})}
                          rows={4}
                          className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value as string || ''}
                          onChange={(e) => setParameters({ ...parameters, [key]: e.target.value })}
                          placeholder={getFieldPlaceholder(key, {})}
                          className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Description field */}
            <div>
              <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
              <textarea
                value={parameters.description || ''}
                onChange={(e) => setParameters({ ...parameters, description: e.target.value })}
                placeholder="Add notes about this node..."
                rows={3}
                className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
