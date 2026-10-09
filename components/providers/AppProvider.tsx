"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { translate, type MessageKey } from "@/i18n/resources";
import { applyDeploymentDefaults, type DeploymentDefaults } from "@/lib/deployment-defaults";
import { cloneDefaultConfig } from "@/lib/default-config";
import { createLiquidSurfaceTokens, createThemeTokens } from "@/lib/palette";
import { fetchDeploymentDefaults } from "@/services/deployment-defaults";
import { hasStoredConfig, loadStoredConfig, saveStoredConfig } from "@/services/config-storage";
import { createConfigExport, downloadConfig } from "@/services/configuration-transfer";
import type { AppConfig } from "@/types/config";
import { ToastViewport, type ToastItem } from "@/components/ui/Toast";
import { SakuraEffect } from "@/components/effects/SakuraEffect";

interface AppContextValue {
  config: AppConfig;
  ready: boolean;
  deploymentDefaults: DeploymentDefaults;
  defaultConfig: AppConfig;
  refreshDeploymentDefaults: () => Promise<DeploymentDefaults>;
  assetRevision: number;
  updateConfig: (updater: (current: AppConfig) => AppConfig) => void;
  replaceConfig: (config: AppConfig) => void;
  touchAssets: () => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  notify: (message: string, tone?: ToastItem["tone"]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(() => cloneDefaultConfig());
  const [ready, setReady] = useState(false);
  const [deploymentDefaults, setDeploymentDefaults] = useState<DeploymentDefaults>({});
  const [assetRevision, setAssetRevision] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const statusAfterLoad = useRef<"migrated" | "recovered" | null>(null);
  const lastPersistedConfig = useRef<string | null>(null);

  const notify = useCallback((message: string, tone: ToastItem["tone"] = "default") => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, message, tone }]);
  }, []);

  const refreshDeploymentDefaults = useCallback(async () => {
    const next = await fetchDeploymentDefaults();
    setDeploymentDefaults(next);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const existing = hasStoredConfig();
      const defaultsPromise = refreshDeploymentDefaults();
      const defaults = existing ? {} : await defaultsPromise;
      const loaded = await loadStoredConfig(defaults);
      if (!active) return;
      setConfig(loaded.config);
      statusAfterLoad.current = loaded.migratedLegacy ? "migrated" : loaded.recovered ? "recovered" : null;
      setReady(true);
    };
    void load();
    return () => { active = false; };
  }, [refreshDeploymentDefaults]);

  useEffect(() => {
    if (!ready || !statusAfterLoad.current) return;
    notify(translate(config.locale, statusAfterLoad.current), statusAfterLoad.current === "recovered" ? "warning" : "success");
    statusAfterLoad.current = null;
  }, [config.locale, notify, ready]);

  useEffect(() => {
    if (!ready) return;
    saveStoredConfig(config);
    const serialized = JSON.stringify(config);
    if (lastPersistedConfig.current === null) {
      lastPersistedConfig.current = serialized;
      return;
    }
    if (lastPersistedConfig.current === serialized) return;
    lastPersistedConfig.current = serialized;
    if (!config.general.autoDownloadConfig) return;
    const timer = window.setTimeout(() => {
      createConfigExport(config).then(({ payload }) => downloadConfig(payload)).catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [config, ready]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const dark = config.theme.mode === "dark" || (config.theme.mode === "system" && media.matches);
      const tokens = createThemeTokens(config.appearance.accentColor, dark, config.appearance.glassTint, config.appearance.themeStrength);
      const liquidTokens = createLiquidSurfaceTokens(dark);
      const standardShadow = dark
        ? "0 28px 80px rgb(0 0 0 / .45), 0 2px 8px rgb(0 0 0 / .25)"
        : "0 24px 64px rgb(11 42 78 / .18), 0 2px 8px rgb(11 42 78 / .08)";
      const materialShadow = dark
        ? "0 8px 20px rgb(0 0 0 / .24), 0 1px 3px rgb(0 0 0 / .18)"
        : "0 6px 18px rgb(11 42 78 / .12), 0 1px 3px rgb(11 42 78 / .08)";
      root.dataset.theme = dark ? "dark" : "light";
      root.style.colorScheme = dark ? "dark" : "only light";
      root.style.setProperty("--accent", tokens.accent);
      root.style.setProperty("--accent-strong", tokens.accentHover);
      root.style.setProperty("--accent-soft", tokens.accentMuted);
      root.style.setProperty("--on-accent", tokens.onAccent);
      root.style.setProperty("--focus-color", tokens.focusRing);
      root.style.setProperty("--surface-color", tokens.surface);
      root.style.setProperty("--surface-strong-color", tokens.surfaceElevated);
      root.style.setProperty("--surface-glass-color", tokens.surfaceGlass);
      root.style.setProperty("--surface-selected", tokens.surfaceSelected);
      root.style.setProperty("--surface-hover", tokens.surfaceHover);
      root.style.setProperty("--border", tokens.border);
      root.style.setProperty("--border-strong", tokens.borderStrong);
      root.style.setProperty("--border-tint", tokens.borderTint);
      root.style.setProperty("--text", tokens.text);
      root.style.setProperty("--text-secondary", tokens.textSecondary);
      root.style.setProperty("--liquid-on-surface", tokens.onSurface);
      root.style.setProperty("--danger", tokens.danger);
      root.style.setProperty("--danger-soft", tokens.dangerMuted);

      // Material semantic roles. These stay derived from the existing accent,
      // palette and strength settings rather than introducing a second color engine.
      root.style.setProperty("--material-primary", tokens.primary);
      root.style.setProperty("--material-on-primary", tokens.onPrimary);
      root.style.setProperty("--material-primary-container", tokens.primaryContainer);
      root.style.setProperty("--material-on-primary-container", tokens.onPrimaryContainer);
      root.style.setProperty("--material-surface", tokens.surface);
      root.style.setProperty("--material-on-surface", tokens.onSurface);
      root.style.setProperty("--material-surface-variant", tokens.surfaceVariant);
      root.style.setProperty("--material-on-surface-variant", tokens.onSurfaceVariant);
      root.style.setProperty("--material-surface-container", tokens.surfaceContainer);
      root.style.setProperty("--material-surface-container-high", tokens.surfaceContainerHigh);
      root.style.setProperty("--material-surface-container-low", tokens.surfaceContainerLow);
      root.style.setProperty("--material-outline", tokens.outline);
      root.style.setProperty("--material-outline-variant", tokens.outlineVariant);
      root.style.setProperty("--material-scrim", tokens.scrim);
      root.style.setProperty("--material-error", tokens.error);
      root.style.setProperty("--material-on-error", tokens.onError);

      root.style.setProperty("--standard-surface-color", tokens.surface);
      root.style.setProperty("--standard-surface-strong-color", tokens.surfaceElevated);
      root.style.setProperty("--standard-surface-glass-color", tokens.surfaceGlass);
      root.style.setProperty("--standard-surface-selected", tokens.surfaceSelected);
      root.style.setProperty("--standard-surface-hover", tokens.surfaceHover);
      root.style.setProperty("--standard-border", tokens.border);
      root.style.setProperty("--standard-border-strong", tokens.borderStrong);
      root.style.setProperty("--standard-border-tint", tokens.borderTint);
      root.style.setProperty("--standard-shadow", standardShadow);
      root.style.setProperty("--standard-highlight", tokens.border);
      root.style.setProperty("--standard-overlay", "rgb(1 9 19 / .64)");
      root.style.setProperty("--standard-dialog-overlay-nested", dark ? "rgb(0 0 0 / .16)" : "rgb(35 45 55 / .14)");
      // Keep old CSS variables as compatibility aliases for existing exports and
      // components while Material becomes the only non-liquid full theme.
      root.style.setProperty("--material-surface-color", tokens.surface);
      root.style.setProperty("--material-surface-strong-color", tokens.surfaceElevated);
      root.style.setProperty("--material-surface-glass-color", tokens.surfaceGlass);
      root.style.setProperty("--material-surface-selected", tokens.surfaceSelected);
      root.style.setProperty("--material-surface-hover", tokens.surfaceHover);
      root.style.setProperty("--material-border", tokens.border);
      root.style.setProperty("--material-border-strong", tokens.borderStrong);
      root.style.setProperty("--material-border-tint", tokens.borderTint);
      root.style.setProperty("--material-shadow", materialShadow);
      root.style.setProperty("--material-dialog-shadow-root", standardShadow);
      root.style.setProperty("--material-dialog-shadow-nested", dark ? "0 26px 70px rgb(0 0 0 / .38), 0 2px 8px rgb(0 0 0 / .2)" : "0 26px 70px rgb(11 42 78 / .2), 0 2px 8px rgb(11 42 78 / .1)");
      root.style.setProperty("--material-dialog-shadow-nested-mobile", dark ? "0 -18px 34px -10px rgb(0 0 0 / .54), 0 -4px 12px -4px rgb(0 0 0 / .36), inset 0 1px 0 rgb(255 255 255 / .22)" : "0 -18px 34px -10px rgb(20 30 40 / .3), 0 -4px 12px -4px rgb(20 30 40 / .18), inset 0 1px 0 rgb(255 255 255 / .5)");
      root.style.setProperty("--material-highlight", tokens.border);
      root.style.setProperty("--material-overlay", "rgb(1 9 19 / .64)");
      root.style.setProperty("--material-dialog-overlay-nested", dark ? "rgb(0 0 0 / .16)" : "rgb(35 45 55 / .14)");

      // Simple keeps interaction states neutral; accent is reserved for explicit
      // primary actions rather than being used as a glass-like selected fill.
      root.style.setProperty("--minimal-surface-selected", tokens.surfaceElevated);
      root.style.setProperty("--minimal-surface-hover", tokens.surface);
      root.style.setProperty("--minimal-surface-color", tokens.surface);
      root.style.setProperty("--minimal-surface-strong-color", tokens.surfaceElevated);
      root.style.setProperty("--minimal-surface-glass-color", tokens.surfaceGlass);
      root.style.setProperty("--minimal-border", tokens.border);
      root.style.setProperty("--minimal-border-strong", tokens.borderStrong);
      root.style.setProperty("--minimal-border-tint", tokens.borderTint);
      root.style.setProperty("--minimal-shadow", standardShadow);
      root.style.setProperty("--minimal-highlight", tokens.border);
      root.style.setProperty("--minimal-overlay", "rgb(1 9 19 / .64)");
      root.style.setProperty("--minimal-dialog-overlay-nested", dark ? "rgb(0 0 0 / .16)" : "rgb(35 45 55 / .14)");

      root.style.setProperty("--liquid-surface-color", liquidTokens.surface);
      root.style.setProperty("--liquid-surface-strong-color", liquidTokens.surfaceElevated);
      root.style.setProperty("--liquid-surface-glass-color", liquidTokens.surfaceGlass);
      root.style.setProperty("--liquid-surface-selected", liquidTokens.surfaceSelected);
      root.style.setProperty("--liquid-surface-hover", liquidTokens.surfaceHover);
      root.style.setProperty("--liquid-border", liquidTokens.border);
      root.style.setProperty("--liquid-border-strong", liquidTokens.borderStrong);
      root.style.setProperty("--liquid-border-tint", liquidTokens.borderTint);
      root.style.setProperty("--liquid-shadow", liquidTokens.shadow);
      root.style.setProperty("--liquid-card-shadow", liquidTokens.cardShadow);
      root.style.setProperty("--liquid-highlight", liquidTokens.highlight);
      root.style.setProperty("--liquid-overlay", liquidTokens.overlay);
      root.style.setProperty("--liquid-dialog-overlay-nested", dark ? "rgb(0 0 0 / .16)" : "rgb(35 45 55 / .14)");
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [config.appearance.accentColor, config.appearance.glassTint, config.appearance.themeStrength, config.theme.mode]);

  useEffect(() => {
    document.documentElement.lang = config.locale;
  }, [config.locale]);

  useEffect(() => {
    document.documentElement.dataset.motion = config.general.motionEnabled ? "on" : "off";
  }, [config.general.motionEnabled]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--glass-opacity", String(config.appearance.glassOpacity / 100));
    root.style.setProperty("--glass-blur", `${config.appearance.glassBlur}px`);
    root.style.setProperty("--settings-glass-blur", `${Math.max(0, config.appearance.glassBlur)}px`);
    root.dataset.surfaceMode = config.appearance.surfaceMode;

    const userOpacity = config.appearance.glassOpacity / 100;
    const standardProfile = {
      control: 0.48 + userOpacity * 0.32,
      controlHover: 0.58 + userOpacity * 0.32,
      panel: 0.42 + userOpacity * 0.38,
      panelStrong: 0.65 + userOpacity * 0.3,
      panelInner: 0.44 + userOpacity * 0.3,
    };
    const liquidProfile = {
      control: 0.14 + userOpacity * 0.13,
      controlHover: 0.19 + userOpacity * 0.13,
      panel: 0.19 + userOpacity * 0.17,
      panelStrong: 0.24 + userOpacity * 0.16,
      panelInner: 0.08 + userOpacity * 0.08,
    };
    const minimalProfile = { control: 0.9, controlHover: 0.96, panel: 0.94, panelStrong: 0.96, panelInner: 0.9 };
    const surfaceMix = (color: string, alpha: number) => `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
    const setProfile = (
      prefix: "material" | "standard" | "liquid" | "minimal",
      base: { surface: string; strong: string; glass: string },
      profile: { control: number; controlHover: number; panel: number; panelStrong: number; panelInner: number },
    ) => {
      root.style.setProperty(`--${prefix}-surface-control`, surfaceMix(base.glass, profile.control));
      root.style.setProperty(`--${prefix}-surface-control-hover`, surfaceMix(base.strong, profile.controlHover));
      root.style.setProperty(`--${prefix}-surface-panel`, surfaceMix(base.glass, profile.panel));
      root.style.setProperty(`--${prefix}-surface-panel-strong`, surfaceMix(base.strong, profile.panelStrong));
      root.style.setProperty(`--${prefix}-surface-panel-inner`, surfaceMix(base.surface, profile.panelInner));
    };

    setProfile("standard", {
      surface: "var(--standard-surface-color)",
      strong: "var(--standard-surface-strong-color)",
      glass: "var(--standard-surface-glass-color)",
    }, standardProfile);
    // Material owns opaque tonal containers. Unlike Liquid, its surfaces do
    // not derive their identity from wallpaper transparency or backdrop blur.
    root.style.setProperty("--material-surface-control", "var(--material-surface-container)");
    root.style.setProperty("--material-surface-control-hover", "color-mix(in srgb, var(--material-primary) 10%, var(--material-surface-container))");
    root.style.setProperty("--material-surface-panel", "var(--material-surface-container)");
    root.style.setProperty("--material-surface-panel-strong", "var(--material-surface-container-high)");
    root.style.setProperty("--material-surface-panel-inner", "var(--material-surface-container-low)");
    setProfile("liquid", {
      surface: "var(--liquid-surface-color)",
      strong: "var(--liquid-surface-strong-color)",
      glass: "var(--liquid-surface-glass-color)",
    }, liquidProfile);
    setProfile("minimal", {
      surface: "var(--standard-surface-color)",
      strong: "var(--standard-surface-strong-color)",
      glass: "var(--standard-surface-glass-color)",
    }, minimalProfile);

    const activePrefix = config.appearance.surfaceMode === "liquid"
      ? "liquid"
      : config.appearance.surfaceMode === "minimal"
        ? "minimal"
        : "material";
    root.style.setProperty("--surface-control", `var(--${activePrefix}-surface-control)`);
    root.style.setProperty("--surface-control-hover", `var(--${activePrefix}-surface-control-hover)`);
    root.style.setProperty("--surface-panel", `var(--${activePrefix}-surface-panel)`);
    root.style.setProperty("--surface-panel-strong", `var(--${activePrefix}-surface-panel-strong)`);
    root.style.setProperty("--surface-panel-inner", `var(--${activePrefix}-surface-panel-inner)`);
    root.style.setProperty("--surface-selected", `var(--${activePrefix}-surface-selected)`);
    root.style.setProperty("--surface-hover", `var(--${activePrefix}-surface-hover)`);
    root.style.setProperty("--surface-border", `var(--${activePrefix}-border)`);
    root.style.setProperty("--surface-border-strong", `var(--${activePrefix}-border-strong)`);
    root.style.setProperty("--surface-border-tint", `var(--${activePrefix}-border-tint)`);
    root.style.setProperty("--surface-shadow", `var(--${activePrefix}-shadow)`);
    root.style.setProperty("--dialog-shadow-root", `var(--${activePrefix}-dialog-shadow-root)`);
    root.style.setProperty("--dialog-shadow-nested", `var(--${activePrefix}-dialog-shadow-nested)`);
    root.style.setProperty("--dialog-shadow-nested-mobile", `var(--${activePrefix}-dialog-shadow-nested-mobile)`);
    root.style.setProperty("--surface-highlight", `var(--${activePrefix}-highlight)`);
    root.style.setProperty("--surface-overlay", `var(--${activePrefix}-overlay)`);
    root.style.setProperty("--dialog-overlay-root", `var(--${activePrefix}-overlay)`);
    root.style.setProperty("--dialog-overlay-nested", `var(--${activePrefix}-dialog-overlay-nested)`);
    root.style.setProperty("--surface-active-strong-color", `var(--${activePrefix}-surface-strong-color)`);
    const isMaterial = config.appearance.surfaceMode === "material";
    const isMinimal = config.appearance.surfaceMode === "minimal";
    root.style.setProperty("--state-hover-bg", config.appearance.surfaceMode === "liquid" ? "var(--liquid-state-hover)" : isMaterial ? "color-mix(in srgb, var(--material-primary) 10%, transparent)" : isMinimal ? "var(--minimal-surface-hover)" : "color-mix(in srgb, var(--accent) 10%, transparent)");
    root.style.setProperty("--state-hover-fg", "var(--text)");
    root.style.setProperty("--state-selected-bg", config.appearance.surfaceMode === "liquid" ? "var(--liquid-state-selected)" : isMaterial ? "var(--material-primary-container)" : isMinimal ? "var(--minimal-surface-selected)" : "color-mix(in srgb, var(--accent) 16%, transparent)");
    root.style.setProperty("--state-selected-fg", config.appearance.surfaceMode === "liquid" ? "var(--liquid-state-fg)" : isMaterial ? "var(--material-on-primary-container)" : isMinimal ? "var(--text)" : "var(--accent-strong)");
    root.style.setProperty("--state-active-bg", config.appearance.surfaceMode === "liquid" ? "var(--liquid-state-active)" : isMaterial ? "var(--material-primary-container)" : isMinimal ? "var(--minimal-surface-hover)" : "color-mix(in srgb, var(--accent) 22%, transparent)");
    root.style.setProperty("--state-active-fg", config.appearance.surfaceMode === "liquid" ? "var(--liquid-state-fg)" : isMaterial ? "var(--material-on-primary-container)" : isMinimal ? "var(--text)" : "var(--accent-strong)");
    root.style.setProperty("--state-focus-ring", "var(--focus)");
    root.style.setProperty("--state-danger-fg", "var(--danger)");
    root.style.setProperty("--state-danger-hover-bg", "color-mix(in srgb, var(--danger) 14%, transparent)");
    root.style.setProperty("--peripheral-bg", "var(--surface-control)");
    root.style.setProperty("--peripheral-bg-hover", "var(--surface-control-hover)");
    root.style.setProperty("--peripheral-bg-active", config.appearance.surfaceMode === "liquid" ? "var(--liquid-state-active)" : "var(--state-active-bg)");
    root.style.setProperty("--peripheral-fg", "var(--text)");
    root.style.setProperty("--peripheral-fg-muted", "var(--text-secondary)");
    root.style.setProperty("--peripheral-border", "var(--surface-border)");
    root.style.setProperty("--peripheral-border-hover", config.appearance.surfaceMode === "liquid" ? "var(--surface-border-strong)" : "var(--accent)");
    root.style.setProperty("--peripheral-shadow", "var(--surface-shadow)");
    root.style.setProperty("--peripheral-active-fg", "var(--accent-strong)");
    root.style.setProperty("--peripheral-active-tint", config.appearance.surfaceMode === "liquid" ? "var(--liquid-state-selected)" : "var(--state-active-bg)");
    root.style.setProperty("--peripheral-focus-ring", "var(--focus)");
    root.style.setProperty("--primary-bg", isMaterial ? "var(--material-primary)" : "var(--accent)");
    root.style.setProperty("--primary-fg", isMaterial ? "var(--material-on-primary)" : "var(--on-accent)");
    root.style.setProperty("--liquid-state-hover", "var(--liquid-menu-hover)");
    root.style.setProperty("--liquid-state-selected", "var(--liquid-menu-selected)");
    root.style.setProperty("--liquid-state-active", "color-mix(in srgb, var(--liquid-surface-selected) 44%, transparent)");
    root.style.setProperty("--liquid-state-fg", "var(--liquid-on-surface)");
  }, [config.appearance.glassBlur, config.appearance.glassOpacity, config.appearance.surfaceMode]);

  const updateConfig = useCallback((updater: (current: AppConfig) => AppConfig) => {
    setConfig((current) => updater(current));
  }, []);

  const replaceConfig = useCallback((next: AppConfig) => setConfig(next), []);
  const touchAssets = useCallback(() => setAssetRevision((value) => value + 1), []);
  const t = useCallback((key: MessageKey, values?: Record<string, string | number>) => translate(config.locale, key, values), [config.locale]);

  const value = useMemo<AppContextValue>(() => ({
    config,
    ready,
    deploymentDefaults,
    defaultConfig: applyDeploymentDefaults(cloneDefaultConfig(), deploymentDefaults),
    refreshDeploymentDefaults,
    assetRevision,
    updateConfig,
    replaceConfig,
    touchAssets,
    t,
    notify,
  }), [assetRevision, config, deploymentDefaults, notify, ready, refreshDeploymentDefaults, replaceConfig, t, touchAssets, updateConfig]);

  return (
    <AppContext.Provider value={value}>
      {children}
      <SakuraEffect />
      <ToastViewport items={toasts} onDismiss={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
