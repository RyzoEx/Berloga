"use client";
import { useRef, useState } from "react";
import { Check, Download, ImagePlus, LayoutGrid, List, RotateCcw, Save, Trash2, Upload, X } from "lucide-react";
import { BUILT_INS, CUSTOM_KEY, DEFAULT, readCustomThemes, validateTheme, type ClientTheme } from "@/lib/themes";

export type RoomView = "list" | "tiles";
type Props = { view: RoomView; onView: (v: RoomView) => void; theme: ClientTheme; onTheme: (v: ClientTheme) => void; onClose: () => void };
const HEX_KEYS = [
  ["ground", "Основа"], ["panel", "Панели"], ["raised", "Элементы"], ["line", "Рамки"],
  ["text", "Основной текст"], ["dim", "Вторичный текст"], ["faint", "Подписи"],
  ["accent", "Акцент"], ["accentInk", "Текст на акценте"], ["live", "Эфир / микрофон"], ["ok", "Успех"],
] as const;
const MAX_WALLPAPER = 2_200_000; // localStorage quota; compressed still images, animated GIF kept intact

export function SettingsDialog({ view, onView, theme, onTheme, onClose }: Props) {
  const [tab, setTab] = useState<"themes" | "room">("themes");
  const [saved, setSaved] = useState<ClientTheme[]>(readCustomThemes);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const change = <K extends keyof ClientTheme>(key: K, value: ClientTheme[K]) => onTheme({ ...theme, [key]: value, id: "draft", name: "Моя тема" });

  const save = () => {
    const label = name.trim() || "Мой пресет";
    const item: ClientTheme = { ...theme, id: `custom-${Date.now()}`, name: label.slice(0, 60) };
    const next = [...saved, item].slice(-30);
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); setSaved(next); onTheme(item); setError(""); }
    catch { setError("Не хватает места в хранилище. Используй ссылку на фон вместо тяжёлого файла."); }
  };
  const remove = (id: string) => {
    const next = saved.filter((t) => t.id !== id);
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); setSaved(next); if (theme.id === id) onTheme(DEFAULT); setError(""); }
    catch { setError("Не удалось удалить пресет."); }
  };
  const exportTheme = () => {
    const blob = new Blob([JSON.stringify({ ...theme, name: name.trim() || theme.name }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "berloga-theme.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importTheme = async (file?: File) => {
    if (!file) return;
    if (file.size > 3_000_000) return setError("Файл темы слишком большой (лимит 3 МБ).");
    try {
      const item = validateTheme(JSON.parse(await file.text()));
      if (!item) return setError("Неверный формат темы или цветов.");
      onTheme({ ...item, id: "draft", name: "Моя тема" }); setName(item.name); setError("");
    } catch { setError("Не удалось прочитать JSON-тему."); }
  };
  const uploadWallpaper = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return setError("Поддерживаются PNG, JPEG, WebP и GIF.");
    // GIF is retained without re-encoding to preserve animation.
    if (file.type === "image/gif" && file.size > MAX_WALLPAPER * .72) return setError("GIF больше 1,6 МБ. Используй HTTPS-ссылку на GIF, чтобы не заполнять localStorage.");
    if (file.type !== "image/gif" && file.size > 12_000_000) return setError("Изображение больше 12 МБ.");
    const read = (blob: Blob) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(blob); });
    try {
      let data: string;
      if (file.type === "image/gif") data = await read(file);
      else {
        const objectUrl = URL.createObjectURL(file);
        try {
          const img = new Image(); img.src = objectUrl; await img.decode();
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, 1920 / img.naturalWidth, 1080 / img.naturalHeight);
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("canvas");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          data = canvas.toDataURL("image/webp", .76);
        } finally { URL.revokeObjectURL(objectUrl); }
      }
      if (data.length > MAX_WALLPAPER) return setError("Фон не поместится в локальное хранилище. Вставь HTTPS-ссылку на изображение.");
      change("background", data); setError("");
    } catch { setError("Не удалось загрузить изображение."); }
  };
  const options: { id: RoomView; label: string; hint: string; icon: typeof List }[] = [
    { id: "list", label: "Список", hint: "Компактные строки с громкостью", icon: List },
    { id: "tiles", label: "Плитки", hint: "Участники с аватарами и баннерами", icon: LayoutGrid },
  ];
  return (
    <div className="fixed inset-0 z-20 grid place-items-center p-3" style={{ background: "rgba(0,0,0,.78)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Настройки клиента" className="theme-settings flex max-h-[min(90vh,800px)] w-full max-w-[760px] flex-col overflow-hidden border border-line bg-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <div><h3 className="text-base font-semibold">Настройки клиента</h3><p className="text-xs text-dim">Внешний вид сохраняется только на этом устройстве</p></div>
          <button className="btn btn-icon" onClick={onClose} aria-label="Закрыть"><X size={16} /></button>
        </div>
        <div className="flex shrink-0 gap-2 border-b border-line px-5 pt-3">
          <button className={`btn mb-3 ${tab === "themes" ? "border-signal text-signal" : ""}`} onClick={() => setTab("themes")}>Оформление</button>
          <button className={`btn mb-3 ${tab === "room" ? "border-signal text-signal" : ""}`} onClick={() => setTab("room")}>Вид комнаты</button>
        </div>
        <div className="theme-settings-scroll min-h-0 flex-1 overflow-y-auto p-5">
          {tab === "room" ? (
            <div role="radiogroup" className="space-y-2">{options.map((o) => <label key={o.id} className={`flex cursor-pointer items-start gap-3 border border-line p-3 ${view === o.id ? "bg-raised" : ""}`}>
              <input type="radio" name="view" className="mt-1 accent-signal" checked={view === o.id} onChange={() => onView(o.id)} />
              <span><span className="flex items-center gap-2 font-medium"><o.icon size={16} /> {o.label}</span><span className="text-sm text-dim">{o.hint}</span></span>
            </label>)}</div>
          ) : <div className="flex flex-col gap-6">
            <section>
              <p className="label mb-3">Готовые темы</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{BUILT_INS.map((t) => <button key={t.id} onClick={() => { onTheme(t); setError(""); }} className={`relative flex flex-col overflow-hidden border text-left ${theme.id === t.id ? "border-signal" : "border-line"}`} aria-pressed={theme.id === t.id}>
                <span className="flex h-16 items-center gap-2 px-3" style={{ background: t.background || t.ground, color: t.text }}>
                  <span className="h-9 w-8 border" style={{ background: t.panel, borderColor: t.line, opacity: t.opacity / 100 }} />
                  <span className="flex flex-col gap-1"><span className="h-2 w-16 rounded-sm" style={{ background: t.accent }} /><span className="h-1 w-12 rounded-sm" style={{ background: t.dim }} /></span>
                </span><span className="flex min-h-9 items-center justify-between gap-1 bg-panel px-2 text-xs font-medium">{t.name}{theme.id === t.id && <Check size={14} className="text-signal" />}</span>
              </button>)}</div>
            </section>
            {saved.length > 0 && <section><p className="label mb-2">Мои сохранённые пресеты</p><div className="flex flex-wrap gap-2">{saved.map((t) => <span key={t.id} className="inline-flex items-center border border-line"><button className={`px-3 py-2 text-xs ${theme.id === t.id ? "text-signal" : ""}`} onClick={() => onTheme(t)}>{t.name}</button><button className="border-l border-line px-2 py-2 text-dim hover:text-live" aria-label={`Удалить ${t.name}`} onClick={() => remove(t.id)}><Trash2 size={13} /></button></span>)}</div></section>}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between"><p className="label">Редактор темы · изменения видны сразу</p><button className="btn h-7 text-xs" onClick={() => { onTheme(DEFAULT); setError(""); }}><RotateCcw size={13} /> Сбросить</button></div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{HEX_KEYS.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-2 border border-line bg-raised px-2 py-1.5 text-xs"><span>{label}</span><input type="color" value={theme[key]} onChange={(e) => change(key, e.target.value)} aria-label={label} /></label>)}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Slider label="Прозрачность панелей" value={theme.opacity} min={15} max={100} unit="%" onChange={(v) => change("opacity", v)} />
                <Slider label="Размытие стекла" value={theme.blur} min={0} max={40} unit="px" onChange={(v) => change("blur", v)} />
                <Slider label="Затемнение фона" value={theme.backgroundDim} min={0} max={90} unit="%" onChange={(v) => change("backgroundDim", v)} />
                <Slider label="Скругление углов" value={theme.radius} min={0} max={24} unit="px" onChange={(v) => change("radius", v)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs text-dim">Шрифт интерфейса<select className="field mt-1" value={theme.font} onChange={(e) => change("font", e.target.value as ClientTheme["font"])}><option value="onest">Onest</option><option value="mono">JetBrains Mono</option><option value="unbounded">Unbounded</option></select></label>
                <label className="text-xs text-dim">Анимация фона<select className="field mt-1" value={theme.motion} onChange={(e) => change("motion", e.target.value as ClientTheme["motion"])}><option value="off">Выключена</option><option value="subtle">Медленное дыхание</option><option value="drift">Плавное движение</option></select></label>
              </div>
            </section>
            <section className="flex flex-col gap-3"><p className="label">Обои · PNG, JPEG, WebP, GIF</p>
              <div className="flex flex-wrap gap-2"><button className="btn" onClick={() => uploadRef.current?.click()}><ImagePlus size={15} /> Загрузить фон</button><button className="btn" onClick={() => change("background", "")}>Без обоев</button></div>
              <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { void uploadWallpaper(e.target.files?.[0]); e.target.value = ""; }} />
              <label className="text-xs text-dim">Или HTTPS-ссылка на изображение / GIF<input className="field mt-1" type="url" placeholder="https://example.com/wallpaper.gif" value={theme.background.startsWith("https://") ? theme.background : ""} onChange={(e) => { const value = e.target.value.trim(); change("background", value); }} /></label>
              <label className="text-xs text-dim">Расположение<select className="field mt-1" value={theme.imageFit} onChange={(e) => change("imageFit", e.target.value as ClientTheme["imageFit"])}><option value="cover">Заполнить окно</option><option value="contain">Показать целиком</option></select></label>
              <p className="text-xs text-dim">Фон из файла хранится локально; статичные изображения сжимаются. Для крупных и анимированных GIF лучше HTTPS-ссылка. Обои не отправляются на сервер.</p>
            </section>
            <section className="flex flex-col gap-3 border-t border-line pt-4"><p className="label">Сохранение и обмен темами</p>
              <div className="flex flex-col gap-2 sm:flex-row"><input className="field min-w-0 flex-1" placeholder="Название моего пресета" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} /><button className="btn btn-signal shrink-0" onClick={save}><Save size={15} /> Сохранить пресет</button></div>
              <div className="flex flex-wrap gap-2"><button className="btn" onClick={exportTheme}><Download size={15} /> Экспорт JSON</button><button className="btn" onClick={() => importRef.current?.click()}><Upload size={15} /> Импорт JSON</button></div>
              <input ref={importRef} type="file" accept=".json,application/json" hidden onChange={(e) => { void importTheme(e.target.files?.[0]); e.target.value = ""; }} />
            </section>
            {error && <p role="alert" className="border border-live p-2 text-sm text-live">{error}</p>}
          </div>}
        </div>
        <div className="flex shrink-0 justify-between gap-3 border-t border-line px-5 py-3 text-xs text-dim"><span>Тема применяется только к этому клиенту</span><button className="btn" onClick={onClose}>Готово</button></div>
      </div>
    </div>
  );
}
function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return <label className="flex flex-col gap-1.5 text-xs text-dim"><span className="flex justify-between gap-2"><span>{label}</span><span className="num text-text">{value}{unit}</span></span><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
