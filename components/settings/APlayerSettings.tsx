"use client";

import { useEffect, useRef, useState } from "react";
import { Edit2, Music, Plus, Trash2 } from "react-feather";
import { useApp } from "@/components/providers/AppProvider";
import { SettingGroup } from "@/components/settings/SettingGroup";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { resolveMetingTracks } from "@/lib/meting";
import { createId } from "@/lib/utils";
import { isSafeHttpUrl, normalizeHttpUrl } from "@/lib/validation";
import type { APlayerTrack, MetingMatchMode, MusicSourceMode } from "@/types/config";

type MetingStatus = { state: "idle" | "loading" | "ready" | "error"; count?: number };

export function APlayerSettings() {
  const { config, updateConfig, t } = useApp();
  const player = config.labs.aplayer;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<APlayerTrack | undefined>();
  const [metingStatus, setMetingStatus] = useState<MetingStatus>({ state: "idle" });
  const metingRequestRef = useRef<AbortController | null>(null);
  const updatePlayer = (patch: Partial<typeof player>) => updateConfig((current) => ({ ...current, labs: { ...current.labs, aplayer: { ...current.labs.aplayer, ...patch } } }));
  useEffect(() => () => metingRequestRef.current?.abort(), []);
  function updateMeting(patch: Partial<typeof player.meting>) {
    updatePlayer({ meting: { ...player.meting, ...patch } });
  }
  function changeSource(source: MusicSourceMode) {
    metingRequestRef.current?.abort();
    setMetingStatus({ state: "idle" });
    updatePlayer({ source, meting: { ...player.meting, enabled: source === "meting" } });
  }
  async function loadMeting() {
    metingRequestRef.current?.abort();
    const controller = new AbortController();
    metingRequestRef.current = controller;
    setMetingStatus({ state: "loading" });
    try {
      const tracks = await resolveMetingTracks(player.meting, controller.signal);
      if (controller.signal.aborted) return;
      updatePlayer({ playlist: tracks });
      setMetingStatus({ state: "ready", count: tracks.length });
    } catch {
      if (!controller.signal.aborted) setMetingStatus({ state: "error" });
    } finally {
      if (metingRequestRef.current === controller) metingRequestRef.current = null;
    }
  }
  function save(track: APlayerTrack) {
    updatePlayer({ playlist: editing ? player.playlist.map((item) => item.id === editing.id ? track : item) : [...player.playlist, track] });
  }
  return (
    <SettingGroup title={t("player")}>
      <Switch checked={player.enabled} onCheckedChange={(enabled) => updatePlayer({ enabled })} label={t("enablePlayer")} />
      <label className="field-label" htmlFor="player-position"><span>{t("playerPosition")}</span><Select id="player-position" value={player.position} options={[{ value: "left", label: t("bottomLeft") }, { value: "right", label: t("bottomRight") }]} onValueChange={(position) => updatePlayer({ position: position as "left" | "right" })} /></label>
      <label className="field-label" htmlFor="player-source"><span>{t("musicSource")}</span><Select id="player-source" value={player.source} options={[{ value: "manual", label: t("manualSource") }, { value: "meting", label: t("metingSource") }]} onValueChange={(source) => changeSource(source as MusicSourceMode)} /></label>
      {player.source === "meting" ? <div className="form-stack form-stack--compact">
        <p className="field-hint">{t("metingExperimental")}</p>
        <label className="field-label" htmlFor="meting-api"><span>{t("metingApi")}</span><Input id="meting-api" value={player.meting.apiBaseUrl} onChange={(event) => updateMeting({ apiBaseUrl: event.target.value })} inputMode="url" placeholder="https://example.com/api.php" /></label>
        <label className="field-label" htmlFor="meting-server"><span>{t("metingServer")}</span><Input id="meting-server" value={player.meting.server} onChange={(event) => updateMeting({ server: event.target.value })} placeholder="netease" /></label>
        <label className="field-label" htmlFor="meting-mode"><span>{t("metingMode")}</span><Select id="meting-mode" value={player.meting.mode} options={[{ value: "song", label: t("metingSong") }, { value: "playlist", label: t("metingPlaylist") }, { value: "album", label: t("metingAlbum") }, { value: "search", label: t("metingSearch") }, { value: "artist", label: t("metingArtist") }]} onValueChange={(mode) => updateMeting({ mode: mode as MetingMatchMode })} /></label>
        <label className="field-label" htmlFor="meting-value"><span>{t(`metingValue${player.meting.mode.charAt(0).toUpperCase()}${player.meting.mode.slice(1)}` as "metingValueSong")}</span><Input id="meting-value" value={player.meting.value} onChange={(event) => updateMeting({ value: event.target.value })} /></label>
        <div className="dialog-actions"><Button size="sm" disabled={metingStatus.state === "loading"} onClick={loadMeting}>{metingStatus.state === "ready" ? t("metingRefresh") : t("metingLoad")}</Button>{metingStatus.state === "loading" ? <span className="field-hint">{t("metingLoading")}</span> : null}{metingStatus.state === "ready" ? <span className="field-hint">{t("metingLoaded", { count: metingStatus.count ?? 0 })}</span> : null}{metingStatus.state === "error" ? <span className="inline-error" role="alert">{t("metingLoadError")}</span> : null}</div>
      </div> : <>
        {player.playlist.length ? <div className="settings-list">{player.playlist.map((track) => (
          <div className="settings-list-item" key={track.id}>
            <div><strong>{track.title}</strong><span>{track.artist || t("unknownArtist")}</span></div>
            <div className="list-actions"><Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => { setEditing(track); setOpen(true); }}><Edit2 size={16} /></Button><Button variant="ghost" size="icon" aria-label={t("remove")} onClick={() => updatePlayer({ playlist: player.playlist.filter((item) => item.id !== track.id) })}><Trash2 size={16} /></Button></div>
          </div>
        ))}</div> : <div className="compact-empty"><Music size={18} /><span>{t("playerEmpty")}</span></div>}
        <Button size="sm" onClick={() => { setEditing(undefined); setOpen(true); }}><Plus size={17} />{t("addTrack")}</Button>
      </>}
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
