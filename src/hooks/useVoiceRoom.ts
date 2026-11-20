"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  LocalAudioTrack,
  LocalVideoTrack,
  RemoteTrackPublication,
  RemoteVideoTrack,
  Room,
  RoomEvent,
  Track,
  VideoQuality,
} from "livekit-client";
import { supabase } from "@/lib/supabase";
import { ECO_AUDIO_BPS, livekitRoomName } from "@/lib/constants";
import { buildShare, type PresetId, type ShareHeight, PRESETS } from "@/lib/presets";
import type { ServerSettings } from "@/lib/types";

export type StreamQuality = "high" | "medium" | "low";
const QUALITY: Record<StreamQuality, VideoQuality> = {
  high: VideoQuality.HIGH,
  medium: VideoQuality.MEDIUM,
  low: VideoQuality.LOW,
};

export type Status = "idle" | "connecting" | "connected" | "error";

export type PersonView = {
  id: string;
  name: string;
  isLocal: boolean;
  speaking: boolean;
  micOn: boolean;
  sharing: boolean;
};

export type StreamView = {
  sid: string;
  participantId: string;
  name: string;
  track?: RemoteVideoTrack;
};

type Opts = { settings: ServerSettings; eco: boolean };

export function useVoiceRoom({ settings, eco }: Opts) {
  const roomRef = useRef<Room | null>(null);
  const audioHost = useRef<HTMLElement | null>(null);
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const [status, setStatus] = useState<Status>("idle");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micError, setMicError] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [qualities, setQualities] = useState<Record<string, StreamQuality>>({});
  const [paused, setPaused] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState(false);
  const micBeforeDeafen = useRef(true);
  const baseVideoBps = useRef<number[]>([]);
  const joinSeq = useRef(0); // номер последней попытки входа: устаревшие попытки сами отменяются

  // последние значения для обработчиков событий LiveKit
  const latest = useRef({ eco, settings, volumes, qualities, paused, hidden, deafened });
  latest.current = { eco, settings, volumes, qualities, paused, hidden, deafened };

  const audioBps = eco ? Math.min(settings.audio_bitrate, ECO_AUDIO_BPS) : settings.audio_bitrate;

  /** Громкость, качество и пауза у всех входящих потоков. */
  const syncRemote = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const l = latest.current;
    for (const p of room.remoteParticipants.values()) {
      const vol = l.deafened ? 0 : (l.volumes[p.identity] ?? 1);
      p.setVolume(vol, Track.Source.Microphone);
      p.setVolume(vol, Track.Source.ScreenShareAudio);
      for (const pub of p.videoTrackPublications.values()) {
        if (pub.source !== Track.Source.ScreenShare) continue;
        const q: StreamQuality = l.eco ? "low" : (l.qualities[pub.trackSid] ?? "high");
        pub.setVideoQuality(QUALITY[q]);
        if (l.eco) pub.setVideoFPS(15);
        pub.setEnabled(!(l.paused[pub.trackSid] || l.hidden));
      }
    }
  }, []);

  /** Потолки битрейта у уже идущих публикаций (мгновенно, без перезапуска). */
  const applyCaps = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const lp = room.localParticipant;
    const mic = lp.getTrackPublication(Track.Source.Microphone)?.track as LocalAudioTrack | undefined;
    const set = (sender: RTCRtpSender | undefined, fn: (e: RTCRtpEncodingParameters[]) => void) => {
      if (!sender) return;
      const params = sender.getParameters();
      if (!params.encodings?.length) return;
      fn(params.encodings);
      sender.setParameters(params).catch(() => {});
    };
    set(mic?.sender, (enc) => {
      enc[0].maxBitrate = audioBps;
    });
    const screen = lp.getTrackPublication(Track.Source.ScreenShare)?.track as LocalVideoTrack | undefined;
    set(screen?.sender, (enc) => {
      enc.forEach((e, i) => {
        const base = baseVideoBps.current[i];
        if (base) e.maxBitrate = Math.min(base, latest.current.settings.max_video_bitrate);
      });
    });
  }, [audioBps]);

  useEffect(() => {
    syncRemote();
  }, [eco, qualities, paused, hidden, volumes, deafened, syncRemote]);

  useEffect(() => {
    applyCaps();
  }, [applyCaps, settings.max_video_bitrate]);

  // Окно свёрнуто или во вкладке в фоне: видео на паузу, звук продолжает идти.
  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  /** Всё, что относится к конкретному подключению, сбрасывается в одном месте (выход и обрыв). */
  const resetLocal = useCallback(() => {
    baseVideoBps.current = [];
    setRoomId(null);
    setStatus("idle");
    setDeafened(false);
    setPaused({});
    setQualities({});
    setMicError(false);
    setAudioBlocked(false);
    bump();
  }, []);

  const leave = useCallback(async () => {
    joinSeq.current++;
    const room = roomRef.current;
    roomRef.current = null;
    if (room) await room.disconnect();
    resetLocal();
  }, [resetLocal]);

  const join = useCallback(
    async (id: string) => {
      if (roomRef.current) await leave();
      const seq = ++joinSeq.current;
      setError(null);
      setMicError(false);
      setStatus("connecting");
      setRoomId(id);

      try {
        const { data } = await supabase.auth.getSession();
        const jwt = data.session?.access_token;
        if (!jwt) throw new Error("Сессия истекла, войди заново");
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
          body: JSON.stringify({ room: id }),
        });
        if (!res.ok) throw new Error(`Токен не выдан (${res.status})`);
        const { token, url } = (await res.json()) as { token: string; url: string };
        if (seq !== joinSeq.current) return; // пока шёл запрос, выбрали другую комнату или вышли

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          webAudioMix: true, // нужен для усиления громкости выше 100%
          audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          publishDefaults: { dtx: true, red: false, audioPreset: { maxBitrate: audioBps }, simulcast: true },
        });
        roomRef.current = room;

        const refresh = () => bump();
        room
          .on(RoomEvent.ParticipantConnected, refresh)
          .on(RoomEvent.ParticipantDisconnected, refresh)
          .on(RoomEvent.ActiveSpeakersChanged, refresh)
          .on(RoomEvent.TrackMuted, refresh)
          .on(RoomEvent.TrackUnmuted, refresh)
          .on(RoomEvent.LocalTrackPublished, () => {
            refresh();
            applyCaps();
          })
          .on(RoomEvent.LocalTrackUnpublished, (pub) => {
            if (pub.source === Track.Source.ScreenShare) baseVideoBps.current = [];
            refresh();
          })
          .on(RoomEvent.TrackPublished, () => {
            refresh();
            syncRemote();
          })
          .on(RoomEvent.TrackUnpublished, refresh)
          .on(RoomEvent.TrackSubscribed, (track) => {
            if (track.kind === Track.Kind.Audio) {
              const el = track.attach();
              audioHost.current?.appendChild(el);
            }
            syncRemote();
            refresh();
          })
          .on(RoomEvent.TrackUnsubscribed, (track) => {
            track.detach().forEach((el) => el.remove());
            refresh();
          })
          .on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!room.canPlaybackAudio))
          .on(RoomEvent.Reconnecting, () => setStatus("connecting"))
          .on(RoomEvent.Reconnected, () => setStatus("connected"))
          .on(RoomEvent.Disconnected, () => {
            if (roomRef.current === room) {
              roomRef.current = null;
              resetLocal();
            }
          });

        await room.connect(url, token);
        if (seq !== joinSeq.current) {
          await room.disconnect();
          return;
        }
        setStatus("connected");
        await room.startAudio().catch(() => {});

        try {
          await room.localParticipant.setMicrophoneEnabled(true, undefined, {
            audioPreset: { maxBitrate: audioBps },
            dtx: true,
            red: false,
          });
        } catch {
          setMicError(true); // нет микрофона или нет разрешения: остаёмся слушателем
        }
        syncRemote();
        bump();
      } catch (e) {
        if (seq !== joinSeq.current) return; // ошибка устаревшей попытки, её уже заменила новая
        void roomRef.current?.disconnect();
        roomRef.current = null;
        resetLocal();
        setStatus("error");
        setError(e instanceof Error ? e.message : "Не удалось подключиться");
      }
    },
    [leave, resetLocal, audioBps, applyCaps, syncRemote],
  );

  useEffect(
    () => () => {
      void roomRef.current?.disconnect();
    },
    [],
  );

  const toggleMic = useCallback(async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp || latest.current.deafened) return;
    try {
      await lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled, undefined, {
        audioPreset: { maxBitrate: audioBps },
        dtx: true,
        red: false,
      });
      setMicError(false);
    } catch {
      setMicError(true);
    }
    bump();
  }, [audioBps]);

  const toggleDeafen = useCallback(async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    if (!latest.current.deafened) {
      micBeforeDeafen.current = lp.isMicrophoneEnabled;
      setDeafened(true);
      await lp.setMicrophoneEnabled(false).catch(() => {});
    } else {
      setDeafened(false);
      if (micBeforeDeafen.current) await lp.setMicrophoneEnabled(true).catch(() => {});
    }
    bump();
  }, []);

  const startShare = useCallback(
    async (presetId: PresetId, height: ShareHeight | 480) => {
      const lp = roomRef.current?.localParticipant;
      const preset = PRESETS.find((p) => p.id === presetId);
      if (!lp || !preset) return;
      const { capture, publish } = buildShare(preset, height, latest.current.settings.max_video_bitrate);
      try {
        await lp.setScreenShareEnabled(true, capture, publish);
        const track = lp.getTrackPublication(Track.Source.ScreenShare)?.track as LocalVideoTrack | undefined;
        const enc = track?.sender?.getParameters().encodings ?? [];
        baseVideoBps.current = enc.map((e) => e.maxBitrate ?? 0);
        applyCaps();
      } catch {
        /* пользователь закрыл выбор окна */
      }
      bump();
    },
    [applyCaps],
  );

  const stopShare = useCallback(async () => {
    await roomRef.current?.localParticipant.setScreenShareEnabled(false).catch(() => {});
    bump();
  }, []);

  const setVolume = (id: string, v: number) => setVolumes((s) => ({ ...s, [id]: v }));
  const setQuality = (sid: string, q: StreamQuality) => setQualities((s) => ({ ...s, [sid]: q }));
  const togglePause = (sid: string) => setPaused((s) => ({ ...s, [sid]: !s[sid] }));
  const unlockAudio = () => roomRef.current?.startAudio().then(() => setAudioBlocked(false));

  // --- снимок для рендера ---
  const room = roomRef.current;
  const people: PersonView[] = [];
  const streams: StreamView[] = [];
  if (room) {
    const all = [room.localParticipant, ...room.remoteParticipants.values()];
    for (const p of all) {
      const isLocal = p === room.localParticipant;
      people.push({
        id: p.identity,
        name: p.name || p.identity,
        isLocal,
        speaking: p.isSpeaking,
        micOn: p.isMicrophoneEnabled,
        sharing: p.isScreenShareEnabled,
      });
      if (!isLocal) {
        const pub = p.getTrackPublication(Track.Source.ScreenShare) as RemoteTrackPublication | undefined;
        if (pub) {
          streams.push({
            sid: pub.trackSid,
            participantId: p.identity,
            name: p.name || p.identity,
            track: pub.videoTrack as RemoteVideoTrack | undefined,
          });
        }
      }
    }
  }
  const me = room?.localParticipant;

  return {
    status,
    roomId,
    roomName: roomId ? livekitRoomName(roomId) : null,
    error,
    micError,
    audioBlocked,
    unlockAudio,
    people,
    streams,
    micOn: !!me?.isMicrophoneEnabled,
    sharing: !!me?.isScreenShareEnabled,
    deafened,
    volumes,
    qualities,
    paused,
    hidden,
    audioHost,
    join,
    leave,
    toggleMic,
    toggleDeafen,
    startShare,
    stopShare,
    setVolume,
    setQuality,
    togglePause,
  };
}
