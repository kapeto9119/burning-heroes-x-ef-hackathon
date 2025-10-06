export interface WorkflowDeployedData {
  workflowName: string;
  workflowId: string;
  triggerType: 'manual' | 'schedule' | 'webhook';
  scheduleInfo?: string;
  webhookUrl?: string;
  viewUrl: string;
  timestamp: Date;
}

export function workflowDeployedTemplate(data: WorkflowDeployedData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workflow Deployed Successfully</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">🚀</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Workflow Deployed!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.5;">
                Great news! Your workflow <strong>${data.workflowName}</strong> has been successfully deployed and is ready to use.
              </p>
              
              <!-- Trigger Info Box -->
              ${data.triggerType === 'webhook' && data.webhookUrl ? `
              <div style="background-color: #eff6ff; border-left: 4px solid: #3b82f6; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px; color: #1e40af; font-size: 14px; font-weight: 600; text-transform: uppercase;">🔗 Webhook Trigger</h3>
                <p style="margin: 0 0 10px; color: #1e3a8a; font-size: 13px;">
                  Your workflow will run when this URL receives a request:
                </p>
                <div style="background-color: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #bfdbfe;">
                  <code style="color: #1e40af; font-size: 12px; word-break: break-all;">${data.webhookUrl}</code>
                </div>
              </div>
              ` : ''}
              
              ${data.triggerType === 'schedule' && data.scheduleInfo ? `
              <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px; color: #166534; font-size: 14px; font-weight: 600; text-transform: uppercase;">⏰ Scheduled Trigger</h3>
                <p style="margin: 0; color: #14532d; font-size: 14px;">
                  <strong>Schedule:</strong> ${data.scheduleInfo}
                </p>
                <p style="margin: 10px 0 0; color: #166534; font-size: 13px;">
                  Your workflow will run automatically according to this schedule.
                </p>
              </div>
              ` : ''}
              
              ${data.triggerType === 'manual' ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: 600; text-transform: uppercase;">▶️ Manual Trigger</h3>
                <p style="margin: 0; color: #78350f; font-size: 14px;">
                  Click the "Run Now" button in your dashboard to execute this workflow.
                </p>
              </div>
              ` : ''}
              
              <!-- Next Steps -->
              <div style="margin: 30px 0;">
                <h3 style="margin: 0 0 15px; color: #111827; font-size: 16px; font-weight: 600;">📋 Next Steps</h3>
                <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                  <li>Activate your workflow to start running it</li>
                  <li>Monitor executions in your dashboard</li>
                  <li>Set up notification preferences</li>
                  ${data.triggerType === 'manual' ? '<li>Click "Run Now" to test your workflow</li>' : ''}
                </ol>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.viewUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
                  View Workflow
                </a>
              </div>
              
              <!-- Metadata -->
              <table width="100%" cellpadding="8" cellspacing="0" style="margin: 20px 0; border-top: 1px solid #e5e7eb;">
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 8px 0;">Deployed:</td>
                  <td style="color: #111827; font-size: 13px; padding: 8px 0;">${new Date(data.timestamp).toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                Mozart AI • Automated Notification
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function workflowDeployedSubject(data: WorkflowDeployedData): string {
  return `🚀 Workflow Deployed: ${data.workflowName}`;
}
