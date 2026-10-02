"use client";

import { Settings } from "react-feather";
import { FeatherActionIcon } from "@/components/links/FeatherActionIcon";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { isSafeHttpUrl } from "@/lib/validation";

export function TopActions({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { config, t } = useApp();
  return (
    <nav className="top-actions" aria-label={t("topActions")}>
      {config.topActions.map((action) => (
        <a
          className="top-action"
          key={action.id}
          href={isSafeHttpUrl(action.url) ? action.url : "#"}
          target={action.openInNewTab ? "_blank" : undefined}
          rel={action.openInNewTab ? "noopener noreferrer" : undefined}
        >
          <span className="top-action-icon"><FeatherActionIcon name={action.icon} size={18} /></span>
          <span>{action.title}</span>
        </a>
      ))}
      <Tooltip label={t("settings")}>
        <Button className="settings-trigger" variant="secondary" size="icon" aria-label={t("settings")} onClick={onOpenSettings}>
          <Settings size={19} />
        </Button>
      </Tooltip>
    </nav>
  );
}
