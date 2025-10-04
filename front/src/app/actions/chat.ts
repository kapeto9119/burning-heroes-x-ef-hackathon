'use server';

import { cookies } from 'next/headers';
import { ensureAuth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function sendChatMessage(message: string) {
  try {
    // Auto-authenticate for demo
    const token = await ensureAuth();

    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateWorkflow(description: string) {
  try {
    // Auto-authenticate for demo
    const token = await ensureAuth();

    const response = await fetch(`${API_URL}/api/chat/generate-workflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ description }),
    });

    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
