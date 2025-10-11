"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getClientToken } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { Sparkles, Copy, Trash2, Play, Clock, Edit2, Maximize2, Eye, RotateCcw, Webhook, Radio, BarChart3, List, Download, Timer, Zap, CheckCircle, XCircle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Background } from "@/components/layout/Background";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { ScheduleDialog } from "@/components/ScheduleDialog";
import { NewWorkflowDialog } from "@/components/NewWorkflowDialog";
import { getWorkflows, getWorkflowExecutions, executeWorkflow, deployWorkflow } from '@/app/actions/workflows';
import { WorkflowCanvas } from '@/components/workflow/WorkflowCanvas';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { NodeDataInspector } from '@/components/execution/NodeDataInspector';
import { getTimeUntilNextRun, cronToHuman } from '@/lib/schedule-utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WorkflowModals } from '@/components/platform/WorkflowModals';
import { DeploySuccessModal } from '@/components/platform/DeploySuccessModal';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [testingWorkflow, setTestingWorkflow] = useState<any>(null);
  
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
  const [isSavingName, setIsSavingName] = useState(false);
  const [hasNameChanged, setHasNameChanged] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [schedulingWorkflowId, setSchedulingWorkflowId] = useState<
    string | null
  >(null);
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [deployingWorkflowId, setDeployingWorkflowId] = useState<string | null>(null);
  const [showDeploySuccessModal, setShowDeploySuccessModal] = useState(false);
  const [deployedWorkflowName, setDeployedWorkflowName] = useState('');
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
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
      const wfId = selectedDeployedWorkflow.workflowId || selectedDeployedWorkflow.id;
      if (!wfId) return;
      const result = await getWorkflowExecutions(wfId, 10, token || undefined);
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
      setHasNameChanged(false);
    }
  };

  const saveTitle = async () => {
    if (!editingName.trim() || !selectedWorkflowId) {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingName(true);
    try {
      const token = getClientToken();
      const workflow = workflows.find((w) => w.id === selectedWorkflowId);
      const workflowId = (workflow as any)?.workflowId || workflow?.id;

      if (!workflowId) {
        throw new Error('Workflow ID not found');
      }

      // Update via API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${workflowId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editingName.trim(),
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        // Update local state
        updateWorkflow(selectedWorkflowId, { name: editingName.trim() });
        // Reload deployed workflows to sync
        await loadDeployedWorkflows();
      } else {
        alert('Failed to save workflow name: ' + result.error);
      }
    } catch (error: any) {
      alert('Error saving workflow name: ' + error.message);
    } finally {
      setIsSavingName(false);
      setIsEditingTitle(false);
    }
  };

  const cancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditingName("");
    setHasNameChanged(false);
  };

  // Deploy workflow handler
  const handleDeployWorkflow = async (workflowId: string) => {
    try {
      setDeployingWorkflowId(workflowId);
      const token = getClientToken();
      
      if (!token) {
        setShowAuthModal(true);
        return;
      }

      // Get the workflow data from API to ensure we have full n8n structure
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${workflowId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const workflowResult = await response.json();
      if (!workflowResult.success) {
        alert('Failed to load workflow: ' + workflowResult.error);
        return;
      }

      const workflow = workflowResult.data;
      console.log('[Platform] Deploying workflow:', workflow.name);
      
      // Deploy to n8n
      const result = await deployWorkflow(workflow, token);
      
      if (result.success) {
        console.log('[Platform] Deployment successful:', result.data);
        
        // Show success modal
        setDeployedWorkflowName(workflow.name);
        setDeploymentResult(result.data);
        setShowDeploySuccessModal(true);
        
        // Reload deployed workflows
        await loadDeployedWorkflows();
      } else {
        alert('❌ Deployment failed: ' + result.error);
      }
    } catch (error: any) {
      console.error('[Platform] Deployment error:', error);
      alert('❌ Error deploying workflow: ' + error.message);
    } finally {
      setDeployingWorkflowId(null);
    }
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
    const wfId = workflow.workflowId || workflow.id;
    if (!wfId) return;
    const result = await getWorkflowExecutions(wfId, 10, token || undefined);
    if (result.success) {
      setExecutions(result.data || []);
    }
  };

  const handleExecuteWorkflow = async (workflow: any) => {
    try {
      const token = getClientToken();
      const wfId = workflow.workflowId || workflow.id;
      if (!wfId) {
        alert('❌ Cannot execute: workflow ID is missing');
        return;
      }
      const result = await executeWorkflow(wfId, {}, token || undefined);
      if (result.success) {
        alert('✅ Workflow executed successfully!');
        const selectedId = selectedDeployedWorkflow?.workflowId || selectedDeployedWorkflow?.id;
        if (selectedId && selectedId === wfId) {
          handleViewExecutions(workflow);
        }
        const previewId = previewWorkflow?.workflowId || previewWorkflow?.id;
        if (previewId && previewId === wfId) {
          const execResult = await getWorkflowExecutions(wfId, 5, token || undefined);
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
            <div className="grid grid-cols-[360px_1fr] gap-6 h-full">
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
                              handleDeployWorkflow(workflow.id);
                            }}
                            disabled={deployingWorkflowId === workflow.id}
                            className="h-7 w-7 p-0 hover:bg-green-500/20 hover:text-green-500"
                            title="Deploy to n8n"
                          >
                            {deployingWorkflowId === workflow.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Zap className="w-3 h-3" />
                            )}
                          </Button>
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

              {/* Right Panel - Selected Workflow Canvas */}
              <div className="flex flex-col h-full backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-2">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Loading workflow...
                      </p>
                    </div>
                  </div>
                ) : !selectedWorkflow ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-4 p-8">
                      <Sparkles className="w-16 h-16 text-muted-foreground mx-auto" />
                      <div>
                        <h3 className="font-medium text-foreground mb-2">
                          No Workflow Selected
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          {workflows.length === 0
                            ? "Create your first workflow to get started with automation"
                            : "Select a workflow from the list to view its canvas"}
                        </p>
                      </div>
                      {workflows.length === 0 && (
                        <Button
                          size="sm"
                          className="rounded-lg bg-black text-white hover:bg-gray-800"
                          onClick={() => setShowNewWorkflowDialog(true)}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Create First Workflow
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header with workflow actions */}
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 group">
                            {isEditingTitle ? (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  ref={titleInputRef}
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => {
                                    setEditingName(e.target.value);
                                    const workflow = workflows.find((w) => w.id === selectedWorkflowId);
                                    setHasNameChanged(e.target.value !== workflow?.name);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && hasNameChanged) saveTitle();
                                    if (e.key === "Escape") cancelEditTitle();
                                  }}
                                  disabled={isSavingName}
                                  className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0 flex-1"
                                />
                                {isSavingName ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                ) : hasNameChanged ? (
                                  <Button
                                    size="sm"
                                    onClick={saveTitle}
                                    className="h-7 px-3"
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                ) : null}
                              </div>
                            ) : (
                              <>
                                <h2 className="text-lg font-semibold">
                                  {selectedWorkflow?.name}
                                </h2>
                                <button
                                  onClick={startEditingTitle}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
                                >
                                  <Edit2 className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedWorkflow?.description || 'Visual workflow editor'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isConnected && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-xs font-medium text-green-500">Live</span>
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const wf = deployedWorkflows.find(w => 
                                w.id === selectedWorkflowId || w.workflowId === selectedWorkflowId
                              );
                              if (wf) {
                                setEditingWorkflow(wf);
                                setShowEditModal(true);
                              }
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const wf = deployedWorkflows.find(w => 
                                w.id === selectedWorkflowId || w.workflowId === selectedWorkflowId
                              );
                              if (wf) {
                                setTestingWorkflow(wf);
                                setShowTestModal(true);
                              }
                            }}
                            className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 hover:from-purple-600/20 hover:to-pink-600/20 border-purple-500/30"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeployWorkflow(selectedWorkflowId)}
                            disabled={deployingWorkflowId === selectedWorkflowId}
                            className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 hover:from-green-600/20 hover:to-emerald-600/20 border-green-500/30"
                          >
                            {deployingWorkflowId === selectedWorkflowId ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4 mr-2" />
                            )}
                            Deploy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const wf = deployedWorkflows.find(w => 
                                w.id === selectedWorkflowId || w.workflowId === selectedWorkflowId
                              );
                              if (wf) handleViewExecutions(wf);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Logs
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              const wf = deployedWorkflows.find(w => 
                                w.id === selectedWorkflowId || w.workflowId === selectedWorkflowId
                              );
                              if (wf) handleExecuteWorkflow(wf);
                            }}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Run
                          </Button>
                          {/* Preview Modal - Not needed anymore since Edit/Test modals are full-size
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const wf = deployedWorkflows.find(w => 
                                w.id === selectedWorkflowId || w.workflowId === selectedWorkflowId
                              );
                              if (wf) setPreviewWorkflow(wf);
                            }}
                          >
                            <Maximize2 className="w-4 h-4" />
                          </Button>
                          */}
                        </div>
                      </div>

                      {/* Stats */}
                      {selectedWorkflow && (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-accent/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">
                              Total Runs
                            </div>
                            <div className="text-2xl font-bold">
                              {selectedWorkflow.stats.runs}
                            </div>
                          </div>
                          <div className="bg-accent/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">
                              Nodes
                            </div>
                            <div className="text-2xl font-bold">
                              {selectedWorkflow.stats.nodes}
                            </div>
                          </div>
                          <div className="bg-accent/50 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground mb-1">
                              Avg Runtime
                            </div>
                            <div className="text-2xl font-bold">
                              {selectedWorkflow.stats.avgRunTime}s
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 overflow-hidden relative">
                      {selectedWorkflow.workflow_data?.nodes && selectedWorkflow.workflow_data.nodes.length > 0 ? (
                        <WorkflowCanvas 
                          workflow={selectedWorkflow.workflow_data} 
                          isGenerating={false}
                          latestExecution={previewExecutions.length > 0 ? previewExecutions[0] : undefined}
                          enableRealTimeUpdates={true}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center space-y-4">
                            <div className="w-20 h-20 rounded-full bg-accent mx-auto flex items-center justify-center">
                              <Sparkles className="w-10 h-10 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground mb-2">
                                No Workflow Canvas
                              </h3>
                              <p className="text-sm text-muted-foreground max-w-md">
                                This workflow hasn't been designed yet. Edit it in the editor to add nodes.
                              </p>
                            </div>
                            <Link href="/editor">
                              <Button
                                size="sm"
                                className="rounded-lg bg-black text-white hover:bg-gray-800"
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit in Editor
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
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
          const wfId = previewWorkflow.workflowId || previewWorkflow.id;
          if (!wfId) { setIsLoadingPreviewExecutions(false); return; }
          const result = await getWorkflowExecutions(wfId, 10, token || undefined);
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
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        editingWorkflow={editingWorkflow}
        setEditingWorkflow={setEditingWorkflow}
        showTestModal={showTestModal}
        setShowTestModal={setShowTestModal}
        testingWorkflow={testingWorkflow}
        setTestingWorkflow={setTestingWorkflow}
      />

      {/* Deploy Success Modal */}
      <DeploySuccessModal
        isOpen={showDeploySuccessModal}
        onClose={() => setShowDeploySuccessModal(false)}
        workflowName={deployedWorkflowName}
        deploymentData={deploymentResult}
      />
    </div>
  );
}
