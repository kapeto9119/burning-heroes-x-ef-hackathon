'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { Button } from '@/components/ui/button';
import { Play, Pause, Trash2, Clock, CheckCircle, XCircle, Loader2, Maximize2 } from 'lucide-react';
import { getWorkflows, activateWorkflow, getWorkflowExecutions } from '@/app/actions/workflows';
import { useRouter } from 'next/navigation';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setIsLoading(true);
    const result = await getWorkflows();
    if (result.success && result.data) {
      setWorkflows(result.data);
    }
    setIsLoading(false);
  };

  const loadExecutions = async (workflowId: string) => {
    const result = await getWorkflowExecutions(workflowId, 10);
    if (result.success && result.data) {
      setExecutions(result.data);
    }
  };

  const handleActivate = async (workflowId: string) => {
    await activateWorkflow(workflowId);
    loadWorkflows();
  };

  const handleViewExecutions = async (workflow: any) => {
    setSelectedWorkflow(workflow);
    await loadExecutions(workflow.workflowId);
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
                        <div className="w-full h-full">
                          <WorkflowCanvas workflow={workflow} isGenerating={false} />
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
                            {new Date(workflow.deployedAt).toLocaleDateString()}
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
            className="bg-background border border-border rounded-2xl p-6 max-w-6xl w-full shadow-2xl h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{previewWorkflow.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewWorkflow.nodes?.length || 0} nodes
                </p>
              </div>
              <button
                onClick={() => setPreviewWorkflow(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 border border-border rounded-xl overflow-hidden">
              <WorkflowCanvas workflow={previewWorkflow} isGenerating={false} />
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
