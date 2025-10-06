'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-8">
      <h2 className="text-3xl font-bold mb-2 dark:text-white text-gray-900 text-center">Welcome Back</h2>
      <p className="dark:text-white/60 text-gray-600 text-center mb-8">Login to continue building workflows</p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 dark:text-red-400 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2 dark:text-white/90 text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 dark:bg-white/5 bg-gray-100 border dark:border-white/10 border-gray-300 rounded-xl dark:text-white text-gray-900 dark:placeholder-white/40 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2 dark:text-white/90 text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 dark:bg-white/5 bg-gray-100 border dark:border-white/10 border-gray-300 rounded-xl dark:text-white text-gray-900 dark:placeholder-white/40 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="dark:text-white/60 text-gray-600">Don't have an account? </span>
        <button
          onClick={onSwitchToRegister}
          className="dark:text-blue-400 text-blue-600 dark:hover:text-blue-300 hover:text-blue-700 font-semibold transition-colors"
        >
          Sign up
        </button>
      </div>
    </div>
  );
}
