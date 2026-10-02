"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit2, MoreHorizontal, Move, Plus, Trash2 } from "react-feather";
import { Button } from "@/components/ui/Button";
import { LIQUID_VISUAL_STYLE } from "@/components/ui/Surface";
import { useApp } from "@/components/providers/AppProvider";
import { QuickLinkEditor } from "@/components/quick-links/QuickLinkEditor";
import { LinkIcon } from "@/components/links/LinkIcon";
import { isSafeHttpUrl } from "@/lib/validation";
import type { QuickLink } from "@/types/config";

function SortableQuickLink({
  link,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  actionsLabel,
  draggingLabel,
  actionsOpen,
  onActionsOpenChange,
}: {
  link: QuickLink;
  onEdit: () => void;
  onDelete: () => void;
  editLabel: string;
  deleteLabel: string;
  actionsLabel: string;
  draggingLabel: string;
  actionsOpen: boolean;
  onActionsOpenChange: (open: boolean) => void;
}) {
  const { config } = useApp();
  const [menuMounted, setMenuMounted] = useState(actionsOpen);
  const [menuExiting, setMenuExiting] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });
  const visualStyle = config.appearance.surfaceMode === "liquid" ? LIQUID_VISUAL_STYLE : {};
  const style = { transform: CSS.Transform.toString(transform), transition };

  useEffect(() => {
    if (actionsOpen) {
      // The menu is retained for the paired exit transition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMenuMounted(true);
      setMenuExiting(false);
      return;
    }
    if (!menuMounted) return;
    setMenuExiting(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
    const timer = window.setTimeout(() => {
      setMenuMounted(false);
      setMenuExiting(false);
    }, reducedMotion ? 0 : 120);
    return () => window.clearTimeout(timer);
  }, [actionsOpen, menuMounted]);

  function handleContextMenu(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 2) return;
    const target = event.target;
    if (target instanceof Element && target.closest(".quick-link-menu, .quick-link-actions, .drag-handle")) return;
    event.preventDefault();
    event.stopPropagation();
    onActionsOpenChange(false);
    onEdit();
  }

  return (
    <div ref={setNodeRef} style={style} className={`quick-link ${isDragging ? "is-dragging" : ""}`} onContextMenu={handleContextMenu}>
      <span aria-hidden="true" className="quick-link-backdrop" style={visualStyle} />
      <div className="quick-link-content">
        <button className="drag-handle" type="button" aria-label={`${draggingLabel}: ${link.title}`} {...attributes} {...listeners}><Move size={16} /></button>
        <a href={isSafeHttpUrl(link.url) ? link.url : "#"} target={link.openInNewTab ? "_blank" : undefined} rel={link.openInNewTab ? "noopener noreferrer" : undefined}>
          <span className="quick-link-icon">
            <LinkIcon title={link.title} url={link.url} customIcon={link.icon} />
          </span>
          <span className="quick-link-title">{link.title}</span>
        </a>
        <Button className="quick-link-actions" variant="ghost" size="icon" aria-label={`${actionsLabel}: ${link.title}`} aria-expanded={actionsOpen} onClick={() => onActionsOpenChange(!actionsOpen)}><MoreHorizontal size={16} /></Button>
        {menuMounted && (
          <div className={`quick-link-menu${menuExiting ? " quick-link-menu--exiting" : ""}`} style={visualStyle} aria-hidden={!actionsOpen}>
            <button type="button" onClick={() => { onActionsOpenChange(false); onEdit(); }}><Edit2 size={16} />{editLabel}</button>
            <button type="button" className="danger-text" onClick={() => { onActionsOpenChange(false); onDelete(); }}><Trash2 size={16} />{deleteLabel}</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function QuickLinksGrid() {
  const { config, updateConfig, t } = useApp();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<QuickLink | undefined>();
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);

  useEffect(() => {
    if (!openActionsId) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".quick-link-menu, .quick-link-actions")) return;
      setOpenActionsId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [openActionsId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    updateConfig((current) => {
      const oldIndex = current.quickLinks.findIndex((item) => item.id === active.id);
      const newIndex = current.quickLinks.findIndex((item) => item.id === over.id);
      return { ...current, quickLinks: arrayMove(current.quickLinks, oldIndex, newIndex) };
    });
  }

  return (
    <section className="quick-links-section" aria-label={t("quickLinks")}>
      {config.quickLinks.length === 0 ? (
        <div className="empty-state">
          <button className="empty-add" type="button" aria-label={t("addQuickLink")} onClick={() => { setEditing(undefined); setEditorOpen(true); }}><Plus size={24} /></button>
          <strong>{t("noQuickLinks")}</strong>
          <p>{t("noQuickLinksHint")}</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={config.quickLinks.map((item) => item.id)} strategy={rectSortingStrategy}>
            <div className="quick-links-grid">
              {config.quickLinks.map((link) => (
                <SortableQuickLink
                  key={link.id}
                  link={link}
                  editLabel={t("edit")}
                  deleteLabel={t("remove")}
                  actionsLabel={t("actions")}
                  draggingLabel={t("dragging")}
                  actionsOpen={openActionsId === link.id}
                  onActionsOpenChange={(open) => setOpenActionsId(open ? link.id : null)}
                  onEdit={() => { setEditing(link); setEditorOpen(true); }}
                  onDelete={() => updateConfig((current) => ({ ...current, quickLinks: current.quickLinks.filter((item) => item.id !== link.id) }))}
                />
              ))}
              <button className="quick-link quick-link--add" type="button" onClick={() => { setOpenActionsId(null); setEditing(undefined); setEditorOpen(true); }}>
                <span aria-hidden="true" className="quick-link-backdrop" style={config.appearance.surfaceMode === "liquid" ? LIQUID_VISUAL_STYLE : undefined} />
                <span className="quick-link-content quick-link-add-content"><Plus size={24} /><span>{t("addQuickLink")}</span></span>
              </button>
            </div>
          </SortableContext>
        </DndContext>
      )}
      <QuickLinkEditor open={editorOpen} onOpenChange={setEditorOpen} editing={editing} />
    </section>
  );
}
