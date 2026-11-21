"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Minus, Square, X } from "lucide-react";

type DesktopWindow = {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
};

type DesktopHost = Window & {
  __TAURI__?: { window?: { getCurrentWindow: () => DesktopWindow } };
};

export function DesktopFrame({ children }: { children: ReactNode }) {
  const [desktop, setDesktop] = useState<DesktopWindow | null>(null);

  useEffect(() => {
    const api = (window as DesktopHost).__TAURI__?.window;
    if (api?.getCurrentWindow) setDesktop(api.getCurrentWindow());
  }, []);

  const run = (action: keyof DesktopWindow) => {
    void desktop?.[action]().catch((error: unknown) => console.error("Berloga window action failed", error));
  };

  return (
    <div className="desktop-frame" data-native-frame={!!desktop}>
      {desktop && (
        <div className="desktop-titlebar">
          <div className="desktop-drag-region" data-tauri-drag-region>
            <span>Берлога</span>
          </div>
          <div className="desktop-window-buttons" role="group" aria-label="Управление окном">
            <button type="button" title="Свернуть" aria-label="Свернуть" onClick={() => run("minimize")}>
              <Minus size={15} aria-hidden="true" />
            </button>
            <button type="button" title="Развернуть или восстановить" aria-label="Развернуть или восстановить" onClick={() => run("toggleMaximize")}>
              <Square size={13} aria-hidden="true" />
            </button>
            <button type="button" title="Закрыть в трей" aria-label="Закрыть в трей" onClick={() => run("close")}>
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <div className="desktop-content">{children}</div>
    </div>
  );
}
