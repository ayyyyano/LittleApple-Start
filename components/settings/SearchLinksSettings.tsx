"use client";

import { QuickLinksSettings } from "@/components/settings/QuickLinksSettings";
import { SearchSettings } from "@/components/settings/SearchSettings";
import { TopActionsSettings } from "@/components/settings/TopActionsSettings";

export function SearchLinksSettings() {
  return <div className="settings-stack"><SearchSettings /><QuickLinksSettings /><TopActionsSettings /></div>;
}
