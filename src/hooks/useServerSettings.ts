"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { ServerSettings } from "@/lib/types";

export function useServerSettings() {
  const [settings, setSettings] = useState<ServerSettings>(DEFAULT_SETTINGS);
  const eventSeq = useRef(0); // сколько раз realtime уже прислал настройки
  const reloadRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let active = true;

    const load = async () => {
      const seq = eventSeq.current;
      const { data } = await supabase.from("server_settings").select("*").eq("id", 1).single();
      // если пока шёл запрос пришло свежее событие, старый ответ его не затирает
      if (active && data && seq === eventSeq.current) setSettings(data as ServerSettings);
    };
    reloadRef.current = load;

    const ch = supabase
      .channel("berloga:settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "server_settings" }, (p) => {
        if (active && p.new && "id" in p.new) {
          eventSeq.current++;
          setSettings(p.new as ServerSettings);
        }
      })
      .subscribe((s) => s === "SUBSCRIBED" && void load()); // и первая загрузка, и догрузка после обрыва

    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, []);

  /** Только для админа: остальным RLS откажет. При ошибке возвращаем настоящие значения с сервера. */
  const update = useCallback(async (patch: Partial<Omit<ServerSettings, "id">>) => {
    setSettings((s) => ({ ...s, ...patch }));
    const { error } = await supabase.from("server_settings").update(patch).eq("id", 1);
    if (error) await reloadRef.current();
    return error;
  }, []);

  return { settings, update };
}
