import OpenAI from 'openai';
import { ChatMessage } from '../types';

export class AIService {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    
    this.systemPrompt = `You are an expert n8n workflow automation assistant. Your role is to help users create automation workflows by understanding their natural language requests.

When a user describes what they want to automate:
1. Identify the trigger (what starts the workflow)
2. Identify the actions (what should happen)
3. Identify the services/tools involved (Slack, email, databases, etc.)
4. Ask clarifying questions if needed
5. Provide a clear, structured response

Be conversational, helpful, and technical when needed. Focus on understanding the user's automation needs.

Example interactions:
User: "Send a Slack message when someone fills out my contact form"
You: "I'll help you create that workflow! To set this up, I need to know:
- Where is your contact form? (Google Forms, Typeform, custom website, etc.)
- Which Slack channel should receive the notification?
- What information from the form should be included in the message?"

Keep responses concise and actionable.`;
  }

  async chat(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<string> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Fast and cost-effective for hackathon
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  async generateWorkflowFromDescription(description: string, mcpContext?: any): Promise<any> {
    try {
      const prompt = `Based on this workflow description, generate a structured workflow plan:

"${description}"

${mcpContext ? `Available n8n nodes and templates:\n${JSON.stringify(mcpContext, null, 2)}` : ''}

Respond with a JSON object containing:
{
  "workflowName": "descriptive name",
  "trigger": { "type": "webhook|schedule|manual", "config": {} },
  "steps": [
    { "action": "send_slack_message", "service": "Slack", "config": {} }
  ],
  "requiredCredentials": ["slack", "email"],
  "estimatedComplexity": "simple|medium|complex"
}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a workflow automation expert. Generate structured workflow plans in JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent JSON
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Workflow generation error:', error);
      throw new Error('Failed to generate workflow structure');
    }
  }

  async suggestImprovements(workflow: any): Promise<string[]> {
    try {
      const prompt = `Analyze this n8n workflow and suggest 3 improvements:

${JSON.stringify(workflow, null, 2)}

Provide concise, actionable suggestions.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a workflow optimization expert.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 300,
      });

      const content = completion.choices[0]?.message?.content || '';
      // Parse suggestions from response
      return content.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
    } catch (error) {
      console.error('Suggestion generation error:', error);
      return [];
    }
  }

  /**
   * AI-powered intent detection
   * Determines if the user wants to create/build a workflow based on conversation context
   */
  async detectWorkflowIntent(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<boolean> {
    try {
      // Build conversation context (last 4 messages for efficiency)
      const recentMessages = conversationHistory.slice(-4);
      const contextLines = recentMessages.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');

      const prompt = `You are analyzing a conversation to determine if the user wants to BUILD/CREATE/GENERATE a workflow RIGHT NOW.

Recent conversation context:
${contextLines}

Latest user message: "${userMessage}"

Analyze if the user is:
1. Explicitly asking to create/build/generate a workflow
2. Giving confirmation to proceed with building (e.g., "do it", "let's go", "proceed", "build it")
3. Providing final details before building
4. Ready to move from planning to implementation

Respond with ONLY "YES" or "NO".

YES if: User wants to build now, gave confirmation, or provided complete requirements
NO if: User is still asking questions, exploring options, or needs more information

Response:`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an intent detection expert. Respond only with YES or NO.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0, // Deterministic
        max_tokens: 5,
      });

      const response = completion.choices[0]?.message?.content?.trim().toUpperCase() || 'NO';
      const shouldBuild = response.includes('YES');

      console.log(`[Intent Detection] Message: "${userMessage.substring(0, 50)}..." → ${shouldBuild ? 'BUILD' : 'CONTINUE CHAT'}`);
      
      return shouldBuild;
    } catch (error) {
      console.error('Intent detection error:', error);
      // Fallback to keyword detection on error
      const keywords = ['create workflow', 'build workflow', 'generate workflow', 'make workflow'];
      return keywords.some(k => userMessage.toLowerCase().includes(k));
    }
  }

  /**
   * Extract workflow requirements from conversation
   * Analyzes the conversation to extract structured workflow requirements
   */
  async extractWorkflowRequirements(conversationHistory: ChatMessage[]): Promise<string> {
    try {
      const contextLines = conversationHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');

      const prompt = `Analyze this conversation and extract the workflow requirements in a clear, structured format.

Conversation:
${contextLines}

Extract and summarize:
1. Trigger: What starts the workflow?
2. Actions: What should happen?
3. Services: Which tools/platforms are involved?
4. Data: What data needs to be passed between steps?
5. Specific details: Channels, fields, formats, etc.

Provide a concise summary suitable for workflow generation.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a requirements extraction expert.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || 'Create a workflow based on the conversation.';
    } catch (error) {
      console.error('Requirements extraction error:', error);
      // Fallback: use last user message
      const lastUserMessage = conversationHistory.filter(m => m.role === 'user').pop();
      return lastUserMessage?.content || 'Create a workflow';
    }
  }
}
