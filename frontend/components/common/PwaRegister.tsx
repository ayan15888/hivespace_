"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol === "https:" || window.location.hostname === "localhost"
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("HiveSpace PWA Service Worker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("HiveSpace PWA Service Worker registration failed:", error);
        });
    }
  }, []);

  return null;
}
