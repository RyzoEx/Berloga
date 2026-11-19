"use client";
import { useEffect, useState } from "react";
import { Gauge, MonitorUp, MonitorOff, SlidersHorizontal } from "lucide-react";
import type { Profile } from "@/lib/types";
import { ROOMS } from "@/lib/constants";
import { useServerSettings } from "@/hooks/useServerSettings";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { useLobby } from "@/hooks/useLobby";
import { RoomList } from "./RoomList";
import { SelfPanel } from "./SelfPanel";
import { Stage } from "./Stage";
import { ShareDialog } from "./ShareDialog";
import { AdminPanel } from "./AdminPanel";

const ECO_KEY = "berloga.eco";

export function Shell({ profile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const { settings, update } = useServerSettings();
  const [ecoLocal, setEcoLocal] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    try {
      setEcoLocal(localStorage.getItem(ECO_KEY) === "1");
    } catch {}
  }, []);
  const setEco = (v: boolean) => {
    setEcoLocal(v);
    try {
      localStorage.setItem(ECO_KEY, v ? "1" : "0");
    } catch {}
  };

  const forcedEco = settings.forced_eco_users.includes(profile.id);
  const eco = forcedEco || ecoLocal;
  const voice = useVoiceRoom({ settings, eco });
  const peers = useLobby(profile, {
    room: voice.roomId,
    streaming: voice.sharing,
    muted: !voice.micOn,
    deafened: voice.deafened,
    eco,
  });

  const room = ROOMS.find((r) => r.id === voice.roomId);

  return (
    <div className="grid h-full grid-cols-[288px_1fr]">
      <aside className="flex min-h-0 flex-col border-r border-line bg-panel">
        <div className="flex h-12 items-center border-b border-line px-4">
          <span className="font-display text-sm font-semibold tracking-tight">БЕРЛОГА</span>
        </div>
        <RoomList peers={peers} current={voice.roomId} connecting={voice.status === "connecting"} onJoin={voice.join} />
        <SelfPanel profile={profile} voice={voice} eco={eco} forcedEco={forcedEco} onEco={setEco} onSignOut={onSignOut} />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-12 items-center justify-between gap-4 border-b border-line px-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2 className="truncate text-base font-semibold">{room ? room.name : "Не в комнате"}</h2>
            {voice.status === "connecting" && <span className="label">подключение</span>}
            {eco && (
              <span className="label flex items-center gap-1 text-signal">
                <Gauge size={12} /> экономия{forcedEco ? " (админ)" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {voice.status === "connected" && (
              <button
                className="btn"
                aria-pressed={voice.sharing}
                onClick={() => (voice.sharing ? voice.stopShare() : setShareOpen(true))}
              >
                {voice.sharing ? <MonitorOff size={16} /> : <MonitorUp size={16} />}
                {voice.sharing ? "Остановить показ" : "Показать экран"}
              </button>
            )}
            {profile.is_admin && (
              <button className="btn" aria-pressed={adminOpen} onClick={() => setAdminOpen((v) => !v)}>
                <SlidersHorizontal size={16} /> Админ
              </button>
            )}
          </div>
        </header>

        {voice.audioBlocked && (
          <button className="border-b border-line bg-raised px-4 py-2 text-left text-signal" onClick={voice.unlockAudio}>
            Браузер заблокировал звук. Нажми, чтобы включить.
          </button>
        )}
        {voice.error && <p className="border-b border-line px-4 py-2 text-live">{voice.error}</p>}
        {voice.micError && <p className="border-b border-line px-4 py-2 text-dim">Микрофон недоступен, ты только слушаешь.</p>}

        <Stage voice={voice} eco={eco} settings={settings} />
      </main>

      <div ref={(el) => void (voice.audioHost.current = el)} hidden />

      {shareOpen && (
        <ShareDialog
          eco={eco}
          capBps={settings.max_video_bitrate}
          onClose={() => setShareOpen(false)}
          onStart={(preset, height) => {
            setShareOpen(false);
            void voice.startShare(preset, height);
          }}
        />
      )}
      {adminOpen && profile.is_admin && (
        <AdminPanel settings={settings} update={update} peers={peers} onClose={() => setAdminOpen(false)} />
      )}
    </div>
  );
}
