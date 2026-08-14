-- Колонка avatar_url для аватарок (если проект создан до этой миграции).
alter table public.profiles add column if not exists avatar_url text;