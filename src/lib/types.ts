export type Profile = { id: string; username: string; is_admin: boolean };

export type ServerSettings = {
  id: number;
  audio_bitrate: number;
  max_video_bitrate: number;
  forced_eco_users: string[];
};

/** То, что каждый клиент публикует в Presence-канал лобби. */
export type Peer = {
  user_id: string;
  username: string;
  room: string | null;
  streaming: boolean;
  muted: boolean;
  deafened: boolean;
  eco: boolean;
};
