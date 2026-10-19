"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { SettingsIcon as AppIcon } from "@/components/settings/SettingsIcon";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { MODEL_ERROR_MESSAGES } from "@/i18n/model-api";
import { modelApiErrorCode, testModelConnection, type ModelApiErrorCode } from "@/lib/model-api";
import { normalizeModelEndpoint } from "@/lib/model-api-config";
import { createId } from "@/lib/utils";
import type { ModelApiProfile, TranslationLanguage } from "@/types/config";

export function ModelApiSettings() {
  const { config, modelCredentials, updateConfig, t } = useApp();
  const { modelApi, aiTranslation } = config.labs;
  const [editor, setEditor] = useState<{ key: string; profile?: ModelApiProfile } | null>(null);
  const [open, setOpen] = useState(false);

  function edit(profile?: ModelApiProfile) {
    setEditor({ key: createId("editor"), profile });
    setOpen(true);
  }

  function save(profile: ModelApiProfile, apiKey: string) {
    modelCredentials.set(profile, apiKey);
    updateConfig((current) => ({ ...current, labs: { ...current.labs, modelApi: {
      ...current.labs.modelApi,
      profiles: current.labs.modelApi.profiles.some((item) => item.id === profile.id)
        ? current.labs.modelApi.profiles.map((item) => item.id === profile.id ? profile : item)
        : [...current.labs.modelApi.profiles, profile],
    } } }));
  }

  function remove(id: string) {
    modelCredentials.delete(id);
    updateConfig((current) => ({ ...current, labs: { ...current.labs,
      modelApi: { ...current.labs.modelApi, profiles: current.labs.modelApi.profiles.filter((item) => item.id !== id) },
      aiTranslation: { ...current.labs.aiTranslation, profileId: current.labs.aiTranslation.profileId === id ? null : current.labs.aiTranslation.profileId },
    } }));
  }

  return <>
    <SettingGroup title={t("modelApi")}>
      <Switch checked={modelApi.enabled} label={t("enableModelApi")} onCheckedChange={(enabled) => updateConfig((current) => ({ ...current, labs: { ...current.labs, modelApi: { ...current.labs.modelApi, enabled } } }))} />
      <p className="field-hint">{t("modelDirectNotice")}</p>
      <div className="settings-list" aria-label={t("modelConnections")}>
        {modelApi.profiles.map((profile) => <div className="settings-list-item" key={profile.id}>
          <div><strong>{profile.name}</strong><span>{profile.model}</span></div>
          <div className="list-actions">
            <Button size="icon" variant="ghost" aria-label={`${t("edit")}: ${profile.name}`} onClick={() => edit(profile)}><AppIcon name="edit" size={16} /></Button>
            <Button size="icon" variant="ghost" aria-label={`${t("remove")}: ${profile.name}`} onClick={() => remove(profile.id)}><AppIcon name="delete" size={16} /></Button>
          </div>
        </div>)}
      </div>
      <Button disabled={modelApi.profiles.length >= 20} onClick={() => edit()}><AppIcon name="add" size={18} />{t("addModelConnection")}</Button>
      <label className="field-label" htmlFor="ai-translation-model"><span>{t("translationModel")}</span>
        <Select id="ai-translation-model" value={aiTranslation.profileId ?? ""} options={[{ value: "", label: t("noTranslationModel") }, ...modelApi.profiles.map((profile) => ({ value: profile.id, label: profile.name }))]} onValueChange={(profileId) => updateConfig((current) => ({ ...current, labs: { ...current.labs, aiTranslation: { ...current.labs.aiTranslation, profileId: profileId || null } } }))} />
      </label>
    </SettingGroup>
    <SettingGroup title={t("aiTranslation")}>
      <Switch checked={aiTranslation.enabled} label={t("enableAiTranslation")} onCheckedChange={(enabled) => updateConfig((current) => ({ ...current, labs: { ...current.labs, aiTranslation: { ...current.labs.aiTranslation, enabled } } }))} />
      <label className="field-label" htmlFor="ai-translation-language"><span>{t("translationTarget")}</span>
        <Select id="ai-translation-language" value={aiTranslation.targetLanguage} options={[
          { value: "zh-CN", label: t("languageSimplified") }, { value: "zh-TW", label: t("languageTraditional") }, { value: "en", label: t("languageEnglish") },
        ]} onValueChange={(targetLanguage) => updateConfig((current) => ({ ...current, labs: { ...current.labs, aiTranslation: { ...current.labs.aiTranslation, targetLanguage: targetLanguage as TranslationLanguage } } }))} />
      </label>
    </SettingGroup>
    {editor ? <ModelConnectionEditor key={editor.key} profile={editor.profile} open={open} onOpenChange={setOpen} onSave={save} /> : null}
  </>;
}

function ModelConnectionEditor({ profile, open, onOpenChange, onSave }: {
  profile?: ModelApiProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (profile: ModelApiProfile, apiKey: string) => void;
}) {
  const { config, modelCredentials, t } = useApp();
  const [id] = useState(() => profile?.id ?? createId("model"));
  const [name, setName] = useState(profile?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(profile?.baseUrl ?? "");
  const [model, setModel] = useState(profile?.model ?? "");
  const [apiKey, setApiKey] = useState(() => profile ? modelCredentials.get(profile) : "");
  const [requiresApiKey, setRequiresApiKey] = useState(profile?.requiresApiKey ?? false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [error, setError] = useState<ModelApiErrorCode | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => { request.current?.abort(); }, [open, config.labs.modelApi.enabled]);

  function invalidate() {
    request.current?.abort();
    setStatus("idle");
    setError(null);
  }

  function connection(): ModelApiProfile | null {
    try { normalizeModelEndpoint(baseUrl); } catch { setError("invalid-config"); return null; }
    if (!name.trim() || !model.trim()) { setError("invalid-config"); return null; }
    return { id, name: name.trim().slice(0, 80), baseUrl: baseUrl.trim(), model: model.trim().slice(0, 200), requiresApiKey: requiresApiKey || Boolean(apiKey.trim()) };
  }

  function close(next: boolean) {
    if (!next) { request.current?.abort(); setApiKey(""); }
    onOpenChange(next);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const next = connection();
    if (!next) return;
    onSave(next, apiKey);
    close(false);
  }

  async function testConnection() {
    if (!config.labs.modelApi.enabled) return;
    const next = connection();
    if (!next) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus("loading");
    setError(null);
    try {
      await testModelConnection(next, apiKey, { signal: controller.signal });
      if (!controller.signal.aborted) setStatus("ready");
    } catch (failure) {
      if (!controller.signal.aborted) { setError(modelApiErrorCode(failure)); setStatus("idle"); }
    }
  }

  return <Dialog open={open} onOpenChange={close} title={t(profile ? "editModelConnection" : "addModelConnection")} closeLabel={t("close")} modalDepth="nested">
    <form className="form-stack" onSubmit={submit}>
      <label><span>{t("title")}</span><Input value={name} maxLength={80} autoFocus onChange={(event) => { invalidate(); setName(event.target.value); }} /></label>
      <label><span>{t("modelBaseUrl")}</span><Input value={baseUrl} maxLength={1000} inputMode="url" placeholder="https://example.com/v1" onChange={(event) => { invalidate(); setBaseUrl(event.target.value); setApiKey(""); }} /></label>
      <label><span>{t("modelId")}</span><Input value={model} maxLength={200} onChange={(event) => { invalidate(); setModel(event.target.value); }} /></label>
      <label><span>{t("modelKey")}</span><Input type="password" value={apiKey} autoComplete="off" spellCheck={false} onChange={(event) => { invalidate(); setApiKey(event.target.value); }} /></label>
      <Switch label={t("modelKeyRequired")} checked={requiresApiKey || Boolean(apiKey.trim())} onCheckedChange={(required) => { invalidate(); setRequiresApiKey(required); }} />
      <p className="field-hint">{t("modelKeyNotice")}</p>
      <div className="button-row"><Button disabled={!config.labs.modelApi.enabled || status === "loading"} onClick={() => { void testConnection(); }}>{status === "loading" ? t("modelTesting") : t("testModelConnection")}</Button></div>
      {status === "ready" ? <p role="status" className="field-hint">{t("modelTestSuccess")}</p> : null}
      {error ? <p role="alert" className="inline-error">{t(MODEL_ERROR_MESSAGES[error])}</p> : null}
      <div className="dialog-actions"><Button onClick={() => close(false)}>{t("cancel")}</Button><Button type="submit" variant="primary">{t("save")}</Button></div>
    </form>
  </Dialog>;
}
