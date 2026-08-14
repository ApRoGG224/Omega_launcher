# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Миграции Supabase

Схема базы управляется миграциями в [`supabase/migrations/`](supabase/migrations/) (нумерованные SQL-файлы, применяются раннером по порядку).

```bash
just migration            # применить новые миграции
just migration-status     # показать статус
just migration-new name   # создать новую миграцию
just migration-import     # пометить текущие файлы как применённые
                          # (только если схема уже была внесена вручную)
```

Требуется:

- проект на [supabase.com](https://supabase.com);
- `.env` с `VITE_SUPABASE_URL` и личным токеном `SUPABASE_ACCESS_TOKEN`(создаётся в https://supabase.com/dashboard/account/tokens);
- установленный `just` (https://github.com/casey/just).

Новые правки БД добавляйте только через новые файлы миграций (не редактируйте применённые).

## Релизы

```bash
just version              # поднять patch-версию и закоммитить
just version minor        # поднять minor-версию
just release              # бамп + пуш + тег vX.Y.Z (CI соберёт и выложит релиз)
```

Только что закоммитьте тег: при пуше тега `v*` GitHub Actions собирает приложение для Windows/Linux/macOS и создаёт черновик Release, откуда пользователи могут скачать установщик.

## Настройка Supabase (вручную, без just)

1. Создайте проект на [supabase.com](https://supabase.com) (бесплатный план).
2. В **SQL Editor** выполните `supabase/migrations/0001_init.sql` и `0002_avatar_url.sql`.
3. Скопируйте `.env.example` в `.env` и заполните:
   - `VITE_SUPABASE_URL` — Project URL (Settings → API)
   - `VITE_SUPABASE_ANON_KEY` — anon public key (Settings → API)
4. Аутентификация: в **Authentication → Providers** включите **Email** (Sign in with email). Для тестов отключите **Confirm email** (Authentication → Sign In / Up), чтобы сессия выдавалась сразу после регистрации.
5. Для реальной проверки системы друзей нужно два аккаунта — регистрация доступна прямо из лаунчера (окно аккаунтов → «Omega»).

`.env` с ключами не коммитится (в `.gitignore`); anon key безопасен для клиентского использования благодаря RLS.
