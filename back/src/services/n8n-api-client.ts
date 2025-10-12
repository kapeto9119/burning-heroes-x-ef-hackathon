import axios, { AxiosInstance } from "axios";
import { N8nWorkflow, ExecutionResult, NodeExecutionStatus } from "../types";

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
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
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
        name: `[User:${userId.substring(0, 8)}] ${workflow.name}`,
      };

      console.log("[n8n API] Creating workflow:", workflowWithContext.name);

      const response = await this.axiosInstance.post(
        "/workflows",
        workflowWithContext
      );

      console.log("[n8n API] ✅ Workflow created with ID:", response.data.id);
      return response.data.id;
    } catch (error: any) {
      console.error(
        "[n8n API] ❌ Failed to create workflow:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to create workflow: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(workflowId: string): Promise<void> {
    try {
      console.log("[n8n API] Activating workflow:", workflowId);

      // Use the dedicated activate endpoint (POST /workflows/{id}/activate)
      await this.axiosInstance.post(`/workflows/${workflowId}/activate`);

      console.log("[n8n API] ✅ Workflow activated");
    } catch (error: any) {
      console.error(
        "[n8n API] ❌ Failed to activate workflow:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to activate workflow: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }
  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(workflowId: string): Promise<void> {
    try {
      console.log("[n8n API] Deactivating workflow:", workflowId);

      // Use the dedicated deactivate endpoint (POST /workflows/{id}/deactivate)
      await this.axiosInstance.post(`/workflows/${workflowId}/deactivate`);

      console.log("[n8n API] ✅ Workflow deactivated");
    } catch (error: any) {
      console.error(
        "[n8n API] ❌ Failed to deactivate workflow:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to deactivate workflow: ${
          error.response?.data?.message || error.message
        }`
      );
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
      console.error(
        "[n8n API] Failed to get workflow:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to get workflow: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Delete a workflow from n8n
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await this.axiosInstance.delete(`/workflows/${workflowId}`);
      console.log("[n8n API] Workflow deleted");
    } catch (error: any) {
      console.error(
        "[n8n API] Failed to delete workflow:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to delete workflow: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Execute a workflow manually (uses n8n public API)
   */
  async executeWorkflow(workflowId: string, data?: any): Promise<any> {
    try {
      console.log("[n8n API] Executing workflow:", workflowId);
      console.log("[n8n API] Base URL:", this.axiosInstance.defaults.baseURL);
      console.log(
        "[n8n API] Full URL:",
        `${this.axiosInstance.defaults.baseURL}/workflows/${workflowId}/execute`
      );
      console.log("[n8n API] Payload:", JSON.stringify(data || {}, null, 2));

      // Use the correct n8n API v1 endpoint for executing workflows
      const response = await this.axiosInstance.post(
        `/workflows/${workflowId}/execute`,
        data || {}
      );

      console.log("[n8n API] Response status:", response.status);
      console.log(
        "[n8n API] Response data:",
        JSON.stringify(response.data, null, 2)
      );

      const executionId =
        response.data?.data?.executionId || response.data?.executionId;
      console.log("[n8n API] ✅ Workflow executed, execution ID:", executionId);
      return {
        executionId,
        id: executionId,
        data: response.data,
      };
    } catch (error: any) {
      console.error(
        "[n8n API] ❌ Failed to execute workflow:",
        error.response?.data || error.message
      );
      console.error("[n8n API] Error status:", error.response?.status);
      console.error(
        "[n8n API] Error details:",
        JSON.stringify(error.response?.data || error.message, null, 2)
      );
      throw new Error(
        `Failed to execute workflow: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get a single execution by ID with full details
   */
  async getExecution(executionId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(
        `/executions/${executionId}`
      );
      return response.data;
    } catch (error: any) {
      console.error(
        "[n8n API] Failed to get execution:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to get execution: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get workflow executions
   */
  async getExecutions(
    workflowId: string,
    limit: number = 10
  ): Promise<ExecutionResult[]> {
    try {
      const response = await this.axiosInstance.get("/executions", {
        params: {
          workflowId,
          limit,
        },
      });

      return response.data.data.map((execution: any) => {
        // Parse node-level execution data
        const nodeExecutions: NodeExecutionStatus[] = [];

        if (execution.data?.resultData?.runData) {
          const runData = execution.data.resultData.runData;

          // Parse each node's execution status
          Object.entries(runData).forEach(
            ([nodeName, nodeData]: [string, any]) => {
              if (Array.isArray(nodeData) && nodeData.length > 0) {
                const lastRun = nodeData[nodeData.length - 1];

                nodeExecutions.push({
                  nodeName,
                  status: lastRun.error ? "error" : "success",
                  executionTime: lastRun.executionTime,
                  error: lastRun.error?.message,
                });
              }
            }
          );
        }

        // Determine execution status
        // Check both finished flag and stoppedAt to avoid stale "running" states
        const hasFinished =
          execution.finished || execution.stoppedAt || execution.data?.finished;
        const hasError = execution.data?.resultData?.error;

        let status: "success" | "error" | "running";
        if (hasFinished) {
          status = hasError ? "error" : "success";
        } else {
          status = "running";
        }

        return {
          id: execution.id,
          status,
          startedAt: new Date(execution.startedAt),
          finishedAt: execution.stoppedAt
            ? new Date(execution.stoppedAt)
            : undefined,
          data: execution.data,
          error: execution.data?.resultData?.error?.message,
          nodeExecutions,
        };
      });
    } catch (error: any) {
      console.error(
        "[n8n API] Failed to get executions:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to get executions: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Get webhook URL for a workflow
   */
  getWebhookUrl(webhookPath: string): string {
    // Ensure the webhook URL has a protocol (https://)
    let baseUrl = this.webhookUrl;
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }

    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, "");

    return `${baseUrl}/webhook/${webhookPath}`;
  }

  /**
   * Create or update n8n credentials for a user
   * Maps service credentials to n8n credential format
   */
  async createCredentials(
    service: string,
    userId: string,
    userCredentials: any
  ): Promise<string> {
    try {
      // Map service types to n8n credential types and format data correctly
      const credentialMapping: Record<
        string,
        { type: string; dataMapper: (creds: any) => any }
      > = {
        slack: {
          type: "slackApi",
          dataMapper: (creds) => {
            console.log(
              "[n8n API] Slack credential data structure:",
              Object.keys(creds)
            );
            console.log("[n8n API] Looking for token in:", {
              token: creds.token,
              access_token: creds.access_token,
              accessToken: creds.accessToken,
            });

            // Try multiple possible field names for the access token
            const accessToken =
              creds.token || creds.access_token || creds.accessToken;

            if (!accessToken) {
              console.error(
                "[n8n API] ❌ No access token found in credential data!"
              );
              console.error(
                "[n8n API] Full credential structure:",
                JSON.stringify(creds, null, 2)
              );
            }

            return {
              accessToken,
              notice: "", // Required by n8n Slack credential schema
            };
          },
        },
        gmail: {
          type: "gmailOAuth2",
          dataMapper: (creds) => ({
            clientId: creds.clientId,
            clientSecret: creds.clientSecret,
            accessToken: creds.accessToken,
            refreshToken: creds.refreshToken,
          }),
        },
        email: {
          type: "smtp",
          dataMapper: (creds) => ({
            user: creds.user,
            password: creds.password,
            host: creds.host || "smtp.gmail.com",
            port: creds.port || 587,
            secure: creds.secure || false,
          }),
        },
        http: {
          type: "httpBasicAuth",
          dataMapper: (creds) => ({
            user: creds.username,
            password: creds.password,
          }),
        },
        postgres: {
          type: "postgres",
          dataMapper: (creds) => ({
            host: creds.host,
            port: creds.port || 5432,
            database: creds.database,
            user: creds.user,
            password: creds.password,
            ssl: creds.ssl || false,
          }),
        },
        googleSheets: {
          type: "googleSheetsOAuth2",
          dataMapper: (creds) => ({
            clientId: creds.clientId,
            clientSecret: creds.clientSecret,
            accessToken: creds.accessToken,
            refreshToken: creds.refreshToken,
          }),
        },
      };

      const mapping = credentialMapping[service];
      if (!mapping) {
        throw new Error(`Unsupported service: ${service}`);
      }

      const credentialName = `${userId.substring(0, 8)}_${service}`;
      const credentialData = mapping.dataMapper(userCredentials);

      console.log(
        "[n8n API] Creating credentials:",
        credentialName,
        "Type:",
        mapping.type
      );

      const response = await this.axiosInstance.post("/credentials", {
        name: credentialName,
        type: mapping.type,
        data: credentialData,
      });

      console.log(
        "[n8n API] ✅ Credentials created with ID:",
        response.data.id
      );
      return response.data.id;
    } catch (error: any) {
      console.error(
        "[n8n API] ❌ Failed to create credentials:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to create credentials: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  /**
   * Test connection to n8n
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.axiosInstance.get("/workflows", { params: { limit: 1 } });
      console.log("[n8n API] ✅ Connection successful");
      return true;
    } catch (error: any) {
      console.error(
        "[n8n API] ❌ Connection failed:",
        error.response?.data || error.message
      );
      return false;
    }
  }
}
