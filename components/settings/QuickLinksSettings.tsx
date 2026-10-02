"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Edit2, Plus, Trash2 } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { QuickLinkEditor } from "@/components/quick-links/QuickLinkEditor";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { moveItem } from "@/lib/utils";
import type { QuickLink } from "@/types/config";

export function QuickLinksSettings() {
  const { config, updateConfig, t } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuickLink | undefined>();
  const style = config.appearance.quickLinksStyle;
  function updateStyle(patch: Partial<typeof style>) {
    updateConfig((current) => ({ ...current, appearance: { ...current.appearance, quickLinksStyle: { ...current.appearance.quickLinksStyle, ...patch } } }));
  }
  function applyDensity(density: typeof style.density) {
    if (density === "compact") updateStyle({ density, cardScale: 84, iconScale: 88, horizontalGap: 80, verticalGap: 80 });
    else if (density === "comfortable") updateStyle({ density, cardScale: 116, iconScale: 112, horizontalGap: 125, verticalGap: 125 });
    else if (density === "standard") updateStyle({ density, cardScale: 100, iconScale: 100, horizontalGap: 100, verticalGap: 100 });
    else updateStyle({ density });
  }
  return (
    <div className="settings-stack">
    <SettingGroup title={t("quickLinks")}>
      {config.quickLinks.length === 0 ? <div className="compact-empty"><strong>{t("noQuickLinks")}</strong><span>{t("noQuickLinksHint")}</span></div> : (
        <div className="settings-list">
          {config.quickLinks.map((link, index) => (
            <div className="settings-list-item" key={link.id}>
              <div><strong>{link.title}</strong><span>{link.url}</span></div>
              <div className="list-actions">
                <Button variant="ghost" size="icon" aria-label={t("moveUp")} disabled={index === 0} onClick={() => updateConfig((current) => ({ ...current, quickLinks: moveItem(current.quickLinks, index, index - 1) }))}><ArrowUp size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("moveDown")} disabled={index === config.quickLinks.length - 1} onClick={() => updateConfig((current) => ({ ...current, quickLinks: moveItem(current.quickLinks, index, index + 1) }))}><ArrowDown size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => { setEditing(link); setOpen(true); }}><Edit2 size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("remove")} onClick={() => updateConfig((current) => ({ ...current, quickLinks: current.quickLinks.filter((item) => item.id !== link.id) }))}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button variant="primary" onClick={() => { setEditing(undefined); setOpen(true); }}><Plus size={18} />{t("addQuickLink")}</Button>
      <QuickLinkEditor open={open} onOpenChange={setOpen} editing={editing} modalDepth="nested" />
    </SettingGroup>
    <SettingGroup title={t("quickLinksLayout")}>
      <label className="field-label" htmlFor="quick-links-density"><span>{t("density")}</span>
        <Select id="quick-links-density" value={style.density} options={[
          { value: "compact", label: t("compact") }, { value: "standard", label: t("standard") },
          { value: "comfortable", label: t("comfortable") }, { value: "advanced", label: t("advanced") },
        ]} onValueChange={(value) => applyDensity(value as typeof style.density)} />
      </label>
      {style.density === "advanced" && (
        <div className="advanced-controls">
          <Slider label={t("cardSize")} value={style.cardScale} min={75} max={130} unit="%" onChange={(value) => updateStyle({ cardScale: value })} />
          <Slider label={t("iconSize")} value={style.iconScale} min={75} max={140} unit="%" onChange={(value) => updateStyle({ iconScale: value })} />
          <Slider label={t("horizontalGap")} value={style.horizontalGap} min={70} max={150} unit="%" onChange={(value) => updateStyle({ horizontalGap: value })} />
          <Slider label={t("verticalGap")} value={style.verticalGap} min={70} max={150} unit="%" onChange={(value) => updateStyle({ verticalGap: value })} />
        </div>
      )}
    </SettingGroup>
    </div>
  );
}
