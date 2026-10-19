import type { Locale } from "@/types/config";

export interface LocatedWeatherPlace {
  latitude: number;
  longitude: number;
  label: string;
}

function coordinateLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function currentCoordinates(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("GEOLOCATION_UNAVAILABLE"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => reject(new Error("GEOLOCATION_DENIED")),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10 * 60_000 },
    );
  });
}

export async function locateWeatherPlace(locale: Locale, signal?: AbortSignal): Promise<LocatedWeatherPlace> {
  const coordinates = await currentCoordinates();
  let label = coordinateLabel(coordinates.latitude, coordinates.longitude);
  try {
    const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
    url.searchParams.set("latitude", String(coordinates.latitude));
    url.searchParams.set("longitude", String(coordinates.longitude));
    url.searchParams.set("localityLanguage", locale === "en" ? "en" : "zh");
    const response = await fetch(url, { signal, cache: "no-store" });
    if (response.ok) {
      const data = await response.json() as Record<string, unknown>;
      const candidate = [data.city, data.locality, data.principalSubdivision].find((value) => typeof value === "string" && value.trim());
      if (typeof candidate === "string") label = candidate.trim();
    }
  } catch {
    // Coordinates remain a valid location if reverse geocoding is unavailable.
  }
  return { ...coordinates, label };
}

export const WEATHER_REFRESH_EVENT = "littleapple:weather-refresh";

export function requestWeatherRefresh(): void {
  window.dispatchEvent(new Event(WEATHER_REFRESH_EVENT));
}
