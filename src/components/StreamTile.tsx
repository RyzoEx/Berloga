"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize, Monitor, Pause, Play, Square } from "lucide-react";
import type { RemoteVideoTrack } from "livekit-client";
import type { StreamView, useVoiceRoom } from "@/hooks/useVoiceRoom";
import { QUALITY_LABELS, type StreamQuality } from "@/lib/clientPreferences";
import { mbPerHour } from "@/lib/constants";
import { useName } from "./ProfilesContext";

type Stats = { w: number; h: number; fps: number; kbps: number };
const hourlyUsage = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

/** Реально получаемые разрешение, fps и битрейт: видно, что делает слой качества. */
function useStats(track: RemoteVideoTrack | undefined, active: boolean) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    if (!track || !active) {
      setStats(null);
      return;
    }
    let prev: { bytes: number; frames: number; t: number } | null = null;
    let stopped = false;
    const id = setInterval(async () => {
      const s = await track.getReceiverStats().catch(() => undefined);
      if (stopped || !s || s.bytesReceived === undefined) return;
      const cur = { bytes: s.bytesReceived, frames: s.framesDecoded, t: s.timestamp };
      if (prev && cur.t > prev.t) {
        const dt = (cur.t - prev.t) / 1000;
        setStats({
          w: s.frameWidth ?? 0,
          h: s.frameHeight ?? 0,
          fps: Math.round((cur.frames - prev.frames) / dt),
          kbps: Math.round(((cur.bytes - prev.bytes) * 8) / dt / 1000),
        });
      }
      prev = cur;
    }, 2000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [track, active]);
  return stats;
}

export function StreamTile({
  stream,
  voice,
  eco,
  onPreferredQuality,
}: {
  stream: StreamView;
  voice: ReturnType<typeof useVoiceRoom>;
  eco: boolean;
  onPreferredQuality: (quality: StreamQuality) => void;
}) {
  const name = useName(stream.participantId, stream.name);
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const paused = !voice.manualStreams && !!voice.paused[stream.sid];
  const running = stream.watching && !paused && !voice.hidden;
  const stats = useStats(stream.track, running);

  useEffect(() => {
    const el = ref.current;
    const track = stream.track;
    if (!stream.watching || !el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [stream.track, stream.watching]);

  const qualitySelector = (
    <select
      className="field field-compact"
      value={stream.quality}
      disabled={eco}
      title={eco ? "В режиме экономии качество зафиксировано" : "Максимальное качество видео"}
      aria-label={`Качество демонстрации: ${name}`}
      onChange={(e) => {
        const quality = e.target.value as StreamQuality;
        if (stream.watching) voice.setQuality(stream.sid, quality);
        if (voice.manualStreams) onPreferredQuality(quality);
      }}
    >
      {(Object.keys(QUALITY_LABELS) as StreamQuality[]).map((quality) => (
        <option key={quality} value={quality}>{QUALITY_LABELS[quality]}</option>
      ))}
    </select>
  );

  if (!stream.watching) {
    return (
      <div className="room-stream flex flex-wrap items-center gap-3 rounded-sm border border-line bg-panel p-3">
        <span className="grid size-9 shrink-0 place-items-center border border-line bg-raised text-signal">
          <Monitor size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-dim">Показывает экран</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {qualitySelector}
          <button className="btn btn-signal" onClick={() => voice.toggleWatch(stream.sid)}>
            <Play size={14} aria-hidden="true" /> Смотреть
          </button>
        </div>
      </div>
    );
  }

  return (
    <figure ref={box} className="room-stream flex flex-col overflow-hidden rounded-sm border border-line bg-panel">
      <div className="relative aspect-video bg-ground">
        <video ref={ref} className="h-full w-full object-contain" autoPlay playsInline muted />
        {(paused || !stream.track) && (
          <p role="status" className="absolute inset-0 grid place-items-center text-dim">
            {paused ? "Демонстрация на паузе" : "Ждём видео…"}
          </p>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center gap-3 border-t border-line px-3 py-2">
        <span className="font-medium">{name}</span>
        {running && stats && (
          <span className="num text-xs text-dim" title="Примерный расход только на видео при текущем битрейте">
            {stats.h}p · {stats.fps} fps · {stats.kbps} кбит/с · ≈{hourlyUsage.format(mbPerHour(stats.kbps * 1000))} МБ/ч
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {qualitySelector}
          {voice.manualStreams ? (
            <button
              className="btn btn-icon h-8"
              title="Перестать смотреть"
              aria-label="Перестать смотреть"
              onClick={() => voice.toggleWatch(stream.sid)}
            >
              <Square size={14} />
            </button>
          ) : <button
            className="btn btn-icon h-8"
            title={paused ? "Продолжить" : "Пауза видео и звука демонстрации"}
            aria-label={paused ? "Продолжить" : "Пауза"}
            onClick={() => voice.togglePause(stream.sid)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>}
          <button
            className="btn btn-icon h-8"
            title="На весь экран"
            aria-label="На весь экран"
            onClick={() => box.current?.requestFullscreen?.()}
          >
            <Maximize size={16} />
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
