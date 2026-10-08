"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import { FeatherActionIcon } from "@/components/links/FeatherActionIcon";
import { isMaterialIconName } from "@/lib/icons";
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
          <span className="top-action-icon">{action.iconProvider === "material" && isMaterialIconName(action.icon)
            ? <AppIcon name={action.icon ?? "link"} provider={action.iconProvider} size={18} />
            : <FeatherActionIcon name={action.icon} size={18} />}</span>
          <span>{action.title}</span>
        </a>
      ))}
      <Tooltip label={t("settings")}>
        <Button className="settings-trigger" variant="secondary" size="icon" aria-label={t("settings")} onClick={onOpenSettings}>
          <AppIcon name="settings" size={19} />
        </Button>
      </Tooltip>
    </nav>
  );
}
