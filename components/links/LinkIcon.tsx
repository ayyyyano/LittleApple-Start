"use client";

import { useEffect, useState } from "react";

import { deleteCachedSiteIcon, loadSiteIconBlob } from "@/lib/site-icon-cache";

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

export function LinkIcon({ title, url, customIcon, size = 30 }: { title: string; url: string; customIcon?: string; size?: number }) {
  return <LinkIconImage key={`${url}:${customIcon ?? ""}`} title={title} url={url} customIcon={customIcon} size={size} />;
}

function LinkIconImage({ title, url, customIcon, size }: { title: string; url: string; customIcon?: string; size: number }) {
  const pageUrl = normalizedPageUrl(url);
  const [source, setSource] = useState<string | null>(customIcon ?? null);
  const [loaded, setLoaded] = useState(false);
  const fallback = title.trim().charAt(0).toLocaleUpperCase();

  useEffect(() => {
    if (customIcon || !pageUrl) return;

    let active = true;
    let objectUrl: string | null = null;
    void loadSiteIconBlob(pageUrl).then((blob) => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [customIcon, pageUrl]);

  if (!source) {
    return <span className="link-icon-fallback" aria-hidden="true" title={title}>{fallback}</span>;
  }

  return (
    <span className="link-icon-stack" aria-hidden="true" title={title}>
      <span className="link-icon-fallback">{fallback}</span>
      {/* The same-origin route discovers and proxies only explicitly declared page icons. */}
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
          if (!customIcon && pageUrl) void deleteCachedSiteIcon(pageUrl);
          if (source.startsWith("blob:")) URL.revokeObjectURL(source);
          setSource(null);
        }}
      />
    </span>
  );
}
