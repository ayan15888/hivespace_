"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const { user, loading, error, isAuthenticated, fetchUser, logout } = useAuthStore();

  useEffect(() => {
    // Only fetch user details once when mounting/initializing if a token is present
    fetchUser();
  }, [fetchUser]);

  const handleLogout = () => {
    logout();
    setTimeout(() => {
      window.location.href = "/signin";
    }, 800);
  };

  return {
    user,
    loading,
    error,
    logout: handleLogout,
    isAuthenticated,
  };
}

