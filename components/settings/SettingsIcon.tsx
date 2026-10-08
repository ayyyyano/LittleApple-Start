"use client";

import { useApp } from "@/components/providers/AppProvider";
import { AppIcon, type AppIconProps } from "@/components/ui/AppIcon";
import { resolveIconProvider } from "@/lib/icons";

/** Settings follows the same theme-aware provider contract as the rest of the fixed UI. */
export function SettingsIcon({ provider, ...props }: AppIconProps) {
  const { config } = useApp();
  const resolvedProvider = provider ?? resolveIconProvider(config.appearance.iconStyle, config.appearance.surfaceMode);
  return <AppIcon {...props} provider={resolvedProvider} />;
}
