import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai-service';
import { ApiResponse } from '../types';

export function createTestDataRouter(aiService: AIService): Router {
  const router = Router();

  /**
   * POST /api/test-data/generate
   * Generate AI-powered test data for a workflow
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const { workflow } = req.body;

      if (!workflow || !workflow.nodes) {
        return res.status(400).json({
          success: false,
          error: 'Workflow with nodes is required'
        } as ApiResponse);
      }

      // Analyze workflow to understand what test data is needed
      const triggerNode = workflow.nodes.find((n: any) => 
        n.type.includes('webhook') || 
        n.type.includes('manual') || 
        n.type.includes('trigger')
      );

      if (!triggerNode) {
        return res.status(400).json({
          success: false,
          error: 'No trigger node found in workflow'
        } as ApiResponse);
      }

      // Build context about the workflow
      const workflowContext = {
        name: workflow.name,
        description: workflow.description,
        triggerType: triggerNode.type,
        nodes: workflow.nodes.map((n: any) => ({
          name: n.name,
          type: n.type,
          parameters: n.parameters
        }))
      };

      // Generate test data using AI
      const prompt = `You are a test data generator for workflow automation.

Analyze this workflow and generate realistic test data that would trigger it:

Workflow: ${workflowContext.name}
Trigger: ${workflowContext.triggerType}
Nodes: ${workflowContext.nodes.map((n: any) => `- ${n.name} (${n.type})`).join('\n')}

Based on the workflow structure, generate a JSON object that represents realistic test data.

Rules:
1. If it's a webhook trigger, generate typical webhook payload (e.g., form submission, API event)
2. If it processes user data, include realistic names, emails, phone numbers
3. If it involves e-commerce, include product/order data
4. If it's a notification workflow, include message content
5. Include all fields that downstream nodes might need
6. Use realistic but fake data (don't use real personal information)
7. Return ONLY valid JSON, no markdown or explanations

Example for a contact form webhook:
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "message": "I'm interested in learning more about your product",
  "timestamp": "2024-01-15T10:30:00Z",
  "source": "website_contact_form"
}

Now generate appropriate test data for this workflow:`;

      const aiResponse = await aiService.chat(prompt);

      // Parse AI response
      let testData: any;
      try {
        // Try to extract JSON from response (in case AI adds markdown)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          testData = JSON.parse(jsonMatch[0]);
        } else {
          testData = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        console.error('[Test Data] Failed to parse AI response:', aiResponse);
        // Fallback to generic test data
        testData = {
          test: true,
          message: "AI-generated test data",
          timestamp: new Date().toISOString(),
          data: {
            sample: "value"
          }
        };
      }

      // Add metadata
      const result = {
        testData,
        metadata: {
          generatedAt: new Date().toISOString(),
          workflowName: workflow.name,
          triggerType: triggerNode.type,
          aiGenerated: true
        }
      };

      res.json({
        success: true,
        data: result
      } as ApiResponse<any>);

    } catch (error: any) {
      console.error('[Test Data] Generation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate test data'
      } as ApiResponse);
    }
  });

  /**
   * POST /api/test-data/generate-for-node
   * Generate test data for a specific node type
   */
  router.post('/generate-for-node', async (req: Request, res: Response) => {
    try {
      const { nodeType, nodeName, parameters } = req.body;

      const prompt = `Generate realistic test data for a workflow node.

Node Type: ${nodeType}
Node Name: ${nodeName}
Parameters: ${JSON.stringify(parameters, null, 2)}

Generate a JSON object with sample data that this node would typically receive as input.
Return ONLY valid JSON, no explanations.`;

      const aiResponse = await aiService.chat(prompt);

      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const testData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);

      res.json({
        success: true,
        data: testData
      } as ApiResponse<any>);

    } catch (error: any) {
      console.error('[Test Data] Node generation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate node test data'
      } as ApiResponse);
    }
  });

  return router;
}
