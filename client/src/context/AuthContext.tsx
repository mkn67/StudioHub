'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, apiLogin, apiRegister, apiLogout, apiGetProfile, apiUpdateProfile } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { full_name: string; email: string; password: string; phone: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    full_name?: string;
    phone?: string;
    current_password?: string;
    new_password?: string;
  }) => Promise<User>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user & token from localStorage on initial render
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken) {
        setToken(storedToken);
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      // Verify and refresh profile from DB if token exists
      if (storedToken) {
        apiGetProfile()
          .then((freshUser) => {
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          })
          .catch(() => {
            // Token expired or revoked
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const result = await apiLogin(credentials);
      setToken(result.token);
      setUser(result.user);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (data: { full_name: string; email: string; password: string; phone: string }) => {
      setIsLoading(true);
      try {
        const result = await apiRegister(data);
        setToken(result.token);
        setUser(result.user);
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout().catch(() => {});
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(
    async (data: {
      full_name?: string;
      phone?: string;
      current_password?: string;
      new_password?: string;
    }) => {
      const updated = await apiUpdateProfile(data);
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const fresh = await apiGetProfile();
    setUser(fresh);
    localStorage.setItem('user', JSON.stringify(fresh));
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

