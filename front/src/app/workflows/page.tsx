'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { getClientToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Play, Pause, Trash2, Clock, CheckCircle, XCircle, Loader2, Maximize2, Eye, RotateCcw, Webhook, Copy, Radio, BarChart3, List, Download, Timer, Zap, Edit } from 'lucide-react';
import { getWorkflows, activateWorkflow, getWorkflowExecutions, executeWorkflow } from '@/app/actions/workflows';
import { useRouter } from 'next/navigation';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { NodeDataInspector } from '@/components/execution/NodeDataInspector';
import { getTimeUntilNextRun, cronToHuman } from '@/lib/schedule-utils';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [previewExecutions, setPreviewExecutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPreviewExecutions, setIsLoadingPreviewExecutions] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflows' | 'analytics'>('workflows');
  const [executionFilter, setExecutionFilter] = useState<'all' | 'success' | 'error'>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // WebSocket for real-time updates
  const { isConnected, addEventListener, subscribeToWorkflow, unsubscribeFromWorkflow } = useWebSocket();

  useEffect(() => {
    loadWorkflows();
  }, []);

  // Listen to WebSocket events for real-time execution updates
  useEffect(() => {
    const unsubscribeCompleted = addEventListener('execution:completed', async (event: any) => {
      console.log('[Workflows] Execution completed event:', event);
      
      // Refresh executions if this workflow is being viewed
      if (selectedWorkflow?.workflowId === event.workflowId) {
        const token = getClientToken();
        const result = await getWorkflowExecutions(event.workflowId, 10, token || undefined);
        if (result.success) {
          setExecutions(result.data || []);
        }
      }
      
      // Show toast notification
      const status = event.status === 'success' ? '✅' : '❌';
      console.log(`${status} Workflow execution ${event.status}`);
    });

    const unsubscribeStarted = addEventListener('execution:started', (event: any) => {
      console.log('[Workflows] Execution started event:', event);
    });

    return () => {
      unsubscribeCompleted();
      unsubscribeStarted();
    };
  }, [selectedWorkflow, addEventListener]);

  // Auto-refresh executions when enabled
  useEffect(() => {
    if (!autoRefresh || !selectedWorkflow) return;

    const interval = setInterval(async () => {
      const token = getClientToken();
      const result = await getWorkflowExecutions(selectedWorkflow.workflowId, 10, token || undefined);
      if (result.success) {
        setExecutions(result.data || []);
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedWorkflow]);

  // Auto-load executions when preview workflow opens
  useEffect(() => {
    if (previewWorkflow?.workflowId) {
      const loadPreviewExecutions = async () => {
        setIsLoadingPreviewExecutions(true);
        const token = getClientToken();
        const result = await getWorkflowExecutions(previewWorkflow.workflowId, 5, token || undefined);
        if (result.success) {
          setPreviewExecutions(result.data || []);
        }
        setIsLoadingPreviewExecutions(false);
      };
      loadPreviewExecutions();
    }
  }, [previewWorkflow?.workflowId]);

  const loadWorkflows = async () => {
    setIsLoading(true);
    const token = getClientToken();
    const result = await getWorkflows(token || undefined);
    if (result.success) {
      setWorkflows(result.data || []);
    }
    setIsLoading(false);
  };

  const handleViewExecutions = async (workflow: any) => {
    setSelectedWorkflow(workflow);
    const token = getClientToken();
    const result = await getWorkflowExecutions(workflow.workflowId, 10, token || undefined);
    if (result.success) {
      setExecutions(result.data || []);
    }
  };

  const handleExecuteWorkflow = async (workflow: any) => {
    try {
      const token = getClientToken();
      const result = await executeWorkflow(workflow.workflowId, {}, token || undefined);
      if (result.success) {
        alert('✅ Workflow executed successfully!');
        // Refresh executions if modal is open
        if (selectedWorkflow?.workflowId === workflow.workflowId) {
          handleViewExecutions(workflow);
        }
        // Refresh preview executions if preview modal is open
        if (previewWorkflow?.workflowId === workflow.workflowId) {
          const execResult = await getWorkflowExecutions(workflow.workflowId, 5, token || undefined);
          if (execResult.success) {
            setPreviewExecutions(execResult.data || []);
          }
        }
      } else {
        alert('❌ Execution failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Execution error');
    }
  };

  const handleExportExecutions = () => {
    if (executions.length === 0) return;

    // Create CSV content
    const headers = ['Execution ID', 'Status', 'Started At', 'Finished At', 'Duration (ms)', 'Error Message'];
    const rows = executions.map(exec => [
      exec.id || 'N/A',
      exec.status || 'N/A',
      exec.startedAt ? new Date(exec.startedAt).toLocaleString() : 'N/A',
      exec.finishedAt ? new Date(exec.finishedAt).toLocaleString() : 'N/A',
      exec.finishedAt && exec.startedAt 
        ? (new Date(exec.finishedAt).getTime() - new Date(exec.startedAt).getTime()).toString()
        : 'N/A',
      exec.error || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedWorkflow?.name || 'workflow'}-executions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">Workflows</h1>
                  {isConnected && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-green-500">Live</span>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground">Manage your deployed workflows and analytics</p>
              </div>
              <Button onClick={() => router.push('/editor')}>
                Create New Workflow
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab('workflows')}
                className={`px-4 py-2 font-medium transition-colors relative ${
                  activeTab === 'workflows'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4" />
                  Workflows
                </div>
                {activeTab === 'workflows' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 font-medium transition-colors relative ${
                  activeTab === 'analytics'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </div>
                {activeTab === 'analytics' && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  />
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'analytics' ? (
              <AnalyticsDashboard />
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center py-12 backdrop-blur-xl bg-background/40 rounded-xl border border-border">
                <p className="text-muted-foreground mb-4">No workflows yet</p>
                <Button onClick={() => router.push('/editor')}>
                  Create Your First Workflow
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {workflows.map((workflow) => (
                  <motion.div
                    key={workflow.id || workflow.workflowId}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setPreviewWorkflow(workflow)}
                    className="backdrop-blur-xl bg-background/40 rounded-xl border border-border overflow-hidden cursor-pointer"
                  >
                    {/* Workflow Preview */}
                    <div className="h-48 bg-accent/20 border-b border-border relative">
                      {workflow.nodes && workflow.nodes.length > 0 ? (
                        <div className="w-full h-full" key={`preview-${workflow.id || workflow.workflowId}`}>
                          <WorkflowCanvas 
                            key={`canvas-${workflow.id || workflow.workflowId}`}
                            workflow={workflow} 
                            isGenerating={false}
                            isPreview={true}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <Maximize2 className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{workflow.name || 'Untitled Workflow'}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {workflow.deployedAt 
                              ? new Date(workflow.deployedAt).toLocaleDateString() 
                              : 'Recently'}
                          </span>
                          {workflow.webhookUrl && (
                            <span className="font-mono text-xs bg-accent px-2 py-1 rounded">
                              Webhook
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/workflows/${workflow.workflowId || workflow.id}/edit`);
                          }}
                          className="border-primary text-primary hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/workflows/${workflow.workflowId || workflow.id}/test`);
                          }}
                        >
                          <Zap className="w-4 h-4 mr-1" />
                          Test
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteWorkflow(workflow);
                          }}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Run
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewExecutions(workflow);
                          }}
                        >
                          View Logs
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewWorkflow(workflow);
                          }}
                        >
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {workflow.webhookUrl && (
                      <div className="mt-4 p-3 bg-accent/30 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Webhook URL:</p>
                        <code className="text-xs font-mono break-all">{workflow.webhookUrl}</code>
                      </div>
                    )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Workflow Preview Modal */}
      {previewWorkflow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border border-border rounded-2xl overflow-hidden max-w-7xl w-full shadow-2xl h-[85vh] flex flex-col"
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
                  onClick={() => router.push(`/workflows/${previewWorkflow.id || previewWorkflow.workflowId}/edit`)}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Workflow
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setIsLoadingPreviewExecutions(true);
                    const token = getClientToken();
                    const result = await getWorkflowExecutions(previewWorkflow.workflowId, 10, token || undefined);
                    if (result.success) {
                      setPreviewExecutions(result.data || []);
                    }
                    setIsLoadingPreviewExecutions(false);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Logs
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Reset action - could reload workflow
                    loadWorkflows();
                  }}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                {/* Only show Run button for manual or webhook triggers */}
                {(() => {
                  const hasManualOrWebhook = previewWorkflow.nodes?.some((n: any) => 
                    n.type.includes('manual') || n.type.includes('webhook')
                  );
                  if (hasManualOrWebhook) {
                    return (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExecuteWorkflow(previewWorkflow)}
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
      {selectedWorkflow && (
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
                  {selectedWorkflow.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedWorkflow(null);
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
                  onClick={handleExportExecutions}
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
    </div>
  );
}
