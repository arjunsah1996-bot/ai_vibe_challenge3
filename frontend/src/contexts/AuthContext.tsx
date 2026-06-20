/* ─── Auth Context — global auth state for the React app ────────────────── */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  clearToken,
  getMe,
  hasToken,
  login as apiLogin,
  register as apiRegister,
  updateProfile as apiUpdateProfile,
  changePassword as apiChangePassword,
} from '../api/client';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, region?: string, householdSize?: number) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateProfile: (region?: string, householdSize?: number) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check existing token on mount
  useEffect(() => {
    if (hasToken()) {
      getMe()
        .then(setUser)
        .catch(() => clearToken())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await apiLogin(email, password);
      setUser(res.user);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  };

  const register = async (email: string, password: string, region = 'india', householdSize = 1) => {
    setError(null);
    try {
      const res = await apiRegister(email, password, region, householdSize);
      setUser(res.user);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const clearError = () => setError(null);

  const updateProfile = async (region?: string, householdSize?: number) => {
    setError(null);
    try {
      const updatedUser = await apiUpdateProfile(region, householdSize);
      setUser(updatedUser);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    setError(null);
    try {
      await apiChangePassword(oldPassword, newPassword);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        clearError,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
