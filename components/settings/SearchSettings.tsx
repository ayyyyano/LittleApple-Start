"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Edit2, Plus, Trash2 } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { createId, moveItem } from "@/lib/utils";
import { normalizeHttpUrl, validateSearchEngine } from "@/lib/validation";
import type { SearchEngine } from "@/types/config";

export function SearchSettings() {
  const { config, updateConfig, t } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SearchEngine | undefined>();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openEditor(engine?: SearchEngine) {
    setEditing(engine);
    setName(engine?.name ?? "");
    setUrl(engine?.urlTemplate ?? "");
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
    const engine = { id: editing?.id ?? createId("engine"), name: name.trim(), urlTemplate: normalizedUrl };
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
      </SettingGroup>
      <SettingGroup title={t("engines")}>
        <div className="settings-list">
          {config.search.engines.map((engine, index) => (
            <div className="settings-list-item" key={engine.id}>
              <div><strong>{engine.name}</strong><span>{engine.urlTemplate}</span></div>
              <div className="list-actions">
                <Button variant="ghost" size="icon" aria-label={t("moveUp")} disabled={index === 0} onClick={() => updateConfig((current) => ({ ...current, search: { ...current.search, engines: moveItem(current.search.engines, index, index - 1) } }))}><ArrowUp size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("moveDown")} disabled={index === config.search.engines.length - 1} onClick={() => updateConfig((current) => ({ ...current, search: { ...current.search, engines: moveItem(current.search.engines, index, index + 1) } }))}><ArrowDown size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => openEditor(engine)}><Edit2 size={16} /></Button>
                <Button variant="ghost" size="icon" aria-label={t("remove")} disabled={config.search.engines.length <= 1} onClick={() => remove(engine)}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="primary" onClick={() => openEditor()}><Plus size={18} />{t("addEngine")}</Button>
      </SettingGroup>
      <Dialog open={open} onOpenChange={setOpen} title={editing ? t("editEngine") : t("addEngine")} closeLabel={t("close")} modalDepth="nested">
        <form className="form-stack" onSubmit={submit}>
          <label><span>{t("engineName")}</span><Input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
          <label><span>{t("engineUrl")}</span><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/search?q=%s" /></label>
          <p className="field-hint">{t("engineUrlHint")}</p>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <div className="dialog-actions"><Button onClick={() => setOpen(false)}>{t("cancel")}</Button><Button variant="primary" type="submit">{t("save")}</Button></div>
        </form>
      </Dialog>
    </div>
  );
}
