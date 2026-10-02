import { describe, expect, it } from "vitest";
import { conditionFromCode, weatherCacheKey } from "@/lib/weather";
import { cloneDefaultConfig } from "@/lib/default-config";

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
    expect(weatherCacheKey({ ...weather, location: "  XiaMen  " })).toBe("open-meteo:xiamen");
  });
});
