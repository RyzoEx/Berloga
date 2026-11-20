"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play } from "lucide-react";
import type { RemoteVideoTrack } from "livekit-client";
import type { StreamQuality, StreamView, useVoiceRoom } from "@/hooks/useVoiceRoom";
import { useName } from "./ProfilesContext";

type Stats = { w: number; h: number; fps: number; kbps: number };

/** Реально получаемые разрешение, fps и битрейт: видно, что делает слой качества. */
function useStats(track: RemoteVideoTrack | undefined, active: boolean) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    if (!track || !active) {
      setStats(null);
      return;
    }
    let prev: { bytes: number; frames: number; t: number } | null = null;
    const id = setInterval(async () => {
      const s = await track.getReceiverStats().catch(() => undefined);
      if (!s || s.bytesReceived === undefined) return;
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
    return () => clearInterval(id);
  }, [track, active]);
  return stats;
}

const QUALITY_LABEL: Record<StreamQuality, string> = { high: "Высокое", medium: "Среднее", low: "Низкое" };

export function StreamTile({
  stream,
  voice,
  eco,
}: {
  stream: StreamView;
  voice: ReturnType<typeof useVoiceRoom>;
  eco: boolean;
}) {
  const name = useName(stream.participantId, stream.name);
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const paused = !!voice.paused[stream.sid];
  const running = !paused && !voice.hidden;
  const stats = useStats(stream.track, running);

  useEffect(() => {
    const el = ref.current;
    const track = stream.track;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [stream.track]);

  const quality: StreamQuality = eco ? "low" : (voice.qualities[stream.sid] ?? "high");

  return (
    <figure ref={box} className="flex flex-col border border-line bg-panel">
      <div className="relative aspect-video bg-ground">
        <video ref={ref} className="h-full w-full object-contain" autoPlay playsInline muted />
        {(paused || !stream.track) && (
          <p className="absolute inset-0 grid place-items-center text-dim">
            {paused ? "Пауза: видео не загружается" : "Ждём видео…"}
          </p>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center gap-3 border-t border-line px-3 py-2">
        <span className="font-medium">{name}</span>
        <span className="num text-dim">
          {stats ? `${stats.h}p · ${stats.fps} fps · ${stats.kbps} кбит/с` : "—"}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <select
            className="field h-8 w-auto"
            value={quality}
            disabled={eco}
            title={eco ? "В режиме экономии качество зафиксировано" : "Слой качества, который отдаёт сервер"}
            aria-label="Качество потока"
            onChange={(e) => voice.setQuality(stream.sid, e.target.value as StreamQuality)}
          >
            {(Object.keys(QUALITY_LABEL) as StreamQuality[]).map((q) => (
              <option key={q} value={q}>
                {QUALITY_LABEL[q]}
              </option>
            ))}
          </select>
          <button
            className="btn btn-icon h-8"
            title={paused ? "Продолжить" : "Пауза (трафик не расходуется)"}
            aria-label={paused ? "Продолжить" : "Пауза"}
            onClick={() => voice.togglePause(stream.sid)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
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
