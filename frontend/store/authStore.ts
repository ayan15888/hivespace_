import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { getCurrentUser, updateProfile as apiUpdateProfile } from '@/lib/api/auth';
import { gooeyToast } from '@/components/ui/goey-toaster';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (token: string, user: User) => void;
  logout: (showToast?: boolean) => void;
  fetchUser: (force?: boolean) => Promise<void>;
  updateProfile: (data: {
    fullName: string;
    jobTitle: string;
    bio: string;
    avatarUrl?: string;
  }) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      error: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      login: (token, user) => {
        const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax${secure}`;
        set({ user, isAuthenticated: true, error: null, loading: false });
      },

      logout: (showToast = true) => {
        // Clear all hivespace-related localStorage keys
        if (typeof window !== "undefined") {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("hivespace")) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));
        }

        // Clear all cookies completely across all path/domain combinations
        if (typeof document !== "undefined") {
          const cookies = document.cookie.split(";");
          for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
            
            // Clear cookie under all path and domain configurations
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`;
            document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.${window.location.hostname}`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          }
        }

        set({ user: null, isAuthenticated: false, error: null, loading: false });
        if (showToast) {
          gooeyToast.success("Logged out successfully");
        }
      },

      fetchUser: async (force = false) => {
        // Skip fetch if we already have a user and aren't forcing a reload
        if (get().user && !force) {
          set({ loading: false });
          return;
        }

        const token = getCookie("token");
        if (!token) {
          set({ user: null, isAuthenticated: false, loading: false });
          return;
        }

        set({ loading: true, error: null });
        try {
          const userData = await getCurrentUser();
          set({ user: userData, isAuthenticated: true, loading: false });
        } catch (err: any) {
          console.error("Auth fetch user failed:", err);
          // If the API call fails specifically with session error, we clear token.
          // In other cases (e.g. network timeout/Spring Boot offline), we keep the cached user state but set error.
          const isNetworkError = err.message && err.message.includes("Cannot reach the Java API");
          if (!isNetworkError) {
            const isUnauthenticated = err.status === 401 || (err.message && err.message.includes("Not authenticated"));
            if (isUnauthenticated) {
              get().logout(false);
            } else {
              document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              set({ user: null, isAuthenticated: false });
            }
          }
          set({
            error: err.message || "Session expired",
            loading: false,
          });
        }
      },

      updateProfile: async (data) => {
        set({ loading: true, error: null });
        try {
          const updatedUser = await apiUpdateProfile(data);
          set({ user: updatedUser, loading: false });
          gooeyToast.success("Profile updated successfully!");
        } catch (err: any) {
          const msg = err.message || "Failed to update profile";
          set({ error: msg, loading: false });
          gooeyToast.error(msg);
          throw err;
        }
      },
    }),
    {
      name: 'hivespace-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
