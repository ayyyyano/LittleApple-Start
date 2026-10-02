"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { fetchWeather, weatherCacheKey } from "@/lib/weather";
import { readWeatherCache, writeWeatherCache } from "@/services/weather-cache";
import type { MessageKey } from "@/i18n/resources";
import type { NormalizedWeather } from "@/types/weather";

const REQUEST_TIMEOUT = 6500;

export function WeatherWidget() {
  const { config, t } = useApp();
  const weatherConfig = config.content.weather;
  const [weather, setWeather] = useState<NormalizedWeather | null>(null);

  useEffect(() => {
    if (!weatherConfig.enabled || !weatherConfig.location.trim()) return;
    let active = true;
    const key = weatherCacheKey(weatherConfig);
    const cached = readWeatherCache(key);
    if (cached) queueMicrotask(() => active && setWeather(cached));
    const age = cached ? Date.now() - Date.parse(cached.updatedAt) : Number.POSITIVE_INFINITY;
    if (age < weatherConfig.refreshMinutes * 60_000) return () => { active = false; };

    const controller = new AbortController();
    const requestTimer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const debounceTimer = window.setTimeout(() => {
      fetchWeather(weatherConfig, config.locale, controller.signal)
        .then((next) => {
          writeWeatherCache(key, next);
          if (active) setWeather(next);
        })
        .catch(() => undefined)
        .finally(() => window.clearTimeout(requestTimer));
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(debounceTimer);
      window.clearTimeout(requestTimer);
      controller.abort();
    };
  }, [config.locale, weatherConfig]);

  if (!weatherConfig.enabled || !weather) return null;
  const updated = new Intl.DateTimeFormat(config.locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(weather.updatedAt));
  return (
    <aside className="weather-widget" aria-label={t("weather")} title={`${weather.location} · ${t("updatedAt")} ${updated}`}>
      {weatherConfig.showIcon ? <span aria-hidden="true">{weather.icon}</span> : null}
      {weatherConfig.showTemperature ? <strong>{weather.temperature}°</strong> : null}
      {weatherConfig.showTemperature && weatherConfig.showCondition ? <span className="weather-separator" aria-hidden="true">·</span> : null}
      {weatherConfig.showCondition ? <span>{t(`weather${weather.condition[0].toUpperCase()}${weather.condition.slice(1)}` as MessageKey)}</span> : null}
      {weatherConfig.showLocation && (weatherConfig.showTemperature || weatherConfig.showCondition) ? <span className="weather-separator" aria-hidden="true">·</span> : null}
      {weatherConfig.showLocation ? <span>{weather.location}</span> : null}
    </aside>
  );
}
