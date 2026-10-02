"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { X } from "react-feather";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/Surface";
import type { SurfaceMode } from "@/types/config";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  headerStart?: React.ReactNode;
  className?: string;
  fullScreenMobile?: boolean;
  showClose?: boolean;
  closeLabel?: string;
  surfaceVariant?: SurfaceMode | "auto";
  modalDepth?: "root" | "nested";
  surfaceStyle?: CSSProperties;
}

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
let dialogLockCount = 0;
let nestedDialogLockCount = 0;
const DIALOG_EXIT_MS = 180;

export function Dialog({
  open, onOpenChange, title, description, children, headerStart, className, fullScreenMobile = false, showClose = true, closeLabel = "Close", surfaceVariant = "auto", modalDepth = "root",
  surfaceStyle,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  const portalTarget = typeof document === "undefined" ? null : document.getElementById("dialog-root") ?? document.body;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (open) {
      // Retain the portal node long enough to play the exit animation.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
    const timer = window.setTimeout(() => setMounted(false), reducedMotion ? 0 : DIALOG_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [mounted, open]);

  useEffect(() => {
    if (!open || !portalTarget) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const content = contentRef.current;
    const first = content?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (modalDepth === "root" && document.querySelector('[data-modal-depth="nested"][aria-hidden="false"]')) return;
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !content) return;
      const focusable = [...content.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) return;
      const firstItem = focusable[0];
      const lastItem = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    dialogLockCount += 1;
    document.body.classList.add("dialog-open");
    if (modalDepth === "nested") {
      nestedDialogLockCount += 1;
      document.body.classList.add("dialog-nested-open");
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      dialogLockCount = Math.max(0, dialogLockCount - 1);
      if (dialogLockCount === 0) document.body.classList.remove("dialog-open");
      if (modalDepth === "nested") {
        nestedDialogLockCount = Math.max(0, nestedDialogLockCount - 1);
        if (nestedDialogLockCount === 0) document.body.classList.remove("dialog-nested-open");
      }
      previousFocus.current?.focus();
    };
  }, [modalDepth, onOpenChange, open, portalTarget]);

  if (!mounted || !portalTarget) return null;
  return createPortal(
    <div className={cn("dialog-layer", modalDepth === "nested" && "dialog-layer--nested", !open && "dialog-layer--exiting")} data-modal-depth={modalDepth} aria-hidden={!open} role="presentation" onMouseDown={(event) => open && event.target === event.currentTarget && onOpenChange(false)}>
      <Surface
        className={cn("dialog-surface", modalDepth === "nested" && "dialog-surface--nested")}
        variant={surfaceVariant}
        style={surfaceStyle}
        liquidRenderer={!isMobile}
      >
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={cn("dialog-content", fullScreenMobile && "dialog-content--mobile-full", className)}
        >
          <div className={cn("dialog-header", Boolean(headerStart) && "dialog-header--with-leading")}>
            <div className={headerStart ? "dialog-header-leading" : undefined}>
              {headerStart}
              <div className={headerStart ? "dialog-header-title" : undefined}>
              <h2 id={titleId}>{title}</h2>
              {description && <p id={descriptionId}>{description}</p>}
              </div>
            </div>
            {showClose && <Button variant="ghost" size="icon" aria-label={closeLabel} onClick={() => onOpenChange(false)}><X size={20} /></Button>}
          </div>
          {children}
        </div>
      </Surface>
    </div>,
    portalTarget,
  );
}
