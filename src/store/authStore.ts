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

        // 1. Save standard string variant to local client cache storage
        localStorage.setItem('hr_token', token);
        
        // 2. FIXED: Wrap token in encodeURIComponent to prevent special token strings (like "1|xyz") from breaking cookie storage parsers
        const maxAge = 60 * 60 * 24 * 7; // 7 Days
        document.cookie = `hr_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        
        set({ user, token, isAuthenticated: true });
        console.log('Auth set for:', user.email);
      },

      setUser: (user) => {
        set({ user });
      },

      clearAuth: () => {
        // 3. Clean local client reference tracks out completely
        localStorage.removeItem('hr_token');
        
        // 4. FIXED: Clean browser cookies context safely using identical string pathways
        document.cookie = 'hr_token=; path=/; max-age=0; SameSite=Lax';
        
        set({ user: null, token: null, isAuthenticated: false });
      },

      hasPermission: (permission) => {
        const currentUser = get().user;
        if (!currentUser) return false;
        
        // Check for permission arrays structural fallbacks safely
        const permissions = currentUser.permissions || currentUser.data?.permissions || [];
        return permissions.includes(permission);
      },

      hasRole: (role) => {
        const currentUser = get().user;
        if (!currentUser) return false;
        
        // Handle array verification properties safely whether reading direct key or relation resource mapping strings
        const roles = currentUser.roles || [];
        const singleRole = currentUser.role ? [currentUser.role.toLowerCase()] : [];
        
        return roles.includes(role) || singleRole.includes(role.toLowerCase());
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