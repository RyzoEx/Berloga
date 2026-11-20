import { supabase } from "./supabase";
import type { AttachmentKind } from "./types";

export const PROFILE_BUCKET = "profile-media";
export const CHAT_BUCKET = "chat-media";

export const AVATAR_MAX = 2 * 1024 * 1024;
export const BANNER_MAX = 6 * 1024 * 1024;
export const CHAT_MAX = 50 * 1024 * 1024;

export const PROFILE_MIMES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const CHAT_IMAGE_MIMES = PROFILE_MIMES;
const CHAT_VIDEO_MIMES = ["video/mp4", "video/webm"];

export const PROFILE_ACCEPT = PROFILE_MIMES.join(",");
export const CHAT_ACCEPT = [...CHAT_IMAGE_MIMES, ...CHAT_VIDEO_MIMES].join(",");

export function chatKind(file: File): AttachmentKind | null {
  if (CHAT_IMAGE_MIMES.includes(file.type)) return "image";
  if (CHAT_VIDEO_MIMES.includes(file.type)) return "video";
  return null;
}

export const mediaUrl = (bucket: string, path: string) =>
  supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} МБ`;
}

function extOf(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type.split("/")[1] ?? "bin";
}

/** Файл кладётся в папку владельца: политики хранилища разрешают писать и удалять только там. Имя уникально, кэш не мешает. */
export async function uploadFile(bucket: string, uid: string, file: File, prefix: string): Promise<string> {
  const path = `${uid}/${prefix}-${crypto.randomUUID()}.${extOf(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Удаление файлов из хранилища (освобождает место). Возвращает текст ошибки или null. */
export async function removeFiles(bucket: string, paths: string[]): Promise<string | null> {
  if (paths.length === 0) return null;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  return error ? error.message : null;
}
