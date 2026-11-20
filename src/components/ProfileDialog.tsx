"use client";
import { useRef, useState } from "react";
import { ImagePlus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AVATAR_MAX, BANNER_MAX, PROFILE_ACCEPT, PROFILE_BUCKET, PROFILE_MIMES, formatSize, mediaUrl, removeFiles, uploadFile } from "@/lib/media";
import { ROOMS } from "@/lib/constants";
import { Avatar } from "./Avatar";
import { useProfilesCtx } from "./ProfilesContext";

type Kind = "avatar" | "banner";
const COL = { avatar: "avatar_path", banner: "banner_path" } as const;

export function ProfileDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { me, profiles, peers, patch } = useProfilesCtx();
  const p = profiles[id];
  const isSelf = id === me.id;
  const peer = peers.find((x) => x.user_id === id);

  const [busy, setBusy] = useState<Kind | "name" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(p?.username ?? "");
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  if (!p) return null;

  const status = peer
    ? peer.streaming
      ? "стримит"
      : peer.room
        ? `в комнате «${ROOMS.find((r) => r.id === peer.room)?.name ?? peer.room}»`
        : "в сети"
    : "не в сети";

  /** Новый файл → запись в профиль → удаление старого файла. Если запись не удалась, новый файл тоже удаляется. */
  const setMedia = async (kind: Kind, file: File | null) => {
    setError(null);
    const old = p[COL[kind]];
    let path: string | null = null;
    if (file) {
      if (!PROFILE_MIMES.includes(file.type)) return setError("Подходят png, jpg, webp и gif");
      const max = kind === "avatar" ? AVATAR_MAX : BANNER_MAX;
      if (file.size > max) return setError(`Файл ${formatSize(file.size)}, лимит ${formatSize(max)}`);
    }
    setBusy(kind);
    try {
      if (file) path = await uploadFile(PROFILE_BUCKET, me.id, file, kind);
      const { error: err } = await supabase.from("profiles").update({ [COL[kind]]: path }).eq("id", me.id);
      if (err) {
        if (path) await removeFiles(PROFILE_BUCKET, [path]);
        setError("Не удалось сохранить");
        return;
      }
      patch(me.id, { [COL[kind]]: path });
      if (old) void removeFiles(PROFILE_BUCKET, [old]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить");
    } finally {
      setBusy(null);
    }
  };

  const saveName = async () => {
    const next = name.trim();
    if (next === p.username) return;
    if (next.length < 2 || next.length > 24) return setError("Ник: от 2 до 24 символов");
    setError(null);
    setBusy("name");
    const { error: err } = await supabase.from("profiles").update({ username: next }).eq("id", me.id);
    setBusy(null);
    if (err) return setError(err.code === "23505" ? "Этот ник занят" : "Не удалось сохранить");
    patch(me.id, { username: next });
  };

  const pick = (kind: Kind) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // чтобы тот же файл можно было выбрать повторно
    if (f) void setMedia(kind, f);
  };

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ground/80 p-4" onClick={onClose}>
      <div role="dialog" aria-label="Профиль" className="w-full max-w-md border border-line bg-panel" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-32 bg-raised">
          {p.banner_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(PROFILE_BUCKET, p.banner_path)} alt="" className="h-full w-full object-cover" />
          )}
          <button className="btn btn-icon absolute right-2 top-2" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div className="-mt-12 flex items-end gap-4">
            <div className="relative border-4 border-panel bg-panel">
              <Avatar id={id} size={72} />
            </div>
            <div className="min-w-0 pb-1">
              <p className="truncate text-base font-semibold">{p.username}</p>
              <p className="label">
                {status}
                {p.is_admin ? " · админ" : ""}
              </p>
            </div>
          </div>

          {isSelf && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="label">Ник</span>
                <span className="flex gap-2">
                  <input className="field" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} />
                  <button className="btn" disabled={busy !== null || name.trim() === p.username} onClick={saveName}>
                    Сохранить
                  </button>
                </span>
              </label>

              {(["avatar", "banner"] as const).map((kind) => (
                <div key={kind} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="block font-medium">{kind === "avatar" ? "Аватар" : "Баннер"}</span>
                    <span className="text-dim">png, jpg, webp, gif · до {formatSize(kind === "avatar" ? AVATAR_MAX : BANNER_MAX)}</span>
                  </span>
                  <span className="flex gap-2">
                    <button className="btn" disabled={busy !== null} onClick={() => (kind === "avatar" ? avatarInput : bannerInput).current?.click()}>
                      <ImagePlus size={16} /> {busy === kind ? "Загрузка…" : "Выбрать"}
                    </button>
                    <button className="btn btn-icon" disabled={busy !== null || !p[COL[kind]]} aria-label="Убрать" title="Убрать" onClick={() => setMedia(kind, null)}>
                      <Trash2 size={16} />
                    </button>
                  </span>
                </div>
              ))}
              <input ref={avatarInput} type="file" accept={PROFILE_ACCEPT} hidden onChange={pick("avatar")} />
              <input ref={bannerInput} type="file" accept={PROFILE_ACCEPT} hidden onChange={pick("banner")} />
            </div>
          )}

          {error && <p className="text-live">{error}</p>}
        </div>
      </div>
    </div>
  );
}
