import { VoiceWorkflowSession } from '../types/vapi';

/**
 * Manages voice workflow sessions in memory
 * In production, this should use Redis or a database
 */
export class VoiceSessionManager {
  private sessions: Map<string, VoiceWorkflowSession> = new Map();

  /**
   * Create a new voice session
   */
  createSession(userId: string, callId?: string): VoiceWorkflowSession {
    const sessionId = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const session: VoiceWorkflowSession = {
      sessionId,
      userId,
      callId,
      conversationContext: {
        services: [],
      },
      status: 'collecting',
      lastUpdated: new Date(),
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);
    
    // Also index by callId if provided
    if (callId) {
      this.sessions.set(`call_${callId}`, session);
    }

    console.log(`[Voice Session] Created session: ${sessionId}`);
    return session;
  }

  /**
   * Get session by ID or call ID
   */
  getSession(sessionIdOrCallId: string): VoiceWorkflowSession | null {
    // Try direct lookup
    let session = this.sessions.get(sessionIdOrCallId);
    
    // Try with call_ prefix
    if (!session && !sessionIdOrCallId.startsWith('call_')) {
      session = this.sessions.get(`call_${sessionIdOrCallId}`);
    }

    return session || null;
  }

  /**
   * Update session
   */
  updateSession(sessionId: string, updates: Partial<VoiceWorkflowSession>): void {
    const session = this.getSession(sessionId);
    if (!session) {
      console.warn(`[Voice Session] Session not found: ${sessionId}`);
      return;
    }

    Object.assign(session, updates, { lastUpdated: new Date() });
    this.sessions.set(session.sessionId, session);
    
    if (session.callId) {
      this.sessions.set(`call_${session.callId}`, session);
    }

    console.log(`[Voice Session] Updated session: ${sessionId} - Status: ${session.status}`);
  }

  /**
   * Update conversation context
   */
  updateContext(sessionId: string, context: Partial<VoiceWorkflowSession['conversationContext']>): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.conversationContext = {
      ...session.conversationContext,
      ...context,
    };
    
    session.lastUpdated = new Date();
    this.sessions.set(session.sessionId, session);
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      this.sessions.delete(session.sessionId);
      if (session.callId) {
        this.sessions.delete(`call_${session.callId}`);
      }
      console.log(`[Voice Session] Deleted session: ${sessionId}`);
    }
  }

  /**
   * Clean up old sessions (older than 1 hour)
   */
  cleanupOldSessions(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let cleaned = 0;

    for (const [key, session] of this.sessions.entries()) {
      if (session.lastUpdated < oneHourAgo) {
        this.sessions.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Voice Session] Cleaned up ${cleaned} old sessions`);
    }
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): VoiceWorkflowSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && !session.sessionId.startsWith('call_'));
  }
}

// Singleton instance
export const voiceSessionManager = new VoiceSessionManager();

// Cleanup old sessions every 15 minutes
setInterval(() => {
  voiceSessionManager.cleanupOldSessions();
}, 15 * 60 * 1000);
