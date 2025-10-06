import { Resend } from 'resend';
import { executionFailedTemplate, executionFailedSubject, ExecutionFailedData } from '../templates/execution-failed';
import { workflowDeployedTemplate, workflowDeployedSubject, WorkflowDeployedData } from '../templates/workflow-deployed';
import { welcomeTemplate, welcomeSubject, WelcomeData } from '../templates/welcome';

export class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private fromName: string;
  private isConfigured: boolean = false;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not configured - email notifications will be disabled');
      this.isConfigured = false;
    } else {
      this.resend = new Resend(apiKey);
      this.isConfigured = true;
      console.log('✅ Resend configured successfully');
    }

    this.fromEmail = process.env.FROM_EMAIL || 'notifications@yourdomain.com';
    this.fromName = process.env.FROM_NAME || 'Mozart AI';
  }

  /**
   * Check if email service is configured
   */
  private checkConfigured(): boolean {
    if (!this.isConfigured || !this.resend) {
      console.warn('[Email] Skipping email - Resend not configured');
      return false;
    }
    return true;
  }

  /**
   * Send execution failed notification
   */
  async sendExecutionFailed(to: string, data: ExecutionFailedData): Promise<void> {
    if (!this.checkConfigured()) return;

    try {
      await this.resend!.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: executionFailedSubject(data),
        html: executionFailedTemplate(data)
      });

      console.log(`[Email] Execution failed notification sent to ${to}`);
    } catch (error) {
      console.error('[Email] Failed to send execution failed notification:', error);
      throw error;
    }
  }

  /**
   * Send workflow deployed notification
   */
  async sendWorkflowDeployed(to: string, data: WorkflowDeployedData): Promise<void> {
    if (!this.checkConfigured()) return;

    try {
      await this.resend!.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: workflowDeployedSubject(data),
        html: workflowDeployedTemplate(data)
      });

      console.log(`[Email] Workflow deployed notification sent to ${to}`);
    } catch (error) {
      console.error('[Email] Failed to send workflow deployed notification:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcome(to: string, data: WelcomeData): Promise<void> {
    if (!this.checkConfigured()) return;

    try {
      await this.resend!.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: welcomeSubject(data),
        html: welcomeTemplate(data)
      });

      console.log(`[Email] Welcome email sent to ${to}`);
    } catch (error) {
      console.error('[Email] Failed to send welcome email:', error);
      throw error;
    }
  }

  /**
   * Send test email
   */
  async sendTest(to: string): Promise<void> {
    if (!this.checkConfigured()) {
      throw new Error('Resend API key not configured. Please set RESEND_API_KEY environment variable.');
    }

    try {
      await this.resend!.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject: 'Test Email from Mozart AI',
        html: '<h1>Test Email</h1><p>If you received this, your email service is working correctly!</p>'
      });

      console.log(`[Email] Test email sent to ${to}`);
    } catch (error) {
      console.error('[Email] Failed to send test email:', error);
      throw error;
    }
  }
}
