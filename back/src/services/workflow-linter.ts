/**
 * Post-generation workflow linter
 * Fixes common issues deterministically (no AI calls)
 */

import { N8nWorkflow, N8nNode } from '../types';

export interface LintResult {
  workflow: N8nWorkflow;
  fixes: string[];
  warnings: string[];
}

/**
 * Validate and fix a generated workflow
 */
export function lintWorkflow(workflow: N8nWorkflow): LintResult {
  const fixes: string[] = [];
  const warnings: string[] = [];

  // Ensure workflow has required fields
  if (!workflow.settings) {
    workflow.settings = { executionOrder: 'v1' };
    fixes.push('Added missing workflow settings');
  } else if (!workflow.settings.executionOrder) {
    workflow.settings.executionOrder = 'v1';
    fixes.push('Set executionOrder to v1');
  }

  // Ensure workflow is inactive by default
  if (workflow.active !== false) {
    workflow.active = false;
    fixes.push('Set workflow to inactive (safe default)');
  }

  // Fix each node
  workflow.nodes = workflow.nodes.map((node, index) => {
    const nodeId = `node_${index}`;
    
    // Fix Slack nodes
    if (node.type === 'n8n-nodes-base.slack' && node.parameters) {
      const params = node.parameters as any;
      
      // Ensure channelId has # prefix
      if (params.channelId && typeof params.channelId === 'string') {
        if (!params.channelId.startsWith('#') && !params.channelId.startsWith('={{')) {
          params.channelId = `#${params.channelId}`;
          fixes.push(`${nodeId}: Added # prefix to Slack channel`);
        }
      }
      
      // Ensure correct operation structure
      if (!params.resource) {
        params.resource = 'message';
        fixes.push(`${nodeId}: Set Slack resource to 'message'`);
      }
      if (!params.operation) {
        params.operation = 'post';
        fixes.push(`${nodeId}: Set Slack operation to 'post'`);
      }
    }

    // Fix email nodes - ensure we're using emailSend, not emailReadImap
    if (node.type.includes('email') && node.parameters) {
      const params = node.parameters as any;
      
      // If this is supposed to send email but using wrong node type
      if (node.type === 'n8n-nodes-base.emailReadImap' || 
          (params.operation && params.operation.includes('read'))) {
        node.type = 'n8n-nodes-base.emailSend';
        fixes.push(`${nodeId}: Changed to emailSend (was using read node for sending)`);
      }
      
      // Ensure emailSend has required fields
      if (node.type === 'n8n-nodes-base.emailSend') {
        if (!params.fromEmail) {
          params.fromEmail = 'noreply@example.com';
          warnings.push(`${nodeId}: Using placeholder fromEmail - update before deploying`);
        }
        if (!params.toEmail) {
          params.toEmail = '={{ $json.email }}';
          fixes.push(`${nodeId}: Set toEmail to use previous step's email field`);
        }
      }
    }

    // Fix schedule trigger cron expressions
    if (node.type === 'n8n-nodes-base.scheduleTrigger' && node.parameters) {
      const params = node.parameters as any;
      
      if (params.rule?.interval?.[0]?.expression) {
        const cron = params.rule.interval[0].expression;
        if (!isValidCron(cron)) {
          params.rule.interval[0].expression = '0 9 * * *';
          fixes.push(`${nodeId}: Invalid cron expression, defaulted to 9:00 AM daily`);
        }
      }
    }

    // Ensure node has valid position
    if (!node.position || !Array.isArray(node.position) || node.position.length !== 2) {
      node.position = [250 + (index * 300), 300];
      fixes.push(`${nodeId}: Fixed node position`);
    }

    // Ensure node has credentials object (even if empty)
    if (!node.credentials) {
      node.credentials = {};
    }

    return node;
  });

  // Validate connections
  if (!workflow.connections) {
    workflow.connections = {};
    fixes.push('Initialized empty connections object');
  }

  // Ensure all connections reference valid nodes
  const nodeNames = new Set(workflow.nodes.map(n => n.name));
  for (const [sourceName, connections] of Object.entries(workflow.connections)) {
    if (!nodeNames.has(sourceName)) {
      delete workflow.connections[sourceName];
      warnings.push(`Removed connection from non-existent node: ${sourceName}`);
      continue;
    }

    if (connections.main) {
      connections.main = connections.main.map((outputConnections: any) => {
        return outputConnections.filter((conn: any) => {
          if (!nodeNames.has(conn.node)) {
            warnings.push(`Removed connection to non-existent node: ${conn.node}`);
            return false;
          }
          return true;
        });
      });
    }
  }

  return { workflow, fixes, warnings };
}

/**
 * Validate cron expression (basic check)
 */
function isValidCron(expression: string): boolean {
  if (!expression || typeof expression !== 'string') return false;
  
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  
  // Check each part is valid (number, *, range, or step)
  const cronRegex = /^(\*|([0-9]|[1-5][0-9])(-([0-9]|[1-5][0-9]))?(\/[0-9]+)?|\*\/[0-9]+)$/;
  return parts.every(part => cronRegex.test(part));
}

/**
 * Normalize Slack channel name (ensure # prefix)
 */
export function normalizeSlackChannel(channel: string): string {
  if (!channel) return '#general';
  if (channel.startsWith('={{')) return channel; // Expression, don't modify
  return channel.startsWith('#') ? channel : `#${channel}`;
}

/**
 * Validate email address (basic check)
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.startsWith('={{')) return true; // Expression, assume valid
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}
