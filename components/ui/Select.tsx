"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  value?: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function Select({ id, value, options, onValueChange, className, ariaLabel, disabled = false }: SelectProps) {
  const generatedId = useId();
  const listId = `${id ?? generatedId}-listbox`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [listMounted, setListMounted] = useState(false);
  const [listExiting, setListExiting] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [placement, setPlacement] = useState({ left: 0, top: 0, width: 180, maxHeight: 280 });
  const selected = options[selectedIndex];
  const enabledIndices = useMemo(() => options.flatMap((option, index) => option.disabled ? [] : [index]), [options]);

  useEffect(() => {
    if (open) {
      // Retain the listbox long enough to play its paired exit transition.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setListMounted(true);
      setListExiting(false);
      return;
    }
    if (!listMounted) return;
    setListExiting(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";
    const timer = window.setTimeout(() => {
      setListMounted(false);
      setListExiting(false);
    }, reducedMotion ? 0 : 120);
    return () => window.clearTimeout(timer);
  }, [listMounted, open]);

  function positionList() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 6;
    const below = window.innerHeight - rect.bottom - gap;
    const above = rect.top - gap;
    const maxHeight = Math.max(120, Math.min(300, Math.max(below, above) - 8));
    const top = below >= Math.min(220, above) ? rect.bottom + gap : Math.max(8, rect.top - maxHeight - gap);
    setPlacement({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)), top, width: rect.width, maxHeight });
  }

  function openList() {
    if (disabled || options.length === 0) return;
    setActiveIndex(enabledIndices.includes(selectedIndex) ? selectedIndex : enabledIndices[0] ?? 0);
    positionList();
    setOpen(true);
  }

  function commit(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function move(step: 1 | -1) {
    if (enabledIndices.length === 0) return;
    const current = enabledIndices.indexOf(activeIndex);
    const next = current < 0 ? enabledIndices[0] : enabledIndices[(current + step + enabledIndices.length) % enabledIndices.length];
    setActiveIndex(next);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listId, open]);

  return (
    <span className={cn("ui-select-wrap", className)}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className="ui-select"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-expanded={open}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openList()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) openList();
            else move(event.key === "ArrowDown" ? 1 : -1);
          } else if ((event.key === "Enter" || event.key === " ") && open) {
            event.preventDefault();
            commit(activeIndex);
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          } else if (event.key === "Tab") {
            setOpen(false);
          }
        }}
      >
        <span>{selected?.label ?? "—"}</span><AppIcon name="chevronDown" size={16} />
      </button>
      {listMounted && typeof document !== "undefined" && createPortal(
        <div ref={listRef} id={listId} className={cn("ui-select-list", listExiting && "ui-select-list--exiting")} role="listbox" aria-label={ariaLabel} aria-hidden={!open} style={{ left: placement.left, top: placement.top, width: placement.width, maxHeight: placement.maxHeight }}>
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              className={activeIndex === index ? "is-active" : ""}
              disabled={option.disabled}
              onPointerMove={() => !option.disabled && setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              <span>{option.label}</span>{option.value === value ? <AppIcon name="check" size={16} /> : null}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </span>
  );
}
