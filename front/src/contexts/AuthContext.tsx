"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setToken(storedToken);
      // Fetch user data
      fetchUser(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
      } else if (response.status === 401) {
        // Token is invalid/expired, clear it
        localStorage.removeItem("auth_token");
        setToken(null);
      } else {
        // For non-auth errors (e.g., network/CORS/misconfig), keep token and just log
        console.warn("Failed to fetch user (non-auth error):", response.status);
      }
    } catch (error) {
      // Network or other unexpected error; don't clear token so we don't log the user out on refresh
      console.error("Failed to fetch user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include", // Important: include cookies in request
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    const { user: userData, token: authToken } = data.data;

    setUser(userData);
    setToken(authToken);
    localStorage.setItem("auth_token", authToken);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
      credentials: "include", // Important: include cookies in request
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }

    const data = await response.json();
    const { user: userData, token: authToken } = data.data;

    setUser(userData);
    setToken(authToken);
    localStorage.setItem("auth_token", authToken);
  };

  const logout = async () => {
    // Call backend to clear cookie
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    // Clear client-side state
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isLoading,
        isAuthenticated: !!token, // Use token (sync) instead of user (async)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
