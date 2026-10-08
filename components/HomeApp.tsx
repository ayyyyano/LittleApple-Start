"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { BackgroundRenderer } from "@/components/background/BackgroundRenderer";
import { Clock } from "@/components/clock/Clock";
import { Footer } from "@/components/layout/Footer";
import { TopActions } from "@/components/layout/TopActions";
import { SeasonalNotice } from "@/components/layout/SeasonalNotice";
import { useApp } from "@/components/providers/AppProvider";
import { QuickLinksGrid } from "@/components/quick-links/QuickLinksGrid";
import { SearchBox } from "@/components/search/SearchBox";
import type { SettingsSection } from "@/components/settings/SettingsPanel";
import { Quote } from "@/components/quote/Quote";
import { Button } from "@/components/ui/Button";
import { DIALOG_EXIT_MS, Dialog } from "@/components/ui/Dialog";
import { Surface } from "@/components/ui/Surface";
import { WeatherWidget } from "@/components/weather/WeatherWidget";
import { FloatingPlayer } from "@/components/player/FloatingPlayer";
import { SiteIdentityMetadata } from "@/components/layout/SiteIdentityMetadata";

const SettingsPanel = dynamic(() => import("@/components/settings/SettingsPanel").then((module) => module.SettingsPanel), {
  loading: () => null,
});

export function HomeApp() {
  const { config, ready, updateConfig, t } = useApp();
  const [backgroundReady, setBackgroundReady] = useState(false);
  const [startupTimedOut, setStartupTimedOut] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMounted, setSettingsMounted] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("appearance");
  const [focusPromptDismissed, setFocusPromptDismissed] = useState(false);
  const settingsUnmountTimer = useRef<number | null>(null);
  const bootReleased = useRef(false);
  const startupReady = ready && (backgroundReady || startupTimedOut);
  const focusPromptOpen = startupReady && config.general.minimized && config.general.showMinimizeWarning && !focusPromptDismissed;

  useEffect(() => {
    if (!ready || backgroundReady) return;
    const timer = window.setTimeout(() => setStartupTimedOut(true), 700);
    return () => window.clearTimeout(timer);
  }, [backgroundReady, ready]);

  useEffect(() => {
    if (!startupReady || bootReleased.current) return;
    bootReleased.current = true;
    const boot = document.getElementById("startup-boot");
    if (!boot) return;
    const reduceMotion = !config.general.motionEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const remove = () => {
      boot.classList.remove("is-ready");
      boot.classList.add("is-removed");
    };
    if (reduceMotion) {
      remove();
      return;
    }
    boot.classList.add("is-ready");
    const timer = window.setTimeout(remove, 240);
    return () => window.clearTimeout(timer);
  }, [config.general.motionEnabled, startupReady]);

  useEffect(() => () => {
    if (settingsUnmountTimer.current !== null) window.clearTimeout(settingsUnmountTimer.current);
  }, []);

  function openSettings(section: SettingsSection) {
    if (settingsUnmountTimer.current !== null) window.clearTimeout(settingsUnmountTimer.current);
    setSettingsSection(section);
    setSettingsMounted(true);
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
    if (settingsUnmountTimer.current !== null) window.clearTimeout(settingsUnmountTimer.current);
    settingsUnmountTimer.current = window.setTimeout(() => {
      setSettingsMounted(false);
      settingsUnmountTimer.current = null;
    }, DIALOG_EXIT_MS);
  }

  function restore(always: boolean) {
    updateConfig((current) => ({
      ...current,
      general: { ...current.general, minimized: false, showMinimizeWarning: always ? false : current.general.showMinimizeWarning },
    }));
    setFocusPromptDismissed(true);
  }

  const overall = config.appearance.overallScale / 100;
  const clockScale = overall * config.appearance.moduleScale.clock / 100;
  const quoteScale = overall * config.appearance.moduleScale.quote / 100;
  const searchScale = overall * config.appearance.moduleScale.search / 100;
  const linksScale = overall * config.appearance.moduleScale.quickLinks / 100;
  const cardScale = linksScale * config.appearance.quickLinksStyle.cardScale / 100;
  const iconScale = linksScale * config.appearance.quickLinksStyle.iconScale / 100;
  const gapScale = overall * config.appearance.moduleGap / 100;
  const xOffset = config.appearance.composition.x - 50;
  const yOffset = config.appearance.composition.y - 50;
  const compositionStyle = {
    "--composition-padding-left": `${Math.max(0, xOffset) * 1.2}vw`,
    "--composition-padding-right": `${Math.max(0, -xOffset) * 1.2}vw`,
    "--composition-padding-top": `${Math.max(0, yOffset) * 0.75}vh`,
    "--composition-padding-bottom": `${Math.max(0, -yOffset) * 0.75}vh`,
    "--clock-size-min": `${3.4 * clockScale}rem`,
    "--clock-size-fluid": `${10.4 * clockScale}vw`,
    "--clock-size-max": `${7.2 * clockScale}rem`,
    "--quote-size": `${1.02 * quoteScale}rem`,
    "--search-height": `${58 * searchScale}px`,
    "--search-width": `${760 * searchScale}px`,
    "--quick-card-width": `${104 * cardScale}px`,
    "--quick-card-height": `${100 * cardScale}px`,
    "--quick-icon-size": `${46 * iconScale}px`,
    "--quick-image-size": `${30 * iconScale}px`,
    "--quick-gap-x": `${10 * linksScale * config.appearance.quickLinksStyle.horizontalGap / 100}px`,
    "--quick-gap-y": `${12 * linksScale * config.appearance.quickLinksStyle.verticalGap / 100}px`,
    "--gap-small": `${8 * gapScale}px`,
    "--gap-medium": `${18 * gapScale}px`,
    "--gap-large": `${32 * gapScale}px`,
  } as CSSProperties;

  return (
    <div className="app-shell">
      <SiteIdentityMetadata />
      <BackgroundRenderer onReady={() => setBackgroundReady(true)} />
      {startupReady && <SeasonalNotice />}
      {startupReady && (config.general.minimized ? (
        <Surface className="restore-interface-surface" variant="auto">
          <button className="restore-interface" type="button" aria-label={t("restoreInterface")} title={t("restoreInterface")} onClick={() => restore(false)}><AppIcon name="eye" size={19} /></button>
        </Surface>
      ) : (
        <>
          <TopActions onOpenSettings={() => openSettings("appearance")} />
          <WeatherWidget />
          <main id="main-content" className="composition-stage" style={compositionStyle}>
            <div
              className="main-composition"
              data-quote-visible={config.content.visibility.quote ? "true" : "false"}
              data-quick-links-visible={config.content.visibility.quickLinks ? "true" : "false"}
              style={{ "--composition-recenter-y": `${(!config.content.visibility.quote ? 30 : 0) + (!config.content.visibility.quickLinks ? 30 : 0)}px` } as CSSProperties}
            >
              {(config.content.visibility.clock || config.content.visibility.date) && (
                <Clock showClock={config.content.visibility.clock} showDate={config.content.visibility.date} />
              )}
              {config.content.visibility.quote && <Quote />}
              <SearchBox />
              {config.content.visibility.quickLinks && <QuickLinksGrid />}
            </div>
          </main>
          {config.content.visibility.footer && <Footer onAbout={() => openSettings("about")} />}
          <FloatingPlayer />
        </>
      ))}
      {settingsMounted && <SettingsPanel key={settingsSection} open={settingsOpen} onOpenChange={(open) => open ? setSettingsOpen(true) : closeSettings()} initialSection={settingsSection} />}
      <Dialog open={focusPromptOpen} onOpenChange={(open) => !open && setFocusPromptDismissed(true)} title={t("focusPrompt")} showClose={false}>
        <div className="dialog-actions dialog-actions--stack-mobile">
          <Button onClick={() => setFocusPromptDismissed(true)}>{t("dismiss")}</Button>
          <Button onClick={() => restore(false)}>{t("showThisTime")}</Button>
          <Button variant="primary" onClick={() => restore(true)}>{t("alwaysShow")}</Button>
        </div>
      </Dialog>
    </div>
  );
}
