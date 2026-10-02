"use client";

import { Info } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { QuoteProvider } from "@/types/config";

const DEFAULT_QUOTE = "一株果树，多个树杈，N颗苹果。";

export function QuoteSettings() {
  const { config, updateConfig, t } = useApp();
  const provider = config.content.quote;
  const updateQuote = (quote: QuoteProvider) => updateConfig((current) => ({ ...current, content: { ...current.content, quote } }));
  const fallback = provider.type === "static" ? provider.text : provider.fallback;

  return (
    <SettingGroup title={t("quote")}>
      <label className="field-label" htmlFor="quote-provider"><span>{t("quoteProvider")}</span>
        <Select
          id="quote-provider"
          value={provider.type}
          options={[{ value: "static", label: t("quoteStatic") }, { value: "hitokoto", label: "Hitokoto" }, { value: "custom", label: t("quoteCustom") }]}
          onValueChange={(value) => {
            if (value === "static") updateQuote({ type: "static", text: fallback || DEFAULT_QUOTE });
            if (value === "hitokoto") updateQuote({ type: "hitokoto", fallback: fallback || DEFAULT_QUOTE });
            if (value === "custom") updateQuote({ type: "custom", endpoint: "", textPath: "content", fallback: fallback || DEFAULT_QUOTE });
          }}
        />
      </label>
      {provider.type === "static" ? (
        <label className="field-label"><span>{t("quoteText")}</span><Input maxLength={280} value={provider.text} onChange={(event) => updateQuote({ type: "static", text: event.target.value })} /></label>
      ) : (
        <>
          {provider.type === "custom" && (
            <>
              <label className="field-label"><span>{t("apiUrl")}</span><Input inputMode="url" value={provider.endpoint} onChange={(event) => updateQuote({ ...provider, endpoint: event.target.value })} placeholder="https://example.com/quote" /></label>
              <label className="field-label"><span>{t("jsonTextPath")}</span><Input value={provider.textPath} onChange={(event) => updateQuote({ ...provider, textPath: event.target.value })} placeholder="content" /></label>
            </>
          )}
          <label className="field-label"><span>{t("quoteFallback")}</span><Input maxLength={280} value={provider.fallback} onChange={(event) => updateQuote({ ...provider, fallback: event.target.value })} /></label>
        </>
      )}
      {provider.type !== "static" && <p className="context-note"><Info size={14} aria-hidden="true" /><span>{t("quoteNetworkNotice")}</span></p>}
    </SettingGroup>
  );
}
