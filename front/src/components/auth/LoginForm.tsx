'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      setSuccess(true);
      
      // Show success briefly then redirect
      setTimeout(() => {
        // Check if there's a redirect URL in query params
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        
        if (redirect) {
          window.location.href = redirect;
        } else {
          router.push('/editor');
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-8">
      <h2 className="text-3xl font-bold mb-2 text-foreground text-center">Welcome Back</h2>
      <p className="text-muted-foreground text-center mb-8">Login to continue building workflows</p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl animate-shake">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
          ✓ Login successful! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2 text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2 text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || success}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {success ? '✓ Success!' : isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Don't have an account? </span>
        <button
          onClick={onSwitchToRegister}
          className="text-primary hover:text-primary/80 font-semibold transition-colors"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
