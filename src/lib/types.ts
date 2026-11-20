export type Profile = {
  id: string;
  username: string;
  is_admin: boolean;
  avatar_path: string | null;
  banner_path: string | null;
};

export const PROFILE_COLUMNS = "id, username, is_admin, avatar_path, banner_path";

export type ServerSettings = {
  id: number;
  audio_bitrate: number;
  max_video_bitrate: number;
  forced_eco_users: string[];
};

/** Состояние, которое каждый клиент публикует в Presence-канал лобби. Имя и аватар берутся из profiles. */
export type Peer = {
  user_id: string;
  username: string;
  room: string | null;
  streaming: boolean;
  muted: boolean;
  deafened: boolean;
  eco: boolean;
};

export type AttachmentKind = "image" | "video";

export type ChatMessage = {
  id: string;
  room: string;
  user_id: string;
  body: string;
  attachment_path: string | null;
  attachment_kind: AttachmentKind | null;
  attachment_name: string | null;
  attachment_size: number | null;
  created_at: string;
};
