"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Search as SearchIcon } from "react-feather";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LIQUID_VISUAL_STYLE, Surface } from "@/components/ui/Surface";
import { useApp } from "@/components/providers/AppProvider";
import { generateSearchUrl } from "@/lib/search";

export function SearchBox() {
  const { config, updateConfig, t, notify } = useApp();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const debounceRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const engine = useMemo(
    () => config.search.engines.find((item) => item.id === config.search.defaultEngineId) ?? config.search.engines[0],
    [config.search.defaultEngineId, config.search.engines],
  );

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    const trimmed = query.trim();
    if (!trimmed || !config.search.suggestionsEnabled) {
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setOpen(true);
      try {
        const baiduUrl = `https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(trimmed)}`;
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(baiduUrl)}`, { signal: controller.signal });
        const data = await response.json() as { g?: Array<{ q?: string }> };
        setSuggestions((data.g ?? []).flatMap((item) => typeof item.q === "string" ? [item.q] : []).slice(0, 7));
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);
    return () => window.clearTimeout(debounceRef.current);
  }, [config.search.suggestionsEnabled, query]);

  function search(value = query) {
    const trimmed = value.trim();
    if (!trimmed || !engine) return;
    try {
      window.open(generateSearchUrl(engine.urlTemplate, trimmed), "_blank", "noopener,noreferrer");
      setQuery("");
      setOpen(false);
    } catch {
      notify(t("invalidUrlError"), "danger");
    }
  }

  const suggestionsOpen = open && Boolean(query.trim()) && config.search.suggestionsEnabled;
  const options = query.trim() ? [`${t("translation")} “${query.trim()}”`, ...suggestions] : [];
  const visualStyle = config.appearance.surfaceMode === "liquid" ? LIQUID_VISUAL_STYLE : {};

  return (
    <section className="search-surface" aria-label={t("search")}>
      <div className="search-row-surface">
        <Surface className="search-row-visual" variant="auto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none", ...visualStyle }} />
        <form className="search-row" onSubmit={(event) => { event.preventDefault(); search(); }}>
        <label className="sr-only" htmlFor="main-search">{t("searchLabel")}</label>
        <div className="search-input-wrap">
          <SearchIcon size={20} aria-hidden="true" />
          <Input
            id="main-search"
            type="search"
            value={query}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls={listId}
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              setActiveIndex(-1);
              if (!value.trim()) { setSuggestions([]); setOpen(false); }
            }}
            onFocus={() => query.trim() && setOpen(true)}
            onKeyDown={(event) => {
              if (!suggestionsOpen || options.length === 0) return;
              if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.min(options.length - 1, value + 1)); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(0, value - 1)); }
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Enter" && activeIndex >= 0) {
                event.preventDefault();
                if (activeIndex === 0) window.open(`https://fanyi.baidu.com/#auto/auto/${encodeURIComponent(query.trim())}`, "_blank", "noopener,noreferrer");
                else { setQuery(suggestions[activeIndex - 1] ?? query); setOpen(false); }
              }
            }}
          />
          {suggestionsOpen && (
            <div id={listId} className="search-suggestions" role="listbox">
              <button id={`${listId}-0`} type="button" role="option" aria-selected={activeIndex === 0} onClick={() => window.open(`https://fanyi.baidu.com/#auto/auto/${encodeURIComponent(query.trim())}`, "_blank", "noopener,noreferrer")}>
                <span className="suggestion-badge">译</span>{t("translation")} “{query.trim()}”
              </button>
              {suggestions.map((suggestion, index) => (
                <button id={`${listId}-${index + 1}`} key={suggestion} type="button" role="option" aria-selected={activeIndex === index + 1} onClick={() => { setQuery(suggestion); setOpen(false); }}>
                  <SearchIcon size={16} />{suggestion}
                </button>
              ))}
              {loading && <div className="suggestions-state">{t("suggestionsLoading")}</div>}
              {!loading && suggestions.length === 0 && <div className="suggestions-state">{t("suggestionsEmpty")}</div>}
            </div>
          )}
        </div>
        <label className="sr-only" htmlFor="engine-select">{t("searchEngine")}</label>
        <Select
          id="engine-select"
          className="search-engine-select"
          value={engine?.id}
          ariaLabel={t("searchEngine")}
          options={config.search.engines.map((item) => ({ value: item.id, label: item.name }))}
          onValueChange={(value) => updateConfig((current) => ({ ...current, search: { ...current.search, defaultEngineId: value } }))}
        />
        <Button className="search-submit" variant="primary" size="icon" type="submit" aria-label={t("searchButton")}>
          <ArrowRight size={19} />
        </Button>
        </form>
      </div>
    </section>
  );
}
