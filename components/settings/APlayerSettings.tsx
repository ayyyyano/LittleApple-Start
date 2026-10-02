"use client";

import { useState } from "react";
import { Edit2, Music, Plus, Trash2 } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { createId } from "@/lib/utils";
import { isSafeHttpUrl, normalizeHttpUrl } from "@/lib/validation";
import type { APlayerTrack } from "@/types/config";

export function APlayerSettings() {
  const { config, updateConfig, t } = useApp();
  const player = config.labs.aplayer;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<APlayerTrack | undefined>();
  const updatePlayer = (patch: Partial<typeof player>) => updateConfig((current) => ({ ...current, labs: { ...current.labs, aplayer: { ...current.labs.aplayer, ...patch } } }));
  function save(track: APlayerTrack) {
    updatePlayer({ playlist: editing ? player.playlist.map((item) => item.id === editing.id ? track : item) : [...player.playlist, track] });
  }
  return (
    <SettingGroup title={t("player")}>
      <Switch checked={player.enabled} onCheckedChange={(enabled) => updatePlayer({ enabled })} label={t("enablePlayer")} />
      <label className="field-label" htmlFor="player-position"><span>{t("playerPosition")}</span><Select id="player-position" value={player.position} options={[{ value: "left", label: t("bottomLeft") }, { value: "right", label: t("bottomRight") }]} onValueChange={(position) => updatePlayer({ position: position as "left" | "right" })} /></label>
      {player.playlist.length ? <div className="settings-list">{player.playlist.map((track) => (
        <div className="settings-list-item" key={track.id}>
          <div><strong>{track.title}</strong><span>{track.artist || t("unknownArtist")}</span></div>
          <div className="list-actions"><Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => { setEditing(track); setOpen(true); }}><Edit2 size={16} /></Button><Button variant="ghost" size="icon" aria-label={t("remove")} onClick={() => updatePlayer({ playlist: player.playlist.filter((item) => item.id !== track.id) })}><Trash2 size={16} /></Button></div>
        </div>
      ))}</div> : <div className="compact-empty"><Music size={18} /><span>{t("playerEmpty")}</span></div>}
      <Button size="sm" onClick={() => { setEditing(undefined); setOpen(true); }}><Plus size={17} />{t("addTrack")}</Button>
      <TrackEditor key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} editing={editing} onSave={save} />
    </SettingGroup>
  );
}

function TrackEditor({ open, onOpenChange, editing, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; editing?: APlayerTrack; onSave: (track: APlayerTrack) => void }) {
  const { t } = useApp();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [artist, setArtist] = useState(editing?.artist ?? "");
  const [url, setUrl] = useState(editing?.url ?? "");
  const [cover, setCover] = useState(editing?.cover ?? "");
  const [lrc, setLrc] = useState(editing?.lrc ?? "");
  const [error, setError] = useState("");
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = { url: normalizeHttpUrl(url), cover: cover.trim() ? normalizeHttpUrl(cover) : "", lrc: lrc.trim() ? normalizeHttpUrl(lrc) : "" };
    if (!title.trim() || !url.trim()) { setError(t("requiredError")); return; }
    if (!isSafeHttpUrl(normalized.url) || (normalized.cover && !isSafeHttpUrl(normalized.cover)) || (normalized.lrc && !isSafeHttpUrl(normalized.lrc))) { setError(t("invalidUrlError")); return; }
    onSave({ id: editing?.id ?? createId("track"), title: title.trim(), artist: artist.trim(), url: normalized.url, cover: normalized.cover || undefined, lrc: normalized.lrc || undefined });
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={editing ? t("editTrack") : t("addTrack")} closeLabel={t("close")} modalDepth="nested">
      <form className="form-stack" onSubmit={submit}>
        <label><span>{t("trackTitle")}</span><Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label>
        <label><span>{t("trackArtist")}</span><Input value={artist} onChange={(event) => setArtist(event.target.value)} /></label>
        <label><span>{t("audioUrl")}</span><Input value={url} onChange={(event) => setUrl(event.target.value)} inputMode="url" placeholder="https://example.com/audio.mp3" /></label>
        <label><span>{t("coverUrl")}</span><Input value={cover} onChange={(event) => setCover(event.target.value)} inputMode="url" /></label>
        <label><span>{t("lrcUrl")}</span><Input value={lrc} onChange={(event) => setLrc(event.target.value)} inputMode="url" /></label>
        {error ? <p className="inline-error" role="alert">{error}</p> : null}
        <div className="dialog-actions"><Button onClick={() => onOpenChange(false)}>{t("cancel")}</Button><Button variant="primary" type="submit">{t("save")}</Button></div>
      </form>
    </Dialog>
  );
}
