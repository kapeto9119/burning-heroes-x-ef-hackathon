'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Copy, Trash2, Play, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { Background } from '@/components/layout/Background';
import { useWorkflow } from '@/contexts/WorkflowContext';
import { ScheduleDialog } from '@/components/ScheduleDialog';

export default function PlatformPage() {
  const {
    workflows,
    selectedWorkflowId,
    setSelectedWorkflowId,
    setMessages,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
  } = useWorkflow();

  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [schedulingWorkflowId, setSchedulingWorkflowId] = useState<string | null>(null);

  const startEditing = (id: string, name: string) => {
    setEditingWorkflowId(id);
    setEditingName(name);
  };

  const saveEdit = () => {
    if (editingWorkflowId && editingName.trim()) {
      updateWorkflow(editingWorkflowId, { name: editingName.trim() });
      setEditingWorkflowId(null);
      setEditingName('');
    }
  };

  const cancelEdit = () => {
    setEditingWorkflowId(null);
    setEditingName('');
  };

  const handleScheduleClick = (workflowId: string) => {
    setSchedulingWorkflowId(workflowId);
    setShowScheduleDialog(true);
  };

  const handleSchedule = (schedule: { days: string[]; time: string }) => {
    if (schedulingWorkflowId) {
      // Here you would save the schedule to the workflow
      console.log('Scheduling workflow:', schedulingWorkflowId, schedule);
      // For now, just show a toast or update workflow metadata
    }
  };

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);
  const schedulingWorkflow = workflows.find(w => w.id === schedulingWorkflowId);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 w-full h-full">
        <Background />
      </div>

      <div className="relative z-10">
        <Navbar />

        <motion.div 
          className="w-full h-[calc(100vh-120px)] relative z-10 px-6 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="container mx-auto h-full max-w-7xl">
            <div className="grid grid-cols-[280px_1fr] gap-6 h-full">
              {/* Left Sidebar - Workflow List */}
              <div className="flex flex-col h-full backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-semibold">My Workflows</h2>
                  <p className="text-xs text-muted-foreground mt-1">{workflows.length} workflows</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {workflows.map((workflow) => (
                    <motion.div
                      key={workflow.id}
                      className={cn(
                        'rounded-lg mb-2 transition-all overflow-hidden flex items-center',
                        selectedWorkflowId === workflow.id
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-accent/50'
                      )}
                      whileHover={{ scale: 1.02 }}
                    >
                      <button
                        onClick={() => setSelectedWorkflowId(workflow.id)}
                        className="flex-1 text-left p-3"
                      >
                        {editingWorkflowId === workflow.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            onBlur={saveEdit}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-background text-foreground px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                          />
                        ) : (
                          <div 
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              startEditing(workflow.id, workflow.name);
                            }}
                            className="cursor-text"
                          >
                            <div className="font-medium text-sm mb-1">{workflow.name}</div>
                            <div className={cn(
                              'text-xs',
                              selectedWorkflowId === workflow.id
                                ? 'text-primary-foreground/80'
                                : 'text-muted-foreground'
                            )}>
                              {workflow.createdAt.toLocaleDateString()}
                            </div>
                          </div>
                        )}
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
                  ))}
                </div>
                <div className="p-3 border-t border-border">
                  <Link href="/editor">
                    <Button 
                      size="sm" 
                      className="w-full rounded-lg bg-black text-white hover:bg-gray-800"
                      onClick={() => setMessages([])}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      New Workflow
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Right Panel - Workflow Details */}
              <div className="flex flex-col h-full backdrop-blur-xl bg-background/40 rounded-2xl border border-border shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {selectedWorkflow?.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedWorkflow?.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-lg"
                        onClick={() => handleScheduleClick(selectedWorkflowId)}
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
                              setMessages([{
                                id: Date.now().toString(),
                                text: `Editing workflow: ${selectedWorkflow.name}`,
                                isUser: false,
                                timestamp: new Date()
                              }]);
                            }
                          }}
                        >
                          Edit in Chat
                        </Button>
                      </Link>
                      <Button size="sm" className="rounded-lg bg-black text-white hover:bg-gray-800">
                        <Play className="w-4 h-4 mr-1" />
                        Run
                      </Button>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  {selectedWorkflow && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-accent/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Total Runs</div>
                        <div className="text-2xl font-bold">{selectedWorkflow.stats.runs}</div>
                      </div>
                      <div className="bg-accent/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Nodes</div>
                        <div className="text-2xl font-bold">{selectedWorkflow.stats.nodes}</div>
                      </div>
                      <div className="bg-accent/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground mb-1">Avg Runtime</div>
                        <div className="text-2xl font-bold">{selectedWorkflow.stats.avgRunTime}s</div>
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
                        <h3 className="font-medium text-foreground mb-2">Workflow Graph</h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Node graph visualization will appear here. This is where you'll see all the automation steps and connections.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
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
        workflowName={schedulingWorkflow?.name || ''}
      />
    </div>
  );
}
