"use client";
import { LayoutGrid, List, X } from "lucide-react";

export type RoomView = "list" | "tiles";

export function SettingsDialog({ view, onView, onClose }: { view: RoomView; onView: (v: RoomView) => void; onClose: () => void }) {
  const options: { id: RoomView; label: string; hint: string; icon: typeof List }[] = [
    { id: "list", label: "Список", hint: "Строки с ползунками громкости, как в таблице", icon: List },
    { id: "tiles", label: "Плитки", hint: "Карточки участников с баннером и аватаром, как в Discord", icon: LayoutGrid },
  ];
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ground/80 p-4" onClick={onClose}>
      <div role="dialog" aria-label="Настройки" className="flex w-full max-w-md flex-col gap-4 border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Настройки клиента</h3>
          <button className="btn btn-icon" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>
        <div>
          <p className="label mb-2">Вид комнаты</p>
          <div className="flex flex-col" role="radiogroup">
            {options.map((o) => (
              <label key={o.id} className={`-mt-px flex cursor-pointer items-start gap-3 border border-line px-3 py-3 first:mt-0 ${view === o.id ? "bg-raised" : ""}`}>
                <input type="radio" name="view" className="mt-1 accent-signal" checked={view === o.id} onChange={() => onView(o.id)} />
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    <o.icon size={16} /> {o.label}
                  </span>
                  <span className="text-dim">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-dim">Настройка хранится только на этом устройстве.</p>
        </div>
      </div>
    </div>
  );
}
