"use client";

import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";

export function WeatherSettings() {
  const { config, updateConfig, t } = useApp();
  const weather = config.content.weather;
  const updateWeather = (patch: Partial<typeof weather>) => updateConfig((current) => ({
    ...current,
    content: { ...current.content, weather: { ...current.content.weather, ...patch } },
  }));
  return (
    <SettingGroup title={t("weather")}>
      <Switch checked={weather.enabled} onCheckedChange={(enabled) => updateWeather({ enabled })} label={t("showWeather")} />
      {weather.enabled ? (
        <div className="advanced-controls">
          <label className="field-label" htmlFor="weather-provider"><span>{t("weatherProvider")}</span><Select id="weather-provider" value={weather.provider} options={[{ value: "open-meteo", label: "Open-Meteo" }]} onValueChange={() => updateWeather({ provider: "open-meteo" })} /></label>
          <label className="field-label"><span>{t("weatherLocation")}</span><Input value={weather.location} maxLength={80} onChange={(event) => updateWeather({ location: event.target.value })} placeholder={t("weatherLocationPlaceholder")} /></label>
          <Switch checked={weather.showIcon} onCheckedChange={(showIcon) => updateWeather({ showIcon })} label={t("weatherShowIcon")} />
          <Switch checked={weather.showTemperature} onCheckedChange={(showTemperature) => updateWeather({ showTemperature })} label={t("weatherShowTemperature")} />
          <Switch checked={weather.showCondition} onCheckedChange={(showCondition) => updateWeather({ showCondition })} label={t("weatherShowCondition")} />
          <Switch checked={weather.showLocation} onCheckedChange={(showLocation) => updateWeather({ showLocation })} label={t("weatherShowLocation")} />
          <label className="field-label" htmlFor="weather-refresh"><span>{t("weatherRefresh")}</span><Select id="weather-refresh" value={String(weather.refreshMinutes)} options={[20, 30, 60].map((value) => ({ value: String(value), label: t("minutes", { value }) }))} onValueChange={(value) => updateWeather({ refreshMinutes: Number(value) as 20 | 30 | 60 })} /></label>
        </div>
      ) : null}
    </SettingGroup>
  );
}
