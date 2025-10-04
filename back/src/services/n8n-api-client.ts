import axios, { AxiosInstance } from 'axios';
import { N8nWorkflow, ExecutionResult } from '../types';

/**
 * Real n8n API Client for deployment and execution
 */
export class N8nApiClient {
  private apiUrl: string;
  private apiKey: string;
  private webhookUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(apiUrl: string, apiKey: string, webhookUrl?: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.webhookUrl = webhookUrl || apiUrl;

    this.axiosInstance = axios.create({
      baseURL: `${apiUrl}/api/v1`,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a workflow in n8n
   */
  async createWorkflow(workflow: N8nWorkflow, userId: string): Promise<string> {
    try {
      // Remove read-only fields that n8n API doesn't accept
      const { active, ...workflowWithoutActive } = workflow;
      const cleanWorkflow = workflowWithoutActive as any;
      
      // Remove tags if present (also read-only)
      delete cleanWorkflow.tags;
      delete cleanWorkflow.id;
      
      // Add user context to workflow name only
      const workflowWithContext = {
        ...cleanWorkflow,
        name: `[User:${userId.substring(0, 8)}] ${workflow.name}`
      };

      console.log('[n8n API] Creating workflow:', workflowWithContext.name);

      const response = await this.axiosInstance.post('/workflows', workflowWithContext);
      
      console.log('[n8n API] ✅ Workflow created with ID:', response.data.id);
      return response.data.id;
    } catch (error: any) {
      console.error('[n8n API] ❌ Failed to create workflow:', error.response?.data || error.message);
      throw new Error(`Failed to create workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(workflowId: string): Promise<void> {
    try {
      console.log('[n8n API] Activating workflow:', workflowId);

      // Use PUT instead of PATCH for n8n API
      await this.axiosInstance.put(`/workflows/${workflowId}`, {
        active: true
      });

      console.log('[n8n API] ✅ Workflow activated');
    } catch (error: any) {
      console.error('[n8n API] ❌ Failed to activate workflow:', error.response?.data || error.message);
      // Don't throw error - workflow is created, activation is optional
      console.warn('[n8n API] Workflow created but not activated - activate manually in n8n UI');
    }
  }

  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(workflowId: string): Promise<void> {
    try {
      await this.axiosInstance.patch(`/workflows/${workflowId}`, {
        active: false
      });
      console.log('[n8n API] Workflow deactivated');
    } catch (error: any) {
      console.error('[n8n API] Failed to deactivate workflow:', error.response?.data || error.message);
      throw new Error(`Failed to deactivate workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get workflow details from n8n
   */
  async getWorkflow(workflowId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/workflows/${workflowId}`);
      return response.data;
    } catch (error: any) {
      console.error('[n8n API] Failed to get workflow:', error.response?.data || error.message);
      throw new Error(`Failed to get workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a workflow from n8n
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await this.axiosInstance.delete(`/workflows/${workflowId}`);
      console.log('[n8n API] Workflow deleted');
    } catch (error: any) {
      console.error('[n8n API] Failed to delete workflow:', error.response?.data || error.message);
      throw new Error(`Failed to delete workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Execute a workflow manually
   */
  async executeWorkflow(workflowId: string, data?: any): Promise<any> {
    try {
      console.log('[n8n API] Executing workflow:', workflowId);

      const response = await this.axiosInstance.post(`/workflows/${workflowId}/execute`, {
        data
      });

      console.log('[n8n API] ✅ Workflow executed');
      return response.data;
    } catch (error: any) {
      console.error('[n8n API] ❌ Failed to execute workflow:', error.response?.data || error.message);
      throw new Error(`Failed to execute workflow: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get workflow executions
   */
  async getExecutions(workflowId: string, limit: number = 10): Promise<ExecutionResult[]> {
    try {
      const response = await this.axiosInstance.get('/executions', {
        params: {
          workflowId,
          limit
        }
      });

      return response.data.data.map((execution: any) => ({
        id: execution.id,
        status: execution.finished ? (execution.data?.resultData?.error ? 'error' : 'success') : 'running',
        startedAt: new Date(execution.startedAt),
        finishedAt: execution.stoppedAt ? new Date(execution.stoppedAt) : undefined,
        data: execution.data,
        error: execution.data?.resultData?.error?.message
      }));
    } catch (error: any) {
      console.error('[n8n API] Failed to get executions:', error.response?.data || error.message);
      throw new Error(`Failed to get executions: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get webhook URL for a workflow
   */
  getWebhookUrl(webhookPath: string): string {
    return `${this.webhookUrl}/webhook/${webhookPath}`;
  }

  /**
   * Create or update n8n credentials for a user
   */
  async createCredentials(type: string, name: string, data: any): Promise<string> {
    try {
      console.log('[n8n API] Creating credentials:', name);

      const response = await this.axiosInstance.post('/credentials', {
        name,
        type,
        data
      });

      console.log('[n8n API] ✅ Credentials created with ID:', response.data.id);
      return response.data.id;
    } catch (error: any) {
      console.error('[n8n API] ❌ Failed to create credentials:', error.response?.data || error.message);
      throw new Error(`Failed to create credentials: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Test connection to n8n
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/workflows', { params: { limit: 1 } });
      console.log('[n8n API] ✅ Connection successful');
      return true;
    } catch (error: any) {
      console.error('[n8n API] ❌ Connection failed:', error.response?.data || error.message);
      return false;
    }
  }
}
