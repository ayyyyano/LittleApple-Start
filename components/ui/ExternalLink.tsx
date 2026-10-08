"use client";

import { useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { isSafeHttpUrl } from "@/lib/validation";
import { cn } from "@/lib/utils";
import type { IconProvider } from "@/types/config";

export function ExternalLink({ href, children, iconOnly = false, ariaLabel, modalDepth = "root", iconProvider }: { href: string; children: React.ReactNode; iconOnly?: boolean; ariaLabel?: string; modalDepth?: "root" | "nested"; iconProvider?: IconProvider }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const safe = isSafeHttpUrl(href);
  return (
    <>
      <button type="button" className={cn("text-link", iconOnly && "text-link--icon-only")} aria-label={ariaLabel} title={iconOnly ? ariaLabel : undefined} disabled={!safe} onClick={() => setOpen(true)}>{!iconOnly && children}<AppIcon name="externalLink" provider={iconProvider} size={iconOnly ? 17 : 14} /></button>
      <Dialog open={open} onOpenChange={setOpen} title={t("externalTitle")} closeLabel={t("close")} modalDepth={modalDepth} iconProvider={iconProvider} description={t("externalBody", { url: href })}>
        <div className="dialog-actions">
          <Button onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button variant="primary" onClick={() => { window.open(href, "_blank", "noopener,noreferrer"); setOpen(false); }}>{t("continue")}<AppIcon name="externalLink" size={16} /></Button>
        </div>
      </Dialog>
    </>
  );
}
