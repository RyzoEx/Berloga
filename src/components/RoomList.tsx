"use client";
import { HeadphoneOff, MicOff } from "lucide-react";
import { ROOMS } from "@/lib/constants";
import type { Peer } from "@/lib/types";
import { Avatar, PersonName } from "./Avatar";

type Props = { peers: Peer[]; current: string | null; connecting: boolean; onJoin: (id: string) => void };

export function RoomList({ peers, current, connecting, onJoin }: Props) {
  const lobby = peers.filter((p) => !p.room);

  return (
    <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Голосовые комнаты">
      {ROOMS.map((room) => {
        const inRoom = peers.filter((p) => p.room === room.id);
        const active = current === room.id;
        return (
          <section key={room.id} className="border-b border-line">
            <button
              className={`flex w-full items-center justify-between px-4 py-3 text-left hover:bg-raised ${active ? "bg-raised" : ""}`}
              disabled={active || connecting}
              onClick={() => onJoin(room.id)}
            >
              <span className={active ? "font-semibold text-signal" : "font-medium"}>{room.name}</span>
              <span className="num text-faint">{inRoom.length}</span>
            </button>
            {inRoom.length > 0 && (
              <ul className="flex flex-col gap-1 px-4 pb-3">
                {inRoom.map((p) => (
                  <li key={p.user_id} className="flex items-center gap-2 text-dim">
                    <Avatar id={p.user_id} fallbackName={p.username} size={20} />
                    <PersonName id={p.user_id} fallback={p.username} />
                    {p.streaming && <span className="label text-live">эфир</span>}
                    {p.eco && <span className="label">eco</span>}
                    <span className="ml-auto flex gap-1 text-faint">
                      {p.muted && <MicOff size={12} aria-label="микрофон выключен" />}
                      {p.deafened && <HeadphoneOff size={12} aria-label="звук выключен" />}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section className="px-4 py-3">
        <p className="label mb-2">В сети, вне комнат</p>
        {lobby.length === 0 ? (
          <p className="text-faint">Никого</p>
        ) : (
          <ul className="flex flex-col gap-1 text-dim">
            {lobby.map((p) => (
              <li key={p.user_id} className="flex items-center gap-2">
                <Avatar id={p.user_id} fallbackName={p.username} size={20} />
                <PersonName id={p.user_id} fallback={p.username} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </nav>
  );
}
