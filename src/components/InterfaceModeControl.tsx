import type { InterfaceMode } from "@/lib/clientPreferences";

const MODES = [
  { value: "legacy", label: "Legacy" },
  { value: "modern", label: "Modern" },
] as const;

export function InterfaceModeControl({ mode, onMode }: { mode: InterfaceMode; onMode: (mode: InterfaceMode) => void }) {
  return (
    <div className="interface-mode-control" role="group" aria-label="Режим интерфейса">
      {MODES.map(({ value, label }) => (
        <button key={value} type="button" aria-pressed={mode === value} onClick={() => onMode(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}
