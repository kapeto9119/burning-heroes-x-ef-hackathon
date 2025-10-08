import OpenAI from "openai";
import { ChatMessage } from "../types";
import {
  analyzeSlots,
  generateBundledQuestion,
  looksLikeBuildCommand,
} from "./slots";

export class AIService {
  private openai: OpenAI;
  private systemPrompt: string;
  private platformSummaryProvider?: () => Promise<string>;

  constructor(apiKey: string, platformSummaryProvider?: () => Promise<string>) {
    this.openai = new OpenAI({ apiKey });
    this.platformSummaryProvider = platformSummaryProvider;

    this.systemPrompt = `You are an expert n8n workflow automation assistant.

🔥 NON-NEGOTIABLE RULES:
- **BUILD-FIRST**: If essential info is present OR safe defaults exist, propose a draft workflow NOW.
- **QUESTION BUDGET**: Ask at most ONE compact follow-up if truly blocking. NEVER ask the same question twice.
- **REASONABLE DEFAULTS**: Use safe defaults (webhook trigger for API execution, #general, placeholder emails) and state them explicitly.
- **SINGLE CONFIRM**: After proposing a plan, ask only "Deploy now?" - do NOT add new questions.
- **NO RE-ASKING**: Check conversation state first; never re-ask known information.

📋 OUTPUT STYLE:
- Start with a one-line decision ("Draft created with defaults" / "Need 1 choice").
- If you created a draft, list inferred defaults in bullets.
- End with exactly ONE action CTA ("Type **deploy** to go live, or say **change channel** / **switch to schedule 9am**.").

✅ EXAMPLES:
User: "Send Slack message when webhook triggers"
You: "Draft created! Webhook trigger → Slack message to #general. Type **deploy** or say **change channel**."

User: "Get HubSpot leads and email them"
You: "Draft created! Webhook trigger → Fetch HubSpot leads → AI greeting email. Type **deploy** to activate."

Be decisive, concise, and build-first.`;
  }

  async chat(
    userMessage: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    try {
      // Quick greeting filter — prevents accidental builds from "Hey", "Hi", etc.
      if (/^(hi|hey|hello|yo)\b/i.test(userMessage.trim())) {
        return "👋 Hi there! What would you like to automate today?";
      }
      // Check question budget - have we already asked a question?
      const hasAskedQuestion = this.hasAskedQuestion(conversationHistory);

      // Analyze conversation to extract what we already know
      const conversationContext = this.analyzeConversationContext(
        conversationHistory,
        userMessage
      );

      // Enhanced system prompt with conversation awareness + platform knowledge
      const platformSummary = this.platformSummaryProvider
        ? await this.platformSummaryProvider()
        : undefined;

      const enhancedSystemPrompt = `${this.systemPrompt}

CURRENT CONVERSATION STATE:
${conversationContext}

${
  hasAskedQuestion
    ? "⚠️ QUESTION BUDGET EXCEEDED: You already asked a question. DO NOT ask another. Build with defaults instead."
    : ""
}

${platformSummary ? `PLATFORM KNOWLEDGE:\n${platformSummary}\n` : ""}

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
   * Check if we've already asked a follow-up question
   */
  private hasAskedQuestion(history: ChatMessage[]): boolean {
    const lastTwo = history.slice(-2);
    return lastTwo.some(
      (m) =>
        m.role === "assistant" &&
        /\?|clarify|choose|pick|which|what|how|need to know/i.test(m.content)
    );
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

3. Webhook (DEFAULT - use this unless user specifically requests a schedule):
Use webhook trigger for workflows that should be triggered on-demand or via API.
{
  "httpMethod": "POST",
  "path": "webhook-${Date.now()}"
}

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

11. HubSpot (n8n-nodes-base.hubspot):
For fetching contacts/leads:
{
  "resource": "contact",
  "operation": "getAll",
  "returnAll": false,
  "limit": 10,
  "additionalFields": {}
}

For webhook trigger - use Webhook node with HubSpot webhook URL

11. Email Send (n8n-nodes-base.emailSend) - NOT emailReadImap!:
{
  "fromEmail": "sender@example.com",
  "toEmail": "={{$json.email}}",
  "subject": "Email subject",
  "text": "={{$json.emailBody}}"
}

CRITICAL EMAIL WORKFLOW PATTERN:
When user wants to send personalized/AI-generated emails, you MUST create TWO separate steps:
Step 1: Generate email content using Managed AI (HTTP Request)
Step 2: Send email using SMTP (n8n-nodes-base.emailSend)

Example for "Send personalized emails to HubSpot leads":
{
  "steps": [
    { 
      "action": "fetch_leads_from_hubspot", 
      "service": "hubspot", 
      "config": {"resource": "contact", "operation": "getAll", "limit": 10} 
    },
    { 
      "action": "generate_personalized_email", 
      "service": "ai", 
      "prompt": "Generate a personalized email for {{$json.firstname}} {{$json.lastname}} at {{$json.company}}",
      "config": {
        "method": "POST",
        "url": "https://your-backend.com/api/managed-ai/generate-content"
      }
    },
    { 
      "action": "send_email", 
      "service": "email", 
      "config": {
        "fromEmail": "={{$json.owneremail || 'noreply@company.com'}}",
        "toEmail": "={{$json.email}}",
        "subject": "={{$('generate_personalized_email').item.json.subject}}",
        "text": "={{$('generate_personalized_email').item.json.body}}"
      }
    }
  ],
  "requiredCredentials": ["hubspot", "smtp"]
}

CONTROL FLOW NODES (for loops, conditionals, iteration):
12. Loop Over Items / Split in Batches (n8n-nodes-base.splitInBatches):
Use when user mentions: "for each", "loop through", "iterate", "batch process", "one by one"
{
  "batchSize": 1,
  "options": {}
}
Note: This node processes items in batches and can loop back to process all items.

13. IF Node (n8n-nodes-base.if):
Use when user mentions: "if", "only when", "conditional", "check if"
{
  "conditions": {
    "boolean": [],
    "number": [],
    "string": [
      {
        "value1": "={{$json.status}}",
        "operation": "equal",
        "value2": "active"
      }
    ]
  },
  "combineOperation": "all"
}

14. Switch Node (n8n-nodes-base.switch):
Use when user mentions: "switch", "multiple conditions", "different cases", "route based on"
{
  "mode": "rules",
  "rules": {
    "rules": [
      {
        "operation": "equal",
        "value1": "={{$json.type}}",
        "value2": "urgent"
      }
    ]
  },
  "fallbackOutput": 3
}

CONTROL FLOW EXAMPLES:
- "Loop through each lead and send email" → Use splitInBatches before email step
- "Only send if status is active" → Use IF node to check condition
- "Route to different channels based on priority" → Use Switch node

CRITICAL RULES:
1. ONLY include services/nodes that the user EXPLICITLY mentioned
2. DO NOT add extra services (e.g., don't add Slack if user didn't mention it)
3. DO NOT hallucinate steps - only include what was requested
4. For Salesforce data fetching, use "manual" trigger + Salesforce node as first action
5. For AI content generation, use the Managed AI HTTP Request format shown above
6. For email sending with AI content, ALWAYS use TWO steps: AI generation + emailSend
7. When user mentions iteration/loops ("for each", "loop"), add a splitInBatches node
8. When user mentions conditions ("if", "only when"), add an IF or Switch node
7. NEVER try to send emails via HTTP request to /api/managed-ai/generate-content alone

Respond with a JSON object containing:
{
  "workflowName": "descriptive name",
  "trigger": { "type": "webhook|schedule", "config": {} },
  "steps": [
    { "action": "fetch_leads_from_salesforce", "service": "salesforce", "config": {...} },
    { "action": "generate_email_content", "service": "ai", "prompt": "...", "config": {...} },
    
IMPORTANT: Use "webhook" trigger type for all on-demand workflows (default). Only use "schedule" if user explicitly requests scheduled execution (e.g., "every day at 9am", "hourly", "weekly").
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

  /**
   * Helper: Make a JSON-structured completion call
   */
  async jsonComplete(
    systemPrompt: string,
    userPrompt: string,
    temperature: number = 0.2
  ): Promise<any> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("JSON completion error:", error);
      throw error;
    }
  }

  async suggestImprovements(workflow: any): Promise<string[]> {
    try {
      const prompt = `Analyze this n8n workflow and suggest 3 concise improvements:

${JSON.stringify(workflow, null, 2)}

Return JSON: { "improvements": ["suggestion 1", "suggestion 2", "suggestion 3"] }`;

      const result = await this.jsonComplete(
        'You are a workflow optimization expert. Return JSON with an "improvements" array.',
        prompt,
        0.3
      );

      return result.improvements || [];
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
      // Use slot-based analysis first
      const historyText = conversationHistory
        .filter((m) => m.role === "user")
        .map((m) => m.content);

      const analysis = analyzeSlots(userMessage, historyText);

      // Check if message looks like build command (only if we have complete slots or draft)
      if (looksLikeBuildCommand(userMessage, analysis.canBuild)) {
        console.log(
          "[Intent Detection] ✅ Build command detected:",
          userMessage.substring(0, 30)
        );
        return true;
      }

      if (analysis.canBuild) {
        console.log("[Intent Detection] ✅ Slots complete, building workflow", {
          services: analysis.slots.services,
          actions: analysis.slots.actions,
        });
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

      const prompt = `You are analyzing a conversation to determine if the user wants to BUILD/CREATE/GENERATE a workflow.

Recent conversation context:
${contextLines}

Latest user message: "${userMessage}"

CRITICAL: BUILD-FIRST APPROACH - If the user describes a workflow with enough detail, return YES.

Analyze if the user is:
1. Describing a complete workflow (e.g., "Get orders and route to different channels based on priority")
2. Giving an explicit command to build (e.g., "do it", "build it now", "create it")
3. Giving confirmation after being asked (e.g., "yes", "ok", "sure", "proceed")

Respond with ONLY "YES" or "NO".

YES if:
- User describes a workflow with trigger + action(s) (e.g., "when X happens, do Y")
- User describes routing/conditional logic (e.g., "route to different channels based on...")
- User describes data processing (e.g., "get data from X and send to Y")
- User explicitly says: "do it", "build it", "create it", "make it", "deploy"
- User confirms after assistant asks

NO ONLY if:
- User is just greeting (e.g., "hey", "hi", "hello")
- User is asking general questions without describing a workflow
- User is asking for help or clarification

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
   * @deprecated - Now using slot-based analysis
   */
  private hasAllRequiredComponents(
    conversationHistory: ChatMessage[],
    currentMessage: string
  ): boolean {
    // Use new slot-based approach
    const historyText = conversationHistory
      .filter((m) => m.role === "user")
      .map((m) => m.content);

    const analysis = analyzeSlots(currentMessage, historyText);
    return analysis.canBuild;
  }

  /**
   * Extract workflow requirements from conversation
   * Returns structured description suitable for workflow generation
   */
  async extractWorkflowRequirements(
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    try {
      // Use slot-based extraction for structured approach
      const userMessages = conversationHistory
        .filter((m) => m.role === "user")
        .map((m) => m.content);

      const lastMessage = userMessages[userMessages.length - 1] || "";
      const analysis = analyzeSlots(lastMessage, userMessages.slice(0, -1));

      // Build a natural language description from slots
      const parts: string[] = [];

      // Trigger
      if (
        analysis.slots.trigger === "schedule" &&
        analysis.slots.scheduleSpec
      ) {
        parts.push(`Run on schedule (${analysis.slots.scheduleSpec})`);
      } else if (analysis.slots.trigger === "webhook") {
        parts.push("Trigger via webhook");
      } else {
        parts.push("Manual trigger");
      }

      // Actions with services
      if (
        analysis.slots.actions.includes("fetch leads") &&
        analysis.slots.services.includes("hubspot")
      ) {
        parts.push("fetch leads from HubSpot");
      } else if (
        analysis.slots.actions.includes("fetch leads") &&
        analysis.slots.services.includes("salesforce")
      ) {
        parts.push("fetch leads from Salesforce");
      }

      if (
        analysis.slots.actions.includes("generate content") &&
        analysis.slots.services.some((s) =>
          ["openai", "claude", "googleAI"].includes(s)
        )
      ) {
        const contentType =
          analysis.slots.contentHint || "personalized content";
        parts.push(`generate AI ${contentType}`);
      }

      if (analysis.slots.actions.includes("send email")) {
        const emailService =
          analysis.slots.services.find((s) =>
            ["gmail", "email", "sendgrid"].includes(s)
          ) || "email";
        const recipient = analysis.slots.recipient || "each lead";
        parts.push(`send ${emailService} to ${recipient}`);
      }

      if (analysis.slots.actions.includes("post slack")) {
        const channel = analysis.slots.channel || "#general";
        parts.push(`post Slack message to ${channel}`);
      }

      // Build final description
      const description = parts.join(", then ");
      console.log(
        "[Requirements Extraction] Generated description:",
        description
      );

      return description || userMessages.join(" ");
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
