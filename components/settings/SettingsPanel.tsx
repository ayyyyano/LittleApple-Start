"use client";

import { useEffect, useRef, useState } from "react";
import { SettingsIcon as AppIcon } from "@/components/settings/SettingsIcon";
import type { SemanticIconName } from "@/lib/icons";
import { Dialog } from "@/components/ui/Dialog";
import { useApp } from "@/components/providers/AppProvider";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { SearchLinksSettings } from "@/components/settings/SearchLinksSettings";
import { TimeContentSettings } from "@/components/settings/TimeContentSettings";
import { DataSettings } from "@/components/settings/DataSettings";
import { AboutSettings } from "@/components/settings/AboutSettings";

export type SettingsSection = "appearance" | "searchLinks" | "timeContent" | "data" | "about";

const sections: Array<{ id: SettingsSection; icon: SemanticIconName }> = [
  { id: "appearance", icon: "appearance" },
  { id: "searchLinks", icon: "link" },
  { id: "timeContent", icon: "content" },
  { id: "data", icon: "data" },
  { id: "about", icon: "about" },
];

export function SettingsPanel({
  open,
  onOpenChange,
  initialSection = "appearance",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: SettingsSection;
}) {
  const { config, t } = useApp();
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [section]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setIsNarrow(media.matches);
      if (media.matches) setSidebarCollapsed(false);
      setDrawerOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!open) {
        setDrawerOpen(false);
        return;
      }
      setSidebarCollapsed(false);
      setDrawerOpen(false);
    });
    return () => { cancelled = true; };
  }, [open]);
  useEffect(() => {
    if (!open || !drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [drawerOpen, open]);
  const content: Record<SettingsSection, React.ReactNode> = {
    appearance: <AppearanceSettings />,
    searchLinks: <SearchLinksSettings />,
    timeContent: <TimeContentSettings />,
    data: <DataSettings onFinished={() => onOpenChange(false)} />,
    about: <AboutSettings />,
  };
  const settingsSurfaceStyle = config.appearance.surfaceMode === "liquid"
    ? { backdropFilter: "blur(var(--settings-glass-blur)) saturate(1.06)", WebkitBackdropFilter: "blur(var(--settings-glass-blur)) saturate(1.06)" }
    : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("settings")}
      closeLabel={t("close")}
      headerStart={<button className="settings-sidebar-toggle" type="button" aria-label={isNarrow ? (drawerOpen ? t("collapseSidebar") : t("expandSidebar")) : (sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar"))} aria-expanded={isNarrow ? drawerOpen : !sidebarCollapsed} aria-controls="settings-workspace" onClick={() => {
        if (window.matchMedia("(max-width: 767px)").matches) {
          setDrawerOpen((value) => !value);
        } else {
          setSidebarCollapsed((value) => !value);
        }
      }}>
        <AppIcon name="menu" size={18} />
      </button>}
      className={`settings-dialog${sidebarCollapsed ? " settings-dialog--sidebar-collapsed" : ""}${drawerOpen ? " settings-dialog--sidebar-drawer-open" : ""}`}
      fullScreenMobile
      surfaceVariant="auto"
      liquidRenderer={false}
      surfaceStyle={settingsSurfaceStyle}
    >
      <div id="settings-workspace" className="settings-layout">
        <nav className="settings-nav" aria-label={t("settings")} style={drawerOpen ? settingsSurfaceStyle : undefined}>
          {sections.map(({ id, icon }) => (
            <button key={id} type="button" className={section === id ? "is-active" : ""} aria-label={t(id)} aria-current={section === id ? "page" : undefined} onClick={() => { setSection(id); setDrawerOpen(false); }}>
              <AppIcon name={icon} size={18} /><span>{t(id)}</span>
            </button>
          ))}
        </nav>
        {drawerOpen && <button className="settings-sidebar-scrim" type="button" aria-label={t("close")} tabIndex={-1} onClick={() => setDrawerOpen(false)} />}
        <div className="settings-content" ref={contentRef}>
          <div className="settings-content-page" key={section}>
            <h3>{t(section)}</h3>
            {content[section]}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
