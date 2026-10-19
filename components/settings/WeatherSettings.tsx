"use client";

import { useState } from "react";
import { SettingsIcon as AppIcon } from "@/components/settings/SettingsIcon";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { locateWeatherPlace, requestWeatherRefresh } from "@/lib/weather-location";
import type { WeatherRefreshMinutes, WeatherTemperatureUnit } from "@/types/config";

export function WeatherSettings() {
  const { config, updateConfig, t, notify } = useApp();
  const [locating, setLocating] = useState(false);
  const weather = config.content.weather;
  const updateWeather = (patch: Partial<typeof weather>) => updateConfig((current) => ({
    ...current,
    content: { ...current.content, weather: { ...current.content.weather, ...patch } },
  }));
  async function locate() {
    setLocating(true);
    try {
      const place = await locateWeatherPlace(config.locale);
      updateWeather({ location: place.label, latitude: place.latitude, longitude: place.longitude });
      requestWeatherRefresh();
      notify(t("weatherLocationUpdated"), "success");
    } catch {
      notify(t("weatherLocationFailed"), "danger");
    } finally {
      setLocating(false);
    }
  }
  return (
    <SettingGroup title={t("weather")}>
      <Switch checked={weather.enabled} onCheckedChange={(enabled) => updateWeather({ enabled })} label={t("showWeather")} />
      {weather.enabled ? (
        <div className="advanced-controls">
          <label className="field-label" htmlFor="weather-provider"><span>{t("weatherProvider")}</span><Select id="weather-provider" value={weather.provider} options={[{ value: "open-meteo", label: "Open-Meteo" }]} onValueChange={() => updateWeather({ provider: "open-meteo" })} /></label>
          <label className="field-label"><span>{t("weatherLocation")}</span><Input value={weather.location} maxLength={80} onChange={(event) => updateWeather({ location: event.target.value, latitude: undefined, longitude: undefined })} placeholder={t("weatherLocationPlaceholder")} /></label>
          <div className="button-row">
            <Button onClick={() => void locate()} disabled={locating}><AppIcon name="weather" size={17} />{locating ? t("weatherLocating") : t("weatherUseLocation")}</Button>
            <Button onClick={requestWeatherRefresh}><AppIcon name="refresh" size={17} />{t("refreshWeather")}</Button>
          </div>
          <Switch checked={weather.autoLocate} onCheckedChange={(autoLocate) => updateWeather({ autoLocate })} label={t("weatherAutoLocate")} />
          <label className="field-label" htmlFor="weather-unit"><span>{t("weatherTemperatureUnit")}</span><Select id="weather-unit" value={weather.temperatureUnit} options={[
            { value: "celsius", label: t("celsius") },
            { value: "fahrenheit", label: t("fahrenheit") },
          ]} onValueChange={(value) => updateWeather({ temperatureUnit: value as WeatherTemperatureUnit })} /></label>
          <Switch checked={weather.showIcon} onCheckedChange={(showIcon) => updateWeather({ showIcon })} label={t("weatherShowIcon")} />
          <Switch checked={weather.showTemperature} onCheckedChange={(showTemperature) => updateWeather({ showTemperature })} label={t("weatherShowTemperature")} />
          <Switch checked={weather.showCondition} onCheckedChange={(showCondition) => updateWeather({ showCondition })} label={t("weatherShowCondition")} />
          <Switch checked={weather.showLocation} onCheckedChange={(showLocation) => updateWeather({ showLocation })} label={t("weatherShowLocation")} />
          <label className="field-label" htmlFor="weather-refresh"><span>{t("weatherRefresh")}</span><Select id="weather-refresh" value={String(weather.refreshMinutes)} options={[
            { value: "0", label: t("never") },
            ...[15, 20, 30, 60].map((value) => ({ value: String(value), label: t("minutes", { value }) })),
          ]} onValueChange={(value) => updateWeather({ refreshMinutes: Number(value) as WeatherRefreshMinutes })} /></label>
        </div>
      ) : null}
    </SettingGroup>
  );
}
