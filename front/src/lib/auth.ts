/**
 * Centralized Authentication Utility
 * 
 * Provides consistent token management across client and server
 */

const TOKEN_KEY = 'auth_token'; // Single source of truth for token key

/**
 * Get auth token from localStorage (client-side only)
 */
export function getClientToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set auth token in localStorage (client-side only)
 */
export function setClientToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Remove auth token from localStorage (client-side only)
 */
export function removeClientToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated (client-side only)
 */
export function isAuthenticated(): boolean {
  return !!getClientToken();
}

/**
 * Throw error if not authenticated
 */
export function requireAuth(): string {
  const token = getClientToken();
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }
  return token;
}
