"use client";
import { useState } from "react";
import { AUDIO_LIMITS, ROOMS } from "@/lib/constants";

const SPEC: [string, string][] = [
  ["Комнаты", ROOMS.map((r) => r.name).join(" · ")],
  ["Голос", `Opus ${AUDIO_LIMITS.min / 1000}–${AUDIO_LIMITS.max / 1000} кбит/с, шумо- и эхоподавление`],
  ["Экран", "до 1080p / 60 fps, системный звук, три слоя качества"],
  ["Экономия", "480p / 15 fps, около 150 МБ в час на стрим"],
  ["Вход", "только по приглашению администратора"],
];

export function LoginScreen({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<string | null> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <main className="grid min-h-full lg:grid-cols-[minmax(360px,2fr)_3fr]">
      <section className="flex flex-col justify-between gap-6 p-6 lg:p-12">
        <h1 className="font-display text-2xl font-semibold tracking-tight">БЕРЛОГА</h1>

        <form
          className="flex max-w-sm flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(await onSubmit(email.trim(), password));
            setBusy(false);
          }}
        >
          <p className="label">Вход</p>
          <label className="flex flex-col gap-2">
            <span className="text-dim">Почта</span>
            <input className="field" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-dim">Пароль</span>
            <input className="field" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="text-live">{error}</p>}
          <button className="btn btn-signal h-9" disabled={busy}>
            {busy ? "Входим…" : "Войти"}
          </button>
        </form>

        <p className="text-faint">Аккаунты выдаёт администратор.</p>
      </section>

      <section className="hidden border-l border-line bg-panel p-12 lg:flex lg:flex-col lg:justify-end">
        <dl className="flex flex-col">
          {SPEC.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[96px_1fr] gap-4 border-t border-line py-3">
              <dt className="label pt-1">{k}</dt>
              <dd className="text-text">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
