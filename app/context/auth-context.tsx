"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import {
  apiLogin,
  apiLogout,
  apiGetMe,
  saveTokens,
  clearTokens,
  getTokens,
} from "../lib/auth";
import type { User } from "../lib/auth";

type AuthState = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const tokens = getTokens();
    if (!tokens) {
      setIsLoading(false);
      return;
    }
    apiGetMe(tokens.access)
      .then(setUser)
      .catch(() => {
        clearTokens();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    saveTokens({ access: data.access, refresh: data.refresh });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const tokens = getTokens();
    if (tokens) {
      await apiLogout(tokens.refresh, tokens.access).catch(() => {});
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
