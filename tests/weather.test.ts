import { afterEach, describe, expect, it, vi } from "vitest";
import { conditionFromCode, fetchWeather, weatherCacheKey } from "@/lib/weather";
import { cloneDefaultConfig } from "@/lib/default-config";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("weather provider normalization", () => {
  it("maps representative WMO weather codes", () => {
    expect(conditionFromCode(0)).toBe("clear");
    expect(conditionFromCode(2)).toBe("partlyCloudy");
    expect(conditionFromCode(45)).toBe("fog");
    expect(conditionFromCode(63)).toBe("rain");
    expect(conditionFromCode(75)).toBe("snow");
    expect(conditionFromCode(95)).toBe("storm");
  });

  it("normalizes provider cache keys", () => {
    const weather = cloneDefaultConfig().content.weather;
    expect(weatherCacheKey({ ...weather, location: "  XiaMen  " })).toBe("open-meteo:xiamen:celsius");
    expect(weatherCacheKey({ ...weather, latitude: 24.4798, longitude: 118.0894, temperatureUnit: "fahrenheit" })).toBe("open-meteo:24.4798,118.0894:fahrenheit");
  });

  it("uses saved coordinates and the configured temperature unit without geocoding", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ current: { temperature_2m: 77, weather_code: 1 } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const weather = cloneDefaultConfig().content.weather;

    const result = await fetchWeather(
      { ...weather, location: "Xiamen", latitude: 24.48, longitude: 118.09, temperatureUnit: "fahrenheit" },
      "en",
      new AbortController().signal,
    );

    expect(result.temperature).toBe(77);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestUrl).toContain("latitude=24.48");
    expect(requestUrl).toContain("longitude=118.09");
    expect(requestUrl).toContain("temperature_unit=fahrenheit");
  });
});
