import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        if (!token || token === 'undefined') {
          console.error('Invalid token:', token);
          return;
        }
        localStorage.setItem('hr_token', token);
        document.cookie = `hr_token=${token}; path=/; max-age=${
          60 * 60 * 24 * 7
        }; SameSite=Lax`;
        set({ user, token, isAuthenticated: true });
        console.log('Auth set for:', user.email);
      },

      setUser: (user) => {
        set({ user });
      },

      clearAuth: () => {
        localStorage.removeItem('hr_token');
        document.cookie = 'hr_token=; path=/; max-age=0';
        set({ user: null, token: null, isAuthenticated: false });
      },

      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        return user.permissions.includes(permission);
      },

      hasRole: (role) => {
        const user = get().user;
        if (!user) return false;
        return user.roles.includes(role);
      },
    }),
    {
      name: 'hr-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);