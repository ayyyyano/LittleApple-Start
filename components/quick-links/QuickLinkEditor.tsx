"use client";

import { LinkEditor, type LinkDraft } from "@/components/links/LinkEditor";
import { useApp } from "@/components/providers/AppProvider";
import { createId } from "@/lib/utils";
import type { QuickLink } from "@/types/config";
import type { IconProvider } from "@/types/config";

interface QuickLinkEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: QuickLink;
  modalDepth?: "root" | "nested";
  dialogIconProvider?: IconProvider;
}

export function QuickLinkEditor({ open, onOpenChange, editing, modalDepth = "root", dialogIconProvider }: QuickLinkEditorProps) {
  const { config, updateConfig, t } = useApp();
  function save(draft: LinkDraft) {
    const next: QuickLink = { id: editing?.id ?? createId("link"), ...draft, category: editing?.category };
    updateConfig((current) => ({
      ...current,
      quickLinks: editing
        ? current.quickLinks.map((item) => item.id === editing.id ? next : item)
        : [...current.quickLinks, next],
    }));
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
