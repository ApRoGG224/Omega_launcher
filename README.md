# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Настройка Supabase (Этап 9: Omega-аккаунты и друзья)

1. Создайте проект на [supabase.com](https://supabase.com) (бесплатный план).
2. В проекте откройте **SQL Editor** и выполните скрипт [`supabase/schema.sql`](supabase/schema.sql) — он создаст таблицы `profiles` и `friends`, включит RLS и добавит RPC `search_profiles`.
3. Скопируйте `.env.example` в `.env` и заполните:
   - `VITE_SUPABASE_URL` — Project URL (Settings → API)
   - `VITE_SUPABASE_ANON_KEY` — anon public key (Settings → API)
4. Аутентификация: в **Authentication → Providers** включите **Email** (Sign in with email). Для тестов отключите **Confirm email** (Authentication → Sign In / Up), чтобы сессия выдавалась сразу после регистрации.
5. Для реальной проверки системы друзей нужно два аккаунта — регистрация доступна прямо из лаунчера (окно аккаунтов → «Omega»).

`.env` с ключами не коммитится (в `.gitignore`); anon key безопасен для клиентского использования благодаря RLS.
