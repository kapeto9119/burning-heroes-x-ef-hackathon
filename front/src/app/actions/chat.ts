'use server';

// Note: All functions now require token parameter for consistency

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function sendChatMessage(message: string, token?: string) {
  try {
    if (!token) {
      return { success: false, error: 'Authentication token required' };
    }

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

export async function generateWorkflow(description: string, token?: string) {
  try {
    if (!token) {
      return { success: false, error: 'Authentication token required' };
    }

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
