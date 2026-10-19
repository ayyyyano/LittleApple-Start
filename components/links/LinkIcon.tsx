"use client";

import { useEffect, useState } from "react";

import { useApp } from "@/components/providers/AppProvider";
import { deleteCachedSiteIcon, loadSiteIconBlob } from "@/lib/site-icon-cache";
import { getQuickLinkIcon } from "@/services/quick-link-icon-storage";

function normalizedPageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

export function LinkIcon({ title, url, customIcon, iconAssetId, size = 30 }: { title: string; url: string; customIcon?: string; iconAssetId?: string; size?: number }) {
  const { assetRevision } = useApp();
  return <LinkIconImage key={`${url}:${customIcon ?? ""}:${iconAssetId ?? ""}:${assetRevision}`} title={title} url={url} customIcon={customIcon} iconAssetId={iconAssetId} size={size} />;
}

function LinkIconImage({ title, url, customIcon, iconAssetId, size }: { title: string; url: string; customIcon?: string; iconAssetId?: string; size: number }) {
  const pageUrl = normalizedPageUrl(url);
  const [source, setSource] = useState<string | null>(customIcon ?? null);
  const [loaded, setLoaded] = useState(false);
  const fallback = title.trim().charAt(0).toLocaleUpperCase();

  useEffect(() => {
    if (customIcon) return;

    let active = true;
    let objectUrl: string | null = null;
    const load = iconAssetId ? getQuickLinkIcon(iconAssetId) : pageUrl ? loadSiteIconBlob(pageUrl) : Promise.resolve(null);
    void load.then((blob) => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    }).catch(() => { /* Keep initials visible when local asset storage is unavailable. */ });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [customIcon, iconAssetId, pageUrl]);

  if (!source) {
    return <span className="link-icon-fallback" aria-hidden="true" title={title}>{fallback}</span>;
  }

  return (
    <span className="link-icon-stack" aria-hidden="true" title={title}>
      <span className="link-icon-fallback">{fallback}</span>
      {/* Automatic icons have passed the same-origin resolver and browser decode checks. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={loaded ? "is-loaded" : ""}
        src={source}
        alt=""
        width={size}
        height={size}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setLoaded(false);
          if (!customIcon && !iconAssetId && pageUrl) void deleteCachedSiteIcon(pageUrl);
          if (source.startsWith("blob:")) URL.revokeObjectURL(source);
          setSource(null);
        }}
      />
    </span>
  );
}
