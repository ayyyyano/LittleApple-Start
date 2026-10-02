"use client";

import { useState } from "react";
import { ExternalLink } from "react-feather";
import { FeatherActionIcon, isFeatherIconName } from "@/components/links/FeatherActionIcon";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { isSafeHttpUrl, normalizeHttpUrl } from "@/lib/validation";

export interface LinkDraft {
  title: string;
  url: string;
  icon?: string;
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  editing?: ExistingLink;
  existing: ExistingLink[];
  onSave: (draft: LinkDraft) => void;
  iconMode?: "url" | "feather";
  modalDepth?: "root" | "nested";
}) {
  const { t } = useApp();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={heading} closeLabel={t("close")} modalDepth={modalDepth}>
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
  iconMode: "url" | "feather";
}) {
  const { t } = useApp();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "");
  const [newTab, setNewTab] = useState(editing?.openInNewTab ?? true);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedUrl = normalizeHttpUrl(url);
    const normalizedIcon = icon.trim() ? (iconMode === "url" ? normalizeHttpUrl(icon) : icon.trim().toLocaleLowerCase()) : undefined;
    if (!title.trim() || !url.trim()) { setError(t("requiredError")); return; }
    if (!isSafeHttpUrl(normalizedUrl) || (iconMode === "url" && normalizedIcon && !isSafeHttpUrl(normalizedIcon))) { setError(t("invalidUrlError")); return; }
    if (existing.some((item) => item.id !== editing?.id && item.url === normalizedUrl)) { setError(t("duplicateError")); return; }
    onSave({ title: title.trim(), url: normalizedUrl, icon: normalizedIcon, openInNewTab: newTab });
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label><span>{t("title")}</span><Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={60} /></label>
      <label><span>{t("url")}</span><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" inputMode="url" /></label>
      {iconMode === "url" ? (
        <label><span>{t("customIcon")}</span><Input value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="https://example.com/icon.png" inputMode="url" /></label>
      ) : (
        <div className="form-stack form-stack--compact">
          <label><span>{t("featherIconName")}</span><Input value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="home" aria-invalid={!isFeatherIconName(icon)} /></label>
          <div className="feather-icon-preview"><FeatherActionIcon name={icon} size={20} /><span>{isFeatherIconName(icon) ? (icon || "link") : t("invalidIconFallback")}</span></div>
          <a className="text-link" href="https://feathericons.com/" target="_blank" rel="noopener noreferrer">{t("featherReference")}<ExternalLink size={14} /></a>
        </div>
      )}
      <Switch checked={newTab} onCheckedChange={setNewTab} label={t("openNewTab")} />
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="dialog-actions"><Button onClick={onCancel}>{t("cancel")}</Button><Button variant="primary" type="submit">{t("save")}</Button></div>
    </form>
  );
}
