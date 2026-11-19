"use client";
import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Peer, Profile } from "@/lib/types";

type Mine = Pick<Peer, "room" | "streaming" | "muted" | "deafened" | "eco">;

/** Кто в сети и в какой комнате: Supabase Presence, без опроса. */
export function useLobby(me: Profile, mine: Mine) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const channel = useRef<RealtimeChannel | null>(null);
  const payload = useRef<Peer>({ user_id: me.id, username: me.username, ...mine });
  payload.current = { user_id: me.id, username: me.username, ...mine };

  useEffect(() => {
    const ch = supabase.channel("berloga:lobby", { config: { presence: { key: me.id } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Peer>();
      setPeers(
        Object.values(state)
          .map((metas) => metas[metas.length - 1])
          .filter(Boolean),
      );
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") void ch.track(payload.current);
    });
    channel.current = ch;
    return () => {
      channel.current = null;
      void supabase.removeChannel(ch);
    };
  }, [me.id]);

  const { room, streaming, muted, deafened, eco } = mine;
  useEffect(() => {
    void channel.current?.track(payload.current);
  }, [room, streaming, muted, deafened, eco]);

  return peers;
}
