"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { LoginScreen } from "@/components/LoginScreen";
import { Shell } from "@/components/Shell";
import { DEFAULT_PREFERENCES, PREFERENCES_KEY, readClientPreferences, type ClientPreferences } from "@/lib/clientPreferences";

export default function Page() {
  const { loading, uid, profile, signIn, signOut } = useSession();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => setPreferences(readClientPreferences()), []);

  const updatePreferences = (patch: Partial<ClientPreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next)); } catch {}
  };

  if (loading) return <div className="grid h-full place-items-center label">Загрузка</div>;

  if (uid && !profile) {
    // вход выполнен, но строки в profiles нет: раньше это выглядело как «снова экран входа»
    return (
      <main className="grid h-full place-items-center p-6">
        <div className="flex max-w-sm flex-col gap-4">
          <p>Аккаунт найден, но профиль не создан. Скажи администратору, чтобы проверил таблицу profiles.</p>
          <button className="btn w-fit" onClick={() => signOut()}>
            Выйти
          </button>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <LoginScreen
        preferences={preferences}
        onMode={(interfaceMode) => updatePreferences({ interfaceMode })}
        onSubmit={async (email, password) => {
          const { error } = await signIn(email, password);
          return error ? "Неверная почта или пароль" : null;
        }}
      />
    );
  }
  return <Shell profile={profile} onSignOut={signOut} preferences={preferences} onPreferences={updatePreferences} />;
}
