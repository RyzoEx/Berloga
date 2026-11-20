"use client";
import { useState } from "react";
import { PROFILE_BUCKET, mediaUrl } from "@/lib/media";
import { useProfilesCtx } from "./ProfilesContext";

export function Avatar({ id, fallbackName, size = 24 }: { id: string; fallbackName?: string; size?: number }) {
  const { profiles } = useProfilesCtx();
  const p = profiles[id];
  const name = p?.username ?? fallbackName ?? "?";
  const path = p?.avatar_path ?? null;
  const [failed, setFailed] = useState<string | null>(null);

  const box = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.45)) };
  if (path && failed !== path) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaUrl(PROFILE_BUCKET, path)}
        alt=""
        style={box}
        className="shrink-0 rounded-xs bg-raised object-cover"
        onError={() => setFailed(path)}
      />
    );
  }
  return (
    <span style={box} className="grid shrink-0 place-items-center rounded-xs bg-raised font-mono font-semibold uppercase text-dim" aria-hidden>
      {name.slice(0, 1)}
    </span>
  );
}

/** Имя, по клику открывающее профиль. */
export function PersonName({ id, fallback, className = "" }: { id: string; fallback?: string; className?: string }) {
  const ctx = useProfilesCtx();
  const name = ctx.profiles[id]?.username ?? fallback ?? "…";
  return (
    <button className={`truncate text-left hover:underline ${className}`} onClick={() => ctx.openProfile(id)}>
      {name}
    </button>
  );
}
