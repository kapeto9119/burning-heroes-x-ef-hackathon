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

  // Map N8N credential types to user-friendly service names and field definitions
  private credentialFieldMap: Record<string, { service: string; fields: CredentialField[] }> = {
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
        // Query MCP for node details including credential requirements
        const nodeDetails = await this.mcpClient.getNodeDetails(node.type);

        if (nodeDetails && nodeDetails.credentials && nodeDetails.credentials.length > 0) {
          for (const credentialType of nodeDetails.credentials) {
            // Skip if we've already added this credential type
            if (seenCredentials.has(credentialType)) {
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
              console.log(`[Credential Detector] Found requirement: ${credentialInfo.service} (${credentialType})`);
            } else {
              // Unknown credential type - add with generic fields
              console.warn(`[Credential Detector] Unknown credential type: ${credentialType}`);
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
