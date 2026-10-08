"use client";

import { useState } from "react";
import { SettingsIcon as AppIcon } from "@/components/settings/SettingsIcon";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export function GeneralSettings() {
  const { config, updateConfig, t } = useApp();
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <div className="settings-stack">
      <SettingGroup title={t("startupBehavior")}>
        <Switch
          checked={config.general.minimized}
          onCheckedChange={(value) => updateConfig((current) => ({ ...current, general: { ...current.general, minimized: value } }))}
          label={t("focusMode")}
          className="focus-mode-switch"
        />
      </SettingGroup>
      <SettingGroup title={t("homepage")}>
        <Button onClick={() => setGuideOpen(true)}><AppIcon name="system" size={18} />{t("homepageGuide")}<AppIcon name="externalLink" size={15} /></Button>
      </SettingGroup>
      <Dialog open={guideOpen} onOpenChange={setGuideOpen} title={t("homepage")} closeLabel={t("close")} modalDepth="nested" description={t("homepageBody")}>
        <div className="browser-guide">
          <p><strong>Chrome / Edge</strong><span>Settings → On startup → Open a specific page</span></p>
          <p><strong>Firefox</strong><span>Settings → Home → Homepage and new windows</span></p>
          <p><strong>Safari</strong><span>Settings → General → Homepage</span></p>
        </div>
        <div className="dialog-actions"><Button variant="primary" onClick={() => setGuideOpen(false)}>{t("confirm")}</Button></div>
      </Dialog>
    </div>
  );
}
