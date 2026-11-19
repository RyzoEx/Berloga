import { VideoPreset } from "livekit-client";
import type { ScreenShareCaptureOptions, TrackPublishOptions } from "livekit-client";

export type PresetId = "game" | "text" | "eco";
export type ShareHeight = 1080 | 720;

export type SharePreset = {
  id: PresetId;
  label: string;
  hint: string;
  fps: number;
  /** Доступные разрешения захвата (по высоте). */
  heights: ShareHeight[] | [480];
  /** Битрейт верхнего слоя по высоте. */
  topBitrate: Record<number, number>;
  contentHint: "motion" | "detail";
};

export const PRESETS: SharePreset[] = [
  {
    id: "game",
    label: "Игры (плавно)",
    hint: "60 кадров/с, до 4 Мбит/с",
    fps: 60,
    heights: [1080, 720],
    topBitrate: { 1080: 4_000_000, 720: 2_500_000 },
    contentHint: "motion",
  },
  {
    id: "text",
    label: "Текст / Браузер (чётко)",
    hint: "1080p, 15 кадров/с",
    fps: 15,
    heights: [1080],
    topBitrate: { 1080: 2_000_000 },
    contentHint: "detail",
  },
  {
    id: "eco",
    label: "Эконом",
    hint: "480p, 15 кадров/с, 300 кбит/с",
    fps: 15,
    heights: [480],
    topBitrate: { 480: 300_000 },
    contentHint: "detail",
  },
];

const WIDTH: Record<number, number> = { 1080: 1920, 720: 1280, 480: 854 };

/** Нижние слои simulcast: зритель в экономии получает 480p/15 fps (~300 кбит/с). */
const LAYERS = [
  { height: 720, fps: 30, bitrate: 1_200_000 },
  { height: 480, fps: 15, bitrate: 300_000 },
];

/** Кодек экрана. H.264 чаще кодируется аппаратно (меньше CPU в игре); при проблемах заменить на "vp8". */
const SCREEN_CODEC = "h264" as const;

export function buildShare(
  preset: SharePreset,
  height: number,
  capBps: number,
): { capture: ScreenShareCaptureOptions; publish: TrackPublishOptions; topBps: number } {
  const topBps = Math.min(preset.topBitrate[height] ?? 300_000, capBps);
  const layers =
    preset.id === "eco"
      ? []
      : LAYERS.filter((l) => l.height < height).map(
          (l) =>
            new VideoPreset(WIDTH[l.height], l.height, Math.min(l.bitrate, topBps), Math.min(l.fps, preset.fps)),
        );

  return {
    topBps,
    capture: {
      audio: true,
      systemAudio: "include",
      selfBrowserSurface: "exclude",
      contentHint: preset.contentHint,
      resolution: { width: WIDTH[height], height, frameRate: preset.fps },
    },
    publish: {
      videoCodec: SCREEN_CODEC,
      simulcast: layers.length > 0,
      screenShareEncoding: { maxBitrate: topBps, maxFramerate: preset.fps },
      screenShareSimulcastLayers: layers,
    },
  };
}
