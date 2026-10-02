"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Info, X } from "react-feather";
import { Button } from "@/components/ui/Button";

export interface ToastItem {
  id: string;
  message: string;
  tone: "default" | "success" | "warning" | "danger";
}

export function ToastViewport({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const timersRef = useRef(new Map<string, number>());
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const beginDismiss = useCallback((id: string) => {
    if (exitingIds.has(id)) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
    if (reducedMotion) {
      onDismissRef.current(id);
      return;
    }
    setExitingIds((current) => new Set(current).add(id));
    const existing = timersRef.current.get(id);
    if (existing) window.clearTimeout(existing);
    timersRef.current.set(id, window.setTimeout(() => {
      onDismissRef.current(id);
      timersRef.current.delete(id);
      setExitingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }, 180));
  }, [exitingIds]);

  useEffect(() => {
    const visibleIds = new Set(items.map((item) => item.id));
    for (const item of items) {
      if (!exitingIds.has(item.id) && !timersRef.current.has(item.id)) {
        timersRef.current.set(item.id, window.setTimeout(() => beginDismiss(item.id), 4200));
      }
    }
    for (const [id, timer] of timersRef.current) {
      if (!visibleIds.has(id)) {
        window.clearTimeout(timer);
        timersRef.current.delete(id);
      }
    }
  }, [beginDismiss, exitingIds, items]);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) window.clearTimeout(timer);
  }, []);

  return (
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <div className={`toast toast--${item.tone}${exitingIds.has(item.id) ? " toast--exiting" : ""}`} key={item.id} role="status">
          {item.tone === "success" ? <CheckCircle size={20} /> : item.tone === "warning" || item.tone === "danger" ? <AlertCircle size={20} /> : <Info size={20} />}
          <span>{item.message}</span>
          <Button variant="ghost" size="icon" aria-label="Dismiss" onClick={() => beginDismiss(item.id)}><X size={16} /></Button>
        </div>
      ))}
    </div>
  );
}
