"use client";
import { useEffect, useMemo, useState } from "react";
import { Gauge, MessageSquare, MonitorUp, MonitorOff, Radio, SlidersHorizontal } from "lucide-react";
import type { Profile } from "@/lib/types";
import { ROOMS } from "@/lib/constants";
import { reconcileVoicePeers } from "@/lib/sync";
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
import { SettingsDialog, type RoomView } from "./SettingsDialog";
import { applyTheme, readTheme, THEME_KEY, type ClientTheme } from "@/lib/themes";
import type { ClientPreferences } from "@/lib/clientPreferences";
import { InterfaceModeControl } from "./InterfaceModeControl";

const ECO_KEY = "berloga.eco";
const VIEW_KEY = "berloga.view";

type Props = {
  profile: Profile;
  onSignOut: () => void;
  preferences: ClientPreferences;
  onPreferences: (patch: Partial<ClientPreferences>) => void;
};

export function Shell({ profile: sessionProfile, onSignOut, preferences, onPreferences }: Props) {
  const { profiles, patch } = useProfiles();
  // актуальная версия своего профиля (ник, аватар, права) приходит через realtime
  const profile = profiles[sessionProfile.id] ?? sessionProfile;
  const { settings, update } = useServerSettings();
  const [ecoLocal, setEcoLocal] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setViewState] = useState<RoomView>("list");
  const [clientTheme, setClientTheme] = useState<ClientTheme>(readTheme);

  useEffect(() => {
    try {
      setEcoLocal(localStorage.getItem(ECO_KEY) === "1");
      setViewState(localStorage.getItem(VIEW_KEY) === "tiles" ? "tiles" : "list");
    } catch {}
  }, []);
  useEffect(() => {
    applyTheme(clientTheme, preferences);
  }, [clientTheme, preferences]);
  const setTheme = (theme: ClientTheme) => {
    setClientTheme(theme);
    try { localStorage.setItem(THEME_KEY, JSON.stringify(theme)); } catch {}
  };
  const setView = (v: RoomView) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {}
  };
  const setEco = (v: boolean) => {
    setEcoLocal(v);
    try {
      localStorage.setItem(ECO_KEY, v ? "1" : "0");
    } catch {}
  };

  const forcedEco = settings.forced_eco_users.includes(profile.id);
  const eco = forcedEco || ecoLocal;
  const voice = useVoiceRoom({ settings, eco, manualStreams: preferences.manualStreams, streamQuality: preferences.streamQuality });
  const lobby = useLobby(profile, {
    room: voice.connectedRoomId,
    streaming: voice.sharing,
    muted: voice.status === "connected" && !voice.micOn,
    deafened: voice.deafened,
    eco,
  });
  const peers = voice.status === "connected" && voice.connectedRoomId
    ? reconcileVoicePeers(lobby.peers, voice.people, voice.connectedRoomId)
    : lobby.peers;

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
    <div className="theme-shell grid h-full grid-cols-[288px_1fr]" data-interface={preferences.interfaceMode} data-effects={preferences.reduceThemeEffects ? "off" : "on"}>
      <aside className="shell-sidebar flex min-h-0 flex-col border-r border-line bg-panel">
        <div className="shell-brand flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
          {preferences.interfaceMode === "modern" && <span className="modern-brand-icon"><Radio size={17} aria-hidden="true" /></span>}
          <span className="font-display text-sm font-semibold tracking-tight">БЕРЛОГА</span>
          <InterfaceModeControl mode={preferences.interfaceMode} onMode={(interfaceMode) => onPreferences({ interfaceMode })} />
        </div>
        <RoomList peers={peers} presenceReady={lobby.presenceReady} current={voice.roomId} connecting={voice.status === "connecting"} onJoin={voice.join} />
        <SelfPanel profile={profile} voice={voice} eco={eco} forcedEco={forcedEco} onEco={setEco} onSignOut={onSignOut} onSettings={() => setSettingsOpen(true)} />
      </aside>

      <main className="shell-main flex min-h-0 min-w-0 flex-col">
        <header className="shell-toolbar flex h-12 shrink-0 items-center justify-between gap-4 border-b border-line px-4">
          <div className="flex min-w-0 items-baseline gap-3">
            <h2 className="truncate text-base font-semibold">{room ? room.name : "Не в комнате"}</h2>
            {voice.status === "connecting" && <span className="label">подключение</span>}
            {eco && (
              <span className="label flex items-center gap-1 text-signal">
                <Gauge size={12} /> экономия{forcedEco ? " (админ)" : ""}
              </span>
            )}
          </div>
          <div className="shell-toolbar-actions flex items-center gap-2">
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

        <div className="shell-workspace flex min-h-0 flex-1" data-chat-open={chatOpen}>
          <Stage voice={voice} eco={eco} settings={settings} view={view} onPreferredQuality={(streamQuality) => onPreferences({ streamQuality })} />
          {chatOpen && <ChatPanel room={chatRoom} onRoom={setChatRoom} manualAttachments={eco || preferences.manualAttachments} />}
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
      {settingsOpen && (
        <SettingsDialog
          view={view}
          onView={setView}
          theme={clientTheme}
          onTheme={setTheme}
          preferences={preferences}
          onPreferences={onPreferences}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {profileId && <ProfileDialog id={profileId} onClose={() => setProfileId(null)} />}
    </div>
    </ProfilesContext.Provider>
  );
}
