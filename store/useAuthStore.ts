'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      loading: false,
      error: null,

      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await authAPI.login(email, password);
          const { user, token } = res.data as { user: User; token: string };
          localStorage.setItem('sf_token', token);
          set({ user, token, loading: false });
        } catch (err: unknown) {
          const msg =
            (
              err as {
                response?: { data?: { error?: string } };
              }
            )?.response?.data?.error || 'Login failed';
          set({ error: msg, loading: false });
          throw err;
        }
      },

      register: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const res = await authAPI.register(email, password);
          const { user, token } = res.data as { user: User; token: string };
          localStorage.setItem('sf_token', token);
          set({ user, token, loading: false });
        } catch (err: unknown) {
          const msg =
            (
              err as {
                response?: { data?: { error?: string } };
              }
            )?.response?.data?.error || 'Registration failed';
          set({ error: msg, loading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('sf_token');
        set({ user: null, token: null });
      },

      clearError: () => set({ error: null }),

      fetchMe: async () => {
        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('sf_token')
            : null;
        if (!token) return;
        try {
          const res = await authAPI.me();
          set({ user: res.data as User });
        } catch {
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'sf-auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
    }
  )
);
