"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PROFILE_COLUMNS, type Profile } from "@/lib/types";

export function useSession() {
  const [authLoading, setAuthLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // uid меняется только при смене пользователя: обновление токена раз в час профиль не перезагружает
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUid(data.session?.user.id ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUid(session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let active = true; // быстрая смена аккаунта не должна подставить чужой профиль
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProfile((data as Profile | null) ?? null);
        setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();

  return { loading: authLoading || profileLoading, uid, profile, signIn, signOut };
}
