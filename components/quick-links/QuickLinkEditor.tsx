"use client";

import { LinkEditor, type LinkDraft, type LinkIconUpdate } from "@/components/links/LinkEditor";
import { useApp } from "@/components/providers/AppProvider";
import { createId } from "@/lib/utils";
import type { QuickLink } from "@/types/config";
import type { IconProvider } from "@/types/config";
import { deleteQuickLinkIcon, quickLinkIconAssetId, saveQuickLinkIcon } from "@/services/quick-link-icon-storage";

interface QuickLinkEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: QuickLink;
  modalDepth?: "root" | "nested";
  dialogIconProvider?: IconProvider;
}

export function QuickLinkEditor({ open, onOpenChange, editing, modalDepth = "root", dialogIconProvider }: QuickLinkEditorProps) {
  const { config, updateConfig, touchAssets, t } = useApp();
  async function save(draft: LinkDraft, iconUpdate: LinkIconUpdate) {
    const id = editing?.id ?? createId("link");
    const localAssetId = quickLinkIconAssetId(id);
    let iconAssetId = iconUpdate.keepExistingLocalIcon ? editing?.iconAssetId : undefined;
    if (iconUpdate.file) {
      await saveQuickLinkIcon(localAssetId, iconUpdate.file);
      iconAssetId = localAssetId;
    } else if (editing?.iconAssetId && !iconUpdate.keepExistingLocalIcon) {
      await deleteQuickLinkIcon(editing.iconAssetId);
    }
    const next: QuickLink = { id, ...draft, iconAssetId, category: editing?.category };
    updateConfig((current) => ({
      ...current,
      quickLinks: editing
        ? current.quickLinks.map((item) => item.id === editing.id ? next : item)
        : [...current.quickLinks, next],
    }));
    touchAssets();
  }
  return (
    <LinkEditor
      open={open}
      onOpenChange={onOpenChange}
      heading={editing ? t("edit") : t("addQuickLink")}
      editing={editing}
      existing={config.quickLinks}
      onSave={save}
      modalDepth={modalDepth}
      dialogIconProvider={dialogIconProvider}
    />
  );
}
