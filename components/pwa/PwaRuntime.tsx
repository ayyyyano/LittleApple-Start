"use client";

import { useEffect } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { pwaInstall } from "@/lib/pwa-install";

export function PwaRuntime() {
  const { ready } = useApp();
  useEffect(() => pwaInstall.start(), []);
  useEffect(() => {
    if (!ready || process.env.NODE_ENV !== "production" || !window.isSecureContext || !("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => { console.warn("PWA service worker registration failed."); });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, [ready]);
  return null;
}
