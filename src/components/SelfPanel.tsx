"use client";
import { Gauge, Headphones, HeadphoneOff, LogOut, Mic, MicOff, PhoneOff, Settings } from "lucide-react";
import type { Profile } from "@/lib/types";
import type { useVoiceRoom } from "@/hooks/useVoiceRoom";
import { Avatar } from "./Avatar";
import { useProfilesCtx } from "./ProfilesContext";

type Props = {
  profile: Profile;
  voice: ReturnType<typeof useVoiceRoom>;
  eco: boolean;
  forcedEco: boolean;
  onEco: (v: boolean) => void;
  onSignOut: () => void;
  onSettings: () => void;
};

export function SelfPanel({ profile, voice, eco, forcedEco, onEco, onSignOut, onSettings }: Props) {
  const { openProfile } = useProfilesCtx();
  const inRoom = voice.status === "connected";
  const state = voice.sharing ? "стримит" : inRoom ? "в комнате" : "в сети";

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => openProfile(profile.id)} title="Мой профиль">
          <Avatar id={profile.id} size={32} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{profile.username}</span>
            <span className="label block">{state}</span>
          </span>
        </button>
        <span className="flex gap-2">
          <button className="btn btn-icon" title="Настройки" aria-label="Настройки" onClick={onSettings}>
            <Settings size={16} />
          </button>
          <button className="btn btn-icon" title="Выйти из аккаунта" aria-label="Выйти из аккаунта" onClick={onSignOut}>
            <LogOut size={16} />
          </button>
        </span>
      </div>

      <div className="flex gap-2">
        <button
          className="btn btn-live btn-icon"
          aria-pressed={inRoom && !voice.micOn}
          disabled={!inRoom || voice.deafened}
          title={voice.micOn ? "Выключить микрофон" : "Включить микрофон"}
          aria-label={voice.micOn ? "Выключить микрофон" : "Включить микрофон"}
          onClick={voice.toggleMic}
        >
          {voice.micOn ? <Mic size={16} /> : <MicOff size={16} />}
        </button>
        <button
          className="btn btn-live btn-icon"
          aria-pressed={voice.deafened}
          disabled={!inRoom}
          title={voice.deafened ? "Включить звук" : "Отключить звук"}
          aria-label={voice.deafened ? "Включить звук" : "Отключить звук"}
          onClick={voice.toggleDeafen}
        >
          {voice.deafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}
        </button>
        <button
          className="btn flex-1"
          aria-pressed={eco}
          disabled={forcedEco}
          title={forcedEco ? "Включено администратором" : "Только низкий слой видео, звук на 16 кбит/с"}
          onClick={() => onEco(!eco)}
        >
          <Gauge size={16} /> Экономия
        </button>
        <button
          className="btn btn-icon"
          disabled={!inRoom}
          title="Выйти из комнаты"
          aria-label="Выйти из комнаты"
          onClick={voice.leave}
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}
