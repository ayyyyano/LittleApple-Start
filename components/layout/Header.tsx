"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Tooltip } from "@/components/ui/Tooltip";
import { useApp } from "@/components/providers/AppProvider";
import type { Locale } from "@/types/config";

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { config, updateConfig, t } = useApp();
  return (
    <header className="site-header glass-surface">
      <a href="#main-content" className="brand" aria-label={t("brandDesktop")}>
        <span className="brand-icon"><AppIcon name="home" size={20} /></span>
        <span className="brand-desktop">{t("brandDesktop")}</span>
        <span className="brand-mobile">{t("brand")}</span>
        <span className="brand-slogan">{t("slogan")}</span>
      </a>
      <div className="header-actions">
        <label className="sr-only" htmlFor="language-select">{t("language")}</label>
        <Select id="language-select" value={config.locale} options={[
          { value: "zh-CN", label: "简体中文" }, { value: "zh-TW", label: "繁體中文" }, { value: "en", label: "English" },
        ]} onValueChange={(value) => updateConfig((current) => ({ ...current, locale: value as Locale }))} />
        <Tooltip label={t("settings")}>
          <Button variant="ghost" size="icon" aria-label={t("settings")} onClick={onOpenSettings}><AppIcon name="settings" size={20} /></Button>
        </Tooltip>
      </div>
    </header>
  );
}
