"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { DEFAULT_BACKGROUND } from "@/lib/default-background";
import { getBackgroundAsset } from "@/services/background-storage";

interface BackgroundUrls {
  visual?: string;
  audio?: string;
}

interface VisualSource {
  key: string;
  type: "image" | "video";
  url: string;
  fit: string;
}

function BackgroundVisual({
  source,
  className,
  onLoadedData,
  onError,
  videoRef,
}: {
  source: VisualSource;
  className: string;
  onLoadedData?: () => void;
  onError?: () => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {
  if (source.type === "video") {
    return <video ref={videoRef} className={`background-media background-media--${source.fit} ${className}`} src={source.url} autoPlay loop muted playsInline preload="metadata" onLoadedData={onLoadedData} onError={onError} />;
  }
  return <div className={`background-media background-image background-media--${source.fit} ${className}`} style={{ backgroundImage: `url(${JSON.stringify(source.url)})` }} />;
}

export function BackgroundRenderer({ onReady }: { onReady?: () => void }) {
  const { config, ready, assetRevision } = useApp();
  const [urls, setUrls] = useState<BackgroundUrls>({});
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [activeSource, setActiveSource] = useState<VisualSource | null>(null);
  const [outgoingSource, setOutgoingSource] = useState<VisualSource | null>(null);
  const [pendingVideo, setPendingVideo] = useState<VisualSource | null>(null);
  const [crossfadePhase, setCrossfadePhase] = useState<"idle" | "entering" | "running">("idle");
  const activeSourceRef = useRef<VisualSource | null>(null);
  const outgoingSourceRef = useRef<VisualSource | null>(null);
  const pendingVideoRef = useRef<VisualSource | null>(null);
  const audioUrlRef = useRef<string | undefined>(undefined);
  const readyRef = useRef(false);
  const onReadyRef = useRef(onReady);
  const createdUrls = useRef(new Set<string>());
  const transitionTimer = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWasPlayingBeforeHidden = useRef(false);
  const backgroundRootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const revokeCreatedUrl = useCallback((url?: string) => {
    if (!url || !createdUrls.current.delete(url)) return;
    URL.revokeObjectURL(url);
  }, []);

  const releaseUrlWhenUnused = useCallback((url?: string) => {
    if (!url || !createdUrls.current.has(url)) return;
    window.requestAnimationFrame(() => {
      const stillUsed = [
        activeSourceRef.current?.url,
        outgoingSourceRef.current?.url,
        pendingVideoRef.current?.url,
        audioUrlRef.current,
      ].includes(url);
      if (!stillUsed) revokeCreatedUrl(url);
    });
  }, [revokeCreatedUrl]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const motionEnabled = config.general.motionEnabled;

  const markReady = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    onReadyRef.current?.();
  }, []);

  const commitSource = useCallback((source: VisualSource, failed = false) => {
    let effectiveSource = source;
    if (failed) {
      if (activeSourceRef.current) {
        markReady();
        return;
      }
      const fallback: VisualSource = { key: `image|${DEFAULT_BACKGROUND.url}|fill`, type: "image", url: DEFAULT_BACKGROUND.url, fit: "fill" };
      effectiveSource = fallback;
    }
    const previous = activeSourceRef.current;
    if (!previous) {
      const previousOutgoing = outgoingSourceRef.current;
      activeSourceRef.current = effectiveSource;
      outgoingSourceRef.current = null;
      setActiveSource(effectiveSource);
      setOutgoingSource(null);
      setCrossfadePhase("idle");
      releaseUrlWhenUnused(previousOutgoing?.url);
      markReady();
      return;
    }
    if (previous.key === effectiveSource.key) {
      setActiveSource(effectiveSource);
      markReady();
      return;
    }
    activeSourceRef.current = effectiveSource;
    if (!motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const previousOutgoing = outgoingSourceRef.current;
      outgoingSourceRef.current = null;
      setOutgoingSource(null);
      setActiveSource(effectiveSource);
      setCrossfadePhase("idle");
      releaseUrlWhenUnused(previous.url);
      releaseUrlWhenUnused(previousOutgoing?.url);
      markReady();
      return;
    }
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    const previousOutgoing = outgoingSourceRef.current;
    outgoingSourceRef.current = previous;
    setOutgoingSource(previous);
    setActiveSource(effectiveSource);
    setCrossfadePhase("entering");
    releaseUrlWhenUnused(previousOutgoing?.url);
    window.requestAnimationFrame(() => setCrossfadePhase("running"));
    transitionTimer.current = window.setTimeout(() => {
      const exiting = outgoingSourceRef.current;
      outgoingSourceRef.current = null;
      setOutgoingSource(null);
      setCrossfadePhase("idle");
      transitionTimer.current = null;
      releaseUrlWhenUnused(exiting?.url);
    }, 300);
    markReady();
  }, [markReady, motionEnabled, releaseUrlWhenUnused]);

  useEffect(() => {
    let active = true;
    // Asset loading is an external subscription; reset its readiness before awaiting the next revision.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAssetsLoaded(false);
    Promise.all([getBackgroundAsset("visual"), getBackgroundAsset("audio")]).then(([visual, audio]) => {
      if (!active) return;
      const next: BackgroundUrls = {};
      if (visual) {
        next.visual = URL.createObjectURL(visual.blob);
        createdUrls.current.add(next.visual);
      }
      if (audio) {
        next.audio = URL.createObjectURL(audio.blob);
        createdUrls.current.add(next.audio);
      }
      const previousAudio = audioUrlRef.current;
      audioUrlRef.current = next.audio;
      setUrls(next);
      releaseUrlWhenUnused(previousAudio);
      setAssetsLoaded(true);
    }).catch(() => {
      if (!active) return;
      const previousAudio = audioUrlRef.current;
      audioUrlRef.current = undefined;
      setUrls({});
      releaseUrlWhenUnused(previousAudio);
      setAssetsLoaded(true);
    });
    return () => { active = false; };
  }, [assetRevision, releaseUrlWhenUnused]);

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    for (const url of createdUrls.current) URL.revokeObjectURL(url);
  }, []);

  const candidate = useMemo<VisualSource | null>(() => {
    if (!ready || !assetsLoaded) return null;
    const requestedVideo = config.appearance.backgroundType === "video" && Boolean(urls.visual);
    const requestedImage = config.appearance.backgroundType === "image" && Boolean(urls.visual);
    const type = requestedVideo ? "video" : "image";
    const url = requestedVideo || requestedImage ? urls.visual! : (config.appearance.backgroundUrl ?? DEFAULT_BACKGROUND.url);
    const fit = requestedVideo && (config.appearance.backgroundFit === "tile" || config.appearance.backgroundFit === "center")
      ? "fit"
      : config.appearance.backgroundFit;
    return { key: `${type}|${url}|${fit}`, type, url, fit };
  }, [assetsLoaded, config.appearance.backgroundFit, config.appearance.backgroundType, config.appearance.backgroundUrl, ready, urls.visual]);

  useEffect(() => {
    if (!candidate) return;
    if (candidate.type === "video") {
      if (activeSourceRef.current?.key !== candidate.key) {
        const previousPending = pendingVideoRef.current;
        pendingVideoRef.current = candidate;
        setPendingVideo(candidate);
        if (previousPending?.url !== candidate.url) releaseUrlWhenUnused(previousPending?.url);
      }
      return;
    }
    const previousPending = pendingVideoRef.current;
    pendingVideoRef.current = null;
    releaseUrlWhenUnused(previousPending?.url);
    if (activeSourceRef.current?.key === candidate.key) return;
    let cancelled = false;
    const image = new Image();
    const commit = (failed = false) => {
      if (cancelled) return;
      commitSource(candidate, failed);
    };
    image.onload = () => commit(false);
    image.onerror = () => commit(true);
    image.src = candidate.url;
    image.decode?.().then(() => commit(false)).catch(() => undefined);
    return () => { cancelled = true; image.onload = null; image.onerror = null; };
  }, [candidate, commitSource, releaseUrlWhenUnused]);

  const handleVideoReady = useCallback(() => {
    const source = pendingVideoRef.current ?? pendingVideo;
    if (!source) return;
    commitSource(source);
    pendingVideoRef.current = null;
    setPendingVideo(null);
  }, [commitSource, pendingVideo]);

  const handleVideoError = useCallback(() => {
    const failedPending = pendingVideoRef.current ?? pendingVideo;
    pendingVideoRef.current = null;
    setPendingVideo(null);
    releaseUrlWhenUnused(failedPending?.url);
    if (!activeSourceRef.current) {
      commitSource({ key: `image|${DEFAULT_BACKGROUND.url}|fill`, type: "image", url: DEFAULT_BACKGROUND.url, fit: "fill" });
    } else {
      markReady();
    }
  }, [commitSource, markReady, pendingVideo, releaseUrlWhenUnused]);

  useEffect(() => {
    if (config.appearance.backgroundType !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    const play = () => video.play().catch(() => undefined);
    play();
    document.addEventListener("pointerdown", play, { once: true });
    return () => document.removeEventListener("pointerdown", play);
  }, [activeSource?.key, config.appearance.backgroundType]);

  useEffect(() => {
    if (config.appearance.backgroundType === "video") return;
    const audio = audioRef.current;
    if (!audio) return;
    if (!config.appearance.playBackgroundAudio) {
      audio.pause();
      return;
    }
    const play = () => audio.play().catch(() => undefined);
    play();
    document.addEventListener("pointerdown", play, { once: true });
    return () => document.removeEventListener("pointerdown", play);
  }, [config.appearance.backgroundType, config.appearance.playBackgroundAudio, urls.audio]);

  useEffect(() => {
    const onVisibility = () => {
      const videos = backgroundRootRef.current?.querySelectorAll<HTMLVideoElement>("video") ?? [];
      if (document.hidden) {
        videoWasPlayingBeforeHidden.current = Boolean(videoRef.current && !videoRef.current.paused && !videoRef.current.ended);
        videos.forEach((video) => video.pause());
      } else if (config.appearance.backgroundType === "video" && videoWasPlayingBeforeHidden.current) {
        videoRef.current?.play().catch(() => undefined);
        videoWasPlayingBeforeHidden.current = false;
      } else {
        videoWasPlayingBeforeHidden.current = false;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [config.appearance.backgroundType]);

  const customProperties = {
    "--background-blur": `${config.appearance.blur}px`,
    "--background-overlay": String(config.appearance.overlay / 100),
    "--glass-opacity": String(config.appearance.glassOpacity / 100),
    "--glass-blur": `${config.appearance.glassBlur}px`,
    "--bg-position-desktop": `${config.appearance.focalX}% ${config.appearance.focalY}%`,
    "--bg-position-mobile": `${config.appearance.focalX}% ${config.appearance.focalY}%`,
  } as CSSProperties;

  return (
    <div ref={backgroundRootRef} className="background-root" style={customProperties} aria-hidden="true">
      {outgoingSource && <BackgroundVisual source={outgoingSource} className={crossfadePhase === "running" ? "background-media--outgoing" : ""} />}
      {activeSource && <BackgroundVisual source={activeSource} className={crossfadePhase === "entering" ? "background-media--entering" : ""} videoRef={videoRef} />}
      {pendingVideo && candidate?.type === "video" && pendingVideo.key === candidate.key && <BackgroundVisual source={pendingVideo} className="background-media--pending" onLoadedData={handleVideoReady} onError={handleVideoError} />}
      <div className="background-overlay" />
      {urls.audio && config.appearance.backgroundType !== "video" && <audio ref={audioRef} src={urls.audio} loop preload="none" />}
    </div>
  );
}
