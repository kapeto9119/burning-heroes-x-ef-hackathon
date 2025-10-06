import { query } from '../db/client';
import { N8nWorkflow } from '../types';

export interface WorkflowRecord {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  workflow_data: N8nWorkflow;
  node_types: string[];
  required_credential_types: string[];
  is_active: boolean;
  created_from_prompt?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Repository for managing workflows
 * Automatically extracts metadata from workflow structure
 */
export class WorkflowRepository {
  /**
   * Create new workflow
   */
  async create(
    userId: string,
    workflow: N8nWorkflow,
    prompt?: string
  ): Promise<WorkflowRecord> {
    // Extract metadata from workflow
    const nodeTypes = this.extractNodeTypes(workflow);
    const credentialTypes = this.extractCredentialTypes(workflow);
    
    const result = await query(
      `INSERT INTO workflows 
       (user_id, name, description, workflow_data, node_types, 
        required_credential_types, created_from_prompt)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        workflow.name,
        workflow.settings?.description || null,
        JSON.stringify(workflow),
        nodeTypes,
        credentialTypes,
        prompt
      ]
    );
    
    return this.mapRow(result.rows[0]);
  }

  /**
   * Get workflow by ID
   */
  async findById(id: string): Promise<WorkflowRecord | null> {
    const result = await query(
      `SELECT * FROM workflows WHERE id = $1`,
      [id]
    );
    
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Get user's workflows
   */
  async findByUser(userId: string, activeOnly = false): Promise<WorkflowRecord[]> {
    const whereClause = activeOnly 
      ? 'WHERE user_id = $1 AND is_active = true' 
      : 'WHERE user_id = $1';
    
    const result = await query(
      `SELECT * FROM workflows 
       ${whereClause}
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Find workflows using specific node type
   */
  async findByNodeType(userId: string, nodeType: string): Promise<WorkflowRecord[]> {
    const result = await query(
      `SELECT * FROM workflows 
       WHERE user_id = $1 AND $2 = ANY(node_types)
       ORDER BY created_at DESC`,
      [userId, nodeType]
    );
    
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Find workflows needing specific credential type
   */
  async findByCredentialType(userId: string, credentialType: string): Promise<WorkflowRecord[]> {
    const result = await query(
      `SELECT * FROM workflows 
       WHERE user_id = $1 AND $2 = ANY(required_credential_types)
       ORDER BY created_at DESC`,
      [userId, credentialType]
    );
    
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Search workflows by name or description
   */
  async search(userId: string, searchTerm: string): Promise<WorkflowRecord[]> {
    const result = await query(
      `SELECT * FROM workflows 
       WHERE user_id = $1 
       AND (name ILIKE $2 OR description ILIKE $2 OR created_from_prompt ILIKE $2)
       ORDER BY created_at DESC`,
      [userId, `%${searchTerm}%`]
    );
    
    return result.rows.map(row => this.mapRow(row));
  }

  /**
   * Update workflow
   */
  async update(id: string, workflow: N8nWorkflow): Promise<void> {
    const nodeTypes = this.extractNodeTypes(workflow);
    const credentialTypes = this.extractCredentialTypes(workflow);
    
    await query(
      `UPDATE workflows 
       SET workflow_data = $1, 
           node_types = $2, 
           required_credential_types = $3,
           name = $4,
           description = $5
       WHERE id = $6`,
      [
        JSON.stringify(workflow),
        nodeTypes,
        credentialTypes,
        workflow.name,
        workflow.settings?.description || null,
        id
      ]
    );
  }

  /**
   * Update workflow active status
   */
  async setActive(id: string, isActive: boolean): Promise<void> {
    await query(
      `UPDATE workflows SET is_active = $1 WHERE id = $2`,
      [isActive, id]
    );
  }

  /**
   * Delete workflow
   */
  async delete(id: string): Promise<void> {
    await query(`DELETE FROM workflows WHERE id = $1`, [id]);
  }

  /**
   * Get workflow count by user
   */
  async countByUser(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count FROM workflows WHERE user_id = $1`,
      [userId]
    );
    
    return parseInt(result.rows[0].count);
  }

  /**
   * Get most used node types (analytics)
   */
  async getMostUsedNodeTypes(userId: string, limit = 10): Promise<{ nodeType: string; count: number }[]> {
    const result = await query(
      `SELECT unnest(node_types) as node_type, COUNT(*) as count
       FROM workflows
       WHERE user_id = $1
       GROUP BY node_type
       ORDER BY count DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result.rows.map(row => ({
      nodeType: row.node_type,
      count: parseInt(row.count)
    }));
  }

  /**
   * Extract node types from workflow
   */
  private extractNodeTypes(workflow: N8nWorkflow): string[] {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      return [];
    }
    
    return workflow.nodes.map(node => node.type);
  }

  /**
   * Extract credential types from workflow
   */
  private extractCredentialTypes(workflow: N8nWorkflow): string[] {
    if (!workflow.nodes || workflow.nodes.length === 0) {
      return [];
    }
    
    const types = new Set<string>();
    
    for (const node of workflow.nodes) {
      if (node.credentials) {
        Object.keys(node.credentials).forEach(type => types.add(type));
      }
    }
    
    return Array.from(types);
  }

  /**
   * Map database row to WorkflowRecord
   */
  private mapRow(row: any): WorkflowRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      workflow_data: row.workflow_data,
      node_types: row.node_types || [],
      required_credential_types: row.required_credential_types || [],
      is_active: row.is_active,
      created_from_prompt: row.created_from_prompt,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
