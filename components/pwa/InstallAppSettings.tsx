"use client";

import { useId, useSyncExternalStore } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { SettingsIcon } from "@/components/settings/SettingsIcon";
import { Button } from "@/components/ui/Button";
import { pwaInstall, type PwaInstallStatus } from "@/lib/pwa-install";
import type { MessageKey } from "@/i18n/resources";

const STATUS_MESSAGES: Record<PwaInstallStatus, MessageKey> = {
  checking: "pwaChecking", unavailable: "pwaUnavailable", insecure: "pwaInsecure", ready: "pwaReady", prompting: "pwaPrompting",
  accepted: "pwaAccepted", dismissed: "pwaDismissed", installed: "pwaInstalled", error: "pwaError",
};

export function InstallAppSettings() {
  const { t } = useApp();
  const status = useSyncExternalStore(pwaInstall.subscribe, pwaInstall.getSnapshot, pwaInstall.getServerSnapshot);
  const statusId = useId();
  return (
    <SettingGroup title={t("pwaSection")}>
      <div className="button-row">
        <Button disabled={status !== "ready"} aria-describedby={statusId} onClick={() => void pwaInstall.install()}>
          <SettingsIcon name="download" size={18} />{t(status === "installed" ? "pwaInstalledButton" : "pwaInstallButton")}
        </Button>
      </div>
      <p id={statusId} className="field-hint" role="status">{t(STATUS_MESSAGES[status])}</p>
      <p className="field-hint">{t("pwaOfflineHint")}</p>
    </SettingGroup>
  );
}
