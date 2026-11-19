"use client";
import { useSession } from "@/hooks/useSession";
import { LoginScreen } from "@/components/LoginScreen";
import { Shell } from "@/components/Shell";

export default function Page() {
  const { loading, profile, signIn, signOut } = useSession();

  if (loading) return <div className="grid h-full place-items-center label">Загрузка</div>;
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
