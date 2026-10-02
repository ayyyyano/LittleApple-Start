"use client";

import { useApp } from "@/components/providers/AppProvider";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { SettingGroup } from "@/components/settings/SettingGroup";
import type { DateFormat } from "@/types/config";

const TIMEZONES = [
  ["Asia/Shanghai", "北京 / Shanghai (UTC+8)"],
  ["Asia/Tokyo", "Tokyo (UTC+9)"],
  ["Asia/Hong_Kong", "Hong Kong (UTC+8)"],
  ["Europe/London", "London"],
  ["Europe/Paris", "Paris"],
  ["America/New_York", "New York"],
  ["America/Los_Angeles", "Los Angeles"],
] as const;

export function TimeSettings() {
  const { config, updateConfig, t } = useApp();
  const updateClock = (patch: Partial<typeof config.clock>) => updateConfig((current) => ({ ...current, clock: { ...current.clock, ...patch } }));
  return (
    <div className="settings-stack">
      <SettingGroup title={t("timezone")}>
        <label className="field-label" htmlFor="timezone-select"><span>{t("timezone")}</span>
          <Select id="timezone-select" value={config.clock.timezone} options={TIMEZONES.map(([value, label]) => ({ value, label }))} onValueChange={(value) => updateClock({ timezone: value })} />
        </label>
      </SettingGroup>
      <SettingGroup title={t("time")}>
        <Switch checked={config.clock.useLocalTime} onCheckedChange={(value) => updateClock({ useLocalTime: value })} label={t("localTime")} />
        <Switch checked={config.clock.format24h} onCheckedChange={(value) => updateClock({ format24h: value })} label={t("format24h")} />
        <Switch checked={config.clock.showSeconds} onCheckedChange={(value) => updateClock({ showSeconds: value })} label={t("showSeconds")} />
        <Switch checked={config.clock.showNetworkWarning} disabled={config.clock.useLocalTime} onCheckedChange={(value) => updateClock({ showNetworkWarning: value })} label={t("showNetworkWarning")} />
        <label className="field-label" htmlFor="date-format"><span>{t("dateFormat")}</span>
          <Select id="date-format" value={config.clock.dateFormat} options={[
            { value: "numeric", label: "2026/09/30 周三" }, { value: "long", label: "2026年9月30日 星期三" }, { value: "iso", label: "2026-09-30 Wed" },
          ]} onValueChange={(value) => updateClock({ dateFormat: value as DateFormat })} />
        </label>
      </SettingGroup>
    </div>
  );
}
