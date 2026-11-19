"use client";
import { useState } from "react";
import { PRESETS, type PresetId, type ShareHeight } from "@/lib/presets";
import { mbPerHour } from "@/lib/constants";

type Props = {
  eco: boolean;
  capBps: number;
  onClose: () => void;
  onStart: (preset: PresetId, height: ShareHeight | 480) => void;
};

export function ShareDialog({ eco, capBps, onClose, onStart }: Props) {
  const [id, setId] = useState<PresetId>(eco ? "eco" : "game");
  const preset = PRESETS.find((p) => p.id === id)!;
  const [height, setHeight] = useState<number>(preset.heights[0]);

  const pick = (p: (typeof PRESETS)[number]) => {
    setId(p.id);
    setHeight(p.heights[0]);
  };
  const top = Math.min(preset.topBitrate[height] ?? 300_000, capBps);

  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-ground/80 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Показать экран"
        className="flex w-full max-w-md flex-col gap-4 border border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold">Показать экран</h3>

        <div className="flex flex-col" role="radiogroup">
          {PRESETS.map((p) => {
            const locked = eco && p.id !== "eco";
            return (
              <label
                key={p.id}
                className={`flex items-start gap-3 border border-line px-3 py-3 ${locked ? "opacity-40" : "cursor-pointer"} ${
                  id === p.id ? "bg-raised" : ""
                } -mt-px first:mt-0`}
              >
                <input type="radio" name="preset" className="mt-1 accent-signal" checked={id === p.id} disabled={locked} onChange={() => pick(p)} />
                <span>
                  <span className="block font-medium">{p.label}</span>
                  <span className="text-dim">{p.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
        {eco && <p className="text-dim">У тебя включена экономия трафика, доступен только этот пресет.</p>}

        {preset.heights.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="text-dim">Разрешение</span>
            {(preset.heights as number[]).map((h) => (
              <button key={h} className="btn num" aria-pressed={height === h} onClick={() => setHeight(h)}>
                {h}p
              </button>
            ))}
          </div>
        )}

        <p className="text-dim">
          Верхний слой до <span className="num text-text">{Math.round(top / 1000)} кбит/с</span> (≈{" "}
          <span className="num text-text">{Math.round(mbPerHour(top))} МБ/ч</span> твоего аплоада). Зрители получают слой по
          своему каналу. Системный звук включится, если выбрать экран или вкладку со звуком.
        </p>

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-signal" onClick={() => onStart(id, height as ShareHeight | 480)}>
            Выбрать окно
          </button>
        </div>
      </div>
    </div>
  );
}
