"use client";

import { useEffect } from "react";
import { useApp } from "@/components/providers/AppProvider";

declare global {
  interface Window {
    startSakura?: () => void;
    stopSakura?: () => void;
  }
}

let sakuraScriptPromise: Promise<void> | null = null;

function loadSakuraScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (typeof window.startSakura === "function") return Promise.resolve();
  if (sakuraScriptPromise) return sakuraScriptPromise;

  sakuraScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-sakura-effect]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Sakura script failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "/sakura.js";
    script.async = true;
    script.dataset.sakuraEffect = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Sakura script failed to load")), { once: true });
    document.head.appendChild(script);
  });

  return sakuraScriptPromise;
}

function stopSakuraIfRunning(): void {
  if (document.getElementById("canvas_sakura")) window.stopSakura?.();
}

export function SakuraEffect() {
  const { config } = useApp();
  const enabled = config.appearance.sakuraEnabled;

  useEffect(() => {
    void loadSakuraScript().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      stopSakuraIfRunning();
      return () => { cancelled = true; };
    }

    void loadSakuraScript()
      .then(() => {
        if (!cancelled && !document.getElementById("canvas_sakura")) window.startSakura?.();
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [enabled]);

  return null;
}
