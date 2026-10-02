"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { quoteFallback, quoteProviderKey, readTextPath } from "@/lib/quote";
import { isSafeHttpUrl } from "@/lib/validation";
import { readQuoteCache, writeQuoteCache } from "@/services/quote-cache";
import type { QuoteProvider } from "@/types/config";

const REQUEST_TIMEOUT = 4500;

export function Quote() {
  const { config, t } = useApp();
  const provider = config.content.quote;
  if (provider.type === "static") {
    return <section className="quote-module" aria-label={t("quote")}><p>{provider.text}</p></section>;
  }
  const valid = provider.type === "hitokoto" || (isSafeHttpUrl(provider.endpoint) && Boolean(provider.textPath.trim()));
  if (!valid) {
    return <section className="quote-module" aria-label={t("quote")}><p>{provider.fallback}</p></section>;
  }
  return <RemoteQuote key={quoteProviderKey(provider)} provider={provider} label={t("quote")} />;
}

function RemoteQuote({ provider, label }: { provider: Exclude<QuoteProvider, { type: "static" }>; label: string }) {
  const fallback = quoteFallback(provider);
  const [text, setText] = useState(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const key = quoteProviderKey(provider);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    const endpoint = provider.type === "hitokoto" ? "https://v1.hitokoto.cn" : provider.endpoint;
    fetch(endpoint, { signal: controller.signal, cache: "no-store", headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("QUOTE_REQUEST_FAILED");
        const data = await response.json() as unknown;
        const next = provider.type === "hitokoto" ? readTextPath(data, "hitokoto") : readTextPath(data, provider.textPath);
        if (!next) throw new Error("QUOTE_TEXT_MISSING");
        writeQuoteCache(key, next);
        if (active) setText(next);
      })
      .catch(() => {
        if (active) setText(readQuoteCache(key) ?? fallback);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [fallback, provider]);

  return <section className="quote-module" aria-label={label} aria-busy={loading}><p>{text}</p></section>;
}
