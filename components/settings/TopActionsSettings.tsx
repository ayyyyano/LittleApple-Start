"use client";

import { useState } from "react";
import { SettingsIcon as AppIcon } from "@/components/settings/SettingsIcon";
import { LinkEditor, type LinkDraft } from "@/components/links/LinkEditor";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Button } from "@/components/ui/Button";
import { createId, moveItem } from "@/lib/utils";
import type { TopAction } from "@/types/config";

export function TopActionsSettings() {
  const { config, updateConfig, t } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TopAction | undefined>();

  function save(draft: LinkDraft) {
    const next: TopAction = { id: editing?.id ?? createId("action"), ...draft };
    updateConfig((current) => ({
      ...current,
      topActions: editing
        ? current.topActions.map((item) => item.id === editing.id ? next : item)
        : [...current.topActions, next].slice(0, 4),
    }));
  }

  return (
    <SettingGroup title={t("topActions")}>
      {config.topActions.length === 0 ? (
        <div className="compact-empty"><strong>{t("noTopActions")}</strong></div>
      ) : (
        <div className="settings-list">
          {config.topActions.map((action, index) => (
            <div className="settings-list-item" key={action.id}>
              <div><strong>{action.title}</strong><span>{action.url}</span></div>
              <div className="list-actions">
                <Button variant="ghost" size="icon" aria-label={t("moveUp")} disabled={index === 0} onClick={() => updateConfig((current) => ({ ...current, topActions: moveItem(current.topActions, index, index - 1) }))}><AppIcon name="arrowUp" size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("moveDown")} disabled={index === config.topActions.length - 1} onClick={() => updateConfig((current) => ({ ...current, topActions: moveItem(current.topActions, index, index + 1) }))}><AppIcon name="arrowDown" size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => { setEditing(action); setOpen(true); }}><AppIcon name="edit" size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("remove")} onClick={() => updateConfig((current) => ({ ...current, topActions: current.topActions.filter((item) => item.id !== action.id) }))}><AppIcon name="delete" size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button variant="primary" disabled={config.topActions.length >= 4} onClick={() => { setEditing(undefined); setOpen(true); }}><AppIcon name="add" size={18} />{t("addTopAction")}</Button>
      <LinkEditor
        open={open}
        onOpenChange={setOpen}
        modalDepth="nested"
        heading={editing ? t("editTopAction") : t("addTopAction")}
        editing={editing}
        existing={config.topActions}
        iconMode="provider"
        onSave={save}
      />
    </SettingGroup>
  );
}
