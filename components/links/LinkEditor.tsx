"use client";

import { useState } from "react";
import { FeatherActionIcon, isFeatherIconName } from "@/components/links/FeatherActionIcon";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Select } from "@/components/ui/Select";
import { AppIcon } from "@/components/ui/AppIcon";
import { isMaterialIconName } from "@/lib/icons";
import type { IconProvider } from "@/types/config";
import { isSafeHttpUrl, normalizeHttpUrl } from "@/lib/validation";

export interface LinkDraft {
  title: string;
  url: string;
  icon?: string;
  iconProvider?: IconProvider;
  openInNewTab: boolean;
}

interface ExistingLink extends LinkDraft { id: string }

export function LinkEditor({
  open,
  onOpenChange,
  heading,
  editing,
  existing,
  onSave,
  iconMode = "url",
  modalDepth = "root",
  dialogIconProvider,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  editing?: ExistingLink;
  existing: ExistingLink[];
  onSave: (draft: LinkDraft) => void;
  iconMode?: "url" | "feather" | "provider";
  modalDepth?: "root" | "nested";
  dialogIconProvider?: IconProvider;
}) {
  const { t } = useApp();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={heading} closeLabel={t("close")} modalDepth={modalDepth} iconProvider={dialogIconProvider}>
      <LinkEditorForm
        key={editing?.id ?? "new"}
        editing={editing}
        existing={existing}
        iconMode={iconMode}
        onCancel={() => onOpenChange(false)}
        onSave={(draft) => { onSave(draft); onOpenChange(false); }}
      />
    </Dialog>
  );
}

function LinkEditorForm({
  editing,
  existing,
  onCancel,
  onSave,
  iconMode,
}: {
  editing?: ExistingLink;
  existing: ExistingLink[];
  onCancel: () => void;
  onSave: (draft: LinkDraft) => void;
  iconMode: "url" | "feather" | "provider";
}) {
  const { t } = useApp();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "");
  const [iconProvider, setIconProvider] = useState<IconProvider>(editing?.iconProvider ?? "feather");
  const [newTab, setNewTab] = useState(editing?.openInNewTab ?? true);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedUrl = normalizeHttpUrl(url);
    const normalizedIcon = icon.trim() ? (iconMode === "url" ? normalizeHttpUrl(icon) : icon.trim().toLocaleLowerCase()) : undefined;
    if (!title.trim() || !url.trim()) { setError(t("requiredError")); return; }
    if (!isSafeHttpUrl(normalizedUrl) || (iconMode === "url" && normalizedIcon && !isSafeHttpUrl(normalizedIcon))) { setError(t("invalidUrlError")); return; }
    if (iconMode === "provider" && normalizedIcon && ((iconProvider === "feather" && !isFeatherIconName(normalizedIcon)) || (iconProvider === "material" && !isMaterialIconName(normalizedIcon)))) { setError(t("invalidIconFallback")); return; }
    if (existing.some((item) => item.id !== editing?.id && item.url === normalizedUrl)) { setError(t("duplicateError")); return; }
    onSave({ title: title.trim(), url: normalizedUrl, icon: normalizedIcon, iconProvider: iconMode === "provider" ? iconProvider : undefined, openInNewTab: newTab });
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label><span>{t("title")}</span><Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={60} /></label>
      <label><span>{t("url")}</span><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" inputMode="url" /></label>
      {iconMode === "url" ? (
        <label><span>{t("customIcon")}</span><Input value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="https://example.com/icon.png" inputMode="url" /></label>
      ) : (
        <div className="form-stack form-stack--compact">
          {iconMode === "provider" && <label><span>{t("iconStyle")}</span><Select value={iconProvider} ariaLabel={t("iconStyle")} onValueChange={(value) => setIconProvider(value as IconProvider)} options={[{ value: "feather", label: t("iconFeather") }, { value: "material", label: t("iconMaterial") }]} /></label>}
          <label><span>{iconMode === "provider" && iconProvider === "material" ? t("materialIconName") : t("featherIconName")}</span><Input value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="home" aria-invalid={iconMode === "provider" && iconProvider === "material" ? !isMaterialIconName(icon) : !isFeatherIconName(icon)} /></label>
          <div className="feather-icon-preview">{iconMode === "provider" && iconProvider === "material" && isMaterialIconName(icon) ? <AppIcon name={icon} provider="material" size={20} /> : <FeatherActionIcon name={icon} size={20} />}<span>{icon || "link"}</span></div>
          {iconMode !== "provider" && <a className="text-link" href="https://feathericons.com/" target="_blank" rel="noopener noreferrer">{t("featherReference")}<AppIcon name="externalLink" size={14} /></a>}
        </div>
      )}
      <Switch checked={newTab} onCheckedChange={setNewTab} label={t("openNewTab")} />
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="dialog-actions"><Button onClick={onCancel}>{t("cancel")}</Button><Button variant="primary" type="submit">{t("save")}</Button></div>
    </form>
  );
}
