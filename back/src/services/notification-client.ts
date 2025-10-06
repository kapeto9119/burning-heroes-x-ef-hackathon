import axios from 'axios';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';

export interface ExecutionFailedNotification {
  workflowName: string;
  workflowId: string;
  executionId: string;
  errorMessage: string;
  failedNode?: string;
  timestamp: Date;
  viewUrl: string;
}

export interface WorkflowDeployedNotification {
  workflowName: string;
  workflowId: string;
  triggerType: 'manual' | 'schedule' | 'webhook';
  scheduleInfo?: string;
  webhookUrl?: string;
  viewUrl: string;
  timestamp: Date;
}

export interface WelcomeNotification {
  userName: string;
  userEmail: string;
  dashboardUrl: string;
}

export class NotificationClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = NOTIFICATION_SERVICE_URL;
  }

  /**
   * Send execution failed notification
   */
  async sendExecutionFailed(userEmail: string, data: ExecutionFailedNotification): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/send/execution-failed`, {
        to: userEmail,
        data
      });
      console.log(`[Notifications] Execution failed email sent to ${userEmail}`);
    } catch (error: any) {
      console.error('[Notifications] Failed to send execution failed email:', error.message);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send workflow deployed notification
   */
  async sendWorkflowDeployed(userEmail: string, data: WorkflowDeployedNotification): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/send/workflow-deployed`, {
        to: userEmail,
        data
      });
      console.log(`[Notifications] Workflow deployed email sent to ${userEmail}`);
    } catch (error: any) {
      console.error('[Notifications] Failed to send workflow deployed email:', error.message);
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcome(userEmail: string, data: WelcomeNotification): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/send/welcome`, {
        to: userEmail,
        data
      });
      console.log(`[Notifications] Welcome email sent to ${userEmail}`);
    } catch (error: any) {
      console.error('[Notifications] Failed to send welcome email:', error.message);
    }
  }

  /**
   * Send test email
   */
  async sendTest(userEmail: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/send/test`, {
        to: userEmail
      });
      console.log(`[Notifications] Test email sent to ${userEmail}`);
    } catch (error: any) {
      console.error('[Notifications] Failed to send test email:', error.message);
      throw error;
    }
  }
}
