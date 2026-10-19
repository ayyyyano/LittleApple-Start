"use client";

import { useEffect, useRef, useState } from "react";
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
import { QUICK_LINK_ICON_LIMIT } from "@/services/quick-link-icon-storage";

export interface LinkDraft {
  title: string;
  url: string;
  icon?: string;
  iconAssetId?: string;
  iconProvider?: IconProvider;
  openInNewTab: boolean;
}

export interface LinkIconUpdate {
  file: File | null;
  keepExistingLocalIcon: boolean;
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
  onSave: (draft: LinkDraft, iconUpdate: LinkIconUpdate) => void | Promise<void>;
  iconMode?: "url" | "feather" | "provider";
  modalDepth?: "root" | "nested";
  dialogIconProvider?: IconProvider;
}) {
  const { t } = useApp();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={heading} closeLabel={t("close")} modalDepth={modalDepth} iconProvider={dialogIconProvider}>
      <LinkEditorForm
        key={editing?.id ?? "new"}
        active={open}
        editing={editing}
        existing={existing}
        iconMode={iconMode}
        onCancel={() => onOpenChange(false)}
        onSave={async (draft, iconUpdate) => { await onSave(draft, iconUpdate); onOpenChange(false); }}
      />
    </Dialog>
  );
}

function LinkEditorForm({
  active,
  editing,
  existing,
  onCancel,
  onSave,
  iconMode,
}: {
  active: boolean;
  editing?: ExistingLink;
  existing: ExistingLink[];
  onCancel: () => void;
  onSave: (draft: LinkDraft, iconUpdate: LinkIconUpdate) => void | Promise<void>;
  iconMode: "url" | "feather" | "provider";
}) {
  const { t } = useApp();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? "");
  const [iconProvider, setIconProvider] = useState<IconProvider>(editing?.iconProvider ?? "feather");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [keepExistingLocalIcon, setKeepExistingLocalIcon] = useState(Boolean(editing?.iconAssetId));
  const [newTab, setNewTab] = useState(editing?.openInNewTab ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const titleRequest = useRef<AbortController | null>(null);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  useEffect(() => {
    if (!active) titleRequest.current?.abort();
    return () => titleRequest.current?.abort();
  }, [active]);

  function cancelTitleRequest() {
    titleRequest.current?.abort();
    titleRequest.current = null;
    setFetchingTitle(false);
  }

  async function fetchTitle() {
    const target = normalizeHttpUrl(url);
    if (title.trim() || !url.trim() || !isSafeHttpUrl(target)) return;
    cancelTitleRequest();
    const controller = new AbortController();
    titleRequest.current = controller;
    setFetchingTitle(true);
    setError(null);
    let timedOut = false;
    const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 10_000);
    try {
      const response = await fetch(`/api/site-title?url=${encodeURIComponent(target)}`, { signal: controller.signal, cache: "no-store" });
      const result: unknown = await response.json();
      if (controller.signal.aborted || titleRequest.current !== controller) return;
      if (!response.ok || !result || typeof result !== "object" || !("title" in result) || typeof result.title !== "string" || !result.title.trim()) throw new Error("NO_TITLE");
      setTitle(result.title.slice(0, 60));
    } catch {
      if (titleRequest.current === controller && (!controller.signal.aborted || timedOut)) setError(t("fetchTitleFailed"));
    } finally {
      window.clearTimeout(timer);
      if (titleRequest.current === controller) { titleRequest.current = null; setFetchingTitle(false); }
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedUrl = normalizeHttpUrl(url);
    const normalizedIcon = icon.trim() ? (iconMode === "url" ? normalizeHttpUrl(icon) : icon.trim().toLocaleLowerCase()) : undefined;
    if (!title.trim() || !url.trim()) { setError(t("requiredError")); return; }
    if (!isSafeHttpUrl(normalizedUrl) || (iconMode === "url" && normalizedIcon && !isSafeHttpUrl(normalizedIcon))) { setError(t("invalidUrlError")); return; }
    if (iconMode === "provider" && normalizedIcon && ((iconProvider === "feather" && !isFeatherIconName(normalizedIcon)) || (iconProvider === "material" && !isMaterialIconName(normalizedIcon)))) { setError(t("invalidIconFallback")); return; }
    if (existing.some((item) => item.id !== editing?.id && item.url === normalizedUrl)) { setError(t("duplicateError")); return; }
    setSaving(true);
    try {
      await onSave(
        { title: title.trim(), url: normalizedUrl, icon: normalizedIcon, iconProvider: iconMode === "provider" ? iconProvider : undefined, openInNewTab: newTab },
        { file: iconMode === "url" ? iconFile : null, keepExistingLocalIcon: iconMode === "url" && keepExistingLocalIcon },
      );
    } catch {
      setError(t("storageError"));
      setSaving(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label><span>{t("title")}</span><Input value={title} onChange={(event) => { cancelTitleRequest(); setError(null); setTitle(event.target.value); }} autoFocus maxLength={60} /></label>
      <label><span>{t("url")}</span><Input value={url} onChange={(event) => { cancelTitleRequest(); setError(null); setUrl(event.target.value); }} placeholder="https://example.com" inputMode="url" /></label>
      {iconMode === "url" ? <div className="link-title-lookup"><Button size="sm" disabled={!active || fetchingTitle || Boolean(title.trim()) || !url.trim() || !isSafeHttpUrl(normalizeHttpUrl(url))} onClick={() => void fetchTitle()}><AppIcon name="download" size={16} />{t(fetchingTitle ? "fetchingTitle" : "fetchSiteTitle")}</Button><p className="field-hint">{t("fetchTitleHint")}</p></div> : null}
      {iconMode === "url" ? (
        <div className="form-stack form-stack--compact">
          <label><span>{t("customIcon")}</span><Input value={icon} onChange={(event) => { setIcon(event.target.value); setIconFile(null); setKeepExistingLocalIcon(false); }} placeholder="https://example.com/icon.png" inputMode="url" /></label>
          <input ref={iconFileRef} className="sr-only" type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!file.type.startsWith("image/")) { setError(t("quickLinkIconTypeError")); return; }
            if (file.size > QUICK_LINK_ICON_LIMIT) { setError(t("quickLinkIconTooLarge")); return; }
            setIconFile(file);
            setIcon("");
            setKeepExistingLocalIcon(false);
            setError(null);
          }} />
          <div className="button-row">
            <Button size="sm" onClick={() => iconFileRef.current?.click()}><AppIcon name="upload" size={16} />{t("uploadLocalIcon")}</Button>
            {(iconFile || keepExistingLocalIcon || icon) ? <Button size="sm" variant="ghost" onClick={() => { setIconFile(null); setKeepExistingLocalIcon(false); setIcon(""); }}>{t("clearCustomIcon")}</Button> : null}
          </div>
          {(iconFile || keepExistingLocalIcon) ? <p className="field-hint">{iconFile?.name ?? t("localIconSaved")}</p> : null}
        </div>
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
      <div className="dialog-actions"><Button onClick={onCancel} disabled={saving}>{t("cancel")}</Button><Button variant="primary" type="submit" disabled={saving}>{t("save")}</Button></div>
    </form>
  );
}
