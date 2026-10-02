import type { Locale, WeatherConfig, WeatherProviderId } from "@/types/config";
import type { NormalizedWeather, WeatherCondition } from "@/types/weather";

interface WeatherProvider {
  id: WeatherProviderId;
  fetchCurrent: (location: string, locale: Locale, signal: AbortSignal) => Promise<NormalizedWeather>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function conditionFromCode(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code <= 2) return "partlyCloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

function iconForCondition(condition: WeatherCondition): string {
  return { clear: "☀", partlyCloudy: "⛅", cloudy: "☁", fog: "≋", drizzle: "🌦", rain: "🌧", snow: "❄", storm: "⛈" }[condition];
}

async function fetchOpenMeteo(location: string, locale: Locale, signal: AbortSignal): Promise<NormalizedWeather> {
  const language = locale === "en" ? "en" : "zh";
  const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodingUrl.searchParams.set("name", location);
  geocodingUrl.searchParams.set("count", "1");
  geocodingUrl.searchParams.set("language", language);
  geocodingUrl.searchParams.set("format", "json");
  const geocodingResponse = await fetch(geocodingUrl, { signal, cache: "no-store" });
  if (!geocodingResponse.ok) throw new Error("WEATHER_LOCATION_FAILED");
  const geocoding = await geocodingResponse.json() as unknown;
  const first = isRecord(geocoding) && Array.isArray(geocoding.results) && isRecord(geocoding.results[0]) ? geocoding.results[0] : null;
  if (!first || typeof first.latitude !== "number" || typeof first.longitude !== "number" || typeof first.name !== "string") throw new Error("WEATHER_LOCATION_MISSING");

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(first.latitude));
  forecastUrl.searchParams.set("longitude", String(first.longitude));
  forecastUrl.searchParams.set("current", "temperature_2m,weather_code");
  forecastUrl.searchParams.set("timezone", "auto");
  const forecastResponse = await fetch(forecastUrl, { signal, cache: "no-store" });
  if (!forecastResponse.ok) throw new Error("WEATHER_REQUEST_FAILED");
  const forecast = await forecastResponse.json() as unknown;
  const current = isRecord(forecast) && isRecord(forecast.current) ? forecast.current : null;
  if (!current || typeof current.temperature_2m !== "number" || typeof current.weather_code !== "number") throw new Error("WEATHER_RESPONSE_INVALID");
  const condition = conditionFromCode(current.weather_code);
  return {
    temperature: Math.round(current.temperature_2m),
    condition,
    icon: iconForCondition(condition),
    code: current.weather_code,
    location: first.name,
    updatedAt: new Date().toISOString(),
  };
}

export const WEATHER_PROVIDERS: Record<WeatherProviderId, WeatherProvider> = {
  "open-meteo": { id: "open-meteo", fetchCurrent: fetchOpenMeteo },
};

export function weatherCacheKey(config: WeatherConfig): string {
  return `${config.provider}:${config.location.trim().toLocaleLowerCase()}`;
}

export function fetchWeather(config: WeatherConfig, locale: Locale, signal: AbortSignal): Promise<NormalizedWeather> {
  return WEATHER_PROVIDERS[config.provider].fetchCurrent(config.location.trim(), locale, signal);
}
