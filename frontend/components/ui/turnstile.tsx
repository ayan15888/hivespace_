"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export function Turnstile({ onVerify, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Detect if window.turnstile is already loaded on mount (e.g. from page navigation)
  useEffect(() => {
    if (typeof window !== "undefined" && window.turnstile) {
      setScriptLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

    // Clean up any existing widget instance before rendering
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (err) {
        console.error("Error removing Turnstile widget:", err);
      }
      widgetIdRef.current = null;
    }

    // Ensure the container is empty
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    let active = true;

    try {
      if (window.turnstile) {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (token: string) => {
            if (active) onVerify(token);
          },
          "expired-callback": () => {
            if (active) onExpire?.();
          },
          "error-callback": () => {
            if (active) onError?.();
          },
        });
        widgetIdRef.current = id;
      }
    } catch (err) {
      console.error("Error rendering Turnstile:", err);
    }

    return () => {
      active = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (err) {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [scriptLoaded, onVerify, onExpire, onError]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptLoaded(true);
        }}
      />
      <div ref={containerRef} className="flex justify-center my-2 min-h-[65px]" />
    </>
  );
}

// Add global window type definition for TypeScript
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

