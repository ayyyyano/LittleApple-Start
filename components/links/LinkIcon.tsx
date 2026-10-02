"use client";

import { useState } from "react";

export function getLinkIconSources(url: string, customIcon?: string): string[] {
  void url;
  return customIcon ? [customIcon] : [];
}

export function LinkIcon({ title, url, customIcon, size = 30 }: { title: string; url: string; customIcon?: string; size?: number }) {
  return <LinkIconImage key={`${url}:${customIcon ?? ""}`} title={title} sources={getLinkIconSources(url, customIcon)} size={size} />;
}

function LinkIconImage({ title, sources, size }: { title: string; sources: string[]; size: number }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const source = sources[attempt];
  const fallback = title.trim().charAt(0).toLocaleUpperCase();
  if (!source) return <span className="link-icon-fallback" aria-hidden="true">{fallback}</span>;
  return (
    <span className="link-icon-stack" aria-hidden="true">
      <span className="link-icon-fallback">{fallback}</span>
      {/* Unknown user domains cannot be declared in Next Image remotePatterns; the fallback chain handles broken images. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={loaded ? "is-loaded" : ""} src={source} alt="" width={size} height={size} onLoad={() => setLoaded(true)} onError={() => { setLoaded(false); setAttempt((value) => value + 1); }} />
    </span>
  );
}
