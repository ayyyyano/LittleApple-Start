"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Music } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { Surface } from "@/components/ui/Surface";

const APlayerPanel = dynamic(() => import("@/components/player/APlayerPanel").then((module) => module.APlayerPanel), { ssr: false, loading: () => null });

export function FloatingPlayer() {
  const { config, t } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [footerOffset, setFooterOffset] = useState(0);
  const asideRef = useRef<HTMLElement>(null);
  const player = config.labs.aplayer;

  useEffect(() => {
    const resetOffset = () => {
      if (footerOffset === 0) return undefined;
      const frame = window.requestAnimationFrame(() => setFooterOffset(0));
      return () => window.cancelAnimationFrame(frame);
    };
    if (!expanded || !player.enabled || player.playlist.length === 0 || !config.content.visibility.footer) {
      return resetOffset();
    }
    const aside = asideRef.current;
    const footer = document.querySelector<HTMLElement>(".site-footer");
    if (!aside || !footer) {
      return resetOffset();
    }
    const measureCollision = () => {
      const asideRect = aside.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const naturalBottom = asideRect.bottom + footerOffset;
      const nextOffset = Math.max(0, Math.ceil(naturalBottom - footerRect.top + 12));
      if (Math.abs(nextOffset - footerOffset) > 1) setFooterOffset(nextOffset);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measureCollision);
    observer?.observe(aside);
    observer?.observe(footer);
    const frame = window.requestAnimationFrame(measureCollision);
    window.addEventListener("resize", measureCollision);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measureCollision);
      observer?.disconnect();
    };
  }, [config.content.footer.showCopyright, config.content.footer.showLegal, config.content.visibility.footer, expanded, footerOffset, player.enabled, player.playlist.length]);

  if (!player.enabled || player.playlist.length === 0) return null;
  return (
    <aside ref={asideRef} className={`floating-player floating-player--${player.position} ${expanded ? "is-expanded" : "is-collapsed"}`} aria-label={t("player")} style={{ "--floating-player-bottom-offset": `${footerOffset}px` } as CSSProperties}>
      {hasOpened && <div className="floating-player-panel" aria-hidden={!expanded}><APlayerPanel onCollapse={() => setExpanded(false)} /></div>}
      {!expanded && (
        <Surface className="floating-player-trigger-surface" variant="auto">
          <button className="floating-player-trigger" type="button" aria-label={t("expandPlayer")} aria-expanded="false" onClick={() => { setHasOpened(true); window.requestAnimationFrame(() => setExpanded(true)); }}><Music size={19} /></button>
        </Surface>
      )}
    </aside>
  );
}
