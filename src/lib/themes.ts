/** Local-only UI themes. No server/profile changes. */
export type ClientTheme = {
  id: string; name: string; ground: string; panel: string; raised: string; line: string;
  text: string; dim: string; faint: string; accent: string; accentInk: string;
  live: string; ok: string; background: string; backgroundDim: number;
  opacity: number; blur: number; radius: number; font: "onest" | "mono" | "unbounded";
  motion: "off" | "subtle" | "drift"; imageFit: "cover" | "contain";
};
export const THEME_KEY = "berloga.client-theme.v1";
export const CUSTOM_KEY = "berloga.custom-themes.v1";
export const DEFAULT: ClientTheme = {
  id: "original", name: "Радиорубка · оригинал", ground: "#141515", panel: "#1b1d1d", raised: "#242727",
  line: "#343838", text: "#e4e1d9", dim: "#9b9c96", faint: "#666964", accent: "#f0a020",
  accentInk: "#1c1304", live: "#e8573f", ok: "#6fb36f", background: "", backgroundDim: 38,
  opacity: 100, blur: 0, radius: 2, font: "onest", motion: "off", imageFit: "cover",
};
export const BUILT_INS: ClientTheme[] = [
  DEFAULT,
  { ...DEFAULT, id: "glass", name: "Translucent Glass", ground: "#101828", panel: "#1c2b42", raised: "#2a3d57", line: "#6b8399", text: "#f5f8ff", dim: "#c1cddd", faint: "#97a9bd", accent: "#8ccfff", accentInk: "#081524", opacity: 58, blur: 18, radius: 12, background: "linear-gradient(130deg, #142b52 0%, #183d54 43%, #56284f 100%)", backgroundDim: 12, motion: "subtle" },
  { ...DEFAULT, id: "midnight", name: "Midnight Blue", ground: "#090f21", panel: "#111e37", raised: "#1c3050", line: "#34496b", text: "#e9f1ff", dim: "#a4b6d4", faint: "#788bab", accent: "#65b4ff", accentInk: "#091a30", opacity: 89, blur: 8, radius: 6 },
  { ...DEFAULT, id: "crimson", name: "Crimson Night", ground: "#130d13", panel: "#25121b", raised: "#381d29", line: "#643443", text: "#fff0f1", dim: "#d3aeb6", faint: "#a77d89", accent: "#ff6679", accentInk: "#25070e", opacity: 88, blur: 7, radius: 5 },
  { ...DEFAULT, id: "forest", name: "Deep Forest", ground: "#0c1714", panel: "#14251e", raised: "#20382e", line: "#375949", text: "#e4f4e9", dim: "#a6c5b2", faint: "#769b87", accent: "#8ae0a6", accentInk: "#0a2618", opacity: 93, blur: 4, radius: 4 },
  { ...DEFAULT, id: "paper", name: "Soft Paper", ground: "#f2ede3", panel: "#fffaf1", raised: "#e9e1d6", line: "#d4c7b9", text: "#302922", dim: "#675c52", faint: "#80756c", accent: "#9a562a", accentInk: "#ffffff", live: "#c13a32", ok: "#367957", opacity: 100, radius: 5 },
];
const HEX = /^#[0-9a-fA-F]{6}$/;
export function validateTheme(raw: unknown): ClientTheme | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const out = { ...DEFAULT } as ClientTheme;
  for (const k of ["ground", "panel", "raised", "line", "text", "dim", "faint", "accent", "accentInk", "live", "ok"] as const) {
    if (typeof t[k] !== "string" || !HEX.test(t[k] as string)) return null;
    out[k] = t[k] as string;
  }
  for (const [key, min, max] of [["backgroundDim", 0, 90], ["opacity", 15, 100], ["blur", 0, 40], ["radius", 0, 24]] as const) {
    const val = Number(t[key]);
    if (!Number.isFinite(val)) return null;
    out[key] = Math.max(min, Math.min(max, val));
  }
  out.id = typeof t.id === "string" ? t.id.slice(0, 80) : "imported";
  out.name = typeof t.name === "string" ? t.name.slice(0, 60) : "Импортированная тема";
  out.font = t.font === "mono" || t.font === "unbounded" ? t.font : "onest";
  out.motion = t.motion === "drift" || t.motion === "subtle" ? t.motion : "off";
  out.imageFit = t.imageFit === "contain" ? "contain" : "cover";
  // Only allow image URLs, data images or built-in gradient. Never inject arbitrary CSS.
  if (typeof t.background === "string") {
    const bg = t.background.trim();
    if (bg.length <= 3_000_000 && (/^https:\/\//i.test(bg) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(bg) || /^linear-gradient\([#\w\s\d%,.()]+\)$/i.test(bg))) out.background = bg;
  }
  return out;
}
function rgba(hex: string, opacity: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity / 100})`;
}
export function applyTheme(t: ClientTheme) {
  const root = document.documentElement;
  const glass = t.opacity < 100;
  root.dataset.clientTheme = t.id;
  root.dataset.themeGlass = glass ? "true" : "false";
  const vars: Record<string, string> = {
    "--color-ground": rgba(t.ground, glass ? Math.min(t.opacity + 12, 100) : 100),
    "--color-panel": rgba(t.panel, t.opacity), "--color-raised": rgba(t.raised, Math.min(t.opacity + 13, 100)),
    "--color-line": rgba(t.line, glass ? 75 : 100),
    "--color-text": t.text, "--color-dim": t.dim, "--color-faint": t.faint,
    "--color-signal": t.accent, "--color-signal-ink": t.accentInk,
    "--color-live": t.live, "--color-ok": t.ok,
    "--radius-xs": `${t.radius}px`, "--radius-sm": `${Math.min(28, t.radius + 2)}px`,
    "--theme-blur": `${glass ? t.blur : 0}px`, "--theme-dim": String(t.background ? t.backgroundDim / 100 : 0),
    "--theme-bg-size": t.imageFit, "--font-sans": t.font === "mono" ? '"JetBrains Mono Variable", monospace' : t.font === "unbounded" ? '"Unbounded Variable", sans-serif' : '"Onest Variable", sans-serif',
  };
  for (const [k, value] of Object.entries(vars)) root.style.setProperty(k, value);
  const bg = t.background;
  const safeImage = /^https:\/\//i.test(bg) || /^data:image\//i.test(bg);
  root.style.setProperty("--theme-wallpaper", bg ? safeImage ? `url("${bg.replaceAll('"', '%22')}")` : /^linear-gradient\([#\w\s\d%,.()]+\)$/i.test(bg) ? bg : "none" : "none");
  root.dataset.themeMotion = t.motion;
  root.dataset.themeWallpaper = bg ? "true" : "false";
  root.style.backgroundColor = t.ground;
  document.body.style.backgroundColor = t.ground;
}
export function readTheme(): ClientTheme {
  try { return validateTheme(JSON.parse(localStorage.getItem(THEME_KEY) || "")) || DEFAULT; } catch { return DEFAULT; }
}
export function readCustomThemes(): ClientTheme[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
    return Array.isArray(data) ? data.slice(0, 30).map(validateTheme).filter((t): t is ClientTheme => t !== null) : [];
  } catch { return []; }
}
