'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Workflow {
  id: string;
  name: string;
  createdAt: Date;
  description: string;
  stats: {
    runs: number;
    nodes: number;
    avgRunTime: number;
  };
  workflow_data?: any; // N8N workflow data
  is_active?: boolean;
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'confirm';
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface WorkflowContextType {
  workflows: Workflow[];
  selectedWorkflowId: string;
  messages: Message[];
  toasts: Toast[];
  isLoading: boolean;
  error: string | null;
  setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>>;
  setSelectedWorkflowId: React.Dispatch<React.SetStateAction<string>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  createWorkflow: (name: string, description: string) => Promise<void>;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => Promise<void>;
  deleteWorkflow: (id: string) => void;
  duplicateWorkflow: (id: string) => Promise<void>;
  addToast: (message: string, type: Toast['type'], onConfirm?: () => void) => void;
  removeToast: (id: string) => void;
  refreshWorkflows: () => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch workflows from API
  const fetchWorkflows = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setWorkflows([]);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      // Handle 401 - token is invalid or expired
      if (response.status === 401) {
        console.error('Token is invalid or expired, clearing auth');
        localStorage.removeItem('auth_token');
        setError('Session expired. Please login again.');
        setWorkflows([]);
        setIsLoading(false);
        return;
      }

      if (data.success && data.data) {
        // Transform API data to Workflow format
        const transformedWorkflows: Workflow[] = data.data.map((wf: any) => ({
          id: wf.id,
          name: wf.name || 'Untitled Workflow',
          createdAt: new Date(wf.createdAt || wf.created_at || Date.now()),
          description: wf.description || '',
          stats: {
            runs: 0, // TODO: Get from executions table
            nodes: wf.nodes?.length || 0,
            avgRunTime: 0 // TODO: Calculate from executions
          },
          workflow_data: wf,
          is_active: wf.active || false
        }));

        setWorkflows(transformedWorkflows);
        
        // Set first workflow as selected if none selected
        if (transformedWorkflows.length > 0 && !selectedWorkflowId) {
          setSelectedWorkflowId(transformedWorkflows[0].id);
        }
      } else {
        setError(data.error || 'Failed to fetch workflows');
      }
    } catch (err: any) {
      console.error('Error fetching workflows:', err);
      setError(err.message || 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  // Load workflows on mount
  useEffect(() => {
    fetchWorkflows();
  }, []);

  const addToast = (message: string, type: Toast['type'], onConfirm?: () => void) => {
    const id = Date.now().toString();
    const toast: Toast = {
      id,
      message,
      type,
      onConfirm,
      onCancel: () => removeToast(id)
    };
    setToasts(prev => [...prev, toast]);
    
    if (type !== 'confirm') {
      setTimeout(() => removeToast(id), 3000);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const createWorkflow = async (name: string, description: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        addToast('Please login first', 'error');
        return;
      }

      // Create minimal workflow structure
      const workflowData = {
        name,
        description,
        nodes: [],
        connections: {},
        active: false,
        settings: {}
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(workflowData)
      });

      const data = await response.json();

      if (data.success && data.data) {
        await fetchWorkflows();
        setSelectedWorkflowId(data.data.id);
        addToast('Workflow created successfully', 'success');
      } else {
        addToast(data.error || 'Failed to create workflow', 'error');
      }
    } catch (err: any) {
      console.error('Error creating workflow:', err);
      addToast(err.message || 'Failed to create workflow', 'error');
    }
  };

  const updateWorkflow = async (id: string, updates: Partial<Workflow>) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        addToast('Please login first', 'error');
        return;
      }

      const workflow = workflows.find(w => w.id === id);
      if (!workflow) return;

      // Merge updates with existing workflow data
      const updatedWorkflowData = {
        ...workflow.workflow_data,
        name: updates.name || workflow.name,
        description: updates.description || workflow.description,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedWorkflowData)
      });

      const data = await response.json();

      if (data.success) {
        // Update local state optimistically
        setWorkflows(prev => prev.map(w => 
          w.id === id ? { ...w, ...updates } : w
        ));
      } else {
        addToast(data.error || 'Failed to update workflow', 'error');
      }
    } catch (err: any) {
      console.error('Error updating workflow:', err);
      addToast(err.message || 'Failed to update workflow', 'error');
    }
  };

  const deleteWorkflow = (id: string) => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) return;
    
    addToast(
      `Delete "${workflow.name}"?`,
      'confirm',
      async () => {
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) {
            addToast('Please login first', 'error');
            return;
          }

          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          const data = await response.json();

          if (data.success) {
            setWorkflows(prev => prev.filter(w => w.id !== id));
            if (selectedWorkflowId === id && workflows.length > 1) {
              const remainingWorkflows = workflows.filter(w => w.id !== id);
              setSelectedWorkflowId(remainingWorkflows[0]?.id || '');
            }
            addToast('Workflow deleted successfully', 'success');
          } else {
            addToast(data.error || 'Failed to delete workflow', 'error');
          }
        } catch (err: any) {
          console.error('Error deleting workflow:', err);
          addToast(err.message || 'Failed to delete workflow', 'error');
        }
      }
    );
  };

  const duplicateWorkflow = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        addToast('Please login first', 'error');
        return;
      }

      const workflow = workflows.find(w => w.id === id);
      if (!workflow) return;

      // Create a copy with a new name
      const duplicatedData = {
        ...workflow.workflow_data,
        name: `${workflow.name} (Copy)`,
        id: undefined // Let backend generate new ID
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(duplicatedData)
      });

      const data = await response.json();

      if (data.success && data.data) {
        await fetchWorkflows();
        setSelectedWorkflowId(data.data.id);
        addToast('Workflow duplicated successfully', 'success');
      } else {
        addToast(data.error || 'Failed to duplicate workflow', 'error');
      }
    } catch (err: any) {
      console.error('Error duplicating workflow:', err);
      addToast(err.message || 'Failed to duplicate workflow', 'error');
    }
  };

  return (
    <WorkflowContext.Provider
      value={{
        workflows,
        selectedWorkflowId,
        messages,
        toasts,
        isLoading,
        error,
        setWorkflows,
        setSelectedWorkflowId,
        setMessages,
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        duplicateWorkflow,
        addToast,
        removeToast,
        refreshWorkflows: fetchWorkflows,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
