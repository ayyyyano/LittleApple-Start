"use client";

import { useEffect } from "react";
import { useDesktopCursorSupport } from "@/components/hooks/useDesktopCursorSupport";
import { useApp } from "@/components/providers/AppProvider";
import { getBackgroundAsset } from "@/services/background-storage";
import { prepareCursorPresentation } from "@/lib/cursor-image";

export function CustomCursor() {
  const { assetRevision, config } = useApp();
  const supported = useDesktopCursorSupport();

  useEffect(() => {
    const root = document.documentElement;
    let objectUrl: string | null = null;
    let cancelled = false;

    const clear = () => {
      root.removeAttribute("data-custom-cursor");
      root.style.removeProperty("--custom-cursor");
    };

    if (!supported || !config.labs.customCursor.enabled || config.labs.customCursor.assetId !== "cursor") {
      clear();
      return clear;
    }

    void getBackgroundAsset("cursor").then(async (asset) => {
      if (cancelled) return;
      if (!asset) {
        clear();
        return;
      }
      const presentation = await prepareCursorPresentation(asset.blob, config.labs.customCursor);
      if (cancelled) return;
      objectUrl = URL.createObjectURL(presentation.blob);
      root.style.setProperty("--custom-cursor", `url("${objectUrl}") ${presentation.hotspotX} ${presentation.hotspotY}`);
      root.dataset.customCursor = "on";
    }).catch(() => { if (!cancelled) clear(); });

    return () => {
      cancelled = true;
      clear();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetRevision, config.labs.customCursor, supported]);

  return null;
}
