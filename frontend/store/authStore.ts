import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';
import { getCurrentUser, updateProfile as apiUpdateProfile } from '@/lib/api/auth';
import { gooeyToast } from '@/components/ui/goey-toaster';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
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
        localStorage.setItem("token", token);
        document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;
        set({ user, isAuthenticated: true, error: null, loading: false });
      },

      logout: () => {
        localStorage.removeItem("token");
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        set({ user: null, isAuthenticated: false, error: null, loading: false });
        gooeyToast.success("Logged out successfully");
      },

      fetchUser: async (force = false) => {
        // Skip fetch if we already have a user and aren't forcing a reload
        if (get().user && !force) {
          set({ loading: false });
          return;
        }

        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
            localStorage.removeItem("token");
            document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            set({ user: null, isAuthenticated: false });
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
