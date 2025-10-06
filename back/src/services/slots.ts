/**
 * Slot-Filling State Machine for Workflow Generation
 * Enforces build-first approach with safe defaults
 */

export interface WorkflowSlots {
  trigger?: 'manual' | 'schedule' | 'webhook' | 'cron';
  actions: string[];        // ["send email", "post slack", "fetch leads"]
  services: string[];       // ["gmail", "slack", "hubspot", "openai"]
  channel?: string;         // "#alerts"
  recipient?: string;       // "ops@example.com"
  contentHint?: string;     // "weekly summary" or "greeting message"
  scheduleSpec?: string;    // "0 9 * * *"
  questionAsked?: boolean;  // Track if we've asked a follow-up
}

export interface SlotExtractionResult {
  slots: WorkflowSlots;
  notes: string[];          // Defaults applied
  gaps: string[];           // Critical missing info
  canBuild: boolean;        // Ready to generate workflow
}

/**
 * Extract slots from user message using pattern matching
 */
export function extractSlots(message: string, conversationHistory: string[] = []): WorkflowSlots {
  const allText = [...conversationHistory, message].join(' ').toLowerCase();
  
  const slots: WorkflowSlots = {
    actions: [],
    services: []
  };

  // Extract trigger
  if (allText.match(/schedul(e|ing)|every (day|week|month|monday|tuesday|wednesday|thursday|friday)|at \d+|cron/i)) {
    slots.trigger = 'schedule';
    
    // Extract schedule spec with proper 12am/12pm handling and minutes support
    const everyMatch = allText.match(/every\s+(\d+)\s*min/i);
    const timeMatch = allText.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    const weekdayMatch = allText.match(/(weekday|mon|tue|wed|thu|fri)/i);
    
    if (everyMatch) {
      const mins = everyMatch[1];
      slots.scheduleSpec = `*/${mins} * * * *`;
    } else if (timeMatch) {
      const hourStr = timeMatch[1];
      const minStr = timeMatch[2] || '0';
      const ampm = timeMatch[3].toLowerCase();
      
      // Handle 12am/12pm correctly: 12am=0, 12pm=12, others add 12 for pm
      let hour24 = parseInt(hourStr, 10);
      if (ampm === 'am') {
        if (hour24 === 12) hour24 = 0; // 12am = midnight
      } else { // pm
        if (hour24 !== 12) hour24 += 12; // 1pm-11pm add 12, 12pm stays 12
      }
      
      const minutes = parseInt(minStr, 10);
      const cronDays = weekdayMatch ? '1-5' : '*';
      slots.scheduleSpec = `${minutes} ${hour24} * * ${cronDays}`;
    }
  } else if (allText.match(/webhook|http|api call|when.*receive/i)) {
    slots.trigger = 'webhook';
  } else {
    // Default to manual for data-fetching workflows
    slots.trigger = 'manual';
  }

  // Extract actions (verbs)
  if (allText.match(/send.*email|email.*send/i)) slots.actions.push('send email');
  if (allText.match(/send.*message|post.*slack|slack.*message/i)) slots.actions.push('post slack');
  if (allText.match(/get.*leads|fetch.*leads|grab.*leads|retrieve.*leads/i)) slots.actions.push('fetch leads');
  if (allText.match(/generat(e|ing).*content|ai.*content|write.*email|create.*message/i)) slots.actions.push('generate content');
  if (allText.match(/update|insert|save.*data/i)) slots.actions.push('save data');

  // Extract services
  if (allText.match(/gmail|google mail/i)) slots.services.push('gmail');
  if (allText.match(/slack/i)) slots.services.push('slack');
  if (allText.match(/sendgrid/i)) slots.services.push('sendgrid');
  if (allText.match(/email/i) && !slots.services.includes('gmail')) slots.services.push('email');
  if (allText.match(/sheets|google sheets/i)) slots.services.push('googleSheets');
  if (allText.match(/hubspot/i)) slots.services.push('hubspot');
  if (allText.match(/salesforce/i)) slots.services.push('salesforce');
  if (allText.match(/openai|gpt|chatgpt|gpt-4|ai/i)) slots.services.push('openai');
  if (allText.match(/claude|anthropic/i)) slots.services.push('claude');
  if (allText.match(/gemini|google ai/i)) slots.services.push('googleAI');

  // Extract Slack channel (with or without #)
  // Priority: explicit # mentions, then "channel X" patterns
  const explicitChannel = allText.match(/(?:^|\s)#([\w-]{2,})\b/);
  const channelPattern = allText.match(/\bchannel\s+(?:to\s+)?([\w-]{2,})\b/i);
  
  if (explicitChannel) {
    slots.channel = `#${explicitChannel[1]}`;
  } else if (channelPattern) {
    const channel = channelPattern[1];
    slots.channel = channel.startsWith('#') ? channel : `#${channel}`;
  }

  // Extract email recipient
  const emailMatch = allText.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  if (emailMatch) {
    slots.recipient = emailMatch[0];
  }

  // Extract content hint
  if (allText.match(/greet|greeting|welcome/i)) {
    slots.contentHint = 'greeting message';
  } else if (allText.match(/summary|report/i)) {
    slots.contentHint = 'summary report';
  } else if (allText.match(/notification|alert/i)) {
    slots.contentHint = 'notification';
  }

  return slots;
}

/**
 * Apply safe defaults to missing slots
 */
export function inferDefaults(slots: WorkflowSlots): { slots: WorkflowSlots; notes: string[] } {
  const notes: string[] = [];

  // Default trigger
  if (!slots.trigger) {
    slots.trigger = 'manual';
    notes.push('Defaulted trigger to **manual** (click to run)');
  }

  // Default Slack channel
  if (slots.services.includes('slack') && !slots.channel) {
    slots.channel = '#general';
    notes.push('Defaulted Slack channel to **#general**');
  }

  // Default email recipient
  if ((slots.services.includes('gmail') || slots.services.includes('email')) && !slots.recipient) {
    slots.recipient = '={{ $json.email || "someone@example.com" }}';
    notes.push('Defaulted email recipient to **{{ $json.email }}** (from previous step)');
  }

  // Default schedule spec
  if (slots.trigger === 'schedule' && !slots.scheduleSpec) {
    slots.scheduleSpec = '0 9 * * *';
    notes.push('Defaulted schedule to **9:00 AM daily**');
  }

  return { slots, notes };
}

/**
 * Identify critical gaps that block workflow generation
 */
export function criticalGaps(slots: WorkflowSlots): string[] {
  const gaps: string[] = [];

  // Must have at least one service
  if (!slots.services || slots.services.length === 0) {
    gaps.push('service');
  }

  // Must have at least one action
  if (!slots.actions || slots.actions.length === 0) {
    gaps.push('action');
  }

  return gaps;
}

/**
 * Main analysis function - determines if we can build or need to ask
 */
export function analyzeSlots(message: string, conversationHistory: string[] = []): SlotExtractionResult {
  let slots = extractSlots(message, conversationHistory);
  const gaps = criticalGaps(slots);

  // If no critical gaps, apply defaults and build
  if (gaps.length === 0) {
    const { slots: defaultedSlots, notes } = inferDefaults(slots);
    return {
      slots: defaultedSlots,
      notes,
      gaps: [],
      canBuild: true
    };
  }

  // If 1-2 critical gaps and haven't asked yet, we need ONE question
  if (gaps.length <= 2 && !slots.questionAsked) {
    return {
      slots,
      notes: [],
      gaps,
      canBuild: false
    };
  }

  // If we've already asked or too many gaps, try to build with what we have
  const { slots: defaultedSlots, notes } = inferDefaults(slots);
  return {
    slots: defaultedSlots,
    notes: [...notes, '⚠️ Building with minimal info - you can refine after'],
    gaps,
    canBuild: true
  };
}

/**
 * Generate a compact, bundled question for missing slots
 */
export function generateBundledQuestion(gaps: string[]): string {
  if (gaps.includes('service') && gaps.includes('action')) {
    return `I need to know: **Which service** (Slack, Gmail, Sheets, etc.) and **what action** (send message, update data, etc.)?

Quick examples:
- "Send Slack message to #alerts"
- "Send email via Gmail"
- "Update Google Sheets"`;
  }

  if (gaps.includes('service')) {
    return `Which service should I use? (Slack, Gmail, Google Sheets, HubSpot, etc.)`;
  }

  if (gaps.includes('action')) {
    return `What should the workflow do? (send message, send email, update data, etc.)`;
  }

  return 'What would you like to automate?';
}

/**
 * Check if message looks like a build/deploy command
 * Only returns true if we have context (draft exists or slots are complete)
 */
export function looksLikeBuildCommand(message: string, hasDraftOrCompleteSlots: boolean = false): boolean {
  const BUILD_PHRASES = [
    'do it', 'build it', 'create it', 'make it', 'ship it', 'go ahead',
    'proceed', "let's go", "let's do it", 'deploy', 'activate', 'push live',
    "ok let's", 'sounds good', 'yes', 'yep', 'yeah', 'sure', 'ok', 'okay',
    '👍', '✅', 'perfect', 'great', 'correct', 'right'
  ];

  const m = message.toLowerCase().trim();
  
  // Only treat as build command if we have context (draft exists or slots complete)
  // This prevents "what now?" or "hm..." from triggering builds
  return hasDraftOrCompleteSlots && BUILD_PHRASES.some(p => m.includes(p));
}
