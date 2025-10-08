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

  const renderField = (fieldName: string, fieldConfig: any) => {
    const value = parameters[fieldName] || '';

    switch (fieldConfig.type) {
      case 'string':
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.value })}
            placeholder={fieldConfig.placeholder || ''}
            className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        );

      case 'password':
        return (
          <input
            type="password"
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.value })}
            placeholder={fieldConfig.placeholder || ''}
            className="w-full px-3 py-2 bg-accent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: parseInt(e.target.value) })}
            placeholder={fieldConfig.placeholder || ''}
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
            <option value="">Select...</option>
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
            placeholder={fieldConfig.placeholder || ''}
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
            <span className="text-sm">Enable</span>
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setParameters({ ...parameters, [fieldName]: e.target.value })}
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
                  {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
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
            <div className="p-3 bg-accent/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">
                Node configuration schema not available. You can still set custom parameters below.
              </p>
            </div>

            {/* Basic configuration */}
            <div>
              <label className="block text-sm font-medium mb-2">Node Name</label>
              <input
                type="text"
                value={node.data.label}
                readOnly
                className="w-full px-3 py-2 bg-accent/50 border border-border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={parameters.description || ''}
                onChange={(e) => setParameters({ ...parameters, description: e.target.value })}
                placeholder="Add a description..."
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
