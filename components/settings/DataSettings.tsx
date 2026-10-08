"use client";

import { useRef, useState } from "react";
import { SettingsIcon as AppIcon } from "@/components/settings/SettingsIcon";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Switch } from "@/components/ui/Switch";
import { parseConfigFile } from "@/lib/config-parser";
import {
  applyImportedConfiguration,
  createConfigExport,
  downloadConfig,
  resetAllConfiguration,
} from "@/services/configuration-transfer";
import type { ConfigExportV4 } from "@/types/config";

export function DataSettings({ onFinished }: { onFinished: () => void }) {
  const { config, replaceConfig, touchAssets, notify, t, refreshDeploymentDefaults } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ConfigExportV4 | null>(null);
  // Keep the last preview snapshot while Dialog owns its exit presence.
  const [previewContent, setPreviewContent] = useState<ConfigExportV4 | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function exportConfig() {
    setBusy(true);
    try {
      const { payload, omittedLargeAsset } = await createConfigExport(config);
      downloadConfig(payload);
      if (omittedLargeAsset) notify(t("exportLargeWarning"), "warning");
    } catch { notify(t("storageError"), "danger"); }
    finally { setBusy(false); }
  }

  async function readImport(file: File) {
    try {
      const text = await file.text();
      const parsed = parseConfigFile(text);
      setPreviewContent(parsed);
      setPreview(parsed);
    } catch (error) {
      notify(t(error instanceof Error && error.message === "UNSUPPORTED_CONFIG_VERSION" ? "unsupportedVersion" : "invalidConfig"), "danger");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function applyImport() {
    if (!preview) return;
    setBusy(true);
    try {
      await applyImportedConfiguration(preview);
      replaceConfig(preview.config);
      touchAssets();
      setPreview(null);
      notify(t("importSuccess"), "success");
      onFinished();
    } catch { notify(t("storageError"), "danger"); }
    finally { setBusy(false); }
  }

  async function reset() {
    setBusy(true);
    try {
      const defaults = await resetAllConfiguration(await refreshDeploymentDefaults());
      replaceConfig(defaults);
      touchAssets();
      setResetOpen(false);
      onFinished();
    } catch { notify(t("storageError"), "danger"); }
    finally { setBusy(false); }
  }

  return (
    <div className="settings-stack">
      <SettingGroup title={t("data")}>
        <Switch
          checked={config.general.autoDownloadConfig}
          onCheckedChange={(value) => replaceConfig({ ...config, general: { ...config.general, autoDownloadConfig: value } })}
          label={t("autoDownload")}
        />
        <div className="button-grid">
          <Button onClick={exportConfig} disabled={busy}><AppIcon name="download" size={18} />{t("exportConfig")}</Button>
          <Button onClick={() => inputRef.current?.click()} disabled={busy}><AppIcon name="upload" size={18} />{t("importConfig")}</Button>
        </div>
        <input ref={inputRef} className="sr-only" type="file" accept=".littleapple,application/json,.json" onChange={(event) => event.target.files?.[0] && readImport(event.target.files[0])} />
      </SettingGroup>
      <SettingGroup title={t("reset")} description={t("resetBody")}>
        <Button variant="danger" onClick={() => setResetOpen(true)}><AppIcon name="reset" size={18} />{t("reset")}</Button>
      </SettingGroup>
      <Dialog open={Boolean(preview)} onOpenChange={(value) => !value && setPreview(null)} title={t("importPreview")} closeLabel={t("close")} modalDepth="nested" description={previewContent ? t("importSummary", { engines: previewContent.config.search.engines.length, links: previewContent.config.quickLinks.length }) : undefined}>
        {previewContent && (
          <div className="import-preview-grid">
            <span>{t("language")}<strong>{previewContent.config.locale}</strong></span>
            <span>{t("engines")}<strong>{previewContent.config.search.engines.length}</strong></span>
            <span>{t("quickLinks")}<strong>{previewContent.config.quickLinks.length}</strong></span>
            <span>{t("background")}<strong>{previewContent.background?.visual ? "✓" : "—"}</strong></span>
          </div>
        )}
        <div className="dialog-actions"><Button onClick={() => setPreview(null)}>{t("cancel")}</Button><Button variant="primary" disabled={busy} onClick={applyImport}>{t("applyImport")}</Button></div>
      </Dialog>
      <Dialog open={resetOpen} onOpenChange={setResetOpen} title={t("resetTitle")} closeLabel={t("close")} modalDepth="nested" description={t("resetBody")}>
        <div className="dialog-actions"><Button onClick={() => setResetOpen(false)}>{t("cancel")}</Button><Button variant="danger" disabled={busy} onClick={reset}>{t("resetConfirm")}</Button></div>
      </Dialog>
    </div>
  );
}
