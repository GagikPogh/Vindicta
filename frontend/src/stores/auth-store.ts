"use client";

import { create } from "zustand";

import { api } from "@/lib/api";
import { clearTokens, isAuthenticated, setTokens } from "@/lib/auth";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  setUser: (user) => set({ user }),

  initialize: async () => {
    if (!isAuthenticated()) {
      set({ isInitialized: true, user: null });
      return;
    }
    try {
      const user = await api.auth.me();
      set({ user, isInitialized: true });
    } catch {
      clearTokens();
      set({ user: null, isInitialized: true });
    }
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const user = await api.auth.me();
      set({ user, isLoading: false });
    } catch {
      clearTokens();
      set({ user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const tokens = await api.auth.login(email, password);
      setTokens(tokens);
      const user = await api.auth.me();
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true });
    try {
      const tokens = await api.auth.register(email, password, fullName);
      setTokens(tokens);
      const user = await api.auth.me();
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    }
    clearTokens();
    set({ user: null });
  },
}));
