import OpenAI from "openai";
import { ChatMessage } from "../types";

export class AIService {
  private openai: OpenAI;
  private systemPrompt: string;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });

    this.systemPrompt = `You are an expert n8n workflow automation assistant. Your role is to help users create automation workflows quickly and efficiently.

IMPORTANT BEHAVIOR:
- If the user has provided enough information to build a workflow (trigger + action + services), tell them you're ready to build it
- Don't ask too many questions - use reasonable defaults when details are missing
- Be proactive and action-oriented
- If user says "do it", "build it", "create it", "make the workflow" - acknowledge you'll build it now

When a user describes what they want to automate:
1. Identify the trigger (webhook, schedule, manual, etc.)
2. Identify the actions (send message, email, update data, etc.)
3. Identify the services (Slack, Gmail, Google Sheets, etc.)
4. If you have enough info, say you're ready to build
5. Only ask 1-2 clarifying questions if absolutely critical info is missing

Example:
User: "Send email when Google Sheet row is added"
You: "Perfect! I'll create a workflow that triggers when a new row is added to Google Sheets and sends an email. I'm ready to build this now!"

Be concise, action-oriented, and avoid asking too many questions.`;
  }

  async chat(
    userMessage: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    try {
      // Analyze conversation to extract what we already know
      const conversationContext = this.analyzeConversationContext(
        conversationHistory,
        userMessage
      );

      // Enhanced system prompt with conversation awareness
      const enhancedSystemPrompt = `${this.systemPrompt}

CURRENT CONVERSATION STATE:
${conversationContext}

CRITICAL: Before asking ANY question, check if the information is already provided above. DO NOT re-ask for information that's already known.`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: enhancedSystemPrompt },
        ...conversationHistory.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user", content: userMessage },
      ];

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      return (
        completion.choices[0]?.message?.content ||
        "Sorry, I could not generate a response."
      );
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error("Failed to get AI response");
    }
  }

  /**
   * Analyze conversation to extract what information we already have
   */
  private analyzeConversationContext(
    conversationHistory: ChatMessage[],
    currentMessage: string
  ): string {
    const allMessages = [
      ...conversationHistory,
      { role: "user" as const, content: currentMessage },
    ];
    const userMessages = allMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");

    const context: string[] = [];

    // Check for trigger information
    if (
      userMessages.match(
        /schedul(e|ing)|every (day|week|month|monday|tuesday|wednesday|thursday|friday)|at \d+|cron/i
      )
    ) {
      const scheduleMatch = userMessages.match(
        /(schedul(e|ing)|every) .{0,50}(at \d+|pm|am|\d+ pm|\d+ am)/i
      );
      context.push(
        `✓ Trigger: Schedule - ${
          scheduleMatch ? scheduleMatch[0] : "mentioned"
        }`
      );
    } else if (userMessages.match(/webhook|http|api call|when.*receive/i)) {
      context.push("✓ Trigger: Webhook");
    } else if (userMessages.match(/manual|button|click|run/i)) {
      context.push("✓ Trigger: Manual");
    }

    // Check for action/goal
    if (userMessages.match(/send.*email|email.*send|\d+ emails/i)) {
      const emailMatch = userMessages.match(/\d+ emails/i);
      context.push(
        `✓ Action: Send email${emailMatch ? ` (${emailMatch[0]})` : ""}`
      );
    } else if (
      userMessages.match(/send.*message|post.*slack|slack.*message/i)
    ) {
      context.push("✓ Action: Send Slack message");
    } else if (userMessages.match(/update|insert|save.*data/i)) {
      context.push("✓ Action: Update/save data");
    }

    // Check for services
    const services: string[] = [];
    if (userMessages.match(/gmail|google mail/i)) services.push("Gmail");
    if (userMessages.match(/slack/i)) services.push("Slack");
    if (userMessages.match(/sendgrid/i)) services.push("SendGrid");
    if (userMessages.match(/sheets|google sheets/i))
      services.push("Google Sheets");
    if (userMessages.match(/openai|gpt|chatgpt|gpt-4/i))
      services.push("OpenAI");
    if (userMessages.match(/claude|anthropic/i)) services.push("Claude");
    if (userMessages.match(/gemini|google ai/i)) services.push("Google AI");
    if (userMessages.match(/dall-e|dalle|image generation/i))
      services.push("DALL-E");
    if (userMessages.match(/stable diffusion|stability/i))
      services.push("Stability AI");
    if (userMessages.match(/elevenlabs|voice|text to speech/i))
      services.push("ElevenLabs");
    if (services.length > 0) {
      context.push(`✓ Services: ${services.join(", ")}`);
    }

    // Check for content/details
    if (userMessages.match(/test content|content|message|body/i)) {
      context.push("✓ Content: Specified");
    }

    // Check for channels/recipients
    const channelMatch = userMessages.match(/#[\w-]+|channel.*[\w-]+/i);
    if (channelMatch) {
      context.push(`✓ Channel: ${channelMatch[0]}`);
    }

    if (context.length === 0) {
      return "No workflow details collected yet.";
    }

    return context.join("\n");
  }

  async generateWorkflowFromDescription(
    description: string,
    mcpContext?: any
  ): Promise<any> {
    try {
      const prompt = `Based on this workflow description, generate a structured workflow plan:

"${description}"

IMPORTANT: If the user mentions a specific Slack channel (e.g., "#alerts", "team-updates", "all-fluida"), use that EXACT channel name in the workflow. Add "#" prefix if not present. If no channel is mentioned, use "#general" as a reasonable default.

Examples:
- "send to all-fluida" → use "#all-fluida"
- "post to #alerts" → use "#alerts"  
- "message team-updates channel" → use "#team-updates"

${
  mcpContext
    ? `Available n8n nodes and templates:\n${JSON.stringify(
        mcpContext,
        null,
        2
      )}`
    : ""
}

IMPORTANT: Use correct n8n node parameter formats:

TRIGGERS:
1. Webhook (n8n-nodes-base.webhook):
{
  "httpMethod": "POST",
  "path": "/webhook-${Date.now()}"
}

2. Schedule (n8n-nodes-base.scheduleTrigger):
{
  "rule": {
    "interval": [{"field": "cronExpression", "expression": "0 9 * * *"}]
  }
}
Example cron: "0 9 * * *" = daily at 9am, "*/5 * * * *" = every 5 minutes

3. Manual (n8n-nodes-base.manualTrigger):
{} (no parameters needed)

ACTIONS:
1. Slack (n8n-nodes-base.slack):
{
  "resource": "message",
  "operation": "post",
  "select": "channel",
  "channelId": "#channel-name",
  "text": "message content"
}

2. Email (n8n-nodes-base.emailSend):
{
  "fromEmail": "sender@example.com",
  "toEmail": "recipient@example.com",
  "subject": "Email subject",
  "text": "Email body"
}

3. Gmail (n8n-nodes-base.gmail):
{
  "resource": "message",
  "operation": "send",
  "to": "recipient@example.com",
  "subject": "Email subject",
  "message": "Email body"
}

4. HTTP Request (n8n-nodes-base.httpRequest):
{
  "method": "POST",
  "url": "https://api.example.com/endpoint",
  "authentication": "none",
  "sendBody": true,
  "bodyParameters": {
    "parameters": []
  }
}

5. Postgres (n8n-nodes-base.postgres):
{
  "operation": "executeQuery",
  "query": "INSERT INTO table_name (column1, column2) VALUES ($1, $2)",
  "additionalFields": {}
}

6. Google Sheets (n8n-nodes-base.googleSheets):
{
  "resource": "sheet",
  "operation": "append",
  "sheetId": "spreadsheet-id",
  "range": "Sheet1!A:Z",
  "options": {}
}

7. Airtable (n8n-nodes-base.airtable):
{
  "operation": "append",
  "application": "app-id",
  "table": "table-name",
  "fields": {}
}

AI & CONTENT GENERATION (Use Managed AI - HTTP Request):
8. Managed AI Text Generation (n8n-nodes-base.httpRequest):
{
  "method": "POST",
  "url": "https://your-backend.com/api/managed-ai/generate-content",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "{\\"userId\\": \\"={{$json.userId}}\\", \\"workflowId\\": \\"={{$workflow.id}}\\", \\"prompt\\": \\"Generate content about...\\"}"
}

9. Managed AI Image Generation (n8n-nodes-base.httpRequest):
{
  "method": "POST",
  "url": "https://your-backend.com/api/managed-ai/image",
  "sendBody": true,
  "specifyBody": "json",
  "jsonBody": "{\\"userId\\": \\"={{$json.userId}}\\", \\"workflowId\\": \\"={{$workflow.id}}\\", \\"prompt\\": \\"A beautiful sunset over mountains\\"}"
}

10. Salesforce (n8n-nodes-base.salesforce):
For fetching leads:
{
  "resource": "lead",
  "operation": "getAll",
  "returnAll": false,
  "limit": 10,
  "options": {}
}

For webhook trigger - use Webhook node with Salesforce webhook URL

11. Email Send (n8n-nodes-base.emailSend) - NOT emailReadImap!:
{
  "fromEmail": "sender@example.com",
  "toEmail": "={{$json.email}}",
  "subject": "Email subject",
  "text": "={{$json.emailBody}}"
}

CRITICAL RULES:
1. ONLY include services/nodes that the user EXPLICITLY mentioned
2. DO NOT add extra services (e.g., don't add Slack if user didn't mention it)
3. DO NOT hallucinate steps - only include what was requested
4. For Salesforce data fetching, use "manual" trigger + Salesforce node as first action
5. For AI content generation, use the Managed AI HTTP Request format shown above

Respond with a JSON object containing:
{
  "workflowName": "descriptive name",
  "trigger": { "type": "manual|webhook|schedule", "config": {} },
  "steps": [
    { "action": "fetch_leads_from_salesforce", "service": "salesforce", "config": {...} },
    { "action": "generate_email_content", "service": "ai", "prompt": "...", "config": {...} },
    { "action": "send_email", "service": "email", "config": {...} }
  ],
  "requiredCredentials": ["salesforce", "email"],
  "estimatedComplexity": "simple|medium|complex"
}

Remember: Only include steps the user actually requested!`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a workflow automation expert. Generate structured workflow plans in JSON format.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3, // Lower temperature for more consistent JSON
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("Workflow generation error:", error);
      throw new Error("Failed to generate workflow structure");
    }
  }

  async suggestImprovements(workflow: any): Promise<string[]> {
    try {
      const prompt = `Analyze this n8n workflow and suggest 3 improvements:

${JSON.stringify(workflow, null, 2)}

Provide concise, actionable suggestions.`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a workflow optimization expert.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 300,
      });

      const content = completion.choices[0]?.message?.content || "";
      // Parse suggestions from response
      return content
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .slice(0, 3);
    } catch (error) {
      console.error("Suggestion generation error:", error);
      return [];
    }
  }

  /**
   * AI-powered intent detection
   * Determines if the user wants to create/build a workflow based on conversation context
   */
  async detectWorkflowIntent(
    userMessage: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<boolean> {
    try {
      // Quick check: if we have all required components, build immediately
      const hasAllComponents = this.hasAllRequiredComponents(
        conversationHistory,
        userMessage
      );
      if (hasAllComponents) {
        console.log(
          "[Intent Detection] ✅ All components present, building workflow"
        );
        return true;
      }

      // Build conversation context (last 4 messages for efficiency)
      const recentMessages = conversationHistory.slice(-4);
      const contextLines = recentMessages
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n");

      const prompt = `You are analyzing a conversation to determine if the user wants to BUILD/CREATE/GENERATE a workflow RIGHT NOW.

Recent conversation context:
${contextLines}

Latest user message: "${userMessage}"

CRITICAL: Only return YES if the user is giving EXPLICIT CONFIRMATION or IMPERATIVE COMMAND to build.

Analyze if the user is:
1. Giving an EXPLICIT command to build NOW (e.g., "do it", "build it now", "create it", "let's do it", "go ahead")
2. Giving confirmation after being asked (e.g., "yes", "ok", "sure", "proceed", "go")
3. Expressing urgency to build immediately (e.g., "just build it", "make it now")

Respond with ONLY "YES" or "NO".

YES ONLY if:
- User explicitly says: "do it", "build it", "create it now", "make it", "let's go", "proceed", "yes do it"
- User confirms after assistant asks "should I build this?"
- User is clearly commanding the build to happen right now

NO if:
- User is just DESCRIBING what they want (even if detailed)
- User is asking questions or exploring options  
- First time user mentions their workflow idea
- Assistant hasn't yet asked for confirmation to build
- User says "I want to create..." (describing, not commanding)

Response:`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an intent detection expert. Respond only with YES or NO.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0, // Deterministic
        max_tokens: 5,
      });

      const response =
        completion.choices[0]?.message?.content?.trim().toUpperCase() || "NO";
      const shouldBuild = response.includes("YES");

      console.log(
        `[Intent Detection] Message: "${userMessage.substring(0, 50)}..." → ${
          shouldBuild ? "BUILD" : "CONTINUE CHAT"
        }`
      );

      return shouldBuild;
    } catch (error) {
      console.error("Intent detection error:", error);
      // Fallback to keyword detection on error
      const keywords = [
        "create workflow",
        "build workflow",
        "generate workflow",
        "make workflow",
      ];
      return keywords.some((k) => userMessage.toLowerCase().includes(k));
    }
  }

  /**
   * Check if conversation has all required components for workflow generation
   */
  private hasAllRequiredComponents(
    conversationHistory: ChatMessage[],
    currentMessage: string
  ): boolean {
    const allMessages = [
      ...conversationHistory,
      { role: "user" as const, content: currentMessage },
    ];
    const userMessages = allMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ")
      .toLowerCase();

    // Check for trigger
    const hasTrigger = userMessages.match(
      /schedul(e|ing)|webhook|manual|every (day|week|month|monday|tuesday|wednesday|thursday|friday)|at \d+|cron/i
    );

    // Check for action
    const hasAction = userMessages.match(
      /send|post|create|update|insert|email|message/i
    );

    // Check for service
    const hasService = userMessages.match(
      /gmail|slack|sendgrid|sheets|airtable|postgres|http|api/i
    );

    const hasAll = !!(hasTrigger && hasAction && hasService);

    if (hasAll) {
      console.log(
        "[Component Check] ✓ Trigger:",
        !!hasTrigger,
        "✓ Action:",
        !!hasAction,
        "✓ Service:",
        !!hasService
      );
    }

    return hasAll;
  }

  /**
   * Extract workflow requirements from conversation
   * Analyzes the conversation to extract structured workflow requirements
   */
  async extractWorkflowRequirements(
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    try {
      const contextLines = conversationHistory
        .map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n");

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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a requirements extraction expert.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return (
        completion.choices[0]?.message?.content ||
        "Create a workflow based on the conversation."
      );
    } catch (error) {
      console.error("Requirements extraction error:", error);
      // Fallback: use last user message
      const lastUserMessage = conversationHistory
        .filter((m) => m.role === "user")
        .pop();
      return lastUserMessage?.content || "Create a workflow";
    }
  }
}
