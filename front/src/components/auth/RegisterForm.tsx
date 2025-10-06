'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-8">
      <h2 className="text-3xl font-bold mb-2 text-white dark:text-white text-gray-900 text-center">Create Account</h2>
      <p className="text-white/60 dark:text-white/60 text-gray-600 text-center mb-8">Start building powerful workflows</p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 dark:text-red-400 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2 text-white/90 dark:text-white/90 text-gray-700">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 bg-gray-100 border border-white/10 dark:border-white/10 border-gray-300 rounded-xl text-white dark:text-white text-gray-900 placeholder-white/40 dark:placeholder-white/40 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2 text-white/90 dark:text-white/90 text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 bg-gray-100 border border-white/10 dark:border-white/10 border-gray-300 rounded-xl text-white dark:text-white text-gray-900 placeholder-white/40 dark:placeholder-white/40 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2 text-white/90 dark:text-white/90 text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 bg-gray-100 border border-white/10 dark:border-white/10 border-gray-300 rounded-xl text-white dark:text-white text-gray-900 placeholder-white/40 dark:placeholder-white/40 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-white/90 dark:text-white/90 text-gray-700">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 bg-gray-100 border border-white/10 dark:border-white/10 border-gray-300 rounded-xl text-white dark:text-white text-gray-900 placeholder-white/40 dark:placeholder-white/40 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-white/60 dark:text-white/60 text-gray-600">Already have an account? </span>
        <button
          onClick={onSwitchToLogin}
          className="text-blue-400 dark:text-blue-400 text-blue-600 hover:text-blue-300 dark:hover:text-blue-300 hover:text-blue-700 font-semibold transition-colors"
        >
          Login
        </button>
      </div>
    </div>
  );
}
