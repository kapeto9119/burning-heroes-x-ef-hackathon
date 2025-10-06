import axios from 'axios';
import { INTEGRATIONS } from '../config/integrations';

/**
 * Credential Validation Service
 * Tests credentials before storing them
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export class CredentialValidator {
  /**
   * Validate credentials for a service
   */
  async validate(service: string, credentialData: any): Promise<ValidationResult> {
    const integration = INTEGRATIONS[service];
    
    if (!integration) {
      return {
        valid: false,
        error: `Unknown service: ${service}`
      };
    }

    try {
      console.log(`[Credential Validator] Validating ${service} credentials...`);

      // Use service-specific validation
      const result = await this.validateByService(service, credentialData);

      if (result.valid) {
        console.log(`[Credential Validator] ✅ ${service} credentials valid`);
      } else {
        console.log(`[Credential Validator] ❌ ${service} credentials invalid:`, result.error);
      }

      return result;
    } catch (error: any) {
      console.error(`[Credential Validator] Error validating ${service}:`, error.message);
      return {
        valid: false,
        error: error.message || 'Validation failed'
      };
    }
  }

  /**
   * Service-specific validation logic
   */
  private async validateByService(service: string, data: any): Promise<ValidationResult> {
    switch (service) {
      case 'slack':
        return this.validateSlack(data);
      
      case 'github':
        return this.validateGitHub(data);
      
      case 'notion':
        return this.validateNotion(data);
      
      case 'telegram':
        return this.validateTelegram(data);
      
      case 'twilio':
        return this.validateTwilio(data);
      
      case 'sendgrid':
        return this.validateSendGrid(data);
      
      case 'airtable':
        return this.validateAirtable(data);
      
      case 'postgres':
        return this.validatePostgres(data);
      
      case 'mysql':
        return this.validateMySQL(data);
      
      case 'mongodb':
        return this.validateMongoDB(data);
      
      default:
        // For services without specific validation, assume valid
        console.log(`[Credential Validator] No validation implemented for ${service}, skipping`);
        return { valid: true };
    }
  }

  /**
   * Slack validation
   */
  private async validateSlack(data: any): Promise<ValidationResult> {
    try {
      const token = data.access_token || data.accessToken || data.token;
      
      const response = await axios.post(
        'https://slack.com/api/auth.test',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.ok) {
        return {
          valid: true,
          metadata: {
            teamName: response.data.team,
            userName: response.data.user
          }
        };
      } else {
        return {
          valid: false,
          error: response.data.error || 'Invalid Slack token'
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.error || 'Failed to validate Slack token'
      };
    }
  }

  /**
   * GitHub validation
   */
  private async validateGitHub(data: any): Promise<ValidationResult> {
    try {
      const token = data.access_token || data.accessToken;
      
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      return {
        valid: true,
        metadata: {
          username: response.data.login,
          name: response.data.name
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.status === 401 ? 'Invalid GitHub token' : 'Failed to validate GitHub token'
      };
    }
  }

  /**
   * Notion validation
   */
  private async validateNotion(data: any): Promise<ValidationResult> {
    try {
      const token = data.access_token || data.accessToken;
      
      const response = await axios.get('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      });

      return {
        valid: true,
        metadata: {
          userId: response.data.id,
          name: response.data.name
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.status === 401 ? 'Invalid Notion token' : 'Failed to validate Notion token'
      };
    }
  }

  /**
   * Telegram validation
   */
  private async validateTelegram(data: any): Promise<ValidationResult> {
    try {
      const token = data.accessToken;
      
      const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);

      if (response.data.ok) {
        return {
          valid: true,
          metadata: {
            botName: response.data.result.username,
            botId: response.data.result.id
          }
        };
      } else {
        return {
          valid: false,
          error: 'Invalid Telegram bot token'
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        error: 'Failed to validate Telegram bot token'
      };
    }
  }

  /**
   * Twilio validation
   */
  private async validateTwilio(data: any): Promise<ValidationResult> {
    try {
      const { accountSid, authToken } = data;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      
      const response = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      return {
        valid: true,
        metadata: {
          accountSid: response.data.sid,
          friendlyName: response.data.friendly_name
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.status === 401 ? 'Invalid Twilio credentials' : 'Failed to validate Twilio credentials'
      };
    }
  }

  /**
   * SendGrid validation
   */
  private async validateSendGrid(data: any): Promise<ValidationResult> {
    try {
      const { apiKey } = data;
      
      const response = await axios.get('https://api.sendgrid.com/v3/scopes', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      return {
        valid: true,
        metadata: {
          scopes: response.data.scopes
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.status === 401 ? 'Invalid SendGrid API key' : 'Failed to validate SendGrid API key'
      };
    }
  }

  /**
   * Airtable validation
   */
  private async validateAirtable(data: any): Promise<ValidationResult> {
    try {
      const { apiKey } = data;
      
      // Airtable doesn't have a dedicated validation endpoint
      // We'll try to list bases (requires at least read access)
      const response = await axios.get('https://api.airtable.com/v0/meta/bases', {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });

      return {
        valid: true,
        metadata: {
          basesCount: response.data.bases?.length || 0
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.status === 401 ? 'Invalid Airtable API key' : 'Failed to validate Airtable API key'
      };
    }
  }

  /**
   * PostgreSQL validation
   */
  private async validatePostgres(data: any): Promise<ValidationResult> {
    try {
      const { Client } = require('pg');
      const client = new Client({
        host: data.host,
        port: data.port || 5432,
        database: data.database,
        user: data.user,
        password: data.password,
        connectionTimeoutMillis: 5000
      });

      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      return {
        valid: true,
        metadata: {
          host: data.host,
          database: data.database
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.code === 'ECONNREFUSED' 
          ? 'Cannot connect to database' 
          : error.message || 'Invalid PostgreSQL credentials'
      };
    }
  }

  /**
   * MySQL validation
   */
  private async validateMySQL(data: any): Promise<ValidationResult> {
    try {
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection({
        host: data.host,
        port: data.port || 3306,
        database: data.database,
        user: data.user,
        password: data.password,
        connectTimeout: 5000
      });

      await connection.query('SELECT 1');
      await connection.end();

      return {
        valid: true,
        metadata: {
          host: data.host,
          database: data.database
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.code === 'ECONNREFUSED' 
          ? 'Cannot connect to database' 
          : error.message || 'Invalid MySQL credentials'
      };
    }
  }

  /**
   * MongoDB validation
   */
  private async validateMongoDB(data: any): Promise<ValidationResult> {
    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(data.connectionString, {
        serverSelectionTimeoutMS: 5000
      });

      await client.connect();
      await client.db().admin().ping();
      await client.close();

      return {
        valid: true,
        metadata: {
          connected: true
        }
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Invalid MongoDB connection string'
      };
    }
  }
}
