import type { NormalizedWeather } from "@/types/weather";

const WEATHER_CACHE_KEY = "littleapple.weather-cache.v1";

interface CacheMap { [key: string]: NormalizedWeather }

function readMap(): CacheMap {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) ?? "{}") as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as CacheMap : {};
  } catch {
    return {};
  }
}

export function readWeatherCache(key: string): NormalizedWeather | null {
  const value = readMap()[key];
  return value && typeof value.temperature === "number" && typeof value.updatedAt === "string" ? value : null;
}

export function writeWeatherCache(key: string, weather: NormalizedWeather): void {
  try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ...readMap(), [key]: weather })); } catch { /* Cache failure must not affect the start page. */ }
}

export function clearWeatherCache(): void {
  localStorage.removeItem(WEATHER_CACHE_KEY);
}
