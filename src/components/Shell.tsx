"use client";
import { useEffect, useMemo, useState } from "react";
import { Gauge, MessageSquare, MonitorUp, MonitorOff, SlidersHorizontal } from "lucide-react";
import type { Profile } from "@/lib/types";
import { ROOMS } from "@/lib/constants";
import { useServerSettings } from "@/hooks/useServerSettings";
import { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { useLobby } from "@/hooks/useLobby";
import { useProfiles } from "@/hooks/useProfiles";
import { RoomList } from "./RoomList";
import { SelfPanel } from "./SelfPanel";
import { Stage } from "./Stage";
import { ShareDialog } from "./ShareDialog";
import { AdminPanel } from "./AdminPanel";
import { ChatPanel } from "./ChatPanel";
import { ProfileDialog } from "./ProfileDialog";
import { ProfilesContext } from "./ProfilesContext";

const ECO_KEY = "berloga.eco";

export function Shell({ profile: sessionProfile, onSignOut }: { profile: Profile; onSignOut: () => void }) {
  const { profiles, patch } = useProfiles();
  // актуальная версия своего профиля (ник, аватар, права) приходит через realtime
  const profile = profiles[sessionProfile.id] ?? sessionProfile;
  const { settings, update } = useServerSettings();
  const [ecoLocal, setEcoLocal] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

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
    muted: voice.status === "connected" && !voice.micOn,
    deafened: voice.deafened,
    eco,
  });

  const room = ROOMS.find((r) => r.id === voice.roomId);

  // чат следует за голосовой комнатой, но его можно переключить вручную
  const [chatRoom, setChatRoom] = useState<string>(voice.roomId ?? "main");
  useEffect(() => {
    if (voice.roomId) setChatRoom(voice.roomId);
  }, [voice.roomId]);

  // права админа снимаются сразу, если их отозвали
  useEffect(() => {
    if (!profile.is_admin) setAdminOpen(false);
  }, [profile.is_admin]);

  const ctx = useMemo(
    () => ({ me: profile, profiles, peers, patch, openProfile: setProfileId }),
    [profile, profiles, peers, patch],
  );

  return (
    <ProfilesContext.Provider value={ctx}>
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
            <button className="btn" aria-pressed={chatOpen} onClick={() => setChatOpen((v) => !v)}>
              <MessageSquare size={16} /> Чат
            </button>
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

        <div className="flex min-h-0 flex-1">
          <Stage voice={voice} eco={eco} settings={settings} />
          {chatOpen && <ChatPanel room={chatRoom} onRoom={setChatRoom} eco={eco} />}
        </div>
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
      {profileId && <ProfileDialog id={profileId} onClose={() => setProfileId(null)} />}
    </div>
    </ProfilesContext.Provider>
  );
}
