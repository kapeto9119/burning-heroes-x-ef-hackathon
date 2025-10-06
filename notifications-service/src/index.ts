import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { EmailService } from './services/email-service';

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize email service
const emailService = new EmailService();

// Health check
app.get('/health', (req: Request, res: Response) => {
  const hasResendKey = !!process.env.RESEND_API_KEY;
  
  res.json({ 
    status: 'ok', 
    service: 'notifications',
    emailConfigured: hasResendKey,
    provider: 'Resend',
    message: hasResendKey 
      ? 'Email notifications enabled' 
      : 'Email notifications disabled - RESEND_API_KEY not set'
  });
});

/**
 * POST /send/execution-failed
 * Send execution failed notification
 */
app.post('/send/execution-failed', async (req: Request, res: Response) => {
  try {
    const { to, data } = req.body;

    if (!to || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, data'
      });
    }

    await emailService.sendExecutionFailed(to, data);

    res.json({
      success: true,
      message: 'Execution failed notification sent'
    });
  } catch (error: any) {
    console.error('[API] Error sending execution failed notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /send/workflow-deployed
 * Send workflow deployed notification
 */
app.post('/send/workflow-deployed', async (req: Request, res: Response) => {
  try {
    const { to, data } = req.body;

    if (!to || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, data'
      });
    }

    await emailService.sendWorkflowDeployed(to, data);

    res.json({
      success: true,
      message: 'Workflow deployed notification sent'
    });
  } catch (error: any) {
    console.error('[API] Error sending workflow deployed notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /send/welcome
 * Send welcome email
 */
app.post('/send/welcome', async (req: Request, res: Response) => {
  try {
    const { to, data } = req.body;

    if (!to || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, data'
      });
    }

    await emailService.sendWelcome(to, data);

    res.json({
      success: true,
      message: 'Welcome email sent'
    });
  } catch (error: any) {
    console.error('[API] Error sending welcome email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /send/test
 * Send test email
 */
app.post('/send/test', async (req: Request, res: Response) => {
  try {
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: to'
      });
    }

    await emailService.sendTest(to);

    res.json({
      success: true,
      message: 'Test email sent'
    });
  } catch (error: any) {
    console.error('[API] Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  const hasResendKey = !!process.env.RESEND_API_KEY;
  
  console.log('');
  console.log('📧 ================================================');
  console.log('📧  Mozart AI Notification Service');
  console.log('📧 ================================================');
  console.log('');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`${hasResendKey ? '✅' : '⚠️ '} Email provider: Resend ${hasResendKey ? '(configured)' : '(NOT CONFIGURED)'}`);
  console.log(`📧 From: ${process.env.FROM_NAME || 'Mozart AI'} <${process.env.FROM_EMAIL || 'not-set'}>`);
  console.log('');
  
  if (!hasResendKey) {
    console.log('⚠️  WARNING: RESEND_API_KEY not set!');
    console.log('⚠️  Email notifications will be disabled.');
    console.log('⚠️  Set RESEND_API_KEY environment variable to enable emails.');
    console.log('');
  }
  
  console.log('📡 Available endpoints:');
  console.log(`   - GET  http://localhost:${PORT}/health`);
  console.log(`   - POST http://localhost:${PORT}/send/execution-failed`);
  console.log(`   - POST http://localhost:${PORT}/send/workflow-deployed`);
  console.log(`   - POST http://localhost:${PORT}/send/welcome`);
  console.log(`   - POST http://localhost:${PORT}/send/test`);
  console.log('');
  console.log(`🎯 ${hasResendKey ? 'Ready to send notifications!' : 'Running in no-email mode'} 📬`);
  console.log('');
});
