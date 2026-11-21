"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { resolvePeers, type WirePeer } from "@/lib/sync";
import type { Peer, Profile } from "@/lib/types";

type Mine = Pick<Peer, "room" | "streaming" | "muted" | "deafened" | "eco">;

const RESYNC_MS = 30_000;

/** Кто в сети и в какой комнате: Supabase Presence. Своё состояние всегда берётся локально. */
export function useLobby(me: Profile, mine: Mine) {
  const [wire, setWire] = useState<WirePeer[]>([]);
  const [presenceReady, setPresenceReady] = useState(false);
  const [conn] = useState(() => crypto.randomUUID()); // у каждой вкладки и окна своя запись
  const send = useRef<() => void>(() => {});

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

  useEffect(() => {
    const ch = supabase.channel("berloga:lobby", { config: { presence: { enabled: true, key: conn } } });
    let active = true;
    let sending = false;
    let queued = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const publish = async () => {
      if (!active || ch.state !== "joined") return;
      if (sending) {
        queued = true;
        return;
      }
      clearTimeout(retry);
      sending = true;
      const result = await ch.track(payload.current).catch(() => "error");
      sending = false;
      if (!active) return;
      if (result === "ok") {
        failures = 0;
        if (queued) {
          queued = false;
          void publish();
        }
      } else {
        queued = false;
        failures = Math.min(failures + 1, 5);
        retry = setTimeout(() => void publish(), 1000 * 2 ** (failures - 1));
      }
    };
    send.current = () => void publish();

    ch.on("presence", { event: "sync" }, () => {
      if (!active) return;
      setWire(Object.values(ch.presenceState<WirePeer>()).flat());
      setPresenceReady(true);
    }).subscribe((status) => {
      if (!active) return;
      if (status === "SUBSCRIBED") void publish();
      else setPresenceReady(false);
    });
    const timer = setInterval(() => void publish(), RESYNC_MS);
    const resume = () => {
      if (!document.hidden) void publish();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      active = false;
      clearTimeout(retry);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
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
  const peers = useMemo(() => resolvePeers(wire, self), [wire, self]);
  return { peers, presenceReady };
}
