"use client";

import { useRef, useState } from "react";
import { SettingsIcon as AppIcon } from "@/components/settings/SettingsIcon";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { createId, moveItem } from "@/lib/utils";
import { normalizeHttpUrl, validateSearchEngine } from "@/lib/validation";
import { resolveSuggestionProvider } from "@/lib/search-suggestions";
import type { AppConfig, SearchEngine, SuggestionProvider } from "@/types/config";

export function SearchSettings() {
  const { config, updateConfig, t } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SearchEngine | undefined>();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [engineSuggestions, setEngineSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const manualProvider = useRef<Exclude<SuggestionProvider, "auto">>(config.search.suggestionProvider === "auto" ? "baidu" : config.search.suggestionProvider);
  const automaticSuggestions = config.search.suggestionProvider === "auto";
  const selectedEngine = config.search.engines.find((engine) => engine.id === config.search.defaultEngineId) ?? config.search.engines[0];
  const automaticAvailable = selectedEngine && resolveSuggestionProvider("auto", selectedEngine) !== null;

  function openEditor(engine?: SearchEngine) {
    setEditing(engine);
    setName(engine?.name ?? "");
    setUrl(engine?.urlTemplate ?? "");
    setEngineSuggestions(engine?.suggestionsEnabled !== false);
    setError(null);
    setOpen(true);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedUrl = normalizeHttpUrl(url);
    const result = validateSearchEngine({ name, urlTemplate: normalizedUrl }, config.search.engines, editing?.id);
    if (!result.valid) {
      setError(t(result.error === "invalidUrl" ? "invalidUrlError" : result.error === "duplicate" ? "duplicateError" : "requiredError"));
      return;
    }
    const engine = { id: editing?.id ?? createId("engine"), name: name.trim(), urlTemplate: normalizedUrl, suggestionsEnabled: engineSuggestions };
    updateConfig((current) => ({
      ...current,
      search: {
        ...current.search,
        engines: editing ? current.search.engines.map((item) => item.id === editing.id ? engine : item) : [...current.search.engines, engine],
      },
    }));
    setOpen(false);
  }

  function remove(engine: SearchEngine) {
    if (config.search.engines.length <= 1) return;
    updateConfig((current) => {
      const engines = current.search.engines.filter((item) => item.id !== engine.id);
      return { ...current, search: { ...current.search, engines, defaultEngineId: current.search.defaultEngineId === engine.id ? engines[0].id : current.search.defaultEngineId } };
    });
  }

  return (
    <div className="settings-stack">
      <SettingGroup title={t("defaultEngine")}>
        <label className="field-label" htmlFor="default-engine"><span>{t("defaultEngine")}</span><Select id="default-engine" value={config.search.defaultEngineId} options={config.search.engines.map((engine) => ({ value: engine.id, label: engine.name }))} onValueChange={(value) => updateConfig((current) => ({ ...current, search: { ...current.search, defaultEngineId: value } }))} /></label>
        <Switch checked={config.search.suggestionsEnabled} onCheckedChange={(value) => updateConfig((current) => ({ ...current, search: { ...current.search, suggestionsEnabled: value } }))} label={t("suggestions")} />
        {config.search.suggestionsEnabled ? <div className="advanced-controls">
          <label className="field-label" htmlFor="suggestion-source-mode"><span>{t("suggestionProvider")}</span><Select id="suggestion-source-mode" value={automaticSuggestions ? "auto" : "manual"} options={[
            { value: "auto", label: t("suggestionAuto"), disabled: !automaticAvailable },
            { value: "manual", label: t("suggestionManual") },
          ]} onValueChange={(value) => {
            if (config.search.suggestionProvider !== "auto") manualProvider.current = config.search.suggestionProvider;
            const provider = value === "auto" ? "auto" : manualProvider.current;
            updateConfig((current) => ({ ...current, search: { ...current.search, suggestionProvider: provider } }));
          }} /></label>
          {automaticSuggestions ? <p className="field-hint">{t(automaticAvailable ? "suggestionAutoHint" : "suggestionAutoUnavailable")}</p> : <label className="field-label" htmlFor="suggestion-provider"><span>{t("suggestionManualProvider")}</span><Select id="suggestion-provider" value={config.search.suggestionProvider} options={[
            { value: "baidu", label: "百度" },
            { value: "google", label: "Google" },
            { value: "bing", label: "Bing" },
            { value: "duckduckgo", label: "DuckDuckGo" },
            { value: "custom", label: t("customApi") },
          ]} onValueChange={(value) => {
            manualProvider.current = value as Exclude<SuggestionProvider, "auto">;
            updateConfig((current) => ({ ...current, search: { ...current.search, suggestionProvider: value as SuggestionProvider } }));
          }} /></label>}
          {config.search.suggestionProvider === "custom" ? <label><span>{t("suggestionApiUrl")}</span><Input value={config.search.suggestionApiUrl} onChange={(event) => updateConfig((current) => ({ ...current, search: { ...current.search, suggestionApiUrl: event.target.value } }))} placeholder="https://example.com/suggest?q={query}" inputMode="url" /><span className="field-hint">{t("suggestionApiHint")}</span></label> : null}
          <label className="field-label" htmlFor="suggestion-transport"><span>{t("suggestionTransport")}</span><Select id="suggestion-transport" value={config.search.suggestionTransport} options={[
            { value: "auto", label: t("suggestionTransportAuto") },
            { value: "direct", label: t("suggestionDirect") },
            { value: "allorigins", label: "AllOrigins" },
            { value: "custom", label: t("suggestionCustomProxy") },
          ]} onValueChange={(value) => updateConfig((current) => ({ ...current, search: { ...current.search, suggestionTransport: value as AppConfig["search"]["suggestionTransport"] } }))} /></label>
          <p className="field-hint">{t("suggestionTransportHint")}</p>
          {config.search.suggestionTransport === "custom" ? <label><span>{t("suggestionProxyUrl")}</span><Input value={config.search.suggestionProxyUrl} onChange={(event) => updateConfig((current) => ({ ...current, search: { ...current.search, suggestionProxyUrl: event.target.value } }))} placeholder="https://proxy.example.com/?url={url}" inputMode="url" /><span className="field-hint">{t("suggestionProxyHint")}</span></label> : null}
        </div> : null}
      </SettingGroup>
      <SettingGroup title={t("translationEntry")}>
        <Switch checked={config.search.translationEnabled} onCheckedChange={(value) => updateConfig((current) => ({ ...current, search: { ...current.search, translationEnabled: value } }))} label={t("showTranslationEntry")} />
        {config.search.translationEnabled ? <div className="advanced-controls">
          <label className="field-label" htmlFor="translation-provider"><span>{t("translationProvider")}</span><Select id="translation-provider" value={config.search.translationProvider} options={[
            { value: "baidu", label: "百度翻译" },
            { value: "google", label: "Google Translate" },
            { value: "bing", label: "Bing Translator" },
            { value: "custom", label: t("customEntry") },
          ]} onValueChange={(value) => updateConfig((current) => ({ ...current, search: { ...current.search, translationProvider: value as AppConfig["search"]["translationProvider"] } }))} /></label>
          {config.search.translationProvider === "custom" ? <label><span>{t("translationUrlTemplate")}</span><Input value={config.search.translationUrlTemplate} onChange={(event) => updateConfig((current) => ({ ...current, search: { ...current.search, translationUrlTemplate: event.target.value } }))} placeholder="https://example.com/translate?q={query}" inputMode="url" /><span className="field-hint">{t("translationUrlHint")}</span></label> : null}
        </div> : null}
      </SettingGroup>
      <SettingGroup title={t("engines")}>
        <div className="settings-list">
          {config.search.engines.map((engine, index) => (
            <div className="settings-list-item" key={engine.id}>
              <div><strong>{engine.name}</strong><span>{engine.urlTemplate}</span></div>
              <div className="list-actions">
                <Button variant="ghost" size="icon" aria-label={t("moveUp")} disabled={index === 0} onClick={() => updateConfig((current) => ({ ...current, search: { ...current.search, engines: moveItem(current.search.engines, index, index - 1) } }))}><AppIcon name="arrowUp" size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("moveDown")} disabled={index === config.search.engines.length - 1} onClick={() => updateConfig((current) => ({ ...current, search: { ...current.search, engines: moveItem(current.search.engines, index, index + 1) } }))}><AppIcon name="arrowDown" size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => openEditor(engine)}><AppIcon name="edit" size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("remove")} disabled={config.search.engines.length <= 1} onClick={() => remove(engine)}><AppIcon name="delete" size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="primary" onClick={() => openEditor()}><AppIcon name="add" size={18} />{t("addEngine")}</Button>
      </SettingGroup>
      <Dialog open={open} onOpenChange={setOpen} title={editing ? t("editEngine") : t("addEngine")} closeLabel={t("close")} modalDepth="nested">
        <form className="form-stack" onSubmit={submit}>
          <label><span>{t("engineName")}</span><Input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
          <label><span>{t("engineUrl")}</span><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/search?q=%s" /></label>
          <p className="field-hint">{t("engineUrlHint")}</p>
          <Switch checked={engineSuggestions} onCheckedChange={setEngineSuggestions} label={t("engineSuggestions")} />
          {error && <p className="inline-error" role="alert">{error}</p>}
          <div className="dialog-actions"><Button onClick={() => setOpen(false)}>{t("cancel")}</Button><Button variant="primary" type="submit">{t("save")}</Button></div>
        </form>
      </Dialog>
    </div>
  );
}
