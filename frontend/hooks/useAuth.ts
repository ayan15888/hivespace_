"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { usePathname, useRouter } from "next/navigation";

export function useAuth() {
  const { user, loading, error, isAuthenticated, fetchUser, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only fetch user details once when mounting/initializing if a token is present
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const isProtectedRoute = 
      pathname?.startsWith("/dashboard") || 
      pathname?.startsWith("/settings") ||
      pathname?.startsWith("/account");

    if (!loading && !isAuthenticated && isProtectedRoute) {
      logout(false); // Clean logout without success toast
      router.push("/signin?session_expired=true");
    }
  }, [loading, isAuthenticated, pathname, router, logout]);

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

