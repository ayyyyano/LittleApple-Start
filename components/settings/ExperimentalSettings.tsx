"use client";

import { useEffect, useRef, useState } from "react";
import { useDesktopCursorSupport } from "@/components/hooks/useDesktopCursorSupport";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { SettingsIcon as AppIcon } from "@/components/settings/SettingsIcon";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Slider } from "@/components/ui/Slider";
import { ModelApiSettings } from "@/components/settings/ModelApiSettings";
import { deleteBackgroundAsset, getBackgroundAsset, saveBackgroundAsset } from "@/services/background-storage";
import type { AppConfig } from "@/types/config";

const CURSOR_FILE_LIMIT = 5 * 1024 * 1024;
const CURSOR_MAX_SIZE = 128;

async function prepareCursorImage(file: File): Promise<{ blob: Blob; mimeType: string; name: string }> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    if (image.naturalWidth <= CURSOR_MAX_SIZE && image.naturalHeight <= CURSOR_MAX_SIZE) {
      return { blob: file, mimeType: file.type, name: file.name };
    }
    const scale = Math.min(CURSOR_MAX_SIZE / image.naturalWidth, CURSOR_MAX_SIZE / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("CURSOR_CANVAS_UNAVAILABLE");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("CURSOR_CONVERSION_FAILED")), "image/png");
    });
    return { blob, mimeType: "image/png", name: `${file.name.replace(/\.[^.]+$/, "") || "cursor"}.png` };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export function ExperimentalSettings() {
  const { assetRevision, config, notify, t, touchAssets, updateConfig } = useApp();
  const audioInput = useRef<HTMLInputElement>(null);
  const cursorInput = useRef<HTMLInputElement>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [hasCursor, setHasCursor] = useState(false);
  const cursorSupported = useDesktopCursorSupport();

  const updateAppearance = (patch: Partial<AppConfig["appearance"]>) => updateConfig((current) => ({
    ...current,
    appearance: { ...current.appearance, ...patch },
  }));
  const updateCursor = (patch: Partial<AppConfig["labs"]["customCursor"]>) => updateConfig((current) => ({
    ...current,
    labs: { ...current.labs, customCursor: { ...current.labs.customCursor, ...patch } },
  }));

  useEffect(() => {
    let active = true;
    Promise.all([getBackgroundAsset("audio"), getBackgroundAsset("cursor")])
      .then(([audio, cursor]) => {
        if (!active) return;
        setHasAudio(Boolean(audio));
        setHasCursor(Boolean(cursor));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [assetRevision]);

  async function storeAudio(file: File) {
    if (!file.type.startsWith("audio/")) { notify(t("backgroundTypeError"), "danger"); return; }
    if (file.size > 25 * 1024 * 1024) { notify(t("backgroundTooLarge"), "danger"); return; }
    try {
      await saveBackgroundAsset({ id: "audio", blob: file, mimeType: file.type, name: file.name, updatedAt: new Date().toISOString() });
      setHasAudio(true);
      touchAssets();
    } catch {
      notify(t("storageError"), "danger");
    }
  }

  async function removeAudio() {
    try {
      await deleteBackgroundAsset("audio");
      updateAppearance({ playBackgroundAudio: false });
      setHasAudio(false);
      touchAssets();
    } catch {
      notify(t("storageError"), "danger");
    }
  }

  async function storeCursor(file: File) {
    if (!cursorSupported) return;
    if (!file.type.startsWith("image/")) { notify(t("cursorTypeError"), "danger"); return; }
    if (file.size > CURSOR_FILE_LIMIT) { notify(t("cursorTooLarge"), "danger"); return; }
    try {
      const prepared = await prepareCursorImage(file);
      await saveBackgroundAsset({ id: "cursor", blob: prepared.blob, mimeType: prepared.mimeType, name: prepared.name, updatedAt: new Date().toISOString() });
      setHasCursor(true);
      updateCursor({ enabled: true, assetId: "cursor" });
      touchAssets();
    } catch {
      notify(t("cursorInvalid"), "danger");
    }
  }

  async function removeCursor() {
    try {
      await deleteBackgroundAsset("cursor");
      updateCursor({ enabled: false, assetId: null });
      setHasCursor(false);
      touchAssets();
    } catch {
      notify(t("storageError"), "danger");
    }
  }

  return (
    <div className="settings-stack">
      <SettingGroup title={t("liveBackdropBlur")}>
        <Switch checked={config.labs.liveBackdropBlur} label={t("liveBackdropBlur")} description={t("liveBackdropBlurDescription")} onCheckedChange={(enabled) => updateConfig((current) => ({ ...current, labs: { ...current.labs, liveBackdropBlur: enabled } }))} />
      </SettingGroup>
      <ModelApiSettings />
      <SettingGroup title={t("customCursor")} description={t("customCursorDescription")}>
        <div className="wallpaper-resource-group wallpaper-resource-group--standalone">
          <div className="wallpaper-resource-heading">
            <h5>{t("cursorImage")}</h5>
            <span className={hasCursor ? "is-ready" : undefined}>{hasCursor ? t("cursorReady") : t("cursorEmpty")}</span>
          </div>
          <div className="button-grid">
            <Button disabled={!cursorSupported} onClick={() => cursorInput.current?.click()}><AppIcon name="upload" size={18} />{hasCursor ? t("replaceCursor") : t("uploadCursor")}</Button>
            <Button variant="danger" disabled={!hasCursor} onClick={removeCursor}><AppIcon name="delete" size={18} />{t("removeCursor")}</Button>
          </div>
          <Switch
            checked={cursorSupported && hasCursor && config.labs.customCursor.enabled}
            disabled={!cursorSupported || !hasCursor}
            onCheckedChange={(enabled) => { if (cursorSupported) updateCursor({ enabled, assetId: hasCursor ? "cursor" : null }); }}
            label={t("enableCustomCursor")}
          />
          {!cursorSupported ? <p className="field-hint">{t("cursorDesktopOnly")}</p> : null}
          {cursorSupported && hasCursor ? <div className="advanced-controls">
            <Switch checked={config.labs.customCursor.size === null} onCheckedChange={(original) => updateCursor({ size: original ? null : 32 })} label={t("cursorOriginalSize")} />
            {config.labs.customCursor.size !== null ? <Slider label={t("cursorSize")} min={16} max={128} value={config.labs.customCursor.size} unit="px" onChange={(size) => updateCursor({ size })} /> : null}
            <Slider label={t("cursorHotspotX")} min={0} max={127} value={config.labs.customCursor.hotspotX} unit="px" onChange={(hotspotX) => updateCursor({ hotspotX })} />
            <Slider label={t("cursorHotspotY")} min={0} max={127} value={config.labs.customCursor.hotspotY} unit="px" onChange={(hotspotY) => updateCursor({ hotspotY })} />
            <p className="field-hint">{t("cursorHotspotHint")}</p>
          </div> : null}
        </div>
        <input
          ref={cursorInput}
          className="sr-only"
          type="file"
          accept="image/png,image/webp,image/gif,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
          disabled={!cursorSupported}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void storeCursor(file);
          }}
        />
      </SettingGroup>

      <SettingGroup title={t("backgroundAudio")} description={t("backgroundAudioDescription")}>
        <div className="wallpaper-resource-group wallpaper-resource-group--standalone">
          <div className="wallpaper-resource-heading">
            <h5>{t("backgroundAudio")}</h5>
            <span className={hasAudio ? "is-ready" : undefined}>{hasAudio ? t("audioReady") : t("audioEmpty")}</span>
          </div>
          <div className="button-grid">
            <Button onClick={() => audioInput.current?.click()}><AppIcon name="audio" size={18} />{hasAudio ? t("replaceAudio") : t("uploadAudio")}</Button>
            <Button variant="danger" onClick={removeAudio} disabled={!hasAudio}><AppIcon name="delete" size={18} />{t("removeAudio")}</Button>
          </div>
          <Switch checked={hasAudio && config.appearance.playBackgroundAudio} disabled={!hasAudio} onCheckedChange={(value) => updateAppearance({ playBackgroundAudio: value })} label={t("playAudio")} />
        </div>
        <input
          ref={audioInput}
          className="sr-only"
          type="file"
          accept="audio/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void storeAudio(file);
          }}
        />
      </SettingGroup>
    </div>
  );
}
