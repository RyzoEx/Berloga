"use client";
import { MicOff, Monitor } from "lucide-react";
import type { useVoiceRoom } from "@/hooks/useVoiceRoom";
import type { ServerSettings } from "@/lib/types";
import { StreamTile } from "./StreamTile";
import { Avatar, PersonName } from "./Avatar";

type Props = { voice: ReturnType<typeof useVoiceRoom>; eco: boolean; settings: ServerSettings };

export function Stage({ voice, eco, settings }: Props) {
  if (voice.status !== "connected") {
    return (
      <div className="grid min-w-0 flex-1 place-items-center p-6">
        <p className="max-w-xs text-center text-dim">
          {voice.status === "connecting" ? "Подключаемся…" : "Выбери комнату слева, чтобы зайти в голосовой канал."}
        </p>
      </div>
    );
  }

  const cols = voice.streams.length > 1 ? "xl:grid-cols-2" : "";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      {voice.sharing && (
        <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-dim">
          <Monitor size={16} className="text-live" />
          Твой экран в эфире. Потолок видео{" "}
          <span className="num text-text">{(settings.max_video_bitrate / 1000).toFixed(0)} кбит/с</span> задаёт админ.
        </p>
      )}

      {voice.streams.length > 0 && (
        <div className={`grid gap-4 border-b border-line p-4 ${cols}`}>
          {voice.streams.map((s) => (
            <StreamTile key={s.sid} stream={s} voice={voice} eco={eco} />
          ))}
        </div>
      )}

      <section className="p-4">
        <p className="label mb-3">В комнате · {voice.people.length}</p>
        <ul className="flex flex-col">
          {voice.people.map((p) => {
            const vol = voice.volumes[p.id] ?? 1;
            return (
              <li
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(120px,240px)_48px] items-center gap-4 border-t border-line py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-6 w-1 shrink-0 ${p.speaking ? "bg-signal" : "bg-line"}`}
                    aria-label={p.speaking ? "говорит" : undefined}
                  />
                  <Avatar id={p.id} fallbackName={p.name} size={24} />
                  <PersonName id={p.id} fallback={p.name} className="font-medium" />
                  {p.isLocal && <span className="text-faint">(ты)</span>}
                  {!p.micOn && <MicOff size={14} className="shrink-0 text-faint" aria-label="микрофон выключен" />}
                  {p.sharing && <span className="label text-live">эфир</span>}
                </div>
                {p.isLocal ? (
                  <span />
                ) : (
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={Math.round(vol * 100)}
                    aria-label={`Громкость: ${p.name}`}
                    onChange={(e) => voice.setVolume(p.id, Number(e.target.value) / 100)}
                    onDoubleClick={() => voice.setVolume(p.id, 1)}
                  />
                )}
                <span className="num text-right text-dim">{p.isLocal ? "" : `${Math.round(vol * 100)}%`}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
