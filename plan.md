# План улучшений Omega Launcher

## Этап 1: Рефакторинг архитектуры (приоритет: высокий)

### 1.1 Разбить App.tsx на модули
- [ ] Вынести компоненты в `src/components/`:
  - `home/` — Dashboard, панели (сервера, друзья, консоль)
  - `mods/` — ModsPanel, ModCard, SearchBar, дропдауны
  - `instances/` — InstanceCard, InstanceList, ContextMenu, модалки
  - `accounts/` — AccountModal, ProfileMenu
  - `settings/` — SettingsPanel
  - `ui/` — DraggableWindow, Toast, Dropdown (переиспользуемые)
- [ ] Вынести хуки в `src/hooks/`:
  - `useInstances.ts` — управление сборками
  - `useAccounts.ts` — аккаунты + localStorage
  - `useModrinth.ts` — поиск/скачивание с Modrinth
  - `useTauriCommands.ts` — обёртки над invoke
- [ ] Вынести типы в `src/types/` (Account, ModpackInstance, и т.д.)
- [ ] Вынести сервисы в `src/services/` (api.ts, storage.ts, ipc.ts)
- [ ] Объединить дублирующиеся системы тостов в единый `ToastProvider`

### 1.2 Исправить найденные баги
- [ ] Memory leak в `listen` (App.tsx:1237) — корректный cleanup
- [ ] Race condition при смене языка в ModsPanel — добавить язык в зависимость searchMods
- [ ] Обработка ошибок загрузки version_manifest — try/catch + ретрай
- [ ] Escape для закрытия контекстного меню и модалок
- [ ] Кэширование version_manifest_v2.json (24 часа)

## Этап 2: Переход с sidecar'ов на нативный Rust (приоритет: высокий)

### 2.1 Перенести логику в Tauri команды
- [x] `download_mod` — переписать на Rust (reqwest + flate2 уже есть)
- [x] `install_loader` (Fabric/Quilt/Forge/NeoForge) — нативный установщик
- [x] `install_modpack` / `export_modpack` — на Rust (tar, zip, json)
- [x] `import_prism` / `import_curseforge` / `import_mrpack` — на Rust
- [x] `launch_minecraft` — интеграция с minecraft-launcher-core логикой (или JSON-RPC)
- [x] `login_microsoft` — уже нативный, но вынести OAuth в отдельный модуль

### 2.2 Удалить
- [x] `sidecar/` папку полностью после переноса
- [x] `npx tsx` вызовы из lib.rs
- [x] `test_xmcl.js` и мусорные файлы

### 2.3 Преимущества
- Нет cold start (2-3с экономия на каждом действии)
- Типизация Rust↔TS через serde
- Единый бинарник без node_modules в продакшене
- Прогресс-события через `Emitter` без парсинга stdout

## Этап 3: Хранилище данных (приоритет: средний)

### 3.1 SQLite вместо localStorage
- [x] Добавить `rusqlite` (или `sqlx`) в Cargo.toml
- [x] Таблица `instances` (id, name, mc_version, loader, icon_path, x, y, group)
- [x] Таблица `accounts` (name, type, tokens, uuid)
- [x] Таблица `installed_mods` (instance_id, mod_id, version, filename)
- [x] Иконки хранить как файлы в `app_data_dir/icons/` (не base64)

### 3.2 Кэш
- [x] `app_cache_dir/versions.json` — кэш версий MC
- [x] Кэш иконок модов (Modrinth CDN → локально)

## Этап 4: Безопасность (приоритет: средний)

### 4.1 Валидация входных данных
- [x] `validate_instance_id` — защита от path traversal в каждой команде
- [x] Валидация путей (export_path, zip_path, world_name)
- [x] Ограничение размера скачиваемых файлов

### 4.2 Аутентификация
- [x] Offline аккаунтам генерировать стабильный UUID (не случайный)
- [x] Хранить токены MS в безопасном месте (не в `ms_auth.json` в cwd)
- [x] Авто-рефреш токена Microsoft

## Этап 5: UX улучшения (приоритет: средний)

- [x] Drag & Drop модов на карточку сборки
- [x] Авто-детект установленных JDK в системе
- [x] История серверов + favicon + пинг
- [x] Кнопка "Обновить все моды" (сверка с Modrinth)
- [x] Индикатор прогресса установки модпака (не только логи)
- [x] Мультизапуск нескольких сборок одновременно
- [x] Экспорт в `.omega` файл (сборка + моды + конфиг)

## Этап 6: Тестирование и CI (приоритет: низкий)

### 6.1 Тесты
- [x] Добавить vitest + @testing-library/react
- [x] Тесты хуков (useInstances, useAccounts)
- [x] Тесты компонентов (DraggableWindow, Dropdown)
- [x] Rust unit-тесты (validate_instance_id, NBT-парсер)

### 6.2 CI
- [x] `.github/workflows/ci.yml`:
  - `npm run build` (typecheck)
  - `cd src-tauri && cargo check --locked`
  - `npm run test`
- [x] Автосборка релизов через tauri-action (уже есть release.yml — проверить)

## Порядок выполнения

```
Этап 1 ──► Этап 2 ──► Этап 3 ──► Этап 4 ──► Этап 5 ──► Этап 6
(1-2 нед.) (2-3 нед.) (1 нед.)  (3-4 дн.)  (1 нед.)   (1 нед.)
```

- **Этапы 1-2** — фундамент, без них дальше больно
- **Этап 3** — сразу после рефакторинга, чтобы не мигрировать дважды
- **Этапы 4-5** — можно параллелить
- **Этап 6** — постоянный процесс, не блокирует фичи
