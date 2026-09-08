import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// User ka type
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  username?: string;
  role?: string;
  mustChangePassword?: boolean;
  companySlug?: string;
}

// Auth store ka type
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isSuperAdmin: boolean;

  // Actions
  setAuth: (data: Partial<AuthState>) => void;
  setUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isSuperAdmin: false,

      // Auth data set karo -- login ke baad
      setAuth: (data) => set((state) => ({ ...state, ...data })),

      // User info update karo
      setUser: (user) => set({ user }),

      // Logout -- sab clear karo
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isSuperAdmin: false,
        }),

      // Check karo authenticated hai ya nahi
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'crm-auth', // localStorage key
      // Sirf ye fields persist karo
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isSuperAdmin: state.isSuperAdmin,
      }),
    },
  ),
);