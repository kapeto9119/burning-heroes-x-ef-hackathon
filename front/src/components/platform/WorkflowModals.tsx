'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { NodeDataInspector } from '@/components/execution/NodeDataInspector';
import { getTimeUntilNextRun, cronToHuman } from '@/lib/schedule-utils';
import { Eye, RotateCcw, Play, Zap, Webhook, Clock, Timer, Radio, Copy, CheckCircle, XCircle, Loader2, Download, Save, Trash2, ArrowLeft, FileJson, Sparkles, AlertCircle, Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Background as RFBackground,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  Position,
  Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NodePalette } from '@/components/workflow/NodePalette';
import { NodeConfigPanel } from '@/components/workflow/NodeConfigPanel';
import { useNodes } from '@/hooks/useNodes';
import { getNodeVisual } from '@/lib/nodeVisuals';
import { getClientToken } from '@/lib/auth';
import { executeWorkflow, getWorkflowExecutions } from '@/app/actions/workflows';
import { EditWorkflowModal } from './EditWorkflowModal';
import { TestWorkflowModal } from './TestWorkflowModal';

interface WorkflowModalsProps {
  previewWorkflow: any;
  setPreviewWorkflow: (wf: any) => void;
  previewExecutions: any[];
  setPreviewExecutions: (execs: any[]) => void;
  isLoadingPreviewExecutions: boolean;
  onExecuteWorkflow: (workflow: any) => void;
  onLoadWorkflows: () => void;
  onLoadPreviewExecutions: () => void;
  
  selectedDeployedWorkflow: any;
  setSelectedDeployedWorkflow: (wf: any) => void;
  showExecutionsModal: boolean;
  setShowExecutionsModal: (show: boolean) => void;
  executions: any[];
  setExecutions: (execs: any[]) => void;
  executionFilter: 'all' | 'success' | 'error';
  setExecutionFilter: (filter: 'all' | 'success' | 'error') => void;
  autoRefresh: boolean;
  setAutoRefresh: (refresh: boolean) => void;
  onExportExecutions: () => void;
  
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  editingWorkflow: any;
  setEditingWorkflow: (wf: any) => void;
  showTestModal: boolean;
  setShowTestModal: (show: boolean) => void;
  testingWorkflow: any;
  setTestingWorkflow: (wf: any) => void;
}

export function WorkflowModals({
  previewWorkflow,
  setPreviewWorkflow,
  previewExecutions,
  setPreviewExecutions,
  isLoadingPreviewExecutions,
  onExecuteWorkflow,
  onLoadWorkflows,
  onLoadPreviewExecutions,
  selectedDeployedWorkflow,
  setSelectedDeployedWorkflow,
  showExecutionsModal,
  setShowExecutionsModal,
  executions,
  setExecutions,
  executionFilter,
  setExecutionFilter,
  autoRefresh,
  setAutoRefresh,
  onExportExecutions,
  showEditModal,
  setShowEditModal,
  editingWorkflow,
  setEditingWorkflow,
  showTestModal,
  setShowTestModal,
  testingWorkflow,
  setTestingWorkflow,
}: WorkflowModalsProps) {
  const router = useRouter();

  return (
    <>
      {/* Workflow Preview Modal */}
      {previewWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border border-border rounded-2xl overflow-hidden max-w-[92vw] w-full shadow-2xl h-[88vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{previewWorkflow.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Visual flow editor and execution logs
                </p>
                {/* Trigger-specific info */}
                {(() => {
                  const triggerNode = previewWorkflow.nodes?.find((n: any) => 
                    n.type.includes('webhook') || n.type.includes('schedule') || n.type.includes('manual')
                  );
                  
                  if (!triggerNode) return null;
                  
                  // Webhook trigger
                  if (triggerNode.type.includes('webhook') && previewWorkflow.webhookUrl) {
                    return (
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Webhook className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-blue-500">Webhook Trigger</span>
                          <Radio className="w-3 h-3 text-green-500 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-background/50 px-2 py-1 rounded flex-1 truncate">
                            {previewWorkflow.webhookUrl}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(previewWorkflow.webhookUrl);
                              alert('Webhook URL copied!');
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          This workflow is listening for HTTP requests at the URL above.
                        </p>
                      </div>
                    );
                  }
                  
                  // Schedule trigger
                  if (triggerNode.type.includes('schedule')) {
                    const cron = triggerNode.parameters?.rule?.interval?.[0]?.expression || 'Not set';
                    const nextRun = cron !== 'Not set' ? getTimeUntilNextRun(cron) : null;
                    const humanReadable = cronToHuman(cron);
                    
                    return (
                      <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-medium text-purple-500">Scheduled Trigger</span>
                          {nextRun && (
                            <div className="ml-auto flex items-center gap-1 bg-purple-500/20 px-2 py-0.5 rounded">
                              <Timer className="w-3 h-3 text-purple-400" />
                              <span className="text-xs font-medium text-purple-400">Next: {nextRun}</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{humanReadable}</div>
                          <code className="text-xs font-mono text-muted-foreground block">
                            {cron}
                          </code>
                        </div>
                      </div>
                    );
                  }
                  
                  // Manual trigger
                  if (triggerNode.type.includes('manual')) {
                    return (
                      <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium text-green-500">Manual Trigger</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Use the "Run" button to execute this workflow manually.
                        </p>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onLoadPreviewExecutions}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Logs
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onLoadWorkflows}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                {(() => {
                  const hasManualOrWebhook = previewWorkflow.nodes?.some((n: any) => 
                    n.type.includes('manual') || n.type.includes('webhook')
                  );
                  if (hasManualOrWebhook) {
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onExecuteWorkflow(previewWorkflow)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Run Now
                      </Button>
                    );
                  }
                  return null;
                })()}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/workflows/${previewWorkflow.id || previewWorkflow.workflowId}/test`)}
                  className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 hover:from-purple-600/20 hover:to-pink-600/20 border-purple-500/30"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Test Workflow
                </Button>
                <button
                  onClick={() => {
                    setPreviewWorkflow(null);
                    setPreviewExecutions([]);
                  }}
                  className="text-muted-foreground hover:text-foreground ml-2"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Canvas */}
            <div className="flex-1 overflow-hidden">
              <WorkflowCanvas 
                workflow={previewWorkflow} 
                isGenerating={false}
                latestExecution={previewExecutions.length > 0 ? previewExecutions[0] : undefined}
                enableRealTimeUpdates={true}
              />
            </div>
            
            {/* Execution Data Panel */}
            <div className="border-t border-border bg-accent/20 max-h-[300px] overflow-y-auto">
              <div className="px-6 py-3">
                <h3 className="text-sm font-semibold mb-3">Node Execution Data</h3>
                {isLoadingPreviewExecutions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : previewExecutions.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">
                    No executions yet. Click "View Logs" to load recent executions.
                  </div>
                ) : (
                  <NodeDataInspector
                    execution={previewExecutions[0]}
                    workflowNodes={previewWorkflow.nodes || []}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Executions Modal */}
      {showExecutionsModal && selectedDeployedWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border border-border rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Execution History</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDeployedWorkflow.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedDeployedWorkflow(null);
                  setShowExecutionsModal(false);
                  setExecutions([]);
                  setExecutionFilter('all');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExecutionFilter('all')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      executionFilter === 'all'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    All ({executions.length})
                  </button>
                  <button
                    onClick={() => setExecutionFilter('success')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      executionFilter === 'success'
                        ? 'bg-green-500 text-white'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    ✅ Success ({executions.filter(e => e.status === 'success').length})
                  </button>
                  <button
                    onClick={() => setExecutionFilter('error')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      executionFilter === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    ❌ Errors ({executions.filter(e => e.status === 'error').length})
                  </button>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    autoRefresh
                      ? 'bg-green-500 text-white'
                      : 'bg-accent hover:bg-accent/80'
                  }`}
                >
                  <Radio className={`w-3 h-3 ${autoRefresh ? 'animate-pulse' : ''}`} />
                  {autoRefresh ? 'Live' : 'Auto-refresh'}
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onExportExecutions}
                  disabled={executions.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            {executions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No executions yet</p>
            ) : (
              <div className="space-y-4">
                {executions
                  .filter(e => executionFilter === 'all' || e.status === executionFilter)
                  .map((execution: any) => (
                  <div
                    key={execution.id}
                    className="p-4 bg-accent/30 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {execution.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : execution.status === 'error' ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        )}
                        <span className="font-medium capitalize">{execution.status}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(execution.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {execution.error && (
                      <p className="text-xs text-red-500 mt-2">{execution.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Edit Workflow Modal */}
      {showEditModal && editingWorkflow && (
        <EditWorkflowModal
          workflow={editingWorkflow}
          onClose={() => {
            setShowEditModal(false);
            setEditingWorkflow(null);
          }}
          onSave={() => {
            onLoadWorkflows();
            setShowEditModal(false);
            setEditingWorkflow(null);
          }}
        />
      )}

      {/* Test Workflow Modal */}
      {showTestModal && testingWorkflow && (
        <TestWorkflowModal
          workflow={testingWorkflow}
          onClose={() => {
            setShowTestModal(false);
            setTestingWorkflow(null);
          }}
        />
      )}
    </>
  );
}
