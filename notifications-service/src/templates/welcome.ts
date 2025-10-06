export interface WelcomeData {
  userName: string;
  userEmail: string;
  dashboardUrl: string;
}

export function welcomeTemplate(data: WelcomeData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AI Workflow Builder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">👋</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome to Mozart AI!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${data.userName}</strong>,
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                We're excited to have you on board! 🎉 You're now ready to automate your workflows with the power of AI.
              </p>
              
              <!-- Features -->
              <div style="margin: 30px 0;">
                <h3 style="margin: 0 0 20px; color: #111827; font-size: 18px; font-weight: 600;">🚀 What you can do:</h3>
                
                <div style="margin-bottom: 15px;">
                  <div style="display: inline-block; width: 40px; height: 40px; background-color: #eff6ff; border-radius: 8px; text-align: center; line-height: 40px; font-size: 20px; vertical-align: middle;">🤖</div>
                  <div style="display: inline-block; vertical-align: middle; margin-left: 15px; width: calc(100% - 60px);">
                    <strong style="color: #111827; font-size: 15px;">AI-Powered Workflow Generation</strong>
                    <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Describe your automation in plain English, and AI builds it for you</p>
                  </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <div style="display: inline-block; width: 40px; height: 40px; background-color: #f0fdf4; border-radius: 8px; text-align: center; line-height: 40px; font-size: 20px; vertical-align: middle;">⚡</div>
                  <div style="display: inline-block; vertical-align: middle; margin-left: 15px; width: calc(100% - 60px);">
                    <strong style="color: #111827; font-size: 15px;">400+ Integrations</strong>
                    <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Connect to Slack, Gmail, HubSpot, Salesforce, and more</p>
                  </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                  <div style="display: inline-block; width: 40px; height: 40px; background-color: #fef3c7; border-radius: 8px; text-align: center; line-height: 40px; font-size: 20px; vertical-align: middle;">📊</div>
                  <div style="display: inline-block; vertical-align: middle; margin-left: 15px; width: calc(100% - 60px);">
                    <strong style="color: #111827; font-size: 15px;">Real-Time Monitoring</strong>
                    <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">Track executions, view analytics, and get instant notifications</p>
                  </div>
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Create Your First Workflow
                </a>
              </div>
              
              <!-- Quick Start -->
              <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin-top: 30px;">
                <h4 style="margin: 0 0 15px; color: #374151; font-size: 15px; font-weight: 600;">💡 Quick Start Guide</h4>
                <ol style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.8;">
                  <li>Click "Create Workflow" in your dashboard</li>
                  <li>Describe what you want to automate (e.g., "Send Slack message when I get a new lead")</li>
                  <li>Review the AI-generated workflow</li>
                  <li>Connect your accounts and deploy!</li>
                </ol>
              </div>
              
              <!-- Help -->
              <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6; text-align: center;">
                Need help? Reply to this email or check out our <a href="${data.dashboardUrl}/docs" style="color: #8b5cf6; text-decoration: none;">documentation</a>.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                Mozart AI
              </p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
                You're receiving this because you just signed up. Welcome aboard!
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

export function welcomeSubject(data: WelcomeData): string {
  return `👋 Welcome to Mozart AI, ${data.userName}!`;
}
