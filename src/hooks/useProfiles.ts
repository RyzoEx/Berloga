"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PROFILE_COLUMNS, type Profile } from "@/lib/types";

/** Единственный источник имён, аватаров и прав: все экраны читают отсюда, поэтому не расходятся. */
export function useProfiles() {
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    let active = true;
    const touched = new Set<string>(); // строки, которые уже обновил realtime: загрузка их не затирает

    const load = async () => {
      const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS);
      if (!active || !data) return;
      setProfiles((prev) => {
        const next: Record<string, Profile> = {};
        for (const p of data as Profile[]) next[p.id] = touched.has(p.id) && prev[p.id] ? prev[p.id] : p;
        return next;
      });
    };

    const ch = supabase
      .channel("berloga:profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (e) => {
        if (!active) return;
        if (e.eventType === "DELETE") {
          const id = (e.old as { id?: string }).id;
          if (!id) return;
          touched.add(id);
          setProfiles((prev) => {
            const { [id]: _gone, ...rest } = prev;
            return rest;
          });
        } else {
          const p = e.new as Profile;
          touched.add(p.id);
          setProfiles((prev) => ({ ...prev, [p.id]: p }));
        }
      })
      // при каждом (пере)подключении догружаем всё, что могли пропустить
      .subscribe((status) => status === "SUBSCRIBED" && void load());

    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, []);

  /** Мгновенно применить своё изменение, не дожидаясь realtime. */
  const patch = useCallback((id: string, part: Partial<Profile>) => {
    setProfiles((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ...part } } : prev));
  }, []);

  return { profiles, patch };
}
