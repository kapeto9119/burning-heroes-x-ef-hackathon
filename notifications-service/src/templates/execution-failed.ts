export interface ExecutionFailedData {
  workflowName: string;
  workflowId: string;
  executionId: string;
  errorMessage: string;
  failedNode?: string;
  timestamp: Date;
  viewUrl: string;
}

export function executionFailedTemplate(data: ExecutionFailedData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workflow Execution Failed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Workflow Execution Failed</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.5;">
                Your workflow <strong>${data.workflowName}</strong> encountered an error and failed to complete.
              </p>
              
              <!-- Error Details Box -->
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h3 style="margin: 0 0 10px; color: #991b1b; font-size: 14px; font-weight: 600; text-transform: uppercase;">Error Details</h3>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px; font-family: 'Courier New', monospace; word-break: break-word;">
                  ${data.errorMessage}
                </p>
                ${data.failedNode ? `
                <p style="margin: 10px 0 0; color: #991b1b; font-size: 13px;">
                  <strong>Failed Node:</strong> ${data.failedNode}
                </p>
                ` : ''}
              </div>
              
              <!-- Metadata -->
              <table width="100%" cellpadding="8" cellspacing="0" style="margin: 20px 0; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 8px 0;">Execution ID:</td>
                  <td style="color: #111827; font-size: 13px; font-family: 'Courier New', monospace; padding: 8px 0;">${data.executionId}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 13px; padding: 8px 0;">Timestamp:</td>
                  <td style="color: #111827; font-size: 13px; padding: 8px 0;">${new Date(data.timestamp).toLocaleString()}</td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.viewUrl}" style="display: inline-block; background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
                  View Execution Details
                </a>
              </div>
              
              <!-- Help Text -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-top: 30px;">
                <h4 style="margin: 0 0 10px; color: #374151; font-size: 14px; font-weight: 600;">💡 Troubleshooting Tips</h4>
                <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 13px; line-height: 1.6;">
                  <li>Check if your credentials are still valid</li>
                  <li>Verify the workflow configuration</li>
                  <li>Review the error message for specific details</li>
                  <li>Check the execution logs for more information</li>
                </ul>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                Mozart AI • Automated Notification
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
                You received this email because a workflow execution failed.
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

export function executionFailedSubject(data: ExecutionFailedData): string {
  return `❌ Workflow Failed: ${data.workflowName}`;
}
