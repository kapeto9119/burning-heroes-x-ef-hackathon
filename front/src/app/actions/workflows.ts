'use server';

import { cookies } from 'next/headers';
import { ensureAuth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, any>;
  credentials: Record<string, any>;
}

export interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, any>;
  active: boolean;
  settings: Record<string, any>;
}

export async function saveWorkflow(workflow: N8nWorkflow) {
  try {
    // Auto-authenticate for demo
    const token = await ensureAuth();

    const response = await fetch(`${API_URL}/api/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(workflow),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deployWorkflow(workflow: N8nWorkflow) {
  try {
    // Auto-authenticate for demo
    const token = await ensureAuth();

    const response = await fetch(`${API_URL}/api/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ workflow }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function activateWorkflow(workflowId: string) {
  try {
    // Auto-authenticate for demo
    const token = await ensureAuth();

    const response = await fetch(`${API_URL}/api/deploy/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getWorkflows() {
  try {
    // Auto-authenticate for demo
    const token = await ensureAuth();

    const response = await fetch(`${API_URL}/api/workflows`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getWorkflowExecutions(workflowId: string, limit: number = 10) {
  try {
    // Auto-authenticate for demo
    const token = await ensureAuth();

    const response = await fetch(`${API_URL}/api/deploy/${workflowId}/executions?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
