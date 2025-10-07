"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getClientToken } from "@/lib/auth";
import { Sparkles, Copy, Trash2, Play, Clock, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Background } from "@/components/layout/Background";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { ScheduleDialog } from "@/components/ScheduleDialog";
import { NewWorkflowDialog } from "@/components/NewWorkflowDialog";

export default function PlatformPage() {
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    const token = getClientToken();
    if (!token) {
      console.log("[Platform] No auth token found, redirecting to login");
      router.push("/login");
    }
  }, [router]);
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

  const handleSchedule = (schedule: { days: string[]; time: string }) => {
    if (schedulingWorkflowId) {
      // Here you would save the schedule to the workflow
      console.log("Scheduling workflow:", schedulingWorkflowId, schedule);
      // For now, just show a toast or update workflow metadata
    }
  };

  const handleCreateWorkflow = (title: string) => {
    // Set initial message with workflow title
    setMessages([
      {
        id: Date.now().toString(),
        text: `Create a workflow for: ${title}`,
        isUser: true,
        timestamp: new Date(),
      },
    ]);

    // Navigate to editor
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

              {/* Right Panel - Workflow Details */}
              <div className="flex flex-col h-full backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">
                        Loading workflow details...
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
                            : "Select a workflow from the list to view its details"}
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
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 group">
                            {isEditingTitle ? (
                              <input
                                ref={titleInputRef}
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveTitle();
                                  if (e.key === "Escape") cancelEditTitle();
                                }}
                                onBlur={saveTitle}
                                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full"
                              />
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
                            {selectedWorkflow?.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() =>
                              handleScheduleClick(selectedWorkflowId)
                            }
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Schedule
                          </Button>
                          <Link href="/editor">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg"
                              onClick={() => {
                                if (selectedWorkflow) {
                                  setMessages([
                                    {
                                      id: Date.now().toString(),
                                      text: `Editing workflow: ${selectedWorkflow.name}`,
                                      isUser: false,
                                      timestamp: new Date(),
                                    },
                                  ]);
                                }
                              }}
                            >
                              Edit in Chat
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            className="rounded-lg bg-black text-white hover:bg-gray-800"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Run
                          </Button>
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
                    <div className="flex-1 p-6 overflow-auto">
                      <motion.div
                        key={selectedWorkflowId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="h-full flex items-center justify-center"
                      >
                        <div className="text-center space-y-4">
                          <div className="w-20 h-20 rounded-full bg-accent mx-auto flex items-center justify-center">
                            <Sparkles className="w-10 h-10 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground mb-2">
                              Workflow Graph
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md">
                              Node graph visualization will appear here. This is
                              where you'll see all the automation steps and
                              connections.
                            </p>
                          </div>
                        </div>
                      </motion.div>
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
    </div>
  );
}
