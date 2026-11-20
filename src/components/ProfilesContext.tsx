"use client";
import { createContext, useContext } from "react";
import type { Peer, Profile } from "@/lib/types";

export type ProfilesCtx = {
  me: Profile;
  profiles: Record<string, Profile>;
  peers: Peer[];
  patch: (id: string, part: Partial<Profile>) => void;
  openProfile: (id: string) => void;
};

export const ProfilesContext = createContext<ProfilesCtx | null>(null);

export function useProfilesCtx() {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error("ProfilesContext отсутствует");
  return ctx;
}

/** Актуальное имя: из profiles, а если профиль ещё не загрузился, то запасное. */
export function useName(id: string, fallback = "…") {
  return useProfilesCtx().profiles[id]?.username ?? fallback;
}
