import { describe, expect, it } from "vitest";
import { canUseCustomCursor, cursorGeometry, isMobileUserAgent } from "@/lib/custom-cursor";

describe("cursor image geometry", () => {
  it("preserves original dimensions by default", () => {
    expect(cursorGeometry(48, 32, { size: null, hotspotX: 0, hotspotY: 0 })).toEqual({ width: 48, height: 32, hotspotX: 0, hotspotY: 0 });
  });
  it("resizes proportionally and clamps hotspots to actual bounds", () => {
    expect(cursorGeometry(64, 32, { size: 32, hotspotX: 127, hotspotY: 20 })).toEqual({ width: 32, height: 16, hotspotX: 31, hotspotY: 15 });
    expect(cursorGeometry(16, 128, { size: 128, hotspotX: 5, hotspotY: 10 })).toEqual({ width: 16, height: 128, hotspotX: 5, hotspotY: 10 });
    expect(cursorGeometry(0, 0, { size: Number.NaN, hotspotX: -4, hotspotY: Number.NaN })).toEqual({ width: 32, height: 32, hotspotX: 0, hotspotY: 0 });
  });
});

describe("custom cursor environment gating", () => {
  it("allows a desktop user agent with a fine pointer regardless of viewport dimensions", () => {
    expect(canUseCustomCursor({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      platform: "Win32",
      maxTouchPoints: 10,
      hasFinePointer: true,
    })).toBe(true);
  });

  it("blocks mobile user agents even when a fine pointer is connected", () => {
    expect(canUseCustomCursor({
      userAgent: "Mozilla/5.0 (Linux; Android 16; Mobile) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
      hasFinePointer: true,
    })).toBe(false);
  });

  it("blocks iPadOS desktop user agents and desktop devices without a fine pointer", () => {
    expect(isMobileUserAgent({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
    expect(canUseCustomCursor({ userAgent: "Mozilla/5.0 (X11; Linux x86_64)", platform: "Linux x86_64", maxTouchPoints: 0, hasFinePointer: false })).toBe(false);
  });
});
