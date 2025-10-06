'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { Button } from '@/components/ui/button';
import { Play, Pause, Trash2, Clock, CheckCircle, XCircle, Loader2, Maximize2, Eye, RotateCcw, Webhook, Copy, Radio } from 'lucide-react';
import { getWorkflows, activateWorkflow, getWorkflowExecutions, executeWorkflow } from '@/app/actions/workflows';
import { useRouter } from 'next/navigation';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [previewExecutions, setPreviewExecutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPreviewExecutions, setIsLoadingPreviewExecutions] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  // Auto-load executions when preview workflow opens
  useEffect(() => {
    if (previewWorkflow?.workflowId) {
      const loadPreviewExecutions = async () => {
        setIsLoadingPreviewExecutions(true);
        const result = await getWorkflowExecutions(previewWorkflow.workflowId, 5);
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
    const result = await getWorkflows();
    if (result.success) {
      setWorkflows(result.data || []);
    }
    setIsLoading(false);
  };

  const handleViewExecutions = async (workflow: any) => {
    setSelectedWorkflow(workflow);
    const result = await getWorkflowExecutions(workflow.workflowId, 10);
    if (result.success) {
      setExecutions(result.data || []);
    }
  };

  const handleExecuteWorkflow = async (workflow: any) => {
    try {
      const result = await executeWorkflow(workflow.workflowId, {});
      if (result.success) {
        alert('✅ Workflow executed successfully!');
        // Refresh executions if modal is open
        if (selectedWorkflow?.workflowId === workflow.workflowId) {
          handleViewExecutions(workflow);
        }
        // Refresh preview executions if preview modal is open
        if (previewWorkflow?.workflowId === workflow.workflowId) {
          const execResult = await getWorkflowExecutions(workflow.workflowId, 5);
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

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 w-full h-full">
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
                <h1 className="text-4xl font-bold mb-2">Workflows</h1>
                <p className="text-muted-foreground">Manage your deployed workflows</p>
              </div>
              <Button onClick={() => router.push('/editor')}>
                Create New Workflow
              </Button>
            </div>

            {isLoading ? (
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
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteWorkflow(workflow);
                          }}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Run Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewExecutions(workflow);
                          }}
                        >
                          View Executions
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
                    
                    // Parse cron to human readable
                    const getCronDescription = (expr: string) => {
                      if (expr === 'Not set') return 'No schedule configured';
                      if (expr === '0 9 * * 1-5') return 'Every weekday at 9:00 AM';
                      if (expr === '0 * * * *') return 'Every hour';
                      if (expr === '*/15 * * * *') return 'Every 15 minutes';
                      if (expr === '0 0 * * *') return 'Daily at midnight';
                      return expr; // Return cron if no match
                    };
                    
                    return (
                      <div className="mt-3 flex items-center gap-3 p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                        <Clock className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-purple-500">Scheduled Trigger</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs font-medium text-foreground">{getCronDescription(cron)}</span>
                          </div>
                          <code className="text-[10px] font-mono text-muted-foreground">
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
                  onClick={async () => {
                    setIsLoadingPreviewExecutions(true);
                    const result = await getWorkflowExecutions(previewWorkflow.workflowId, 10);
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
              />
            </div>
            
            {/* Execution Log Panel */}
            <div className="border-t border-border bg-accent/20">
              <div className="px-6 py-3">
                <h3 className="text-sm font-semibold mb-3">Execution Log</h3>
                {isLoadingPreviewExecutions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : previewExecutions.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-2">
                    No executions yet. Click "View Logs" to load recent executions.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {previewExecutions.slice(0, 5).map((execution: any) => (
                      <div key={execution.id} className="flex items-start gap-3 text-sm py-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{
                          backgroundColor: execution.status === 'success' ? '#22c55e' :
                                         execution.status === 'error' ? '#ef4444' : '#3b82f6'
                        }} />
                        <span className="text-xs text-muted-foreground min-w-[60px]">
                          {new Date(execution.startedAt).toLocaleTimeString()}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium capitalize">{execution.status}</div>
                          {execution.nodeExecutions && execution.nodeExecutions.length > 0 && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {execution.nodeExecutions.map((node: any, idx: number) => (
                                <span key={idx}>
                                  {node.nodeName}: {node.status}
                                  {idx < execution.nodeExecutions.length - 1 && ' • '}
                                </span>
                              ))}
                            </div>
                          )}
                          {execution.error && (
                            <div className="text-xs text-red-500 mt-0.5">{execution.error}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
              <h2 className="text-2xl font-bold">Execution History</h2>
              <button
                onClick={() => {
                  setSelectedWorkflow(null);
                  setExecutions([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {executions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No executions yet</p>
            ) : (
              <div className="space-y-4">
                {executions.map((execution: any) => (
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
