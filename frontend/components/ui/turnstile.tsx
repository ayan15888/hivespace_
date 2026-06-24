"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

export function Turnstile({ onVerify, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";

    const renderWidget = () => {
      if (containerRef.current && window.turnstile) {
        // Clean up previous widget if it exists
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
        }

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: "dark",
            callback: (token: string) => {
              onVerify(token);
            },
            "expired-callback": () => {
              onExpire?.();
            },
            "error-callback": () => {
              onError?.();
            },
          });
          widgetIdRef.current = id;
        } catch (err) {
          console.error("Error rendering Turnstile:", err);
        }
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      // If turnstile script is loaded but window.turnstile isn't ready immediately
      const checkInterval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(checkInterval);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onVerify, onExpire, onError]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.turnstile && containerRef.current && !widgetIdRef.current) {
            const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
            try {
              const id = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                theme: "dark",
                callback: onVerify,
                "expired-callback": onExpire,
                "error-callback": onError,
              });
              widgetIdRef.current = id;
            } catch (err) {
              console.error("Error rendering Turnstile on load:", err);
            }
          }
        }}
      />
      <div ref={containerRef} className="flex justify-center my-2" />
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
