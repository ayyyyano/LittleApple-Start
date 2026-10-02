"use client";

import "aplayer/dist/APlayer.min.css";
import { useEffect, useRef } from "react";
import { ChevronDown } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { LIQUID_VISUAL_STYLE, Surface } from "@/components/ui/Surface";

export function APlayerPanel({ onCollapse }: { onCollapse: () => void }) {
  const { config, t } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const playlist = config.labs.aplayer.playlist;
  const visualStyle = config.appearance.surfaceMode === "liquid" ? LIQUID_VISUAL_STYLE : {};

  useEffect(() => {
    let active = true;
    let player: { destroy: () => void } | undefined;
    if (!containerRef.current || playlist.length === 0) return;
    import("aplayer").then(({ default: APlayer }) => {
      if (!active || !containerRef.current) return;
      player = new APlayer({
        container: containerRef.current,
        audio: playlist.map((track) => ({ name: track.title, artist: track.artist || t("unknownArtist"), url: track.url, cover: track.cover, lrc: track.lrc })),
        autoplay: false,
        theme: config.appearance.accentColor,
        loop: "all",
        order: "list",
        preload: "metadata",
        volume: 0.7,
        mutex: true,
        lrcType: playlist.some((track) => track.lrc) ? 3 : 0,
      });
    }).catch(() => undefined);
    return () => { active = false; player?.destroy(); };
  }, [config.appearance.accentColor, playlist, t]);

  return (
    <>
      <Surface className="floating-player-visual" variant="auto" style={{ ...visualStyle, position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none" }} />
      <Button className="aplayer-collapse" variant="secondary" size="icon" aria-label={t("collapsePlayer")} onClick={onCollapse}><ChevronDown size={18} /></Button>
      <div ref={containerRef} className="aplayer-host" />
    </>
  );
}
