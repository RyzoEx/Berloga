"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CHAT_BUCKET, CHAT_MAX, chatKind, removeFiles, uploadFile } from "@/lib/media";
import { mergeMessages, reconcileLatest, removeMessage } from "@/lib/sync";
import type { ChatMessage } from "@/lib/types";

const PAGE = 50;

export type ChatStatus = "loading" | "ready" | "error";

export function useChat(room: string, userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("loading");
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const roomNow = useRef(room);
  roomNow.current = room;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    let active = true; // ответы от старой комнаты после переключения игнорируются
    let first = true;
    setMessages([]);
    setStatus("loading");
    setHasMore(false);

    const fetchLatest = async (isFirst: boolean) => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room", room)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE);
      if (!active) return;
      if (error || !data) {
        if (isFirst) setStatus("error");
        return;
      }
      setMessages((prev) => reconcileLatest(prev, data as ChatMessage[], PAGE));
      if (isFirst) setHasMore(data.length === PAGE);
      setStatus("ready");
    };

    const ch = supabase
      .channel(`berloga:chat:${room}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room=eq.${room}` },
        (p) => active && setMessages((prev) => mergeMessages(prev, [p.new as ChatMessage])),
      )
      // у DELETE нет фильтра по комнате (ограничение realtime), но id глобально уникален
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages" }, (p) => {
        const id = (p.old as { id?: string }).id;
        if (active && id) setMessages((prev) => removeMessage(prev, id));
      })
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          void fetchLatest(first);
          first = false;
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [room]);

  const loadOlder = useCallback(async () => {
    const oldest = messagesRef.current[0];
    if (!oldest) return;
    const forRoom = room;
    setLoadingOlder(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room", forRoom)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE);
    setLoadingOlder(false);
    if (roomNow.current !== forRoom || error || !data) return;
    setMessages((prev) => mergeMessages(prev, data as ChatMessage[]));
    setHasMore(data.length === PAGE);
  }, [room]);

  /** Возвращает текст ошибки или null. Если вставка не удалась, загруженный файл удаляется. */
  const send = useCallback(
    async (body: string, file: File | null): Promise<string | null> => {
      const forRoom = room;
      let path: string | null = null;
      let kind = null;
      if (file) {
        kind = chatKind(file);
        if (!kind) return "Формат не поддерживается (фото: png, jpg, webp, gif; видео: mp4, webm)";
        if (file.size > CHAT_MAX) return "Файл больше 50 МБ";
        try {
          path = await uploadFile(CHAT_BUCKET, userId, file, "msg");
        } catch (e) {
          return `Файл не загрузился: ${e instanceof Error ? e.message : "ошибка"}`;
        }
      }
      const { data, error } = await supabase
        .from("messages")
        .insert({
          room: forRoom,
          body: body.trim(),
          attachment_path: path,
          attachment_kind: kind,
          attachment_name: file?.name.slice(0, 200) ?? null,
          attachment_size: file?.size ?? null,
        })
        .select()
        .single();
      if (error || !data) {
        if (path) await removeFiles(CHAT_BUCKET, [path]);
        return "Сообщение не отправлено";
      }
      if (roomNow.current === forRoom) setMessages((prev) => mergeMessages(prev, [data as ChatMessage]));
      return null;
    },
    [room, userId],
  );

  /** Сначала файл (освобождает место), потом строка. Если файл не удалился, сообщение остаётся. */
  const remove = useCallback(async (m: ChatMessage): Promise<string | null> => {
    if (m.attachment_path) {
      const err = await removeFiles(CHAT_BUCKET, [m.attachment_path]);
      if (err) return "Не удалось удалить файл. Попробуй ещё раз.";
    }
    const { error } = await supabase.from("messages").delete().eq("id", m.id);
    if (error) return "Не удалось удалить сообщение. Попробуй ещё раз.";
    setMessages((prev) => removeMessage(prev, m.id));
    return null;
  }, []);

  return { messages, status, hasMore, loadingOlder, loadOlder, send, remove };
}
