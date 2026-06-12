// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, profileApi } from '@lib/api';
import Security from '@lib/security';
import type { Profile } from '@types/app';

interface AuthContextType {
  user:        Profile | null;
  loading:     boolean;
  signIn:      (email: string, password: string) => Promise<string | null>;
  signUp:      (email: string, name: string, password: string) => Promise<string | null>;
  signOut:     () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    authApi.getSession().then(({ data }) => {
      setUser(data);
      setLoading(false);
    });
  }, []);

  // Heartbeat — update last_seen every 5 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      profileApi.updateLastSeen(user.id).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await authApi.signIn(email, password);
    if (error) return error;
    setUser(data);
    return null;
  }, []);

  const signUp = useCallback(async (email: string, name: string, password: string): Promise<string | null> => {
    const { data, error } = await authApi.signUp(email, name, password);
    if (error) return error;
    setUser(data);
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setUser(null);
    Security.clearSession();
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const { data } = await profileApi.getById(user.id);
    if (data) setUser(data);
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
