import { N8nWorkflow } from '../types';
import { N8nMCPClient } from './n8n-mcp-client';

/**
 * Credential requirement for a service
 */
export interface CredentialRequirement {
  service: string;           // Human-readable service name (e.g., "Slack", "Gmail")
  n8nCredentialType: string; // N8N credential type (e.g., "slackApi", "gmailOAuth2")
  required: boolean;
  fields: CredentialField[];
  nodeType: string;          // The node type that needs this credential
}

export interface CredentialField {
  name: string;
  type: 'string' | 'password' | 'number' | 'boolean' | 'oauth';
  required: boolean;
  description?: string;
  placeholder?: string;
}

/**
 * Service to detect and manage credential requirements for workflows
 */
export class CredentialDetector {
  private mcpClient: N8nMCPClient;

  // Map n8n node types to their required credential types
  private nodeTypeToCredentialMap: Record<string, string> = {
    // Communication
    'n8n-nodes-base.slack': 'slackApi',
    'n8n-nodes-base.discord': 'discordApi',
    'n8n-nodes-base.telegram': 'telegramApi',
    'n8n-nodes-base.twilio': 'twilioApi',
    'n8n-nodes-base.sendGrid': 'sendGridApi',
    'n8n-nodes-base.emailSend': 'smtp',
    
    // Productivity
    'n8n-nodes-base.notion': 'notionApi',
    'n8n-nodes-base.googleSheets': 'googleSheetsOAuth2',
    'n8n-nodes-base.googleDrive': 'googleDriveOAuth2',
    'n8n-nodes-base.airtable': 'airtableApi',
    'n8n-nodes-base.trello': 'trelloApi',
    
    // Database
    'n8n-nodes-base.postgres': 'postgres',
    'n8n-nodes-base.mySql': 'mysqlDb',
    'n8n-nodes-base.mongoDb': 'mongoDb',
    
    // Marketing
    'n8n-nodes-base.mailchimp': 'mailchimpOAuth2',
    'n8n-nodes-base.hubspot': 'hubspotOAuth2',
    'n8n-nodes-base.twitter': 'twitterOAuth2',
    
    // Development
    'n8n-nodes-base.github': 'githubOAuth2',
    'n8n-nodes-base.gitlab': 'gitlabOAuth2',
    
    // CRM
    'n8n-nodes-base.salesforce': 'salesforceOAuth2',
    'n8n-nodes-base.pipedrive': 'pipedriveApi',
    
    // AI
    'n8n-nodes-base.openAi': 'openAiApi',
  };

  // Map N8N credential types to user-friendly service names and field definitions
  private credentialFieldMap: Record<string, { service: string; fields: CredentialField[] }> = {
    'salesforceOAuth2': {
      service: 'Salesforce',
      fields: [
        {
          name: 'clientId',
          type: 'string',
          required: true,
          description: 'Salesforce OAuth Client ID'
        },
        {
          name: 'clientSecret',
          type: 'password',
          required: true,
          description: 'Salesforce OAuth Client Secret'
        },
        {
          name: 'accessToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Access Token'
        },
        {
          name: 'refreshToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Refresh Token'
        }
      ]
    },
    'slackApi': {
      service: 'Slack',
      fields: [
        {
          name: 'token',
          type: 'password',
          required: true,
          description: 'Bot User OAuth Token',
          placeholder: 'xoxb-...'
        }
      ]
    },
    'gmailOAuth2': {
      service: 'Gmail',
      fields: [
        {
          name: 'clientId',
          type: 'string',
          required: true,
          description: 'Google OAuth Client ID'
        },
        {
          name: 'clientSecret',
          type: 'password',
          required: true,
          description: 'Google OAuth Client Secret'
        },
        {
          name: 'accessToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Access Token (obtained via OAuth flow)'
        },
        {
          name: 'refreshToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Refresh Token'
        }
      ]
    },
    'smtp': {
      service: 'Email (SMTP)',
      fields: [
        {
          name: 'user',
          type: 'string',
          required: true,
          description: 'Email address',
          placeholder: 'your-email@gmail.com'
        },
        {
          name: 'password',
          type: 'password',
          required: true,
          description: 'Email password or app password'
        },
        {
          name: 'host',
          type: 'string',
          required: true,
          description: 'SMTP host',
          placeholder: 'smtp.gmail.com'
        },
        {
          name: 'port',
          type: 'number',
          required: true,
          description: 'SMTP port',
          placeholder: '587'
        }
      ]
    },
    'postgres': {
      service: 'PostgreSQL',
      fields: [
        {
          name: 'host',
          type: 'string',
          required: true,
          description: 'Database host',
          placeholder: 'localhost'
        },
        {
          name: 'port',
          type: 'number',
          required: true,
          description: 'Database port',
          placeholder: '5432'
        },
        {
          name: 'database',
          type: 'string',
          required: true,
          description: 'Database name'
        },
        {
          name: 'user',
          type: 'string',
          required: true,
          description: 'Database user'
        },
        {
          name: 'password',
          type: 'password',
          required: true,
          description: 'Database password'
        }
      ]
    },
    'googleSheetsOAuth2': {
      service: 'Google Sheets',
      fields: [
        {
          name: 'clientId',
          type: 'string',
          required: true,
          description: 'Google OAuth Client ID'
        },
        {
          name: 'clientSecret',
          type: 'password',
          required: true,
          description: 'Google OAuth Client Secret'
        },
        {
          name: 'accessToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Access Token'
        },
        {
          name: 'refreshToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Refresh Token'
        }
      ]
    },
    'httpBasicAuth': {
      service: 'HTTP Basic Auth',
      fields: [
        {
          name: 'username',
          type: 'string',
          required: true,
          description: 'Username'
        },
        {
          name: 'password',
          type: 'password',
          required: true,
          description: 'Password'
        }
      ]
    },
    // Additional integrations
    'discordApi': {
      service: 'Discord',
      fields: [
        {
          name: 'botToken',
          type: 'password',
          required: true,
          description: 'Discord Bot Token'
        }
      ]
    },
    'telegramApi': {
      service: 'Telegram',
      fields: [
        {
          name: 'accessToken',
          type: 'password',
          required: true,
          description: 'Telegram Bot Token'
        }
      ]
    },
    'twilioApi': {
      service: 'Twilio',
      fields: [
        {
          name: 'accountSid',
          type: 'string',
          required: true,
          description: 'Twilio Account SID'
        },
        {
          name: 'authToken',
          type: 'password',
          required: true,
          description: 'Twilio Auth Token'
        }
      ]
    },
    'sendGridApi': {
      service: 'SendGrid',
      fields: [
        {
          name: 'apiKey',
          type: 'password',
          required: true,
          description: 'SendGrid API Key'
        }
      ]
    },
    'notionApi': {
      service: 'Notion',
      fields: [
        {
          name: 'apiKey',
          type: 'password',
          required: true,
          description: 'Notion Integration Token'
        }
      ]
    },
    'googleDriveOAuth2': {
      service: 'Google Drive',
      fields: [
        {
          name: 'clientId',
          type: 'string',
          required: true,
          description: 'Google OAuth Client ID'
        },
        {
          name: 'clientSecret',
          type: 'password',
          required: true,
          description: 'Google OAuth Client Secret'
        },
        {
          name: 'accessToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Access Token'
        },
        {
          name: 'refreshToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Refresh Token'
        }
      ]
    },
    'airtableApi': {
      service: 'Airtable',
      fields: [
        {
          name: 'apiKey',
          type: 'password',
          required: true,
          description: 'Airtable API Key'
        }
      ]
    },
    'trelloApi': {
      service: 'Trello',
      fields: [
        {
          name: 'apiKey',
          type: 'password',
          required: true,
          description: 'Trello API Key'
        },
        {
          name: 'apiToken',
          type: 'password',
          required: true,
          description: 'Trello API Token'
        }
      ]
    },
    'mysqlDb': {
      service: 'MySQL',
      fields: [
        {
          name: 'host',
          type: 'string',
          required: true,
          description: 'Database host'
        },
        {
          name: 'port',
          type: 'number',
          required: true,
          description: 'Database port'
        },
        {
          name: 'database',
          type: 'string',
          required: true,
          description: 'Database name'
        },
        {
          name: 'user',
          type: 'string',
          required: true,
          description: 'Database user'
        },
        {
          name: 'password',
          type: 'password',
          required: true,
          description: 'Database password'
        }
      ]
    },
    'mongoDb': {
      service: 'MongoDB',
      fields: [
        {
          name: 'connectionString',
          type: 'password',
          required: true,
          description: 'MongoDB connection string'
        }
      ]
    },
    'mailchimpOAuth2': {
      service: 'Mailchimp',
      fields: [
        {
          name: 'clientId',
          type: 'string',
          required: true,
          description: 'Mailchimp OAuth Client ID'
        },
        {
          name: 'clientSecret',
          type: 'password',
          required: true,
          description: 'Mailchimp OAuth Client Secret'
        },
        {
          name: 'accessToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Access Token'
        }
      ]
    },
    'hubspotOAuth2': {
      service: 'HubSpot',
      fields: [
        {
          name: 'clientId',
          type: 'string',
          required: true,
          description: 'HubSpot OAuth Client ID'
        },
        {
          name: 'clientSecret',
          type: 'password',
          required: true,
          description: 'HubSpot OAuth Client Secret'
        },
        {
          name: 'accessToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Access Token'
        },
        {
          name: 'refreshToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Refresh Token'
        }
      ]
    },
    'twitterOAuth2': {
      service: 'Twitter',
      fields: [
        {
          name: 'clientId',
          type: 'string',
          required: true,
          description: 'Twitter OAuth Client ID'
        },
        {
          name: 'clientSecret',
          type: 'password',
          required: true,
          description: 'Twitter OAuth Client Secret'
        },
        {
          name: 'accessToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Access Token'
        }
      ]
    },
    'githubOAuth2': {
      service: 'GitHub',
      fields: [
        {
          name: 'clientId',
          type: 'string',
          required: true,
          description: 'GitHub OAuth Client ID'
        },
        {
          name: 'clientSecret',
          type: 'password',
          required: true,
          description: 'GitHub OAuth Client Secret'
        },
        {
          name: 'accessToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Access Token'
        }
      ]
    },
    'gitlabOAuth2': {
      service: 'GitLab',
      fields: [
        {
          name: 'clientId',
          type: 'string',
          required: true,
          description: 'GitLab OAuth Client ID'
        },
        {
          name: 'clientSecret',
          type: 'password',
          required: true,
          description: 'GitLab OAuth Client Secret'
        },
        {
          name: 'accessToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Access Token'
        },
        {
          name: 'refreshToken',
          type: 'oauth',
          required: true,
          description: 'OAuth Refresh Token'
        }
      ]
    },
    'pipedriveApi': {
      service: 'Pipedrive',
      fields: [
        {
          name: 'apiToken',
          type: 'password',
          required: true,
          description: 'Pipedrive API Token'
        }
      ]
    },
    'openAiApi': {
      service: 'OpenAI',
      fields: [
        {
          name: 'apiKey',
          type: 'password',
          required: true,
          description: 'OpenAI API Key'
        }
      ]
    }
  };

  constructor(mcpClient: N8nMCPClient) {
    this.mcpClient = mcpClient;
  }

  /**
   * Detect all credential requirements for a workflow
   */
  async detectRequiredCredentials(workflow: N8nWorkflow): Promise<CredentialRequirement[]> {
    const requirements: CredentialRequirement[] = [];
    const seenCredentials = new Set<string>(); // Avoid duplicates

    console.log('[Credential Detector] Analyzing workflow for credential requirements...');

    for (const node of workflow.nodes) {
      try {
        console.log(`[Credential Detector] Analyzing node: ${node.name} (${node.type})`);
        
        // Query MCP for node details including credential requirements
        const nodeDetails = await this.mcpClient.getNodeDetails(node.type);

        console.log(`[Credential Detector] Node details received:`, nodeDetails ? {
          name: nodeDetails.name,
          type: nodeDetails.type,
          hasCredentials: !!nodeDetails.credentials,
          credentialsCount: nodeDetails.credentials?.length || 0,
          credentials: nodeDetails.credentials
        } : 'null');

        // Try to get credentials from MCP first
        let credentialTypes: string[] = [];
        
        if (nodeDetails && nodeDetails.credentials && nodeDetails.credentials.length > 0) {
          console.log(`[Credential Detector] MCP returned ${nodeDetails.credentials.length} credential(s) for ${node.type}`);
          credentialTypes = nodeDetails.credentials;
        } else {
          // Fallback to static mapping since MCP doesn't return credentials
          const mappedCredential = this.nodeTypeToCredentialMap[node.type];
          if (mappedCredential) {
            console.log(`[Credential Detector] Using fallback mapping for ${node.type} → ${mappedCredential}`);
            credentialTypes = [mappedCredential];
          } else {
            console.log(`[Credential Detector] No credentials found or mapped for ${node.type}`);
          }
        }

        // Process credential types
        for (const credentialType of credentialTypes) {
          // Skip if we've already added this credential type
          if (seenCredentials.has(credentialType)) {
            console.log(`[Credential Detector] Skipping duplicate credential: ${credentialType}`);
            continue;
          }

          const credentialInfo = this.credentialFieldMap[credentialType];
          
          if (credentialInfo) {
            requirements.push({
              service: credentialInfo.service,
              n8nCredentialType: credentialType,
              required: true,
              fields: credentialInfo.fields,
              nodeType: node.type
            });

            seenCredentials.add(credentialType);
            console.log(`[Credential Detector] ✅ Found requirement: ${credentialInfo.service} (${credentialType})`);
          } else {
            // Unknown credential type - add with generic fields
            console.warn(`[Credential Detector] ⚠️  Unknown credential type: ${credentialType} for node ${node.type}`);
            requirements.push({
              service: this.extractServiceName(node.type),
              n8nCredentialType: credentialType,
              required: true,
              fields: [
                {
                  name: 'apiKey',
                  type: 'password',
                  required: true,
                  description: 'API Key or Token'
                }
              ],
              nodeType: node.type
            });
            seenCredentials.add(credentialType);
          }
        }
      } catch (error) {
        console.error(`[Credential Detector] Error analyzing node ${node.type}:`, error);
      }
    }

    console.log(`[Credential Detector] Found ${requirements.length} unique credential requirements`);
    return requirements;
  }

  /**
   * Check which credentials a user is missing
   */
  async checkMissingCredentials(
    userId: string,
    requirements: CredentialRequirement[],
    userCredentials: any
  ): Promise<CredentialRequirement[]> {
    const missing: CredentialRequirement[] = [];

    for (const requirement of requirements) {
      const serviceName = requirement.service.toLowerCase().replace(/\s+/g, '');
      
      // Check if user has credentials for this service
      const hasCredential = userCredentials && userCredentials[serviceName];

      if (!hasCredential) {
        missing.push(requirement);
        console.log(`[Credential Detector] User ${userId} missing: ${requirement.service}`);
      }
    }

    return missing;
  }

  /**
   * Extract a friendly service name from a node type
   */
  private extractServiceName(nodeType: string): string {
    // Extract from node type like "n8n-nodes-base.slack" -> "Slack"
    const parts = nodeType.split('.');
    const name = parts[parts.length - 1];
    
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Get credential field definitions for a specific N8N credential type
   */
  getCredentialFields(n8nCredentialType: string): CredentialField[] {
    const info = this.credentialFieldMap[n8nCredentialType];
    return info ? info.fields : [];
  }

  /**
   * Get service name for a credential type
   */
  getServiceName(n8nCredentialType: string): string {
    const info = this.credentialFieldMap[n8nCredentialType];
    return info ? info.service : this.extractServiceName(n8nCredentialType);
  }
}
