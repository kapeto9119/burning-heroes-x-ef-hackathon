'use client';

import { useState, useTransition } from 'react';
import { deployWorkflow, activateWorkflow, getWorkflows, getWorkflowExecutions, type N8nWorkflow } from '@/app/actions/workflows';

export function useWorkflows() {
  const [isPending, startTransition] = useTransition();
  const [workflows, setWorkflows] = useState<any[]>([]);

  const deploy = async (workflow: N8nWorkflow) => {
    let result;
    startTransition(async () => {
      result = await deployWorkflow(workflow);
    });
    return result;
  };

  const activate = async (workflowId: string) => {
    let result;
    startTransition(async () => {
      result = await activateWorkflow(workflowId);
    });
    return result;
  };

  const fetchWorkflows = async () => {
    const result = await getWorkflows();
    if (result.success && result.data) {
      setWorkflows(result.data);
    }
    return result;
  };

  const fetchExecutions = async (workflowId: string, limit?: number) => {
    return await getWorkflowExecutions(workflowId, limit);
  };

  return {
    workflows,
    isPending,
    deploy,
    activate,
    fetchWorkflows,
    fetchExecutions,
  };
}
