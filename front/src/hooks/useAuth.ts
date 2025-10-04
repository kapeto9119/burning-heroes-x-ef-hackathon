'use client';

import { useState, useTransition } from 'react';
import { register, login, logout, getMe, addCredentials, getCredentials, type User } from '@/app/actions/auth';

export function useAuth() {
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<User | null>(null);

  const handleRegister = async (email: string, password: string, name: string) => {
    let result;
    startTransition(async () => {
      result = await register(email, password, name);
      if (result.success && result.user) {
        setUser(result.user);
      }
    });
    return result;
  };

  const handleLogin = async (email: string, password: string) => {
    let result;
    startTransition(async () => {
      result = await login(email, password);
      if (result.success && result.user) {
        setUser(result.user);
      }
    });
    return result;
  };

  const handleLogout = async () => {
    startTransition(async () => {
      await logout();
      setUser(null);
    });
  };

  const fetchUser = async () => {
    const result = await getMe();
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const handleAddCredentials = async (service: string, credentials: Record<string, any>) => {
    return await addCredentials(service, credentials);
  };

  const handleGetCredentials = async (service: string) => {
    return await getCredentials(service);
  };

  return {
    user,
    isPending,
    register: handleRegister,
    login: handleLogin,
    logout: handleLogout,
    fetchUser,
    addCredentials: handleAddCredentials,
    getCredentials: handleGetCredentials,
  };
}
