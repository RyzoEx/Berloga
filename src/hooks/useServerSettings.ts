"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { ServerSettings } from "@/lib/types";

export function useServerSettings() {
  const [settings, setSettings] = useState<ServerSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let alive = true;
    supabase
      .from("server_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => alive && data && setSettings(data as ServerSettings));

    const ch = supabase
      .channel("berloga:settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "server_settings" }, (p) => {
        if (p.new && "id" in p.new) setSettings(p.new as ServerSettings);
      })
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  /** Только для админа: остальным RLS откажет. */
  const update = useCallback(async (patch: Partial<Omit<ServerSettings, "id">>) => {
    setSettings((s) => ({ ...s, ...patch }));
    const { error } = await supabase.from("server_settings").update(patch).eq("id", 1);
    return error;
  }, []);

  return { settings, update };
}
