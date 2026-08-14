-- Omega Launcher — схема Supabase (Этап 9: Omega-аккаунты и друзья)
-- Выполнить в SQL Editor проекта Supabase.

-- 1. Профили (один к одному с auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  friend_code text not null unique,
  created_at timestamptz not null default now()
);

-- 2. Друзья (заявка -> принятие)
create table if not exists public.friends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

-- 3. Row Level Security
alter table public.profiles enable row level security;
alter table public.friends enable row level security;

-- Профили: читают все аутентифицированные (нужно для поиска друзей),
-- создаёт/изменяет только владелец.
create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- Друзья: только участник пары.
create policy "friends_select" on public.friends
  for select using (auth.uid() in (user_id, friend_id));

create policy "friends_insert" on public.friends
  for insert with check (auth.uid() = user_id);

create policy "friends_update" on public.friends
  for update using (auth.uid() in (user_id, friend_id));

create policy "friends_delete" on public.friends
  for delete using (auth.uid() in (user_id, friend_id));

-- 4. RPC: поиск профиля по нику или friend_code
create or replace function public.search_profiles(query text)
returns setof public.profiles
language sql
security definer
set search_path = public
as $$
  select * from public.profiles
  where username ilike '%' || query || '%'
     or friend_code ilike '%' || query || '%'
  limit 20;
$$;
