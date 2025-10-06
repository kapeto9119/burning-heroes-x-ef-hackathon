'use client';

import { ExternalLink, CheckCircle, Copy, Check, Info } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface TutorialStep {
  title: string;
  description: string;
  image?: string;
  code?: string;
  link?: string;
}

interface ServiceTutorial {
  service: string;
  description: string;
  videoUrl?: string;
  steps: TutorialStep[];
  tips?: string[];
}

export const serviceTutorials: Record<string, ServiceTutorial> = {
  'Slack': {
    service: 'Slack',
    description: 'Create a Slack Bot to send messages to your workspace',
    videoUrl: 'https://www.youtube.com/watch?v=example',
    steps: [
      {
        title: 'Go to Slack API Dashboard',
        description: 'Visit the Slack API website and sign in with your Slack account',
        link: 'https://api.slack.com/apps'
      },
      {
        title: 'Create New App',
        description: 'Click "Create New App" → Choose "From scratch" → Give it a name (e.g., "Workflow Bot") and select your workspace'
      },
      {
        title: 'Add Bot Permissions',
        description: 'Go to "OAuth & Permissions" in the sidebar → Scroll to "Scopes" section → Click "Add an OAuth Scope" → Add these Bot Token Scopes:',
        code: 'Required scopes:\nchat:write - Send messages\nchat:write.public - Send to public channels\nchannels:read - View channel info\n\nOptional (for advanced features):\nfiles:write - Upload files\nusers:read - Get user info\nchannels:history - Read messages'
      },
      {
        title: 'Install to Workspace',
        description: 'Scroll to the top of the page → Click "Install to Workspace" → Review permissions → Click "Allow" to authorize the app'
      },
      {
        title: 'Copy Bot Token',
        description: 'After installation, you\'ll see the "Bot User OAuth Token" → Click "Copy" button',
        code: 'Format: xoxb-[numbers]-[numbers]-[random-string]\nExample: xoxb-1234567890-9876543210123-REPLACE_WITH_YOUR_TOKEN'
      },
      {
        title: 'Invite Bot to Channel (Important!)',
        description: 'In Slack, go to the channel where you want to send messages → Type: @YourBotName → Click "Invite to Channel"'
      }
    ],
    tips: [
      'The token starts with "xoxb-" for bot tokens (not "xoxp-" which is user tokens)',
      'Keep your token secret - never commit it to GitHub or share publicly',
      'You must invite the bot to channels before it can post there',
      'Test your bot by sending a message to a test channel first',
      'You can regenerate the token if it gets compromised (Settings → Rotate Token)'
    ]
  },
  'Gmail': {
    service: 'Gmail',
    description: 'Connect your Gmail account to send and receive emails',
    steps: [
      {
        title: 'Check 2-Factor Authentication',
        description: 'Go to Google Account Security settings → Verify that 2-Step Verification is ON (required for App Passwords)',
        link: 'https://myaccount.google.com/security'
      },
      {
        title: 'Navigate to App Passwords',
        description: 'In Security settings → Scroll down to "How you sign in to Google" → Click "App passwords" (if you don\'t see it, enable 2FA first)',
        link: 'https://myaccount.google.com/apppasswords'
      },
      {
        title: 'Generate App Password',
        description: 'Select app: "Mail" → Select device: "Other (Custom name)" → Type "n8n Workflow" → Click "Generate"'
      },
      {
        title: 'Copy the Password',
        description: 'Google will show a 16-character password in a yellow box. Copy it immediately (you won\'t see it again)',
        code: 'Example: abcd efgh ijkl mnop\n(Spaces don\'t matter when pasting)'
      },
      {
        title: 'Use in Workflow',
        description: 'Paste this password in the credential form. Your email address is your Gmail address (e.g., yourname@gmail.com)'
      },
      {
        title: 'Advanced: Full OAuth2 Setup',
        description: 'For production apps with many users, set up OAuth2 in Google Cloud Console',
        link: 'https://console.cloud.google.com/apis/credentials'
      }
    ],
    tips: [
      'App passwords are 16 characters without spaces (spaces are just for readability)',
      'Each app password is unique and can be revoked independently from myaccount.google.com',
      'If you change your Google password, app passwords remain valid',
      'For production with multiple users, implement full OAuth2 flow',
      'App passwords work with IMAP/SMTP for both sending and receiving emails'
    ]
  },
  'Email (SMTP)': {
    service: 'Email (SMTP)',
    description: 'Send emails using SMTP (works with Gmail, Outlook, Yahoo, and more)',
    steps: [
      {
        title: 'Gmail SMTP Configuration',
        description: 'For Gmail accounts, use these exact settings:',
        code: 'SMTP Host: smtp.gmail.com\nPort: 587 (TLS) or 465 (SSL)\nSecurity: TLS/STARTTLS\nUsername: your-email@gmail.com\nPassword: App Password (not your Gmail password)'
      },
      {
        title: 'Get Gmail App Password',
        description: 'Follow the Gmail tutorial above to generate an App Password. Never use your actual Gmail password!',
        link: 'https://myaccount.google.com/apppasswords'
      },
      {
        title: 'Outlook/Hotmail SMTP Configuration',
        description: 'For Microsoft accounts (Outlook, Hotmail, Live):',
        code: 'SMTP Host: smtp-mail.outlook.com\nPort: 587\nSecurity: TLS/STARTTLS\nUsername: your-email@outlook.com\nPassword: Your Outlook password'
      },
      {
        title: 'Yahoo Mail SMTP Configuration',
        description: 'For Yahoo Mail accounts:',
        code: 'SMTP Host: smtp.mail.yahoo.com\nPort: 587 or 465\nSecurity: TLS/SSL\nUsername: your-email@yahoo.com\nPassword: App Password (generate at account.yahoo.com)'
      },
      {
        title: 'Custom Domain / Other Providers',
        description: 'Check your email provider\'s documentation. Common providers: Zoho, ProtonMail, FastMail, etc.'
      },
      {
        title: 'Test Your Connection',
        description: 'After entering credentials, send a test email to yourself to verify it works'
      }
    ],
    tips: [
      'Port 587 with TLS is the modern standard (recommended)',
      'Port 465 with SSL is older but still widely supported',
      'Port 25 is usually blocked by ISPs for security reasons',
      'Always use App Passwords for Gmail (not your main password)',
      'Some providers limit daily email sending (Gmail: 500/day for free accounts)',
      'If emails go to spam, set up SPF/DKIM records for your domain'
    ]
  },
  'PostgreSQL': {
    service: 'PostgreSQL',
    description: 'Connect to your PostgreSQL database for data operations',
    steps: [
      {
        title: 'Gather Database Information',
        description: 'You\'ll need 5 pieces of information: Host, Port, Database Name, Username, and Password'
      },
      {
        title: 'Local PostgreSQL Setup',
        description: 'If running PostgreSQL on your computer:',
        code: 'Host: localhost (or 127.0.0.1)\nPort: 5432 (default)\nDatabase: myapp_db\nUser: postgres (or your username)\nPassword: (set during installation)'
      },
      {
        title: 'Find Your Local Credentials',
        description: 'Open terminal/command prompt and run: psql -U postgres -l (this lists databases). If you forgot password, you may need to reset it.'
      },
      {
        title: 'Heroku Postgres',
        description: 'In Heroku Dashboard → Your App → Resources → Heroku Postgres → Settings → View Credentials',
        code: 'Copy the connection details:\nHost: ec2-xxx.compute.amazonaws.com\nPort: 5432\nDatabase: d...\nUser: u...\nPassword: (long string)'
      },
      {
        title: 'AWS RDS',
        description: 'In AWS Console → RDS → Databases → Click your database → Connectivity & Security',
        code: 'Endpoint: your-db.xxxxx.region.rds.amazonaws.com\nPort: 5432\nDatabase: (you created this)\nUser: (master username)\nPassword: (you set this)'
      },
      {
        title: 'Supabase',
        description: 'In Supabase Dashboard → Project Settings → Database → Connection String',
        link: 'https://app.supabase.com'
      },
      {
        title: 'Enable Remote Connections',
        description: 'For local databases: Edit postgresql.conf (listen_addresses = \'*\') and pg_hba.conf (add host entry)'
      },
      {
        title: 'Test Connection',
        description: 'Use a tool like pgAdmin or DBeaver to test the connection before using in n8n'
      }
    ],
    tips: [
      'Default port is 5432 (don\'t change unless you know why)',
      'For cloud databases, check firewall rules to allow n8n\'s IP',
      'Create a dedicated user with limited permissions: CREATE USER n8n_user WITH PASSWORD \'secure_password\';',
      'Grant only necessary permissions: GRANT SELECT, INSERT, UPDATE ON table_name TO n8n_user;',
      'Enable SSL for production: Add ?sslmode=require to connection string',
      'Never use the master/admin user for applications'
    ]
  },
  'Google Sheets': {
    service: 'Google Sheets',
    description: 'Read and write data to Google Sheets spreadsheets',
    steps: [
      {
        title: 'Create Google Cloud Project',
        description: 'Go to Google Cloud Console → Click "Select a project" → "New Project" → Give it a name (e.g., "n8n Workflows")',
        link: 'https://console.cloud.google.com/'
      },
      {
        title: 'Enable Google Sheets API',
        description: 'In your project → "APIs & Services" → "Library" → Search "Google Sheets API" → Click it → Click "Enable"',
        link: 'https://console.cloud.google.com/apis/library/sheets.googleapis.com'
      },
      {
        title: 'Enable Google Drive API (Important!)',
        description: 'Also enable Google Drive API (needed to access sheets): Library → Search "Google Drive API" → Enable',
        link: 'https://console.cloud.google.com/apis/library/drive.googleapis.com'
      },
      {
        title: 'Configure OAuth Consent Screen',
        description: 'Go to "OAuth consent screen" → Choose "External" → Fill in: App name, User support email, Developer email → Save',
        link: 'https://console.cloud.google.com/apis/credentials/consent'
      },
      {
        title: 'Add Scopes',
        description: 'In OAuth consent screen → "Add or Remove Scopes" → Add these:',
        code: '../auth/spreadsheets (Google Sheets)\n../auth/drive.file (Google Drive)'
      },
      {
        title: 'Add Test Users',
        description: 'In OAuth consent screen → "Test users" → "Add Users" → Add your Gmail address (required for testing)'
      },
      {
        title: 'Create OAuth Credentials',
        description: 'Go to "Credentials" → "Create Credentials" → "OAuth client ID" → Application type: "Web application" → Name it "n8n"',
        link: 'https://console.cloud.google.com/apis/credentials'
      },
      {
        title: 'Add Authorized Redirect URI',
        description: 'In OAuth client → "Authorized redirect URIs" → Add your n8n callback URL:',
        code: 'http://localhost:5678/rest/oauth2-credential/callback\n(or your n8n domain)'
      },
      {
        title: 'Copy Credentials',
        description: 'Copy the Client ID and Client Secret → You\'ll need these for n8n'
      },
      {
        title: 'Complete OAuth Flow',
        description: 'In n8n, after entering Client ID/Secret, click "Connect" → Sign in with Google → Grant permissions'
      }
    ],
    tips: [
      'You need BOTH Google Sheets API and Google Drive API enabled',
      'Add yourself as a test user or the OAuth won\'t work',
      'The redirect URI must exactly match your n8n instance URL',
      'For production, submit app for Google verification (takes 1-2 weeks)',
      'Alternatively, use a Service Account for server-to-server access (no OAuth needed)',
      'Service Account is better for automated workflows without user interaction'
    ]
  },
  'HTTP Basic Auth': {
    service: 'HTTP Basic Auth',
    description: 'Authenticate with APIs using username and password',
    steps: [
      {
        title: 'Check API Documentation',
        description: 'Look for "Authentication" or "API Credentials" section in your API\'s documentation'
      },
      {
        title: 'Common Pattern 1: API Key as Username',
        description: 'Many APIs use this format:',
        code: 'Username: your_api_key_here\nPassword: (leave empty or use "x")'
      },
      {
        title: 'Common Pattern 2: Email + API Key',
        description: 'Some services use:',
        code: 'Username: your-email@example.com\nPassword: your_api_key'
      },
      {
        title: 'Common Pattern 3: Account ID + Secret',
        description: 'Others use account identifiers:',
        code: 'Username: account_id or client_id\nPassword: api_secret or client_secret'
      },
      {
        title: 'Find Your Credentials',
        description: 'Usually found in: Account Settings → API Keys / Developers / Integrations'
      }
    ],
    tips: [
      'Basic Auth sends credentials in every request (base64 encoded)',
      'Always use HTTPS (not HTTP) to protect credentials',
      'Some APIs use "Bearer" tokens instead (different auth type)',
      'Test with curl first: curl -u username:password https://api.example.com',
      'If unsure, check API docs or contact their support'
    ]
  },
  'Airtable': {
    service: 'Airtable',
    description: 'Connect to Airtable bases to read and write records',
    steps: [
      {
        title: 'Go to Airtable Account',
        description: 'Sign in to Airtable and click your profile icon → Account',
        link: 'https://airtable.com/account'
      },
      {
        title: 'Generate Personal Access Token',
        description: 'Scroll to "API" section → Click "Generate token" → Give it a name → Select scopes',
        code: 'Required scopes:\ndata.records:read\ndata.records:write\nschema.bases:read'
      },
      {
        title: 'Select Bases',
        description: 'Choose which bases this token can access → Click "Create token"'
      },
      {
        title: 'Copy Token',
        description: 'Copy the token immediately (you won\'t see it again!)',
        code: 'Format: patXXXXXXXXXXXXXX.YYYYYYYYYYYYYYYY'
      },
      {
        title: 'Get Base ID',
        description: 'Open your base → Help → API documentation → Copy the Base ID',
        code: 'Format: appXXXXXXXXXXXXXX'
      }
    ],
    tips: [
      'Personal Access Tokens are more secure than the old API key method',
      'You can create multiple tokens with different permissions',
      'Tokens can be revoked anytime from your account settings',
      'Base ID starts with "app" and Table ID starts with "tbl"'
    ]
  },
  'Discord': {
    service: 'Discord',
    description: 'Send messages and interact with Discord servers',
    steps: [
      {
        title: 'Go to Discord Developer Portal',
        description: 'Visit the Discord Developer Portal and sign in',
        link: 'https://discord.com/developers/applications'
      },
      {
        title: 'Create New Application',
        description: 'Click "New Application" → Give it a name (e.g., "Workflow Bot") → Create'
      },
      {
        title: 'Create Bot',
        description: 'Go to "Bot" tab in sidebar → Click "Add Bot" → Confirm'
      },
      {
        title: 'Get Bot Token',
        description: 'Under "Token" section → Click "Reset Token" → Copy the token',
        code: 'Format: YOUR_BOT_TOKEN_HERE\nExample: MTxxxxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxx'
      },
      {
        title: 'Enable Intents (if needed)',
        description: 'Scroll down → Enable "Message Content Intent" if you need to read messages'
      },
      {
        title: 'Invite Bot to Server',
        description: 'Go to "OAuth2" → "URL Generator" → Select scopes: "bot" → Select permissions → Copy URL → Open in browser → Select server',
        code: 'Permissions needed:\nSend Messages\nRead Message History\nEmbed Links'
      }
    ],
    tips: [
      'Keep your bot token secret - it\'s like a password',
      'You need "Manage Server" permission to add bots',
      'Test in a private server first before using in production',
      'Bot tokens start with "MTk" or similar base64 characters'
    ]
  },
  'Notion': {
    service: 'Notion',
    description: 'Read and write data to Notion databases and pages',
    steps: [
      {
        title: 'Go to Notion Integrations',
        description: 'Visit Notion integrations page and sign in',
        link: 'https://www.notion.so/my-integrations'
      },
      {
        title: 'Create New Integration',
        description: 'Click "+ New integration" → Give it a name → Select workspace → Submit'
      },
      {
        title: 'Copy Internal Integration Token',
        description: 'After creation, copy the "Internal Integration Token"',
        code: 'Format: secret_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      },
      {
        title: 'Share Database with Integration',
        description: 'Open your Notion database → Click "..." (top right) → "Add connections" → Select your integration'
      },
      {
        title: 'Get Database ID',
        description: 'Copy the database URL → The ID is the part between the last slash and the question mark',
        code: 'URL: notion.so/workspace/DatabaseName-abc123def456?v=...\nDatabase ID: abc123def456'
      }
    ],
    tips: [
      'You must share each database/page with the integration',
      'Integration tokens start with "secret_"',
      'Database ID is 32 characters (letters and numbers)',
      'You can\'t access databases you haven\'t explicitly shared'
    ]
  },
  'Twilio': {
    service: 'Twilio',
    description: 'Send SMS messages and make phone calls',
    steps: [
      {
        title: 'Sign Up for Twilio',
        description: 'Create a Twilio account (free trial available)',
        link: 'https://www.twilio.com/try-twilio'
      },
      {
        title: 'Get Account SID',
        description: 'In Twilio Console → Dashboard → Copy "Account SID"',
        code: 'Format: ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      },
      {
        title: 'Get Auth Token',
        description: 'Below Account SID → Click "View" to reveal Auth Token → Copy it',
        code: 'Format: 32-character string'
      },
      {
        title: 'Get Phone Number',
        description: 'Go to Phone Numbers → Manage → Active numbers → Copy your Twilio number',
        code: 'Format: +1234567890'
      },
      {
        title: 'Verify Recipient Numbers (Trial)',
        description: 'For trial accounts: Phone Numbers → Manage → Verified Caller IDs → Add numbers you want to text'
      }
    ],
    tips: [
      'Trial accounts can only send to verified numbers',
      'Upgrade to send to any number (pay-as-you-go)',
      'SMS costs vary by country (~$0.0075 per message in US)',
      'Keep Auth Token secret - it\'s like your password'
    ]
  }
};

interface CredentialTutorialProps {
  service: string;
  onClose?: () => void;
}

export function CredentialTutorial({ service, onClose }: CredentialTutorialProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const tutorial = serviceTutorials[service];

  // Generic fallback tutorial for services without specific guides
  if (!tutorial) {
    return (
      <div className="space-y-4">
        <div className="pb-4 border-b border-border">
          <h3 className="font-semibold text-lg mb-1">How to get {service} credentials</h3>
          <p className="text-sm text-muted-foreground">General guide for API authentication</p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-medium">Visit the Service's Developer Portal</h4>
              <p className="text-sm text-muted-foreground">
                Look for "API", "Developers", "Integrations", or "Settings" in the service's website menu.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-medium">Create API Credentials</h4>
              <p className="text-sm text-muted-foreground">
                Look for options like "Create API Key", "Generate Token", or "New Integration".
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-medium">Copy Your Credentials</h4>
              <p className="text-sm text-muted-foreground">
                Save the API key, token, or credentials shown. You usually won't be able to see them again!
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              4
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="font-medium">Enter in the Form Below</h4>
              <p className="text-sm text-muted-foreground">
                Paste your credentials in the credential form and test the connection.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            General Tips
          </h4>
          <ul className="space-y-1">
            <li className="text-sm text-muted-foreground flex gap-2">
              <span className="text-primary">•</span>
              <span>Check the service's official API documentation for detailed setup instructions</span>
            </li>
            <li className="text-sm text-muted-foreground flex gap-2">
              <span className="text-primary">•</span>
              <span>Keep your API keys secret - never share them publicly or commit to version control</span>
            </li>
            <li className="text-sm text-muted-foreground flex gap-2">
              <span className="text-primary">•</span>
              <span>Some services require you to enable API access in settings before creating keys</span>
            </li>
            <li className="text-sm text-muted-foreground flex gap-2">
              <span className="text-primary">•</span>
              <span>You can usually regenerate or revoke API keys if they get compromised</span>
            </li>
          </ul>
        </div>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-2 text-sm">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-blue-500 font-medium mb-1">Need more help?</p>
              <p className="text-blue-400">
                Search for "{service} API documentation" or "{service} API key" in your favorite search engine for service-specific instructions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <h3 className="font-semibold text-lg mb-1">How to get {service} credentials</h3>
        <p className="text-sm text-muted-foreground">{tutorial.description}</p>
      </div>

      {/* Video Tutorial (if available) */}
      {tutorial.videoUrl && (
        <div className="mb-4">
          <div className="aspect-video rounded-lg overflow-hidden border border-border bg-muted/30">
            <iframe
              width="100%"
              height="100%"
              src={tutorial.videoUrl}
              title={`${service} Setup Tutorial`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {tutorial.steps.map((step, index) => (
          <div key={index} className="flex gap-3">
            {/* Step Number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>

            {/* Step Content */}
            <div className="flex-1 space-y-2">
              <h4 className="font-medium">{step.title}</h4>
              <p className="text-sm text-muted-foreground">{step.description}</p>

              {/* Code Block */}
              {step.code && (
                <div className="relative">
                  <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs overflow-x-auto">
                    <code>{step.code}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(step.code!, index)}
                    className="absolute top-2 right-2 p-1.5 rounded bg-background border border-border hover:bg-accent transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === index ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              )}

              {/* External Link */}
              {step.link && (
                <a
                  href={step.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Open in new tab
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      {tutorial.tips && tutorial.tips.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Pro Tips
          </h4>
          <ul className="space-y-1">
            {tutorial.tips.map((tip, index) => (
              <li key={index} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-primary">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
