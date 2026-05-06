import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  username: string;
  avatarDataUrl?: string;
}

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  username: string;
}

interface AuthState {
  user: User | null;
  isPremium: boolean;
  tourCompleted: boolean;
  isFirstLogin: boolean;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  register: (email: string, username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, 'username' | 'avatarDataUrl'>>) => void;
  activatePremium: (code: string) => boolean;
  completeTour: () => void;
  resetAllData: () => void;
}

function simpleHash(password: string, email: string): string {
  return btoa(password + email);
}

function getStoredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('infraflow-users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: StoredUser[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('infraflow-users', JSON.stringify(users));
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isPremium: false,
      tourCompleted: false,
      isFirstLogin: false,

      login: (email, password) => {
        const users = getStoredUsers();
        const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!found) {
          return { ok: false, error: 'No account found with that email' };
        }
        const hash = simpleHash(password, found.email);
        if (hash !== found.passwordHash) {
          return { ok: false, error: 'Incorrect password' };
        }
        set({
          user: { id: found.id, email: found.email, username: found.username },
          isFirstLogin: false,
        });
        return { ok: true };
      },

      register: (email, username, password) => {
        const users = getStoredUsers();
        const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          return { ok: false, error: 'An account with that email already exists' };
        }
        const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const passwordHash = simpleHash(password, email);
        const newUser: StoredUser = { id, email, passwordHash, username };
        saveStoredUsers([...users, newUser]);
        set({
          user: { id, email, username },
          isFirstLogin: true,
          tourCompleted: false,
        });
        return { ok: true };
      },

      logout: () => {
        set({ user: null, isPremium: false, tourCompleted: false, isFirstLogin: false });
      },

      updateProfile: (updates) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...updates } });
      },

      activatePremium: (code) => {
        if (code === 'ownerprem') {
          set({ isPremium: true });
          return true;
        }
        return false;
      },

      completeTour: () => {
        set({ tourCompleted: true, isFirstLogin: false });
      },

      resetAllData: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('infraflow-auth');
          localStorage.removeItem('infraflow-users');
          localStorage.removeItem('infraflow-canvas');
          localStorage.removeItem('infraflow-ui');
          window.location.href = '/login';
        }
      },
    }),
    {
      name: 'infraflow-auth',
      partialize: (s) => ({
        user: s.user,
        isPremium: s.isPremium,
        tourCompleted: s.tourCompleted,
        isFirstLogin: s.isFirstLogin,
      }),
    }
  )
);
