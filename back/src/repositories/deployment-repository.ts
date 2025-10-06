import { Pool } from 'pg';

export interface DeploymentRecord {
  id?: string;
  workflowId: string;
  userId: string;
  n8nWorkflowId: string;
  webhookUrl?: string;
  status: 'active' | 'inactive' | 'error' | 'deleted';
  credentialsSnapshot?: any;
  lastExecutionAt?: Date;
  executionCount?: number;
  errorCount?: number;
  deployedAt?: Date;
  activatedAt?: Date;
  deactivatedAt?: Date;
}

export interface ExecutionRecord {
  id?: string;
  deploymentId: string;
  workflowId: string;
  userId: string;
  n8nExecutionId?: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  startedAt: Date;
  finishedAt?: Date;
  durationMs?: number;
  triggerType?: string;
  errorMessage?: string;
  failedNode?: string;
  inputData?: any;
  outputData?: any;
}

export class DeploymentRepository {
  constructor(private pool: Pool) {}

  /**
   * Create a new deployment record
   */
  async create(deployment: DeploymentRecord): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO deployments (
        workflow_id, user_id, n8n_workflow_id, webhook_url, 
        status, credentials_snapshot, deployed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        deployment.workflowId,
        deployment.userId,
        deployment.n8nWorkflowId,
        deployment.webhookUrl,
        deployment.status || 'inactive',
        deployment.credentialsSnapshot ? JSON.stringify(deployment.credentialsSnapshot) : null,
        deployment.deployedAt || new Date()
      ]
    );
    return result.rows[0].id;
  }

  /**
   * Find deployment by workflow ID
   */
  async findByWorkflowId(workflowId: string): Promise<DeploymentRecord | null> {
    const result = await this.pool.query(
      `SELECT * FROM deployments WHERE workflow_id = $1 AND status != 'deleted' LIMIT 1`,
      [workflowId]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Find deployment by n8n workflow ID
   */
  async findByN8nWorkflowId(n8nWorkflowId: string): Promise<DeploymentRecord | null> {
    const result = await this.pool.query(
      `SELECT * FROM deployments WHERE n8n_workflow_id = $1 AND status != 'deleted' LIMIT 1`,
      [n8nWorkflowId]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Find all deployments for a user
   */
  async findByUserId(userId: string): Promise<DeploymentRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM deployments 
       WHERE user_id = $1 AND status != 'deleted' 
       ORDER BY deployed_at DESC`,
      [userId]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Find active deployments for a user
   */
  async findActiveByUserId(userId: string): Promise<DeploymentRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM deployments 
       WHERE user_id = $1 AND status = 'active' 
       ORDER BY deployed_at DESC`,
      [userId]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Update deployment status
   */
  async updateStatus(
    workflowId: string, 
    status: 'active' | 'inactive' | 'error' | 'deleted'
  ): Promise<void> {
    const now = new Date();
    const activatedAt = status === 'active' ? now : null;
    const deactivatedAt = status === 'inactive' ? now : null;

    await this.pool.query(
      `UPDATE deployments 
       SET status = $1, 
           activated_at = COALESCE($2, activated_at),
           deactivated_at = COALESCE($3, deactivated_at)
       WHERE workflow_id = $4`,
      [status, activatedAt, deactivatedAt, workflowId]
    );
  }

  /**
   * Update execution stats
   */
  async updateExecutionStats(
    workflowId: string,
    incrementExecution: boolean = true,
    incrementError: boolean = false
  ): Promise<void> {
    await this.pool.query(
      `UPDATE deployments 
       SET last_execution_at = NOW(),
           execution_count = execution_count + $1,
           error_count = error_count + $2
       WHERE workflow_id = $3`,
      [incrementExecution ? 1 : 0, incrementError ? 1 : 0, workflowId]
    );
  }

  /**
   * Delete deployment (soft delete)
   */
  async delete(workflowId: string): Promise<void> {
    await this.pool.query(
      `UPDATE deployments SET status = 'deleted' WHERE workflow_id = $1`,
      [workflowId]
    );
  }

  /**
   * Hard delete deployment
   */
  async hardDelete(workflowId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM deployments WHERE workflow_id = $1`,
      [workflowId]
    );
  }

  /**
   * Get deployment statistics for a user
   */
  async getStats(userId: string): Promise<{
    totalDeployments: number;
    activeDeployments: number;
    totalExecutions: number;
    totalErrors: number;
    successRate: number;
  }> {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as total_deployments,
        COUNT(*) FILTER (WHERE status = 'active') as active_deployments,
        COALESCE(SUM(execution_count), 0) as total_executions,
        COALESCE(SUM(error_count), 0) as total_errors
       FROM deployments 
       WHERE user_id = $1 AND status != 'deleted'`,
      [userId]
    );

    const row = result.rows[0];
    const totalExecutions = parseInt(row.total_executions);
    const totalErrors = parseInt(row.total_errors);
    const successRate = totalExecutions > 0 
      ? ((totalExecutions - totalErrors) / totalExecutions) * 100 
      : 100;

    return {
      totalDeployments: parseInt(row.total_deployments),
      activeDeployments: parseInt(row.active_deployments),
      totalExecutions,
      totalErrors,
      successRate: Math.round(successRate * 10) / 10
    };
  }

  /**
   * Map database row to DeploymentRecord
   */
  private mapRow(row: any): DeploymentRecord {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      userId: row.user_id,
      n8nWorkflowId: row.n8n_workflow_id,
      webhookUrl: row.webhook_url,
      status: row.status,
      credentialsSnapshot: row.credentials_snapshot,
      lastExecutionAt: row.last_execution_at,
      executionCount: row.execution_count,
      errorCount: row.error_count,
      deployedAt: row.deployed_at,
      activatedAt: row.activated_at,
      deactivatedAt: row.deactivated_at
    };
  }
}

/**
 * Execution Repository
 */
export class ExecutionRepository {
  constructor(private pool: Pool) {}

  /**
   * Create execution record
   */
  async create(execution: ExecutionRecord): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO executions (
        deployment_id, workflow_id, user_id, n8n_execution_id,
        status, started_at, finished_at, duration_ms,
        trigger_type, error_message, failed_node,
        input_data, output_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        execution.deploymentId,
        execution.workflowId,
        execution.userId,
        execution.n8nExecutionId,
        execution.status,
        execution.startedAt,
        execution.finishedAt,
        execution.durationMs,
        execution.triggerType,
        execution.errorMessage,
        execution.failedNode,
        execution.inputData ? JSON.stringify(execution.inputData) : null,
        execution.outputData ? JSON.stringify(execution.outputData) : null
      ]
    );
    return result.rows[0].id;
  }

  /**
   * Get executions for a deployment
   */
  async findByDeploymentId(deploymentId: string, limit: number = 50): Promise<ExecutionRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM executions 
       WHERE deployment_id = $1 
       ORDER BY started_at DESC 
       LIMIT $2`,
      [deploymentId, limit]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Get executions for a workflow
   */
  async findByWorkflowId(workflowId: string, limit: number = 50): Promise<ExecutionRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM executions 
       WHERE workflow_id = $1 
       ORDER BY started_at DESC 
       LIMIT $2`,
      [workflowId, limit]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Get executions for a user
   */
  async findByUserId(userId: string, limit: number = 50, status?: string): Promise<ExecutionRecord[]> {
    let query = `SELECT * FROM executions WHERE user_id = $1`;
    const params: any[] = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY started_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Get execution statistics for a workflow
   */
  async getWorkflowStats(workflowId: string, days: number = 7): Promise<{
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    avgDurationMs: number;
  }> {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE status = 'success') as success_count,
        COUNT(*) FILTER (WHERE status = 'error') as error_count,
        AVG(duration_ms) as avg_duration_ms
       FROM executions 
       WHERE workflow_id = $1 
         AND started_at >= NOW() - INTERVAL '${days} days'`,
      [workflowId]
    );

    const row = result.rows[0];
    const total = parseInt(row.total_executions);
    const success = parseInt(row.success_count);
    const successRate = total > 0 ? (success / total) * 100 : 100;

    return {
      totalExecutions: total,
      successCount: success,
      errorCount: parseInt(row.error_count),
      successRate: Math.round(successRate * 10) / 10,
      avgDurationMs: Math.round(parseFloat(row.avg_duration_ms) || 0)
    };
  }

  /**
   * Get recent errors for a user
   */
  async getRecentErrors(userId: string, limit: number = 10): Promise<ExecutionRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM executions 
       WHERE user_id = $1 AND status = 'error'
       ORDER BY started_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Map database row to ExecutionRecord
   */
  private mapRow(row: any): ExecutionRecord {
    return {
      id: row.id,
      deploymentId: row.deployment_id,
      workflowId: row.workflow_id,
      userId: row.user_id,
      n8nExecutionId: row.n8n_execution_id,
      status: row.status,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      durationMs: row.duration_ms,
      triggerType: row.trigger_type,
      errorMessage: row.error_message,
      failedNode: row.failed_node,
      inputData: row.input_data,
      outputData: row.output_data
    };
  }
}
