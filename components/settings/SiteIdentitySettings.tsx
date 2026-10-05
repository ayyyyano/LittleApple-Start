"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Trash2, Upload } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { deleteBackgroundAsset, getBackgroundAsset, saveBackgroundAsset } from "@/services/background-storage";

export const DEFAULT_SITE_NAME = "LittleApple Start";

export function useAvatarUrl(assetId: "avatar" | null, assetRevision: number) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    if (assetId) {
      getBackgroundAsset("avatar").then((asset) => {
        if (!active) return;
        if (asset) {
          objectUrl = URL.createObjectURL(asset.blob);
          setAvatarUrl(objectUrl);
        } else {
          setAvatarUrl(null);
        }
      }).catch(() => undefined);
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, assetRevision]);

  return assetId ? avatarUrl : null;
}

export function SiteIdentitySettings() {
  const { config, defaultConfig, assetRevision, updateConfig, touchAssets, notify, t } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const avatarUrl = useAvatarUrl(config.siteIdentity.avatarAssetId, assetRevision);

  async function handleAvatar(file: File) {
    if (!file.type.startsWith("image/")) {
      notify(t("siteAvatarTypeError"), "danger");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify(t("siteAvatarTooLarge"), "danger");
      return;
    }
    try {
      await saveBackgroundAsset({ id: "avatar", blob: file, mimeType: file.type, name: file.name, updatedAt: new Date().toISOString() });
      touchAssets();
      updateConfig((current) => ({ ...current, siteIdentity: { ...current.siteIdentity, avatarAssetId: "avatar" } }));
    } catch {
      notify(t("storageError"), "danger");
    }
  }

  async function resetLogo() {
    try { await deleteBackgroundAsset("avatar"); } catch { /* Missing avatar is already the desired state. */ }
    touchAssets();
    updateConfig((current) => ({ ...current, siteIdentity: { ...current.siteIdentity, avatarAssetId: null } }));
  }

  async function resetIdentity() {
    await resetLogo();
    updateConfig((current) => ({ ...current, siteIdentity: { name: defaultConfig.siteIdentity.name, avatarAssetId: null } }));
  }

  return (
    <SettingGroup title={t("siteIdentity")}>
      <div className="identity-preview-row">
        <Image className="identity-avatar" src={avatarUrl ?? "/favicon.ico"} alt={t("siteAvatarAlt")} width={56} height={56} unoptimized />
      </div>
      <label className="field-label" htmlFor="site-name">
        <span>{t("siteName")}</span>
        <Input id="site-name" value={config.siteIdentity.name} maxLength={60} onChange={(event) => updateConfig((current) => ({ ...current, siteIdentity: { ...current.siteIdentity, name: event.target.value.slice(0, 60) } }))} />
      </label>
      <div className="identity-actions">
        <input ref={inputRef} className="sr-only" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleAvatar(file); event.target.value = ""; }} />
        <Button size="sm" onClick={() => inputRef.current?.click()}><Upload size={15} />{config.siteIdentity.avatarAssetId ? t("replaceAvatar") : t("uploadAvatar")}</Button>
        <Button size="sm" variant="ghost" disabled={!config.siteIdentity.avatarAssetId} onClick={() => void resetLogo()}><Trash2 size={15} />{t("resetLogo")}</Button>
      </div>
      <div className="identity-actions identity-actions--reset"><Button size="sm" variant="secondary" onClick={() => void resetIdentity()}><RotateCcw size={15} />{t("resetIdentity")}</Button></div>
    </SettingGroup>
  );
}
