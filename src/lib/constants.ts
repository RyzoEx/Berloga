export const ROOMS = [
  { id: "main", name: "Основная" },
  { id: "game", name: "Игровая" },
  { id: "afk", name: "АФК" },
] as const;

export type RoomId = (typeof ROOMS)[number]["id"];

export const livekitRoomName = (id: string) => `berloga-${id}`;

export const AUDIO_LIMITS = { min: 12_000, max: 64_000, step: 4_000 };
export const VIDEO_LIMITS = { min: 250_000, max: 4_000_000, step: 50_000 };

/** Исходящий звук пользователя в режиме экономии. */
export const ECO_AUDIO_BPS = 16_000;

export const DEFAULT_SETTINGS = {
  id: 1,
  audio_bitrate: 32_000,
  max_video_bitrate: 2_500_000,
  forced_eco_users: [] as string[],
};

/** МБ в час при постоянном битрейте. */
export const mbPerHour = (bps: number) => (bps * 3600) / 8 / 1_000_000;
