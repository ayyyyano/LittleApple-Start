"use client";

import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import type { DateFormat, Locale } from "@/types/config";

type ClockParts = {
  prefix: string;
  hours: string;
  minutes: string;
  seconds?: string;
  suffix: string;
};

function splitClockTime(value: string): ClockParts | null {
  const match = value.match(/^(.*?)(\d{1,2}):(\d{2})(?::(\d{2}))?(.*)$/);
  if (!match) return null;
  const [, prefix, hours, minutes, seconds, suffix] = match;
  return { prefix, hours, minutes, seconds, suffix };
}

function renderClockGroup(value: string) {
  return (
    <span className="clock-group">
      {[...value].map((digit, index) => (
        <span key={`${digit}-${index}`} className={`clock-digit${digit === "4" || digit === "7" ? ` clock-digit--${digit}` : ""}`}>
          {digit}
        </span>
      ))}
    </span>
  );
}

function renderClockTime(value: string) {
  const parts = splitClockTime(value);
  if (!parts) {
    if (value === "--:--") {
      return (
        <>
          {renderClockGroup("--")}
          <span className="clock-separator" aria-hidden="true">:</span>
          {renderClockGroup("--")}
        </>
      );
    }
    return value;
  }

  return (
    <>
      {parts.prefix && <span className="clock-period">{parts.prefix}</span>}
      {renderClockGroup(parts.hours)}
      <span className="clock-separator" aria-hidden="true">:</span>
      {renderClockGroup(parts.minutes)}
      {parts.seconds && (
        <>
          <span className="clock-separator" aria-hidden="true">:</span>
          {renderClockGroup(parts.seconds)}
        </>
      )}
      {parts.suffix && <span className="clock-period">{parts.suffix}</span>}
    </>
  );
}

function formatDate(date: Date, locale: Locale, timeZone: string, format: DateFormat): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const year = read("year");
  const month = read("month");
  const day = read("day");
  if (format === "iso") {
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
    return `${year}-${month}-${day} ${weekday}`;
  }
  if (format === "long") {
    const weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: "long" }).format(date);
    if (locale === "en") {
      const longDate = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "long", day: "numeric" }).format(date);
      return `${longDate} ${weekday}`;
    }
    return `${year}年${Number(month)}月${Number(day)}日 ${weekday}`;
  }
  const weekday = new Intl.DateTimeFormat(locale, { timeZone, weekday: "short" }).format(date);
  return `${year}/${month}/${day} ${weekday}`;
}

export function Clock({ showClock = true, showDate = true }: { showClock?: boolean; showDate?: boolean }) {
  const { config, notify, t } = useApp();
  const [now, setNow] = useState<Date | null>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);

    async function calibrate() {
      offsetRef.current = 0;
      if (!config.clock.useLocalTime) {
        try {
          const started = Date.now();
          const response = await fetch("https://time.akamai.com/", { signal: controller.signal, cache: "no-store" });
          if (!response.ok) throw new Error("NETWORK_TIME_FAILED");
          const seconds = Number((await response.text()).trim());
          if (!Number.isFinite(seconds)) throw new Error("NETWORK_TIME_INVALID");
          const roundTrip = Date.now() - started;
          offsetRef.current = seconds * 1000 + roundTrip / 2 - Date.now();
        } catch {
          if (active && config.clock.showNetworkWarning) notify(t("networkTimeFallback"), "warning");
        }
      }
      if (active) setNow(new Date(Date.now() + offsetRef.current));
    }

    calibrate();
    const interval = window.setInterval(() => setNow(new Date(Date.now() + offsetRef.current)), 1000);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [config.clock.showNetworkWarning, config.clock.useLocalTime, notify, t]);

  if (!now) return <section className="clock" aria-label={t("time")}>{showClock && <span className="clock-time" aria-label="--:--">{renderClockTime("--:--")}</span>}</section>;
  const time = new Intl.DateTimeFormat(config.locale, {
    timeZone: config.clock.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: config.clock.showSeconds ? "2-digit" : undefined,
    hour12: !config.clock.format24h,
  }).format(now);
  const date = formatDate(now, config.locale, config.clock.timezone, config.clock.dateFormat);

  return (
    <section className="clock" aria-label={t("time")}>
      {showClock && <time className="clock-time" dateTime={now.toISOString()} aria-label={time}>{renderClockTime(time)}</time>}
      {showDate && <span className="clock-date">{date}</span>}
    </section>
  );
}
