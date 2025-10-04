'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>>;
  setSelectedWorkflowId: React.Dispatch<React.SetStateAction<string>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  createWorkflow: (name: string, description: string) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  duplicateWorkflow: (id: string) => void;
  addToast: (message: string, type: Toast['type'], onConfirm?: () => void) => void;
  removeToast: (id: string) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [workflows, setWorkflows] = useState<Workflow[]>(() => [
    {
      id: '1',
      name: 'Email Automation',
      createdAt: new Date('2025-01-15'),
      description: 'Automated email responses for customer inquiries',
      stats: { runs: 142, nodes: 8, avgRunTime: 2.3 }
    },
    {
      id: '2',
      name: 'Data Processing Pipeline',
      createdAt: new Date('2025-01-20'),
      description: 'Process and transform CSV data automatically',
      stats: { runs: 89, nodes: 12, avgRunTime: 5.7 }
    },
    {
      id: '3',
      name: 'Social Media Scheduler',
      createdAt: new Date('2025-01-22'),
      description: 'Schedule posts across multiple platforms',
      stats: { runs: 256, nodes: 6, avgRunTime: 1.2 }
    }
  ]);
  
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const createWorkflow = (name: string, description: string) => {
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name,
      createdAt: new Date(),
      description,
      stats: { runs: 0, nodes: 0, avgRunTime: 0 }
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    setSelectedWorkflowId(newWorkflow.id);
  };

  const updateWorkflow = (id: string, updates: Partial<Workflow>) => {
    setWorkflows(prev => prev.map(w => 
      w.id === id ? { ...w, ...updates } : w
    ));
  };

  const deleteWorkflow = (id: string) => {
    const workflow = workflows.find(w => w.id === id);
    if (!workflow) return;
    
    addToast(
      `Delete "${workflow.name}"?`,
      'confirm',
      () => {
        setWorkflows(prev => prev.filter(w => w.id !== id));
        if (selectedWorkflowId === id && workflows.length > 1) {
          const remainingWorkflows = workflows.filter(w => w.id !== id);
          setSelectedWorkflowId(remainingWorkflows[0].id);
        }
        addToast('Workflow deleted successfully', 'success');
      }
    );
  };

  const duplicateWorkflow = (id: string) => {
    const workflow = workflows.find(w => w.id === id);
    if (workflow) {
      const duplicated: Workflow = {
        ...workflow,
        id: Date.now().toString(),
        name: `${workflow.name} (Copy)`,
        createdAt: new Date()
      };
      setWorkflows(prev => [...prev, duplicated]);
      setSelectedWorkflowId(duplicated.id);
    }
  };

  return (
    <WorkflowContext.Provider
      value={{
        workflows,
        selectedWorkflowId,
        messages,
        toasts,
        setWorkflows,
        setSelectedWorkflowId,
        setMessages,
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        duplicateWorkflow,
        addToast,
        removeToast,
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
