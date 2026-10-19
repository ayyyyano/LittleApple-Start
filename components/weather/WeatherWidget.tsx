"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { fetchWeather, weatherCacheKey } from "@/lib/weather";
import { readWeatherCache, writeWeatherCache } from "@/services/weather-cache";
import type { MessageKey } from "@/i18n/resources";
import type { NormalizedWeather } from "@/types/weather";
import { locateWeatherPlace, requestWeatherRefresh, WEATHER_REFRESH_EVENT } from "@/lib/weather-location";

const REQUEST_TIMEOUT = 6500;

export function WeatherWidget() {
  const { config, updateConfig, t } = useApp();
  const weatherConfig = config.content.weather;
  const [weather, setWeather] = useState<NormalizedWeather | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const autoLocateAttempted = useRef(false);
  const handledRefreshNonce = useRef(0);

  useEffect(() => {
    const refresh = () => setRefreshNonce((value) => value + 1);
    window.addEventListener(WEATHER_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(WEATHER_REFRESH_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!weatherConfig.enabled || !weatherConfig.autoLocate) {
      autoLocateAttempted.current = false;
      return;
    }
    if (autoLocateAttempted.current) return;
    autoLocateAttempted.current = true;
    let active = true;
    const controller = new AbortController();
    void locateWeatherPlace(config.locale, controller.signal).then((place) => {
      if (!active) return;
      updateConfig((current) => ({
        ...current,
        content: { ...current.content, weather: { ...current.content.weather, location: place.label, latitude: place.latitude, longitude: place.longitude } },
      }));
    }).catch(() => undefined);
    return () => { active = false; controller.abort(); };
  }, [config.locale, updateConfig, weatherConfig.autoLocate, weatherConfig.enabled]);

  useEffect(() => {
    if (!weatherConfig.enabled || (!weatherConfig.location.trim() && (weatherConfig.latitude === undefined || weatherConfig.longitude === undefined))) return;
    let active = true;
    const key = weatherCacheKey(weatherConfig);
    const cached = readWeatherCache(key);
    if (cached) queueMicrotask(() => active && setWeather(cached));
    const age = cached ? Date.now() - Date.parse(cached.updatedAt) : Number.POSITIVE_INFINITY;
    const forced = refreshNonce !== handledRefreshNonce.current;
    if (forced) handledRefreshNonce.current = refreshNonce;
    if (cached && !forced) {
      if (weatherConfig.refreshMinutes === 0) return () => { active = false; };
      const refreshAfter = weatherConfig.refreshMinutes * 60_000;
      if (age < refreshAfter) {
        const timer = window.setTimeout(() => setRefreshNonce((value) => value + 1), Math.max(1_000, refreshAfter - age));
        return () => { active = false; window.clearTimeout(timer); };
      }
    }

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
  }, [config.locale, refreshNonce, weather?.updatedAt, weatherConfig]);

  if (!weatherConfig.enabled || !weather) return null;
  const updated = new Intl.DateTimeFormat(config.locale, { hour: "2-digit", minute: "2-digit" }).format(new Date(weather.updatedAt));
  return (
    <button type="button" className="weather-widget" aria-label={t("refreshWeather")} title={`${weather.location} · ${t("updatedAt")} ${updated} · ${t("clickToRefresh")}`} onClick={requestWeatherRefresh}>
      {weatherConfig.showIcon ? <span aria-hidden="true">{weather.icon}</span> : null}
      {weatherConfig.showTemperature ? <strong>{weather.temperature}°{weatherConfig.temperatureUnit === "fahrenheit" ? "F" : "C"}</strong> : null}
      {weatherConfig.showTemperature && weatherConfig.showCondition ? <span className="weather-separator" aria-hidden="true">·</span> : null}
      {weatherConfig.showCondition ? <span>{t(`weather${weather.condition[0].toUpperCase()}${weather.condition.slice(1)}` as MessageKey)}</span> : null}
      {weatherConfig.showLocation && (weatherConfig.showTemperature || weatherConfig.showCondition) ? <span className="weather-separator" aria-hidden="true">·</span> : null}
      {weatherConfig.showLocation ? <span>{weather.location}</span> : null}
    </button>
  );
}
