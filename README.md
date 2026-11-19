# Berloga

Next.js (App Router) + Supabase + LiveKit Cloud, десктопная оболочка на Tauri v2.

## Запуск с нуля

1. **Supabase.** Новый проект → SQL Editor → выполнить `supabase/schema.sql`.
   Authentication → Providers → Email: выключить *Allow new users to sign up*.
   Authentication → Users → *Add user* (Auto Confirm) для каждого друга; ник берётся из части email до `@`
   или из `user_metadata.username`. Себя сделать админом:
   `update public.profiles set is_admin = true where username = 'ник';`
2. **LiveKit Cloud.** Создать проект, взять URL и API key/secret.
3. **Vercel.** Импорт репозитория, переменные из `.env.example`
   (`LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` только серверные). Деплой.
4. **Tauri.** В `src-tauri/tauri.conf.json` заменить `https://REPLACE-ME.vercel.app` на свой домен.
   Windows-установщик собирает GitHub Actions (`Actions → Windows installer → Run workflow`),
   .exe появится в артефактах. Локально: `npm run tauri build` на Windows с Rust.

Локальная разработка: `cp .env.example .env.local`, `npm run dev`.

## Где что менять

| Что | Файл |
|---|---|
| Пресеты показа экрана, слои simulcast, кодек | `src/lib/presets.ts` |
| Комнаты, лимиты ползунков, аудио в экономии | `src/lib/constants.ts` |
| Логика комнаты, экономия, пауза при сворачивании | `src/hooks/useVoiceRoom.ts` |
| Выдача токенов LiveKit | `src/app/api/livekit/token/route.ts` |
| Трей, закрытие в трей | `src-tauri/src/lib.rs` |

## Что проверить на реальных машинах в первую очередь

- `getDisplayMedia` со звуком в WebView2 (системный звук захватывается не на всех сборках рантайма).
- Звук продолжает идти, когда окно спрятано в трей.
- H.264 для экрана: если у кого-то картинка рвётся, поставить `"vp8"` в `presets.ts`.
- Замер трафика зрителя в экономии (цель 150–200 МБ/ч) и в чистом войсе (10–15 МБ/ч): цифры у зрителя в плитке потока показывают реальные кбит/с.
