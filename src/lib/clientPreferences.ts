export type StreamQuality = "high" | "medium" | "low";
export type InterfaceMode = "legacy" | "modern";

export const QUALITY_LABELS: Record<StreamQuality, string> = {
  low: "Низкое",
  medium: "Среднее",
  high: "Высокое",
};

export const PREFERENCES_KEY = "berloga.client-preferences.v1";

export const DEFAULT_PREFERENCES = {
  interfaceMode: "legacy" as InterfaceMode,
  manualStreams: true,
  streamQuality: "high" as StreamQuality,
  manualAttachments: false,
  blockRemoteWallpaper: false,
  reduceThemeEffects: false,
};

export type ClientPreferences = typeof DEFAULT_PREFERENCES;

export function readClientPreferences(): ClientPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? "{}") as Partial<ClientPreferences>;
    return {
      interfaceMode: saved.interfaceMode === "modern" ? "modern" : "legacy",
      manualStreams: typeof saved.manualStreams === "boolean" ? saved.manualStreams : DEFAULT_PREFERENCES.manualStreams,
      streamQuality: saved.streamQuality === "low" || saved.streamQuality === "medium" ? saved.streamQuality : "high",
      manualAttachments: saved.manualAttachments === true,
      blockRemoteWallpaper: saved.blockRemoteWallpaper === true,
      reduceThemeEffects: saved.reduceThemeEffects === true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
