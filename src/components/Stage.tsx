"use client";
import { Headphones, MicOff, Monitor } from "lucide-react";
import type { useVoiceRoom } from "@/hooks/useVoiceRoom";
import type { ServerSettings } from "@/lib/types";
import { StreamTile } from "./StreamTile";
import { Avatar, PersonName } from "./Avatar";
import { PROFILE_BUCKET, mediaUrl } from "@/lib/media";
import { useProfilesCtx } from "./ProfilesContext";
import type { RoomView } from "./SettingsDialog";
import type { StreamQuality } from "@/lib/clientPreferences";

type Voice = ReturnType<typeof useVoiceRoom>;
type Props = { voice: Voice; eco: boolean; settings: ServerSettings; view: RoomView; onPreferredQuality: (quality: StreamQuality) => void };

function List({ voice }: { voice: Voice }) {
  return (
    <ul className="flex flex-col">
          {voice.people.map((p) => {
            const vol = voice.volumes[p.id] ?? 1;
            return (
              <li
                key={p.id}
                className="room-participant-row grid grid-cols-[minmax(0,1fr)_minmax(120px,240px)_48px] items-center gap-4 border-t border-line py-3"
                data-speaking={p.speaking}
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
  );
}

/** Вид «как в Discord»: карточка на участника, баннер как фон, говорящий обведён сигнальным цветом. */
function Tiles({ voice, compact }: { voice: Voice; compact: boolean }) {
  const { profiles } = useProfilesCtx();
  return (
    <ul className={`grid gap-3 ${compact ? "grid-cols-[repeat(auto-fill,minmax(150px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"}`}>
      {voice.people.map((p) => {
        const vol = voice.volumes[p.id] ?? 1;
        const banner = profiles[p.id]?.banner_path;
        return (
          <li key={p.id} data-speaking={p.speaking} className={`room-participant-tile relative flex flex-col overflow-hidden border-2 bg-raised ${p.speaking ? "border-signal" : "border-line"}`}>
            <div className={`relative grid place-items-center ${compact ? "h-24" : "h-32"}`}>
              {banner && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(PROFILE_BUCKET, banner)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
              )}
              <span className="relative">
                <Avatar id={p.id} fallbackName={p.name} size={compact ? 48 : 64} />
              </span>
              <span className="absolute right-2 top-2 flex items-center gap-2">
                {p.sharing && <span className="label bg-ground px-1 text-live">эфир</span>}
                {!p.micOn && (
                  <span className="bg-ground p-1 text-live">
                    <MicOff size={14} aria-label="микрофон выключен" />
                  </span>
                )}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1 bg-panel px-3 py-2">
              <p className="flex min-w-0 items-baseline gap-1">
                <PersonName id={p.id} fallback={p.name} className="font-medium" />
                {p.isLocal && <span className="text-faint">(ты)</span>}
              </p>
              {!p.isLocal && (
                <span className="flex items-center gap-2">
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
                  <span className="num w-10 text-right text-dim">{Math.round(vol * 100)}%</span>
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Stage({ voice, eco, settings, view, onPreferredQuality }: Props) {
  if (voice.status !== "connected") {
    return (
      <div className="room-empty grid min-w-0 flex-1 place-items-center p-6">
        <div className="room-empty-content">
          <span className="modern-empty-icon"><Headphones size={28} aria-hidden="true" /></span>
          <h2 className="modern-empty-title">{voice.status === "connecting" ? "Вход в комнату" : "Голосовые комнаты"}</h2>
          <p className="max-w-xs text-center text-dim">
          {voice.status === "connecting" ? "Подключаемся…" : "Выбери комнату слева, чтобы зайти в голосовой канал."}
          </p>
        </div>
      </div>
    );
  }

  const activeStreams = voice.streams.filter((stream) => stream.watching);
  const waitingStreams = voice.streams.filter((stream) => !stream.watching);

  return (
    <div className="room-stage flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
      {voice.sharing && (
        <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-dim">
          <Monitor size={16} className="text-live" />
          Твой экран в эфире. Потолок видео{" "}
          <span className="num text-text">{(settings.max_video_bitrate / 1000).toFixed(0)} кбит/с</span> задаёт админ.
        </p>
      )}

      {voice.streams.length > 0 && (
        <section aria-label="Демонстрации экрана" className="room-stream-grid grid items-start gap-3 border-b border-line p-4">
          {[...activeStreams, ...waitingStreams].map((stream) => (
            <div key={stream.sid} className={stream.watching && activeStreams.length === 1 ? "col-span-full min-w-0" : "min-w-0"}>
              <StreamTile stream={stream} voice={voice} eco={eco} onPreferredQuality={onPreferredQuality} />
            </div>
          ))}
        </section>
      )}

      <section className="room-participants p-4">
        <p className="label mb-3">В комнате · {voice.people.length}</p>
        {view === "tiles" ? <Tiles voice={voice} compact={activeStreams.length > 0} /> : <List voice={voice} />}
      </section>
    </div>
  );
}
