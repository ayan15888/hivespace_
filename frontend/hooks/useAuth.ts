"use client";

import { useState, useEffect } from "react";
import { User } from "@/types/auth";
import { getCurrentUser } from "@/lib/api/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Auth initialization failed:", error);
        localStorage.removeItem("token");
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/signin";
  };

  return {
    user,
    loading,
    error,
    logout,
    isAuthenticated: !!user,
  };
}
