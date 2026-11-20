"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { resolvePeers, type WirePeer } from "@/lib/sync";
import type { Peer, Profile } from "@/lib/types";

type Mine = Pick<Peer, "room" | "streaming" | "muted" | "deafened" | "eco">;

const RESYNC_MS = 30_000;

/** Кто в сети и в какой комнате: Supabase Presence. Своё состояние всегда берётся локально. */
export function useLobby(me: Profile, mine: Mine) {
  const [wire, setWire] = useState<WirePeer[]>([]);
  const [conn] = useState(() => crypto.randomUUID()); // у каждой вкладки и окна своя запись
  const channel = useRef<RealtimeChannel | null>(null);

  // время последнего изменения состояния: по нему выбирается актуальная запись, если соединений несколько
  const stamp = useRef(Date.now());
  const lastKey = useRef("");
  const key = JSON.stringify([me.username, mine.room, mine.streaming, mine.muted, mine.deafened, mine.eco]);
  if (key !== lastKey.current) {
    lastKey.current = key;
    stamp.current = Date.now();
  }
  const payload = useRef<WirePeer>({ user_id: me.id, username: me.username, ...mine, conn, ts: stamp.current });
  payload.current = { user_id: me.id, username: me.username, ...mine, conn, ts: stamp.current };

  /** track с повтором: единичная потерянная отправка не должна навсегда оставить чужой экран в старом состоянии. */
  const send = useRef(async (attempt = 0) => {
    const ch = channel.current;
    if (!ch) return;
    const res = await ch.track(payload.current);
    if (res !== "ok" && attempt < 3) setTimeout(() => void send.current(attempt + 1), 1500 * (attempt + 1));
  });

  useEffect(() => {
    const ch = supabase.channel("berloga:lobby", { config: { presence: { key: conn } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<WirePeer>();
      setWire(Object.values(state).flat());
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") void send.current();
    });
    channel.current = ch;
    // периодическая сверка лечит любые потерянные обновления без участия пользователя
    const timer = setInterval(() => void send.current(), RESYNC_MS);
    return () => {
      clearInterval(timer);
      channel.current = null;
      void supabase.removeChannel(ch);
    };
  }, [conn]);

  useEffect(() => {
    void send.current();
  }, [key]);

  const self: Peer = useMemo(
    () => ({ user_id: me.id, username: me.username, ...mine }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me.id, key],
  );
  return useMemo(() => resolvePeers(wire, self), [wire, self]);
}
