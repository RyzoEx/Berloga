-- Berloga: схема Supabase. Выполнить целиком в SQL Editor.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 2 and 24),
  is_admin boolean not null default false
);

create table public.server_settings (
  id int primary key default 1 check (id = 1),
  audio_bitrate int not null default 32000 check (audio_bitrate between 12000 and 64000),
  max_video_bitrate int not null default 2500000 check (max_video_bitrate between 250000 and 4000000),
  forced_eco_users uuid[] not null default '{}'
);
insert into public.server_settings (id) values (1);

-- security definer: иначе политика на profiles рекурсивно читает profiles
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

alter table public.profiles enable row level security;
alter table public.server_settings enable row level security;

-- профили: читать могут все вошедшие, менять нельзя никому (is_admin правится только из панели Supabase)
create policy "profiles read" on public.profiles for select to authenticated using (true);

create policy "settings read" on public.server_settings for select to authenticated using (true);
create policy "settings admin update" on public.server_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- профиль создаётся автоматически при создании пользователя в Authentication → Users
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- мгновенная рассылка изменений настроек всем клиентам
alter publication supabase_realtime add table public.server_settings;

-- Первый админ (после создания пользователя):
-- update public.profiles set is_admin = true where username = 'твой_ник';
