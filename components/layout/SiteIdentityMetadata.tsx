"use client";

import { useEffect } from "react";
import { useApp } from "@/components/providers/AppProvider";

/** Keeps local, user-editable identity reflected in browser metadata without a server round-trip. */
export function SiteIdentityMetadata() {
  const { config } = useApp();

  useEffect(() => {
    const name = config.siteIdentity.name.trim() || "LittleApple Start";
    document.title = name;
    document.documentElement.dataset.siteName = name;
    const setMeta = (selector: string, attributes: Record<string, string>) => {
      let meta = document.querySelector<HTMLMetaElement>(selector);
      if (!meta) {
        meta = document.createElement("meta");
        Object.entries(attributes).forEach(([key, value]) => meta?.setAttribute(key, value));
        document.head.appendChild(meta);
      }
      meta.content = name;
    };
    setMeta('meta[name="application-name"]', { name: "application-name" });
    setMeta('meta[property="og:site_name"]', { property: "og:site_name" });
    setMeta('meta[property="og:title"]', { property: "og:title" });
  }, [config.siteIdentity.name]);

  return null;
}
