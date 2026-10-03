"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { getBackgroundAsset } from "@/services/background-storage";

const DEFAULT_FAVICON = "/favicon.ico";
const RUNTIME_FAVICON_ATTRIBUTE = "data-runtime-favicon";

function getFaviconLinks(createIfMissing = false): HTMLLinkElement[] {
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
  const staticLinks = links.filter((link) => !link.hasAttribute(RUNTIME_FAVICON_ATTRIBUTE));
  const primary = staticLinks[0] ?? links[0];
  if (primary) {
    links.filter((link) => link !== primary).forEach((link) => link.remove());
    primary.removeAttribute(RUNTIME_FAVICON_ATTRIBUTE);
    return [primary];
  }
  if (!createIfMissing) return [];
  const link = document.createElement("link");
  link.rel = "icon";
  link.setAttribute(RUNTIME_FAVICON_ATTRIBUTE, "true");
  document.head.appendChild(link);
  return [link];
}

function setFaviconHref(links: HTMLLinkElement[], href: string): void {
  links.forEach((link) => { link.href = href; });
}

/** Keeps local, user-editable identity reflected in browser metadata without a server round-trip. */
export function SiteIdentityMetadata() {
  const { config, assetRevision } = useApp();
  const faviconUrlRef = useRef<string | null>(null);

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

  useEffect(() => {
    let active = true;
    const defaultHref = new URL(DEFAULT_FAVICON, document.baseURI).href;
    const restoreDefault = () => {
      setFaviconHref(getFaviconLinks(), defaultHref);
      if (faviconUrlRef.current) {
        URL.revokeObjectURL(faviconUrlRef.current);
        faviconUrlRef.current = null;
      }
    };

    if (!config.siteIdentity.avatarAssetId) {
      restoreDefault();
      return () => { active = false; };
    }

    getBackgroundAsset("avatar").then((asset) => {
      if (!active) return;
      if (!asset) {
        restoreDefault();
        return;
      }
      const links = getFaviconLinks(true);
      const nextUrl = URL.createObjectURL(asset.blob);
      setFaviconHref(links, nextUrl);
      const previousUrl = faviconUrlRef.current;
      faviconUrlRef.current = nextUrl;
      if (previousUrl) URL.revokeObjectURL(previousUrl);
    }).catch(() => {
      if (active) restoreDefault();
    });

    return () => { active = false; };
  }, [assetRevision, config.siteIdentity.avatarAssetId]);

  useEffect(() => () => {
    if (faviconUrlRef.current) URL.revokeObjectURL(faviconUrlRef.current);
  }, []);

  return null;
}
