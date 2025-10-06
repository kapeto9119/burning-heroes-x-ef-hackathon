/**
 * Integration Configuration
 * Defines all supported services with OAuth and credential details
 */

export interface IntegrationConfig {
  id: string;
  name: string;
  category: 'communication' | 'productivity' | 'database' | 'marketing' | 'development' | 'crm' | 'storage' | 'ai';
  authType: 'oauth2' | 'apiKey' | 'basic' | 'custom';
  n8nCredentialType: string;
  n8nNodeType: string;
  
  // OAuth configuration
  oauth?: {
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    scopeSeparator?: string;
  };
  
  // API Key configuration
  apiKey?: {
    fields: Array<{
      name: string;
      label: string;
      type: 'text' | 'password' | 'number';
      required: boolean;
      placeholder?: string;
      description?: string;
    }>;
  };
  
  // Validation endpoint
  validation?: {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
  };
  
  // UI metadata
  ui: {
    icon: string;
    color: string;
    description: string;
    setupGuideUrl?: string;
  };
}

export const INTEGRATIONS: Record<string, IntegrationConfig> = {
  // ============================================
  // COMMUNICATION (5)
  // ============================================
  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    authType: 'oauth2',
    n8nCredentialType: 'slackApi',
    n8nNodeType: 'n8n-nodes-base.slack',
    oauth: {
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['chat:write', 'channels:read', 'users:read', 'files:write'],
      scopeSeparator: ','
    },
    validation: {
      url: 'https://slack.com/api/auth.test',
      method: 'POST'
    },
    ui: {
      icon: '💬',
      color: '#4A154B',
      description: 'Send messages, manage channels, and automate Slack workflows'
    }
  },

  discord: {
    id: 'discord',
    name: 'Discord',
    category: 'communication',
    authType: 'oauth2',
    n8nCredentialType: 'discordApi',
    n8nNodeType: 'n8n-nodes-base.discord',
    oauth: {
      authUrl: 'https://discord.com/api/oauth2/authorize',
      tokenUrl: 'https://discord.com/api/oauth2/token',
      scopes: ['bot', 'messages.read', 'messages.write'],
      scopeSeparator: ' '
    },
    ui: {
      icon: '🎮',
      color: '#5865F2',
      description: 'Send messages and manage Discord servers'
    }
  },

  telegram: {
    id: 'telegram',
    name: 'Telegram',
    category: 'communication',
    authType: 'apiKey',
    n8nCredentialType: 'telegramApi',
    n8nNodeType: 'n8n-nodes-base.telegram',
    apiKey: {
      fields: [
        {
          name: 'accessToken',
          label: 'Bot Token',
          type: 'password',
          required: true,
          placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
          description: 'Get from @BotFather on Telegram'
        }
      ]
    },
    ui: {
      icon: '✈️',
      color: '#0088CC',
      description: 'Send messages and manage Telegram bots',
      setupGuideUrl: 'https://core.telegram.org/bots#6-botfather'
    }
  },

  twilio: {
    id: 'twilio',
    name: 'Twilio',
    category: 'communication',
    authType: 'apiKey',
    n8nCredentialType: 'twilioApi',
    n8nNodeType: 'n8n-nodes-base.twilio',
    apiKey: {
      fields: [
        {
          name: 'accountSid',
          label: 'Account SID',
          type: 'text',
          required: true,
          placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
        },
        {
          name: 'authToken',
          label: 'Auth Token',
          type: 'password',
          required: true
        }
      ]
    },
    validation: {
      url: 'https://api.twilio.com/2010-04-01/Accounts.json',
      method: 'GET'
    },
    ui: {
      icon: '📱',
      color: '#F22F46',
      description: 'Send SMS, make calls, and manage phone communications'
    }
  },

  sendgrid: {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'communication',
    authType: 'apiKey',
    n8nCredentialType: 'sendGridApi',
    n8nNodeType: 'n8n-nodes-base.sendGrid',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
        }
      ]
    },
    ui: {
      icon: '📧',
      color: '#1A82E2',
      description: 'Send transactional and marketing emails'
    }
  },

  // ============================================
  // PRODUCTIVITY (5)
  // ============================================
  notion: {
    id: 'notion',
    name: 'Notion',
    category: 'productivity',
    authType: 'oauth2',
    n8nCredentialType: 'notionApi',
    n8nNodeType: 'n8n-nodes-base.notion',
    oauth: {
      authUrl: 'https://api.notion.com/v1/oauth/authorize',
      tokenUrl: 'https://api.notion.com/v1/oauth/token',
      scopes: [],
      scopeSeparator: ','
    },
    ui: {
      icon: '📝',
      color: '#000000',
      description: 'Create pages, update databases, and manage Notion workspaces'
    }
  },

  googleSheets: {
    id: 'googleSheets',
    name: 'Google Sheets',
    category: 'productivity',
    authType: 'oauth2',
    n8nCredentialType: 'googleSheetsOAuth2',
    n8nNodeType: 'n8n-nodes-base.googleSheets',
    oauth: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
      scopeSeparator: ' '
    },
    ui: {
      icon: '📊',
      color: '#0F9D58',
      description: 'Read and write data to Google Sheets'
    }
  },

  googleDrive: {
    id: 'googleDrive',
    name: 'Google Drive',
    category: 'productivity',
    authType: 'oauth2',
    n8nCredentialType: 'googleDriveOAuth2',
    n8nNodeType: 'n8n-nodes-base.googleDrive',
    oauth: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['https://www.googleapis.com/auth/drive'],
      scopeSeparator: ' '
    },
    ui: {
      icon: '📁',
      color: '#4285F4',
      description: 'Upload, download, and manage files in Google Drive'
    }
  },

  airtable: {
    id: 'airtable',
    name: 'Airtable',
    category: 'productivity',
    authType: 'apiKey',
    n8nCredentialType: 'airtableApi',
    n8nNodeType: 'n8n-nodes-base.airtable',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'keyXXXXXXXXXXXXXX',
          description: 'Get from https://airtable.com/account'
        }
      ]
    },
    ui: {
      icon: '🗂️',
      color: '#18BFFF',
      description: 'Create and update records in Airtable bases'
    }
  },

  trello: {
    id: 'trello',
    name: 'Trello',
    category: 'productivity',
    authType: 'apiKey',
    n8nCredentialType: 'trelloApi',
    n8nNodeType: 'n8n-nodes-base.trello',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true
        },
        {
          name: 'apiToken',
          label: 'API Token',
          type: 'password',
          required: true
        }
      ]
    },
    ui: {
      icon: '📋',
      color: '#0079BF',
      description: 'Create cards, manage boards, and automate Trello workflows'
    }
  },

  // ============================================
  // DATABASE (3)
  // ============================================
  postgres: {
    id: 'postgres',
    name: 'PostgreSQL',
    category: 'database',
    authType: 'basic',
    n8nCredentialType: 'postgres',
    n8nNodeType: 'n8n-nodes-base.postgres',
    apiKey: {
      fields: [
        {
          name: 'host',
          label: 'Host',
          type: 'text',
          required: true,
          placeholder: 'localhost'
        },
        {
          name: 'port',
          label: 'Port',
          type: 'number',
          required: true,
          placeholder: '5432'
        },
        {
          name: 'database',
          label: 'Database',
          type: 'text',
          required: true
        },
        {
          name: 'user',
          label: 'User',
          type: 'text',
          required: true
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true
        }
      ]
    },
    ui: {
      icon: '🐘',
      color: '#336791',
      description: 'Execute SQL queries on PostgreSQL databases'
    }
  },

  mysql: {
    id: 'mysql',
    name: 'MySQL',
    category: 'database',
    authType: 'basic',
    n8nCredentialType: 'mySql',
    n8nNodeType: 'n8n-nodes-base.mySql',
    apiKey: {
      fields: [
        {
          name: 'host',
          label: 'Host',
          type: 'text',
          required: true,
          placeholder: 'localhost'
        },
        {
          name: 'port',
          label: 'Port',
          type: 'number',
          required: true,
          placeholder: '3306'
        },
        {
          name: 'database',
          label: 'Database',
          type: 'text',
          required: true
        },
        {
          name: 'user',
          label: 'User',
          type: 'text',
          required: true
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true
        }
      ]
    },
    ui: {
      icon: '🐬',
      color: '#00758F',
      description: 'Execute SQL queries on MySQL databases'
    }
  },

  mongodb: {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'database',
    authType: 'basic',
    n8nCredentialType: 'mongoDb',
    n8nNodeType: 'n8n-nodes-base.mongoDb',
    apiKey: {
      fields: [
        {
          name: 'connectionString',
          label: 'Connection String',
          type: 'password',
          required: true,
          placeholder: 'mongodb://localhost:27017/database',
          description: 'MongoDB connection URI'
        }
      ]
    },
    ui: {
      icon: '🍃',
      color: '#47A248',
      description: 'Query and update MongoDB collections'
    }
  },

  // ============================================
  // MARKETING (3)
  // ============================================
  mailchimp: {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'marketing',
    authType: 'oauth2',
    n8nCredentialType: 'mailchimpOAuth2',
    n8nNodeType: 'n8n-nodes-base.mailchimp',
    oauth: {
      authUrl: 'https://login.mailchimp.com/oauth2/authorize',
      tokenUrl: 'https://login.mailchimp.com/oauth2/token',
      scopes: [],
      scopeSeparator: ' '
    },
    ui: {
      icon: '🐵',
      color: '#FFE01B',
      description: 'Manage email campaigns and subscriber lists'
    }
  },

  hubspot: {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'marketing',
    authType: 'oauth2',
    n8nCredentialType: 'hubspotOAuth2',
    n8nNodeType: 'n8n-nodes-base.hubspot',
    oauth: {
      authUrl: 'https://app.hubspot.com/oauth/authorize',
      tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
      scopes: ['contacts', 'content', 'forms'],
      scopeSeparator: ' '
    },
    ui: {
      icon: '🧲',
      color: '#FF7A59',
      description: 'Manage contacts, deals, and marketing automation'
    }
  },

  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    category: 'marketing',
    authType: 'oauth2',
    n8nCredentialType: 'twitterOAuth2',
    n8nNodeType: 'n8n-nodes-base.twitter',
    oauth: {
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.twitter.com/2/oauth2/token',
      scopes: ['tweet.read', 'tweet.write', 'users.read'],
      scopeSeparator: ' '
    },
    ui: {
      icon: '🐦',
      color: '#1DA1F2',
      description: 'Post tweets and manage Twitter/X account'
    }
  },

  // ============================================
  // DEVELOPMENT (2)
  // ============================================
  github: {
    id: 'github',
    name: 'GitHub',
    category: 'development',
    authType: 'oauth2',
    n8nCredentialType: 'githubOAuth2',
    n8nNodeType: 'n8n-nodes-base.github',
    oauth: {
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scopes: ['repo', 'user', 'admin:org'],
      scopeSeparator: ' '
    },
    ui: {
      icon: '🐙',
      color: '#181717',
      description: 'Manage repositories, issues, and pull requests'
    }
  },

  gitlab: {
    id: 'gitlab',
    name: 'GitLab',
    category: 'development',
    authType: 'oauth2',
    n8nCredentialType: 'gitlabOAuth2',
    n8nNodeType: 'n8n-nodes-base.gitlab',
    oauth: {
      authUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      scopes: ['api', 'read_user', 'read_repository'],
      scopeSeparator: ' '
    },
    ui: {
      icon: '🦊',
      color: '#FC6D26',
      description: 'Manage GitLab projects, issues, and pipelines'
    }
  },

  // ============================================
  // CRM (2)
  // ============================================
  salesforce: {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    authType: 'oauth2',
    n8nCredentialType: 'salesforceOAuth2',
    n8nNodeType: 'n8n-nodes-base.salesforce',
    oauth: {
      authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      scopes: ['api', 'refresh_token'],
      scopeSeparator: ' '
    },
    ui: {
      icon: '☁️',
      color: '#00A1E0',
      description: 'Manage leads, contacts, and opportunities'
    }
  },

  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'crm',
    authType: 'apiKey',
    n8nCredentialType: 'pipedriveApi',
    n8nNodeType: 'n8n-nodes-base.pipedrive',
    apiKey: {
      fields: [
        {
          name: 'apiToken',
          label: 'API Token',
          type: 'password',
          required: true,
          description: 'Get from Settings > Personal Preferences > API'
        }
      ]
    },
    ui: {
      icon: '🔧',
      color: '#1A1A1A',
      description: 'Manage deals, contacts, and sales pipeline'
    }
  },

  // ============================================
  // AI & CONTENT GENERATION (7)
  // ============================================
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    category: 'ai',
    authType: 'apiKey',
    n8nCredentialType: 'openAiApi', // Uses OpenAI-compatible API
    n8nNodeType: 'n8n-nodes-langchain.openai',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'fw_...',
          description: 'Get from https://fireworks.ai/api-keys'
        }
      ]
    },
    validation: {
      url: 'https://api.fireworks.ai/inference/v1/models',
      method: 'GET'
    },
    ui: {
      icon: '🔥',
      color: '#FF6B35',
      description: 'Llama 3.1, Mixtral - 70-87% cheaper than OpenAI!',
      setupGuideUrl: 'https://docs.fireworks.ai/'
    }
  },

  openai: {
    id: 'openai',
    name: 'OpenAI',
    category: 'ai',
    authType: 'apiKey',
    n8nCredentialType: 'openAiApi',
    n8nNodeType: 'n8n-nodes-langchain.openai',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'sk-...',
          description: 'Get from https://platform.openai.com/api-keys'
        }
      ]
    },
    validation: {
      url: 'https://api.openai.com/v1/models',
      method: 'GET'
    },
    ui: {
      icon: '🤖',
      color: '#10A37F',
      description: 'GPT models, DALL-E image generation, Whisper transcription',
      setupGuideUrl: 'https://platform.openai.com/docs/quickstart'
    }
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    category: 'ai',
    authType: 'apiKey',
    n8nCredentialType: 'anthropicApi',
    n8nNodeType: 'n8n-nodes-langchain.lmChatAnthropic',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'sk-ant-...',
          description: 'Get from https://console.anthropic.com/'
        }
      ]
    },
    ui: {
      icon: '🧠',
      color: '#D4A373',
      description: 'Claude models for advanced reasoning and long context',
      setupGuideUrl: 'https://docs.anthropic.com/claude/docs'
    }
  },

  googleAI: {
    id: 'googleAI',
    name: 'Google AI',
    category: 'ai',
    authType: 'apiKey',
    n8nCredentialType: 'googlePalmApi',
    n8nNodeType: 'n8n-nodes-langchain.lmChatGooglePalm',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          description: 'Get from https://makersuite.google.com/app/apikey'
        }
      ]
    },
    ui: {
      icon: '🔮',
      color: '#4285F4',
      description: 'Gemini models for multimodal AI (text, images, video)',
      setupGuideUrl: 'https://ai.google.dev/'
    }
  },

  stabilityAI: {
    id: 'stabilityAI',
    name: 'Stability AI',
    category: 'ai',
    authType: 'apiKey',
    n8nCredentialType: 'stabilityAiApi',
    n8nNodeType: 'n8n-nodes-base.stabilityAi',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'sk-...',
          description: 'Get from https://platform.stability.ai/'
        }
      ]
    },
    ui: {
      icon: '🎨',
      color: '#7C3AED',
      description: 'Stable Diffusion for AI image generation',
      setupGuideUrl: 'https://platform.stability.ai/docs'
    }
  },

  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'ai',
    authType: 'apiKey',
    n8nCredentialType: 'elevenLabsApi',
    n8nNodeType: 'n8n-nodes-base.elevenLabs',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          description: 'Get from https://elevenlabs.io/app/settings/api-keys'
        }
      ]
    },
    ui: {
      icon: '🎙️',
      color: '#000000',
      description: 'Realistic voice synthesis and voice cloning',
      setupGuideUrl: 'https://elevenlabs.io/docs'
    }
  },

  replicate: {
    id: 'replicate',
    name: 'Replicate',
    category: 'ai',
    authType: 'apiKey',
    n8nCredentialType: 'replicateApi',
    n8nNodeType: 'n8n-nodes-base.replicate',
    apiKey: {
      fields: [
        {
          name: 'apiKey',
          label: 'API Token',
          type: 'password',
          required: true,
          placeholder: 'r8_...',
          description: 'Get from https://replicate.com/account/api-tokens'
        }
      ]
    },
    ui: {
      icon: '🔄',
      color: '#0F172A',
      description: 'Run various AI models (Stable Diffusion, LLaMA, Flux, etc.)',
      setupGuideUrl: 'https://replicate.com/docs'
    }
  }
};

// Helper functions
export function getIntegration(id: string): IntegrationConfig | undefined {
  return INTEGRATIONS[id];
}

export function getIntegrationsByCategory(category: string): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter(i => i.category === category);
}

export function getOAuthIntegrations(): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter(i => i.authType === 'oauth2');
}

export function getApiKeyIntegrations(): IntegrationConfig[] {
  return Object.values(INTEGRATIONS).filter(i => i.authType === 'apiKey' || i.authType === 'basic');
}

export const INTEGRATION_CATEGORIES = [
  { id: 'ai', name: 'AI & Content', icon: '🤖' },
  { id: 'communication', name: 'Communication', icon: '💬' },
  { id: 'productivity', name: 'Productivity', icon: '📊' },
  { id: 'database', name: 'Database', icon: '🗄️' },
  { id: 'marketing', name: 'Marketing', icon: '📢' },
  { id: 'development', name: 'Development', icon: '⚙️' },
  { id: 'crm', name: 'CRM', icon: '🤝' }
];
