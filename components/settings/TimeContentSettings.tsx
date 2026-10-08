"use client";

import { SettingsIcon as AppIcon } from "@/components/settings/SettingsIcon";
import { useApp } from "@/components/providers/AppProvider";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { LanguageSettings } from "@/components/settings/LanguageSettings";
import { QuoteSettings } from "@/components/settings/QuoteSettings";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { TimeSettings } from "@/components/settings/TimeSettings";
import { WeatherSettings } from "@/components/settings/WeatherSettings";
import { APlayerSettings } from "@/components/settings/APlayerSettings";
import { SiteIdentitySettings } from "@/components/settings/SiteIdentitySettings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";

export function TimeContentSettings() {
  const { config, defaultConfig, updateConfig, t } = useApp();
  const updateVisibility = (patch: Partial<typeof config.content.visibility>) => updateConfig((current) => ({
    ...current,
    content: { ...current.content, visibility: { ...current.content.visibility, ...patch } },
  }));
  const updateFooter = (patch: Partial<typeof config.content.footer>) => updateConfig((current) => ({
    ...current,
    content: { ...current.content, footer: { ...current.content.footer, ...patch } },
  }));
  const footerEnabled = config.content.visibility.footer;
  const legalEnabled = footerEnabled && config.content.footer.showLegal;
  const copyrightEnabled = footerEnabled && config.content.footer.showCopyright;
  const resetFooter = () => {
    const footer = defaultConfig.content.footer;
    updateConfig((current) => ({ ...current, content: { ...current.content, footer } }));
  };
  return (
    <div className="settings-stack">
      <SiteIdentitySettings />
      <TimeSettings />
      <QuoteSettings />
      <WeatherSettings />
      <SettingGroup title={t("moduleVisibility")}>
        <Switch checked={config.content.visibility.clock} onCheckedChange={(value) => updateVisibility({ clock: value })} label={t("showClock")} />
        <Switch checked={config.content.visibility.date} onCheckedChange={(value) => updateVisibility({ date: value })} label={t("showDate")} />
        <Switch checked={config.content.visibility.quote} onCheckedChange={(value) => updateVisibility({ quote: value })} label={t("showQuote")} />
        <Switch checked={config.content.visibility.quickLinks} onCheckedChange={(value) => updateVisibility({ quickLinks: value })} label={t("showQuickLinks")} />
      </SettingGroup>
      <SettingGroup title={t("footer")}>
        <Switch checked={config.content.visibility.footer} onCheckedChange={(value) => updateVisibility({ footer: value })} label={t("showFooter")} />
        <Switch checked={config.content.footer.showLegal} disabled={!footerEnabled} onCheckedChange={(value) => updateFooter({ showLegal: value })} label={t("showLegal")} />
        <label className="field-label" htmlFor="footer-icp-text"><span>{t("icpText")}</span><Input id="footer-icp-text" value={config.content.footer.icpText} disabled={!legalEnabled} maxLength={160} onChange={(event) => updateFooter({ icpText: event.target.value.slice(0, 160) })} /></label>
        <label className="field-label" htmlFor="footer-icp-url"><span>{t("icpUrl")}</span><Input id="footer-icp-url" type="url" value={config.content.footer.icpUrl} disabled={!legalEnabled} maxLength={500} onChange={(event) => updateFooter({ icpUrl: event.target.value.slice(0, 500) })} /></label>
        <label className="field-label" htmlFor="footer-police-text"><span>{t("policeText")}</span><Input id="footer-police-text" value={config.content.footer.policeText} disabled={!legalEnabled} maxLength={160} onChange={(event) => updateFooter({ policeText: event.target.value.slice(0, 160) })} /></label>
        <label className="field-label" htmlFor="footer-police-url"><span>{t("policeUrl")}</span><Input id="footer-police-url" type="url" value={config.content.footer.policeUrl} disabled={!legalEnabled} maxLength={500} onChange={(event) => updateFooter({ policeUrl: event.target.value.slice(0, 500) })} /></label>
        <Switch checked={config.content.footer.showCopyright} disabled={!footerEnabled} onCheckedChange={(value) => updateFooter({ showCopyright: value })} label={t("showCopyright")} />
        <label className="field-label" htmlFor="footer-copyright"><span>{t("copyrightText")}</span><Input id="footer-copyright" value={config.content.footer.copyrightText} disabled={!copyrightEnabled} maxLength={160} onChange={(event) => updateFooter({ copyrightText: event.target.value.slice(0, 160) })} /></label>
        <div className="section-reset"><Button size="sm" variant="ghost" onClick={resetFooter}><AppIcon name="reset" size={15} />{t("resetFooter")}</Button></div>
      </SettingGroup>
      <SettingGroup title={t("language")}><LanguageSettings /></SettingGroup>
      <GeneralSettings />
      <APlayerSettings />
    </div>
  );
}
