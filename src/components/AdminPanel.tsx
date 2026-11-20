"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AUDIO_LIMITS, VIDEO_LIMITS, mbPerHour } from "@/lib/constants";
import type { Peer, ServerSettings } from "@/lib/types";
import { PersonName } from "./Avatar";

type Props = {
  settings: ServerSettings;
  update: (patch: Partial<Omit<ServerSettings, "id">>) => Promise<unknown>;
  peers: Peer[];
  onClose: () => void;
};

function LimitSlider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  note: (v: number) => string;
  onCommit: (v: number) => void;
}) {
  const { value, onCommit } = props;
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => draft !== value && onCommit(draft);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="font-medium">{props.label}</span>
        <span className="num text-signal">{props.format(draft)}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={draft}
        aria-label={props.label}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
      />
      <p className="text-dim">{props.note(draft)}</p>
    </div>
  );
}

export function AdminPanel({ settings, update, peers, onClose }: Props) {
  const forced = new Set(settings.forced_eco_users);
  const toggleForced = (id: string) => {
    const next = new Set(forced);
    next.has(id) ? next.delete(id) : next.add(id);
    void update({ forced_eco_users: [...next] });
  };

  return (
    <aside
      className="fixed inset-y-0 right-0 z-10 flex w-96 max-w-full flex-col border-l border-line bg-panel"
      aria-label="Панель администратора"
    >
      <header className="flex h-12 items-center justify-between border-b border-line px-4">
        <h3 className="font-semibold">Администратор</h3>
        <button className="btn btn-icon" onClick={onClose} aria-label="Закрыть">
          <X size={16} />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <p className="text-dim">Изменения применяются у всех подключённых клиентов сразу.</p>

        <LimitSlider
          label="Аудио, Opus"
          value={settings.audio_bitrate}
          {...AUDIO_LIMITS}
          format={(v) => `${v / 1000} кбит/с`}
          note={(v) => `≈ ${mbPerHour(v).toFixed(0)} МБ/ч на говорящего`}
          onCommit={(v) => update({ audio_bitrate: v })}
        />
        <LimitSlider
          label="Видео, максимум"
          value={settings.max_video_bitrate}
          {...VIDEO_LIMITS}
          format={(v) => `${v / 1000} кбит/с`}
          note={(v) => `≈ ${mbPerHour(v).toFixed(0)} МБ/ч на зрителя верхнего слоя`}
          onCommit={(v) => update({ max_video_bitrate: v })}
        />

        <section>
          <p className="label mb-2">Участники в сети · принудительная экономия</p>
          {peers.length === 0 ? (
            <p className="text-faint">Никого</p>
          ) : (
            <ul className="flex flex-col">
              {peers.map((p) => (
                <li key={p.user_id} className="flex items-center justify-between gap-3 border-t border-line py-2">
                  <PersonName id={p.user_id} fallback={p.username} />
                  <button className="btn" aria-pressed={forced.has(p.user_id)} onClick={() => toggleForced(p.user_id)}>
                    {forced.has(p.user_id) ? "Экономия включена" : "Включить"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
