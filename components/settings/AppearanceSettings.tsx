"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Image as ImageIcon, Music, RefreshCw, RotateCcw, Trash2, Video } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { cloneDefaultConfig } from "@/lib/default-config";
import { DEFAULT_BACKGROUND } from "@/lib/default-background";
import { extractPaletteFromBlob, normalizeHex } from "@/lib/palette";
import { isHexColor } from "@/lib/validation";
import { deleteBackgroundAsset, getBackgroundAsset, saveBackgroundAsset } from "@/services/background-storage";
import { downloadBlob } from "@/services/configuration-transfer";
import type { AppConfig, BackgroundFit, SurfaceMode, ThemeMode, ThemeStrength } from "@/types/config";

export function AppearanceSettings() {
  const { config, updateConfig, touchAssets, notify, t } = useApp();
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const [extracting, setExtracting] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [customColor, setCustomColor] = useState(config.appearance.accentColor);
  const updateAppearance = (patch: Partial<AppConfig["appearance"]>) => updateConfig((current) => ({ ...current, appearance: { ...current.appearance, ...patch } }));

  useEffect(() => {
    let active = true;
    getBackgroundAsset("audio").then((asset) => { if (active) setHasAudio(Boolean(asset)); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const normalizedAccent = normalizeHex(config.appearance.accentColor);
    // Keep the editable HEX draft aligned with external palette/config changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomColor((current) => current === normalizedAccent ? current : normalizedAccent);
  }, [config.appearance.accentColor]);

  function applyDefaultWallpaperPalette() {
    updateAppearance({
      wallpaperPalette: [...DEFAULT_BACKGROUND.palette],
      accentColor: DEFAULT_BACKGROUND.accentColor,
      paletteMode: "wallpaper",
    });
  }

  async function extractColors(blob?: Blob) {
    setExtracting(true);
    try {
      if (!blob && config.appearance.backgroundType !== "image") {
        applyDefaultWallpaperPalette();
        return;
      }
      const source = blob ?? (await getBackgroundAsset("visual"))?.blob;
      if (!source) {
        applyDefaultWallpaperPalette();
        return;
      }
      const palette = await extractPaletteFromBlob(source);
      updateAppearance({ wallpaperPalette: palette, accentColor: palette[0] ?? config.appearance.accentColor, paletteMode: "wallpaper" });
    } catch {
      notify(t("paletteError"), "warning");
    } finally {
      setExtracting(false);
    }
  }

  async function storeFile(file: File, kind: "visual" | "audio") {
    const visualAccepted = file.type.startsWith("image/") || file.type.startsWith("video/");
    const accepted = kind === "audio" ? file.type.startsWith("audio/") : visualAccepted;
    if (!accepted) { notify(t("backgroundTypeError"), "danger"); return; }
    const limit = file.type.startsWith("video/") ? 250 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > limit) { notify(t("backgroundTooLarge"), "danger"); return; }
    try {
      await saveBackgroundAsset({ id: kind, blob: file, mimeType: file.type, name: file.name, updatedAt: new Date().toISOString() });
      if (kind === "visual") {
        const backgroundType = file.type.startsWith("video/") ? "video" : "image";
        updateAppearance({ backgroundType });
        if (backgroundType === "image") void extractColors(file);
      } else setHasAudio(true);
      touchAssets();
    } catch {
      notify(t("storageError"), "danger");
    }
  }

  async function remove(kind: "visual" | "audio") {
    try {
      await deleteBackgroundAsset(kind);
      if (kind === "visual") {
        updateAppearance({
          backgroundType: "none",
          ...(config.appearance.paletteMode === "wallpaper"
            ? { wallpaperPalette: [...DEFAULT_BACKGROUND.palette], accentColor: DEFAULT_BACKGROUND.accentColor }
            : {}),
        });
      } else {
        updateAppearance({ playBackgroundAudio: false });
      }
      if (kind === "audio") setHasAudio(false);
      touchAssets();
    } catch { notify(t("storageError"), "danger"); }
  }

  async function exportBackground() {
    const asset = await getBackgroundAsset("visual");
    if (!asset) return;
    const extension = asset.name.includes(".") ? asset.name.split(".").pop() : asset.mimeType.split("/")[1] || "bin";
    downloadBlob(asset.blob, `background-${new Date().toISOString().slice(0, 10)}.${extension}`);
  }

  function applyCustomColor(value: string) {
    setCustomColor(value);
    if (isHexColor(value)) updateAppearance({ paletteMode: "custom", accentColor: normalizeHex(value) });
  }

  function resetTheme() {
    const defaults = cloneDefaultConfig();
    updateConfig((current) => ({ ...current, theme: defaults.theme, appearance: {
      ...current.appearance,
      paletteMode: defaults.appearance.paletteMode,
      accentColor: defaults.appearance.accentColor,
      wallpaperPalette: defaults.appearance.wallpaperPalette,
      themeStrength: defaults.appearance.themeStrength,
      surfaceMode: defaults.appearance.surfaceMode,
      glassTint: defaults.appearance.glassTint,
    } }));
    setCustomColor(defaults.appearance.accentColor);
  }

  function resetLayout() {
    const defaults = cloneDefaultConfig().appearance;
    updateAppearance({
      overallScale: defaults.overallScale,
      moduleScale: defaults.moduleScale,
      moduleGap: defaults.moduleGap,
      composition: defaults.composition,
      quickLinksStyle: defaults.quickLinksStyle,
    });
  }

  function resetBackgroundSettings() {
    const defaults = cloneDefaultConfig().appearance;
    updateAppearance({
      backgroundFit: defaults.backgroundFit,
      focalX: defaults.focalX,
      focalY: defaults.focalY,
      blur: defaults.blur,
      overlay: defaults.overlay,
      glassOpacity: defaults.glassOpacity,
      glassBlur: defaults.glassBlur,
      glassTint: defaults.glassTint,
    });
  }

  const moduleScale = config.appearance.moduleScale;
  return (
    <div className="settings-stack">
      <SettingGroup title={t("wallpaper")}>
        <div className="wallpaper-resource-group">
          <h5>{t("backgroundResources")}</h5>
          <div className="button-grid">
            <Button onClick={() => imageInput.current?.click()}><ImageIcon size={18} />{t("uploadImage")}</Button>
            <Button onClick={() => videoInput.current?.click()}><Video size={18} />{t("uploadVideo")}</Button>
            <Button onClick={exportBackground} disabled={config.appearance.backgroundType === "none"}><Download size={18} />{t("exportBackground")}</Button>
            <Button variant="danger" onClick={() => remove("visual")} disabled={config.appearance.backgroundType === "none"}><Trash2 size={18} />{t("removeBackground")}</Button>
          </div>
        </div>
        <div className="wallpaper-resource-group">
          <div className="wallpaper-resource-heading">
            <h5>{t("backgroundAudio")}</h5>
            <span className={hasAudio ? "is-ready" : undefined}>{hasAudio ? t("audioReady") : t("audioEmpty")}</span>
          </div>
          <div className="button-grid">
            <Button onClick={() => audioInput.current?.click()}><Music size={18} />{hasAudio ? t("replaceAudio") : t("uploadAudio")}</Button>
            <Button variant="danger" onClick={() => remove("audio")} disabled={!hasAudio}><Trash2 size={18} />{t("removeAudio")}</Button>
          </div>
          <Switch checked={hasAudio && config.appearance.playBackgroundAudio} disabled={!hasAudio} onCheckedChange={(value) => updateAppearance({ playBackgroundAudio: value })} label={t("playAudio")} />
        </div>
        <input ref={imageInput} className="sr-only" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && storeFile(event.target.files[0], "visual")} />
        <input ref={videoInput} className="sr-only" type="file" accept="video/*" onChange={(event) => event.target.files?.[0] && storeFile(event.target.files[0], "visual")} />
        <input ref={audioInput} className="sr-only" type="file" accept="audio/*" onChange={(event) => event.target.files?.[0] && storeFile(event.target.files[0], "audio")} />
        <Switch checked={config.appearance.sakuraEnabled} onCheckedChange={(value) => updateAppearance({ sakuraEnabled: value })} label={t("sakuraEffect")} />
        <label className="field-label" htmlFor="fit-select"><span>{t("backgroundFit")}</span>
          <Select
            id="fit-select"
            value={config.appearance.backgroundFit}
            ariaLabel={t("backgroundFit")}
            onValueChange={(value) => updateAppearance({ backgroundFit: value as BackgroundFit })}
            options={[
              { value: "fill", label: t("fill") },
              { value: "fit", label: t("fit") },
              { value: "stretch", label: t("stretch") },
              { value: "tile", label: t("tile"), disabled: config.appearance.backgroundType === "video" },
              { value: "center", label: t("center"), disabled: config.appearance.backgroundType === "video" },
            ]}
          />
        </label>
        {config.appearance.backgroundFit === "fill" && <>
          <Slider label={t("focalX")} value={config.appearance.focalX} min={0} max={100} unit="%" onChange={(value) => updateAppearance({ focalX: value })} />
          <Slider label={t("focalY")} value={config.appearance.focalY} min={0} max={100} unit="%" onChange={(value) => updateAppearance({ focalY: value })} />
        </>}
        <div className="section-reset"><Button variant="ghost" size="sm" onClick={resetBackgroundSettings}><RotateCcw size={15} />{t("resetBackgroundSettings")}</Button></div>
      </SettingGroup>

      <SettingGroup title={t("palette")}>
        <label className="field-label" htmlFor="theme-select"><span>{t("theme")}</span>
          <Select id="theme-select" value={config.theme.mode} ariaLabel={t("theme")} onValueChange={(value) => updateConfig((current) => ({ ...current, theme: { mode: value as ThemeMode } }))} options={[
            { value: "light", label: t("light") }, { value: "dark", label: t("dark") }, { value: "system", label: t("system") },
          ]} />
        </label>
        <label className="field-label" htmlFor="theme-strength-select"><span>{t("themeStrength")}</span>
          <Select id="theme-strength-select" value={config.appearance.themeStrength} ariaLabel={t("themeStrength")} onValueChange={(value) => updateAppearance({ themeStrength: value as ThemeStrength })} options={[
            { value: "soft", label: t("soft") }, { value: "standard", label: t("standard") }, { value: "vivid", label: t("vivid") },
          ]} />
        </label>
        <div className="palette-mode" role="radiogroup" aria-label={t("themeColor")}>
          <button type="button" role="radio" aria-checked={config.appearance.paletteMode === "wallpaper"} className={config.appearance.paletteMode === "wallpaper" ? "is-active" : ""} onClick={() => updateAppearance({ paletteMode: "wallpaper", accentColor: config.appearance.wallpaperPalette[0] ?? config.appearance.accentColor })}>{t("fromWallpaper")}</button>
          <button type="button" role="radio" aria-checked={config.appearance.paletteMode === "custom"} className={config.appearance.paletteMode === "custom" ? "is-active" : ""} onClick={() => updateAppearance({ paletteMode: "custom" })}>{t("customColor")}</button>
        </div>
        <div className="palette-row" aria-label={t("wallpaperColors")}>
          {config.appearance.wallpaperPalette.map((color) => (
            <button key={color} type="button" className={config.appearance.accentColor === color ? "is-selected" : ""} style={{ backgroundColor: color }} aria-label={color} aria-pressed={config.appearance.accentColor === color} onClick={() => updateAppearance({ paletteMode: "wallpaper", accentColor: color })} />
          ))}
          <Button size="sm" onClick={() => extractColors()} disabled={extracting || config.appearance.backgroundType === "video"}><RefreshCw size={15} />{extracting ? t("extractingColors") : t("extractColors")}</Button>
        </div>
        <div className="color-fields">
          <input className="color-picker" type="color" value={normalizeHex(config.appearance.accentColor)} aria-label={t("accentColor")} onChange={(event) => applyCustomColor(event.target.value)} />
          <label className="field-label"><span>{t("accentHex")}</span><Input value={customColor} maxLength={7} onChange={(event) => applyCustomColor(event.target.value)} aria-invalid={customColor.length > 0 && !isHexColor(customColor)} /></label>
        </div>
        <Slider label={t("glassTint")} value={config.appearance.glassTint} min={0} max={18} unit="%" onChange={(value) => updateAppearance({ glassTint: value })} />
        <div className="section-reset"><Button variant="ghost" size="sm" onClick={resetTheme}><RotateCcw size={15} />{t("resetTheme")}</Button></div>
      </SettingGroup>

      <SettingGroup title={t("readability")}>
        <label className="field-label" htmlFor="surface-mode-select"><span>{t("surfaceMode")}</span>
          <Select id="surface-mode-select" value={config.appearance.surfaceMode} ariaLabel={t("surfaceMode")} onValueChange={(value) => updateAppearance({ surfaceMode: value as SurfaceMode })} options={[
            { value: "minimal", label: t("surfaceMinimal") }, { value: "glass", label: t("surfaceGlass") }, { value: "liquid", label: t("surfaceLiquid") },
          ]} />
        </label>
        <Slider label={t("backgroundBlur")} value={config.appearance.blur} min={0} max={24} unit="px" onChange={(value) => updateAppearance({ blur: value })} />
        <Slider label={t("overlay")} value={config.appearance.overlay} min={0} max={68} unit="%" onChange={(value) => updateAppearance({ overlay: value })} />
        <Slider label={t("glassOpacity")} value={config.appearance.glassOpacity} min={45} max={96} unit="%" onChange={(value) => updateAppearance({ glassOpacity: value })} />
        <Slider label={t("glassBlur")} value={config.appearance.glassBlur} min={0} max={28} unit="px" onChange={(value) => updateAppearance({ glassBlur: value })} />
        <Switch checked={config.general.motionEnabled} onCheckedChange={(value) => updateConfig((current) => ({ ...current, general: { ...current.general, motionEnabled: value } }))} label={t("motion")} />
      </SettingGroup>

      <SettingGroup title={t("composition")}>
        <div className="preset-row" aria-label={t("layoutPreset")}>
          <Button size="sm" variant="ghost" onClick={() => updateAppearance({ moduleGap: 75 })}>{t("compact")}</Button>
          <Button size="sm" variant="ghost" onClick={() => updateAppearance({ moduleGap: 100 })}>{t("balanced")}</Button>
          <Button size="sm" variant="ghost" onClick={() => updateAppearance({ moduleGap: 135 })}>{t("spacious")}</Button>
        </div>
        <Slider label={t("overallScale")} value={config.appearance.overallScale} min={80} max={120} unit="%" onChange={(value) => updateAppearance({ overallScale: value })} />
        <Slider label={t("clockScale")} value={moduleScale.clock} min={70} max={140} unit="%" onChange={(value) => updateAppearance({ moduleScale: { ...moduleScale, clock: value } })} />
        <Slider label={t("quoteScale")} value={moduleScale.quote} min={80} max={130} unit="%" onChange={(value) => updateAppearance({ moduleScale: { ...moduleScale, quote: value } })} />
        <Slider label={t("searchScale")} value={moduleScale.search} min={80} max={120} unit="%" onChange={(value) => updateAppearance({ moduleScale: { ...moduleScale, search: value } })} />
        <Slider label={t("quickLinksScale")} value={moduleScale.quickLinks} min={75} max={130} unit="%" onChange={(value) => updateAppearance({ moduleScale: { ...moduleScale, quickLinks: value } })} />
        <Slider label={t("moduleGap")} value={config.appearance.moduleGap} min={70} max={150} unit="%" onChange={(value) => updateAppearance({ moduleGap: value })} />
        <div className="two-columns">
          <Slider label={t("compositionX")} value={config.appearance.composition.x} min={35} max={65} unit="%" onChange={(value) => updateAppearance({ composition: { ...config.appearance.composition, x: value } })} />
          <Slider label={t("compositionY")} value={config.appearance.composition.y} min={35} max={65} unit="%" onChange={(value) => updateAppearance({ composition: { ...config.appearance.composition, y: value } })} />
        </div>
        <div className="section-reset"><Button variant="ghost" size="sm" onClick={resetLayout}><RotateCcw size={15} />{t("resetLayout")}</Button></div>
      </SettingGroup>
    </div>
  );
}
