"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getClientToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { Sparkles, Copy, Trash2, Play, Clock, Edit2, Maximize2, Eye, RotateCcw, Webhook, Radio, BarChart3, List, Download, Timer, Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Background } from "@/components/layout/Background";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { ScheduleDialog } from "@/components/ScheduleDialog";
import { NewWorkflowDialog } from "@/components/NewWorkflowDialog";
import { getWorkflows, getWorkflowExecutions, executeWorkflow } from '@/app/actions/workflows';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { NodeDataInspector } from '@/components/execution/NodeDataInspector';
import { getTimeUntilNextRun, cronToHuman } from '@/lib/schedule-utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WorkflowModals } from '@/components/platform/WorkflowModals';

export default function PlatformPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Deployed workflows state (from workflows page)
  const [deployedWorkflows, setDeployedWorkflows] = useState<any[]>([]);
  const [selectedDeployedWorkflow, setSelectedDeployedWorkflow] = useState<any>(null);
  const [previewWorkflow, setPreviewWorkflow] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [previewExecutions, setPreviewExecutions] = useState<any[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);
  const [isLoadingPreviewExecutions, setIsLoadingPreviewExecutions] = useState(false);
  const [activeTab, setActiveTab] = useState<'workflows' | 'analytics'>('workflows');
  const [executionFilter, setExecutionFilter] = useState<'all' | 'success' | 'error'>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showExecutionsModal, setShowExecutionsModal] = useState(false);
  
  // Legacy platform context (for sidebar)
  const {
    workflows,
    selectedWorkflowId,
    setSelectedWorkflowId,
    setMessages,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    isLoading,
    error,
  } = useWorkflow();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [schedulingWorkflowId, setSchedulingWorkflowId] = useState<
    string | null
  >(null);
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // WebSocket for real-time updates
  const { isConnected, addEventListener, subscribeToWorkflow, unsubscribeFromWorkflow } = useWebSocket();

  // Load deployed workflows
  useEffect(() => {
    loadDeployedWorkflows();
  }, []);

  // Check authentication on mount
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log("[Platform] No auth token found, showing login modal");
      setShowAuthModal(true);
    }
  }, [authLoading, isAuthenticated]);
  
  // Listen to WebSocket events for real-time execution updates
  useEffect(() => {
    const unsubscribeCompleted = addEventListener('execution:completed', async (event: any) => {
      console.log('[Platform] Execution completed event:', event);
      
      // Refresh executions if this workflow is being viewed
      if (selectedDeployedWorkflow?.workflowId === event.workflowId) {
        const token = getClientToken();
        const result = await getWorkflowExecutions(event.workflowId, 10, token || undefined);
        if (result.success) {
          setExecutions(result.data || []);
        }
      }
    });

    const unsubscribeStarted = addEventListener('execution:started', (event: any) => {
      console.log('[Platform] Execution started event:', event);
    });

    return () => {
      unsubscribeCompleted();
      unsubscribeStarted();
    };
  }, [selectedDeployedWorkflow, addEventListener]);

  // Auto-refresh executions when enabled
  useEffect(() => {
    if (!autoRefresh || !selectedDeployedWorkflow) return;

    const interval = setInterval(async () => {
      const token = getClientToken();
      const result = await getWorkflowExecutions(selectedDeployedWorkflow.workflowId, 10, token || undefined);
      if (result.success) {
        setExecutions(result.data || []);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedDeployedWorkflow]);

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

  // Show auth modal if not authenticated
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
        <div className="fixed inset-0 w-full h-full">
          <Background />
        </div>
        <div className="relative z-10">
          <Navbar />
          <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-4">Authentication Required</h1>
              <p className="text-muted-foreground mb-6">Please log in to access the platform</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all"
              >
                Log In
              </button>
            </div>
          </div>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            router.push('/');
          }}
        />
      </div>
    );
  }

  const startEditingTitle = () => {
    const workflow = workflows.find((w) => w.id === selectedWorkflowId);
    if (workflow) {
      setEditingName(workflow.name);
      setIsEditingTitle(true);
    }
  };

  const saveTitle = () => {
    if (editingName.trim() && selectedWorkflowId) {
      updateWorkflow(selectedWorkflowId, { name: editingName.trim() });
    }
    setIsEditingTitle(false);
  };

  const cancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditingName("");
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleScheduleClick = (workflowId: string) => {
    setSchedulingWorkflowId(workflowId);
    setShowScheduleDialog(true);
  };

  const loadDeployedWorkflows = async () => {
    setIsLoadingWorkflows(true);
    const token = getClientToken();
    const result = await getWorkflows(token || undefined);
    if (result.success) {
      setDeployedWorkflows(result.data || []);
    }
    setIsLoadingWorkflows(false);
  };

  const handleViewExecutions = async (workflow: any) => {
    setSelectedDeployedWorkflow(workflow);
    setShowExecutionsModal(true);
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
        if (selectedDeployedWorkflow?.workflowId === workflow.workflowId) {
          handleViewExecutions(workflow);
        }
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

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDeployedWorkflow?.name || 'workflow'}-executions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSchedule = (schedule: { days: string[]; time: string }) => {
    if (schedulingWorkflowId) {
      console.log("Scheduling workflow:", schedulingWorkflowId, schedule);
    }
  };

  const handleCreateWorkflow = (title: string) => {
    setMessages([
      {
        id: Date.now().toString(),
        text: `Create a workflow for: ${title}`,
        isUser: true,
        timestamp: new Date(),
      },
    ]);
    router.push("/editor");
  };

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
  const schedulingWorkflow = workflows.find(
    (w) => w.id === schedulingWorkflowId
  );

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 w-full h-full">
        <Background />
      </div>

      <div className="relative z-10">
        <Navbar />

        <motion.div
          className="w-full h-[calc(100vh-120px)] relative z-10 px-6 py-6 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="container mx-auto h-[90%] max-w-[1600px]">
            <div className="grid grid-cols-[280px_1fr] gap-6 h-full">
              {/* Left Sidebar - Workflow List */}
              <div className="flex flex-col h-full backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-semibold">My Workflows</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {workflows.length} workflows
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground">
                          Loading workflows...
                        </p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-center justify-center h-full p-4">
                      <div className="text-center space-y-2">
                        <p className="text-sm text-destructive">{error}</p>
                        <p className="text-xs text-muted-foreground">
                          Please try refreshing the page
                        </p>
                      </div>
                    </div>
                  ) : workflows.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-4">
                      <div className="text-center space-y-2">
                        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No workflows yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Create your first workflow to get started
                        </p>
                      </div>
                    </div>
                  ) : (
                    workflows.map((workflow) => (
                      <motion.div
                        key={workflow.id}
                        className={cn(
                          "rounded-lg mb-2 transition-all overflow-hidden flex items-center",
                          selectedWorkflowId === workflow.id
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-accent/50"
                        )}
                        whileHover={{ scale: 1.02 }}
                      >
                        <button
                          onClick={() => setSelectedWorkflowId(workflow.id)}
                          className="flex-1 text-left p-3"
                        >
                          <div className="font-medium text-sm mb-1">
                            {workflow.name}
                          </div>
                          <div
                            className={cn(
                              "text-xs",
                              selectedWorkflowId === workflow.id
                                ? "text-primary-foreground/80"
                                : "text-muted-foreground"
                            )}
                          >
                            {workflow.createdAt.toLocaleDateString()}
                          </div>
                        </button>
                        <div className="flex items-center gap-1 pr-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateWorkflow(workflow.id);
                            }}
                            className="h-7 w-7 p-0 hover:bg-background/20"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWorkflow(workflow.id);
                            }}
                            className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-border">
                  <Button
                    size="sm"
                    className="w-full rounded-lg bg-black text-white hover:bg-gray-800"
                    onClick={() => setShowNewWorkflowDialog(true)}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    New Workflow
                  </Button>
                </div>
              </div>

              {/* Right Panel - Deployed Workflows with Enhanced Features */}
              <div className="flex flex-col h-full backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-border px-4 pt-4">
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
                      Deployed Workflows
                      {isConnected && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      )}
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
                  <div className="flex-1 overflow-auto p-6">
                    <AnalyticsDashboard />
                  </div>
                ) : isLoadingWorkflows ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Loading deployed workflows...
                      </p>
                    </div>
                  </div>
                ) : deployedWorkflows.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4 p-8">
                      <Sparkles className="w-16 h-16 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="font-medium text-foreground mb-2">
                          No Deployed Workflows
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Create and deploy workflows from the editor to see them here
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-lg bg-black text-white hover:bg-gray-800"
                        onClick={() => router.push('/editor')}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Go to Editor
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {deployedWorkflows.map((workflow) => (
                        <motion.div
                          key={workflow.id || workflow.workflowId}
                          whileHover={{ scale: 1.01 }}
                          onClick={() => setPreviewWorkflow(workflow)}
                          className="backdrop-blur-xl bg-background/40 rounded-xl border border-border overflow-hidden cursor-pointer"
                        >
                          {/* Workflow Preview */}
                          <div className="h-32 bg-accent/20 border-b border-border relative">
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
                                <Maximize2 className="w-6 h-6" />
                              </div>
                            )}
                          </div>

                          <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold mb-1">{workflow.name || 'Untitled Workflow'}</h3>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {workflow.deployedAt 
                                      ? new Date(workflow.deployedAt).toLocaleDateString() 
                                      : 'Recently'}
                                  </span>
                                  {workflow.webhookUrl && (
                                    <span className="font-mono text-xs bg-accent px-2 py-0.5 rounded">
                                      Webhook
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/workflows/${workflow.workflowId || workflow.id}/test`);
                                }}
                                className="flex-1"
                              >
                                <Zap className="w-3 h-3 mr-1" />
                                Test
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExecuteWorkflow(workflow);
                                }}
                              >
                                <Play className="w-3 h-3 mr-1" />
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
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewWorkflow(workflow);
                                }}
                              >
                                <Maximize2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <ScheduleDialog
        isOpen={showScheduleDialog}
        onClose={() => {
          setShowScheduleDialog(false);
          setSchedulingWorkflowId(null);
        }}
        onSchedule={handleSchedule}
        workflowName={schedulingWorkflow?.name || ""}
      />

      <NewWorkflowDialog
        isOpen={showNewWorkflowDialog}
        onClose={() => setShowNewWorkflowDialog(false)}
        onCreateWorkflow={handleCreateWorkflow}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          router.push('/');
        }}
      />

      <WorkflowModals
        previewWorkflow={previewWorkflow}
        setPreviewWorkflow={setPreviewWorkflow}
        previewExecutions={previewExecutions}
        setPreviewExecutions={setPreviewExecutions}
        isLoadingPreviewExecutions={isLoadingPreviewExecutions}
        onExecuteWorkflow={handleExecuteWorkflow}
        onLoadWorkflows={loadDeployedWorkflows}
        onLoadPreviewExecutions={async () => {
          setIsLoadingPreviewExecutions(true);
          const token = getClientToken();
          const result = await getWorkflowExecutions(previewWorkflow.workflowId, 10, token || undefined);
          if (result.success) {
            setPreviewExecutions(result.data || []);
          }
          setIsLoadingPreviewExecutions(false);
        }}
        selectedDeployedWorkflow={selectedDeployedWorkflow}
        setSelectedDeployedWorkflow={setSelectedDeployedWorkflow}
        showExecutionsModal={showExecutionsModal}
        setShowExecutionsModal={setShowExecutionsModal}
        executions={executions}
        setExecutions={setExecutions}
        executionFilter={executionFilter}
        setExecutionFilter={setExecutionFilter}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        onExportExecutions={handleExportExecutions}
      />
    </div>
  );
}
