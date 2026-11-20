"use client";
import { useSession } from "@/hooks/useSession";
import { LoginScreen } from "@/components/LoginScreen";
import { Shell } from "@/components/Shell";

export default function Page() {
  const { loading, uid, profile, signIn, signOut } = useSession();

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
        onSubmit={async (email, password) => {
          const { error } = await signIn(email, password);
          return error ? "Неверная почта или пароль" : null;
        }}
      />
    );
  }
  return <Shell profile={profile} onSignOut={signOut} />;
}
