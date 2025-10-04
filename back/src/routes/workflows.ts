import { Router, Request, Response } from 'express';
import { N8nMCPClient } from '../services/n8n-mcp-client';
import { ApiResponse, N8nWorkflow } from '../types';

export function createWorkflowsRouter(mcpClient: N8nMCPClient): Router {
  const router = Router();

  // In-memory storage for hackathon (replace with database in production)
  const workflows: Map<string, N8nWorkflow> = new Map();

  // Sample data for demo
  const sampleWorkflows: N8nWorkflow[] = [
    {
      id: 'sample_1',
      name: 'Daily Slack Standup Reminder',
      nodes: [
        {
          id: 'schedule_1',
          name: 'Every Weekday at 9am',
          type: 'n8n-nodes-base.scheduleTrigger',
          position: [250, 300],
          parameters: {
            rule: {
              interval: [{
                field: 'cronExpression',
                expression: '0 9 * * 1-5'
              }]
            }
          },
          credentials: {}
        },
        {
          id: 'slack_1',
          name: 'Send Standup Message',
          type: 'n8n-nodes-base.slack',
          position: [600, 300],
          parameters: {
            resource: 'message',
            operation: 'post',
            select: 'channel',
            channelId: '#team',
            text: '🌅 Good morning team! Time for daily standup!'
          },
          credentials: { slackApi: 'slack_credentials' }
        }
      ],
      connections: {
        'Every Weekday at 9am': {
          main: [[{ node: 'Send Standup Message', type: 'main', index: 0 }]]
        }
      },
      active: true,
      settings: { executionOrder: 'v1' }
    },
    {
      id: 'sample_2',
      name: 'Email Notification System',
      nodes: [
        {
          id: 'webhook_1',
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          position: [250, 300],
          parameters: {
            httpMethod: 'POST',
            path: '/notify'
          },
          credentials: {}
        },
        {
          id: 'email_1',
          name: 'Send Email Alert',
          type: 'n8n-nodes-base.emailSend',
          position: [600, 300],
          parameters: {
            fromEmail: 'alerts@example.com',
            toEmail: 'team@example.com',
            subject: 'New Alert Received',
            text: 'A new notification has been triggered!'
          },
          credentials: { smtp: 'email_credentials' }
        }
      ],
      connections: {
        'Webhook Trigger': {
          main: [[{ node: 'Send Email Alert', type: 'main', index: 0 }]]
        }
      },
      active: true,
      settings: { executionOrder: 'v1' }
    },
    {
      id: 'sample_3',
      name: 'Google Sheets Data Logger',
      nodes: [
        {
          id: 'schedule_2',
          name: 'Every Hour',
          type: 'n8n-nodes-base.scheduleTrigger',
          position: [250, 300],
          parameters: {
            rule: {
              interval: [{
                field: 'cronExpression',
                expression: '0 * * * *'
              }]
            }
          },
          credentials: {}
        },
        {
          id: 'sheets_1',
          name: 'Append to Sheet',
          type: 'n8n-nodes-base.googleSheets',
          position: [600, 300],
          parameters: {
            operation: 'append',
            sheetId: 'your-sheet-id',
            range: 'Sheet1!A:C',
            values: [['{{$now}}', 'Automated Entry', 'Success']]
          },
          credentials: { googleSheetsOAuth2Api: 'sheets_credentials' }
        }
      ],
      connections: {
        'Every Hour': {
          main: [[{ node: 'Append to Sheet', type: 'main', index: 0 }]]
        }
      },
      active: false,
      settings: { executionOrder: 'v1' }
    }
  ];

  // Initialize with sample data
  sampleWorkflows.forEach(workflow => {
    workflows.set(workflow.id!, workflow);
  });

  /**
   * GET /api/workflows
   * List all workflows
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const workflowList = Array.from(workflows.values());

      res.json({
        success: true,
        data: workflowList
      } as ApiResponse<N8nWorkflow[]>);

    } catch (error) {
      console.error('List workflows error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list workflows'
      } as ApiResponse);
    }
  });

  /**
   * GET /api/workflows/:id
   * Get a specific workflow
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const workflow = workflows.get(id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: workflow
      } as ApiResponse<N8nWorkflow>);

    } catch (error) {
      console.error('Get workflow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/workflows
   * Create a new workflow
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const workflow: N8nWorkflow = req.body;

      // Validate workflow
      const validation = await mcpClient.validateWorkflow(workflow);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid workflow',
          data: { errors: validation.errors }
        } as ApiResponse);
      }

      // Generate ID if not provided
      const id = workflow.id || `wf_${Date.now()}`;
      workflow.id = id;

      // Store workflow
      workflows.set(id, workflow);

      res.status(201).json({
        success: true,
        data: workflow,
        message: 'Workflow created successfully'
      } as ApiResponse<N8nWorkflow>);

    } catch (error) {
      console.error('Create workflow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create workflow'
      } as ApiResponse);
    }
  });

  /**
   * PUT /api/workflows/:id
   * Update an existing workflow
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updatedWorkflow: N8nWorkflow = req.body;

      if (!workflows.has(id)) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
      }

      // Validate workflow
      const validation = await mcpClient.validateWorkflow(updatedWorkflow);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid workflow',
          data: { errors: validation.errors }
        } as ApiResponse);
      }

      updatedWorkflow.id = id;
      workflows.set(id, updatedWorkflow);

      res.json({
        success: true,
        data: updatedWorkflow,
        message: 'Workflow updated successfully'
      } as ApiResponse<N8nWorkflow>);

    } catch (error) {
      console.error('Update workflow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update workflow'
      } as ApiResponse);
    }
  });

  /**
   * DELETE /api/workflows/:id
   * Delete a workflow
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!workflows.has(id)) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
      }

      workflows.delete(id);

      res.json({
        success: true,
        message: 'Workflow deleted successfully'
      } as ApiResponse);

    } catch (error) {
      console.error('Delete workflow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete workflow'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/workflows/:id/validate
   * Validate a workflow
   */
  router.post('/:id/validate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const workflow = workflows.get(id);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: 'Workflow not found'
        } as ApiResponse);
      }

      const validation = await mcpClient.validateWorkflow(workflow);

      res.json({
        success: true,
        data: validation
      } as ApiResponse);

    } catch (error) {
      console.error('Validate workflow error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate workflow'
      } as ApiResponse);
    }
  });

  return router;
}
