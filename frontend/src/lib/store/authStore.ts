import { create } from 'zustand';
import { login as loginRequest, logout as logoutRequest, refresh as refreshRequest } from '@/lib/api/auth';
import type { LoginCredentials } from '@/lib/api/auth';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  sessionExpired: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  setUser: (user: User | null) => void;
  setAccessToken: (accessToken: string | null) => void;
  clear: () => void;
}

// Access token is held ONLY in memory (this store). It is never written to
// localStorage, sessionStorage, or a JS-readable cookie — losing it on a full
// page reload is expected, and refreshToken() is used to silently restore it
// from the HTTP-only refresh cookie the backend sets.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,
  sessionExpired: false,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const { accessToken, user } = await loginRequest(credentials);
      set({ accessToken, user, isLoading: false, isInitialized: true, sessionExpired: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await logoutRequest();
    } finally {
      set({
        user: null,
        accessToken: null,
        isLoading: false,
        isInitialized: true,
        sessionExpired: false,
      });
    }
  },

  refreshToken: async () => {
    const { accessToken } = await refreshRequest();
    set({ accessToken, isInitialized: true });
    return accessToken;
  },

  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () =>
    set({
      user: null,
      accessToken: null,
      isLoading: false,
      isInitialized: true,
      sessionExpired: false,
    }),
}));
