"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LIQUID_VISUAL_STYLE, Surface } from "@/components/ui/Surface";
import { useApp } from "@/components/providers/AppProvider";
import { generateSearchUrl, generateTranslationUrl } from "@/lib/search";
import { fetchSearchSuggestions, suggestionsAllowed } from "@/lib/search-suggestions";
import { useInlineTranslation } from "@/components/search/useInlineTranslation";
import { MODEL_ERROR_MESSAGES } from "@/i18n/model-api";

export function SearchBox() {
  const { config, updateConfig, t, notify } = useApp();
  const [query, setQuery] = useState("");
  const [suggestionState, setSuggestionState] = useState({ key: "", items: [] as string[], loading: false, error: "" });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const debounceRef = useRef<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLElement>(null);
  const { state: translationState, translate, cancel: cancelTranslation } = useInlineTranslation(query, open);

  const engine = useMemo(
    () => config.search.engines.find((item) => item.id === config.search.defaultEngineId) ?? config.search.engines[0],
    [config.search.defaultEngineId, config.search.engines],
  );

  const suggestionsEnabled = suggestionsAllowed(config.search.suggestionsEnabled, engine, config.search.suggestionProvider);
  const suggestionKey = JSON.stringify([query.trim(), engine?.id, suggestionsEnabled, config.search.suggestionProvider, config.search.suggestionApiUrl, config.search.suggestionTransport, config.search.suggestionProxyUrl]);
  const suggestions = suggestionsEnabled && suggestionState.key === suggestionKey ? suggestionState.items : [];
  const loading = suggestionsEnabled && suggestionState.key === suggestionKey && suggestionState.loading;
  const suggestionError = suggestionsEnabled && suggestionState.key === suggestionKey ? suggestionState.error : "";

  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    const trimmed = query.trim();
    if (!open || !trimmed || !suggestionsEnabled) return;
    debounceRef.current = window.setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setSuggestionState({ key: suggestionKey, items: [], loading: true, error: "" });
      try {
        if (!engine) return;
        const items = await fetchSearchSuggestions(config.search.suggestionProvider, config.search.suggestionApiUrl, trimmed, engine, controller.signal, config.search.suggestionTransport, config.search.suggestionProxyUrl);
        if (!controller.signal.aborted) setSuggestionState({ key: suggestionKey, items, loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setSuggestionState({ key: suggestionKey, items: [], loading: false, error: error instanceof Error && error.message === "SUGGESTION_TIMEOUT" ? "timeout" : "failed" });
      }
    }, 320);
    return () => {
      window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [config.search.suggestionApiUrl, config.search.suggestionProvider, config.search.suggestionTransport, config.search.suggestionProxyUrl, suggestionsEnabled, engine, open, query, suggestionKey]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) { setOpen(false); cancelTranslation(); }
    };
    const blur = () => { setOpen(false); cancelTranslation(); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("blur", blur);
    };
  }, [cancelTranslation, open]);

  function closeCandidates() {
    cancelTranslation();
    window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setSuggestionState((current) => current.loading ? { ...current, loading: false } : current);
    setOpen(false);
    setActiveIndex(-1);
  }

  function search(value = query) {
    const trimmed = value.trim();
    if (!trimmed || !engine) return;
    try {
      window.open(generateSearchUrl(engine.urlTemplate, trimmed), "_blank", "noopener,noreferrer");
      setQuery("");
      closeCandidates();
    } catch {
      notify(t("invalidUrlError"), "danger");
    }
  }

  const aiEnabled = config.labs.aiTranslation.enabled;
  const translationUrl = query.trim() && config.search.translationEnabled
    ? generateTranslationUrl(config.search.translationProvider, config.search.translationUrlTemplate, query)
    : null;
  const translationOffset = translationUrl ? 1 : 0;
  const aiIndex = translationOffset;
  const suggestionOffset = translationOffset + (aiEnabled ? 1 : 0);
  const optionsCount = suggestionOffset + suggestions.length;
  const suggestionsOpen = open && Boolean(query.trim()) && (suggestionsEnabled || Boolean(translationUrl) || aiEnabled);
  const visualStyle = config.appearance.surfaceMode === "liquid" ? LIQUID_VISUAL_STYLE : {};

  return (
    <section ref={searchRef} className="search-surface" aria-label={t("search")} onKeyDown={(event) => {
      if (event.key === "Escape" && open) { event.preventDefault(); closeCandidates(); }
    }} onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) closeCandidates();
    }}>
      <div className="search-row-surface">
        <Surface className="search-row-visual" variant="auto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", borderRadius: "inherit", pointerEvents: "none", ...visualStyle }} />
        <form className="search-row" onSubmit={(event) => { event.preventDefault(); search(); }}>
        <label className="sr-only" htmlFor="main-search">{t("searchLabel")}</label>
        <div className="search-input-wrap">
          <AppIcon name="search" size={20} />
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
            aria-activedescendant={suggestionsOpen && activeIndex >= 0 && activeIndex < optionsCount ? `${listId}-${activeIndex}` : undefined}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              cancelTranslation();
              setActiveIndex(-1);
              setOpen(Boolean(value.trim()));
            }}
            onFocus={() => query.trim() && setOpen(true)}
            onClick={() => query.trim() && setOpen(true)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Escape" && open) { event.preventDefault(); closeCandidates(); return; }
              if (event.key === "ArrowDown" && !open && query.trim()) { event.preventDefault(); setOpen(true); setActiveIndex(-1); return; }
              if (!suggestionsOpen || optionsCount === 0) return;
              if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((value) => Math.min(optionsCount - 1, value + 1)); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((value) => Math.max(0, value - 1)); }
              if (event.key === "Enter" && activeIndex >= 0 && activeIndex < optionsCount) {
                event.preventDefault();
                if (translationUrl && activeIndex === 0) window.open(translationUrl, "_blank", "noopener,noreferrer");
                else if (aiEnabled && activeIndex === aiIndex) void translate();
                else { setQuery(suggestions[activeIndex - suggestionOffset] ?? query); closeCandidates(); }
              }
            }}
          />
          {suggestionsOpen && (
            <Surface plain liquidRenderer={false} className="search-suggestions">
              <div id={listId} role="listbox" aria-label={t("suggestions")}>
              {translationUrl ? <button id={`${listId}-0`} type="button" role="option" aria-selected={activeIndex === 0} onMouseDown={(event) => event.preventDefault()} onClick={() => window.open(translationUrl, "_blank", "noopener,noreferrer")}>
                <span className="suggestion-badge">译</span>{t("translation")} “{query.trim()}”
              </button> : null}
              {aiEnabled ? <button id={`${listId}-${aiIndex}`} type="button" role="option" aria-selected={activeIndex === aiIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => { void translate(); }}>
                <AppIcon name="quote" size={16} />{t("aiTranslateAction")}
              </button> : null}
              {suggestions.map((suggestion, index) => (
                <button id={`${listId}-${index + suggestionOffset}`} key={suggestion} type="button" role="option" aria-selected={activeIndex === index + suggestionOffset} onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(suggestion); closeCandidates(); }}>
                  <AppIcon name="search" size={16} />{suggestion}
                </button>
              ))}
              </div>
              {loading && <div className="suggestions-state">{t("suggestionsLoading")}</div>}
              {suggestionsEnabled && !loading && suggestions.length === 0 && <div className="suggestions-state" role="status">{t(suggestionError === "timeout" ? "suggestionsTimeout" : suggestionError ? "suggestionsFailed" : "suggestionsEmpty")}</div>}
              <div className="ai-translation-state" role="status" aria-live="polite">
                {translationState?.status === "loading" ? <p>{t("aiTranslating")}</p> : null}
                {translationState?.error ? <p>{t(MODEL_ERROR_MESSAGES[translationState.error])}</p> : null}
                {translationState?.status === "ready" && translationState.text ? <>
                  <p className="ai-translation-text" aria-label={t("aiTranslationResult")}>{translationState.text}</p>
                  <button type="button" onClick={async () => {
                    try { await navigator.clipboard.writeText(translationState.text ?? ""); notify(t("translationCopied"), "success"); }
                    catch { notify(t("translationCopyFailed"), "warning"); }
                  }}>{t("copyTranslation")}</button>
                </> : null}
              </div>
            </Surface>
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
          <AppIcon name="forward" size={19} />
        </Button>
        </form>
      </div>
    </section>
  );
}
