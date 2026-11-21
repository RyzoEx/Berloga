"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Download, Paperclip, Send, Trash2, X } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { CHAT_ACCEPT, CHAT_BUCKET, CHAT_MAX, chatKind, formatSize, mediaUrl } from "@/lib/media";
import { ROOMS } from "@/lib/constants";
import type { ChatMessage } from "@/lib/types";
import { Avatar, PersonName } from "./Avatar";
import { useProfilesCtx } from "./ProfilesContext";

type Props = { room: string; onRoom: (id: string) => void; manualAttachments: boolean };

const time = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
const GROUP_MS = 5 * 60 * 1000;

function Attachment({ m, manual, onLoad, onZoom }: { m: ChatMessage; manual: boolean; onLoad: () => void; onZoom: (url: string) => void }) {
  const [wanted, setWanted] = useState(false);
  const [broken, setBroken] = useState(false);

  if (!m.attachment_path || !m.attachment_kind) return null;
  const url = mediaUrl(CHAT_BUCKET, m.attachment_path);
  const label = `${m.attachment_name ?? "файл"}${m.attachment_size ? ` · ${formatSize(m.attachment_size)}` : ""}`;

  if (manual && !wanted) {
    return (
      <button className="btn h-auto w-fit py-2" onClick={() => setWanted(true)} title="Экономия трафика: файл не загружается сам">
        <Download size={16} /> Загрузить: {label}
      </button>
    );
  }
  if (broken) return <p className="text-faint">Файл недоступен</p>;
  if (m.attachment_kind === "video") {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        playsInline
        className="max-h-72 max-w-full border border-line bg-ground"
        onLoadedMetadata={onLoad}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <button className="w-fit" onClick={() => onZoom(url)} title={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} loading="lazy" className="max-h-72 max-w-full border border-line object-contain" onLoad={onLoad} onError={() => setBroken(true)} />
    </button>
  );
}

export function ChatPanel({ room, onRoom, manualAttachments }: Props) {
  const { me } = useProfilesCtx();
  const chat = useChat(room, me.id);
  const { messages } = chat;

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const stick = useRef(true); // пока читаешь историю выше, новые сообщения не дёргают прокрутку

  const toBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  const onScroll = () => {
    const el = listRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  const onMediaLoad = () => stick.current && toBottom();

  useLayoutEffect(() => {
    if (stick.current) toBottom();
  }, [messages.length, chat.status]);

  useEffect(() => {
    stick.current = true;
    setConfirmId(null);
    setError(null);
  }, [room]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoom(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  const choose = (f: File | null) => {
    if (!f) return;
    if (!chatKind(f)) return setError("Подходят фото (png, jpg, webp, gif) и видео (mp4, webm)");
    if (f.size > CHAT_MAX) return setError(`Файл ${formatSize(f.size)}, лимит ${formatSize(CHAT_MAX)}`);
    setError(null);
    setFile(f);
  };

  const submit = async () => {
    if (sending || (!text.trim() && !file)) return;
    setSending(true);
    setError(null);
    stick.current = true;
    const err = await chat.send(text, file);
    setSending(false);
    if (err) return setError(err);
    setText("");
    setFile(null);
  };

  const del = async (m: ChatMessage) => {
    setDeleting(m.id);
    const err = await chat.remove(m);
    setDeleting(null);
    setConfirmId(null);
    if (err) setError(err);
  };

  const loadOlder = async () => {
    const el = listRef.current;
    const before = el?.scrollHeight ?? 0;
    await chat.loadOlder();
    requestAnimationFrame(() => {
      if (el) el.scrollTop += el.scrollHeight - before;
    });
  };

  return (
    <aside className="shell-chat flex min-h-0 w-96 shrink-0 flex-col border-l border-line bg-panel" aria-label="Чат">
      <div className="shell-chat-tabs flex border-b border-line">
        {ROOMS.map((r) => (
          <button key={r.id} className={`flex-1 px-2 py-3 ${r.id === room ? "bg-raised font-semibold text-signal" : "text-dim hover:bg-raised"}`} aria-pressed={r.id === room} onClick={() => onRoom(r.id)}>
            {r.name}
          </button>
        ))}
      </div>

      <div ref={listRef} onScroll={onScroll} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
        {chat.hasMore && (
          <button className="btn mb-3 w-fit self-center" disabled={chat.loadingOlder} onClick={loadOlder}>
            {chat.loadingOlder ? "Загрузка…" : "Показать более ранние"}
          </button>
        )}
        {chat.status === "loading" && <p className="text-faint">Загрузка…</p>}
        {chat.status === "error" && <p className="text-live">Не удалось загрузить чат. Проверь, что выполнена миграция Supabase.</p>}
        {chat.status === "ready" && messages.length === 0 && <p className="text-faint">Пока пусто.</p>}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || day(prev.created_at) !== day(m.created_at);
          const grouped = !newDay && prev.user_id === m.user_id && Date.parse(m.created_at) - Date.parse(prev.created_at) < GROUP_MS;
          const mine = m.user_id === me.id;
          return (
            <div key={m.id}>
              {newDay && <p className="label my-3 text-center">{day(m.created_at)}</p>}
              <div className={`group flex gap-3 ${grouped ? "pt-1" : "pt-3"}`}>
                <div className="w-8 shrink-0">{!grouped && <Avatar id={m.user_id} size={32} />}</div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {!grouped && (
                    <p className="flex items-baseline gap-2">
                      <PersonName id={m.user_id} className="font-medium" />
                      <span className="num text-faint">{time(m.created_at)}</span>
                    </p>
                  )}
                  {m.body && <p className="chat-message-body whitespace-pre-wrap break-words" data-mine={mine}>{m.body}</p>}
                  <Attachment m={m} manual={manualAttachments} onLoad={onMediaLoad} onZoom={setZoom} />
                </div>
                {mine && (
                  <div className="shrink-0">
                    {confirmId === m.id ? (
                      <span className="flex gap-1">
                        <button className="btn h-8 px-2 text-live" disabled={deleting === m.id} onClick={() => del(m)}>
                          {deleting === m.id ? "…" : m.attachment_path ? "Удалить с файлом" : "Удалить"}
                        </button>
                        <button className="btn btn-icon h-8" aria-label="Отмена" onClick={() => setConfirmId(null)}>
                          <X size={16} />
                        </button>
                      </span>
                    ) : (
                      <button className="btn btn-icon h-8 opacity-0 focus-visible:opacity-100 group-hover:opacity-100" aria-label="Удалить сообщение" title="Удалить" onClick={() => setConfirmId(m.id)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t border-line p-3">
        {error && <p className="text-live">{error}</p>}
        {file && (
          <p className="flex items-center justify-between gap-2 border border-line bg-raised px-3 py-2">
            <span className="truncate">{file.name}</span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="num text-dim">{formatSize(file.size)}</span>
              <button className="text-dim hover:text-text" aria-label="Убрать вложение" onClick={() => setFile(null)}>
                <X size={16} />
              </button>
            </span>
          </p>
        )}
        <div className="flex items-end gap-2">
          <button className="btn btn-icon" aria-label="Прикрепить фото или видео" title="Прикрепить фото или видео" disabled={sending} onClick={() => fileInput.current?.click()}>
            <Paperclip size={16} />
          </button>
          <input ref={fileInput} type="file" accept={CHAT_ACCEPT} hidden onChange={(e) => { choose(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          <textarea
            className="field h-auto max-h-32 min-h-9 resize-none py-2"
            rows={1}
            maxLength={2000}
            placeholder="Сообщение"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const f = Array.from(e.clipboardData.files).find((x) => chatKind(x));
              if (f) {
                e.preventDefault();
                choose(f);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <button className="btn btn-signal btn-icon" aria-label="Отправить" disabled={sending || (!text.trim() && !file)} onClick={submit}>
            <Send size={16} />
          </button>
        </div>
        {sending && file && <p className="text-dim">Загружаем файл…</p>}
      </div>

      {zoom && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-ground/90 p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </aside>
  );
}
