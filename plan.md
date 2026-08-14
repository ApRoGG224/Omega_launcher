# План улучшений Omega Launcher

## Этап 1: Рефакторинг архитектуры (приоритет: высокий)

### 1.1 Разбить App.tsx на модули
- [x] Вынести компоненты в `src/components/`:
  - `home/` — Dashboard, панели (сервера, друзья, консоль)
  - `mods/` — ModsPanel, ModCard, SearchBar, дропдауны
  - `instances/` — InstanceCard, InstanceList, ContextMenu, модалки
  - `accounts/` — AccountModal, ProfileMenu
  - `settings/` — SettingsPanel
  - `ui/` — DraggableWindow, Toast, Dropdown (переиспользуемые)
- [x] Вынести хуки в `src/hooks/`:
  - `useInstances.ts` — управление сборками
  - `useAccounts.ts` — аккаунты + localStorage
  - `useModrinth.ts` — поиск/скачивание с Modrinth
  - `useTauriCommands.ts` — обёртки над invoke
- [x] Вынести типы в `src/types/` (Account, ModpackInstance, и т.д.)
- [x] Вынести сервисы в `src/services/` (api.ts, storage.ts, ipc.ts)
- [x] Объединить дублирующиеся системы тостов в единый `ToastProvider`

### 1.2 Исправить найденные баги
- [x] Memory leak в `listen` (App.tsx:1237) — корректный cleanup
- [x] Race condition при смене языка в ModsPanel — добавить язык в зависимость searchMods
- [x] Обработка ошибок загрузки version_manifest — try/catch + ретрай
- [x] Escape для закрытия контекстного меню и модалок
- [x] Кэширование version_manifest_v2.json (24 часа)

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
- [x] Панель серверов: favicon сервера (modern ping), статус онлайн/офлайн с авто-обновлением, зелёная кнопка "Запустить" при hover, модалка выбора сборки, запуск сборки с auto-join на сервер (`--server host:port`)
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

## Этап 7: Импорт сборок из сторонних лаунчеров (приоритет: высокий)

### 7.1 Кнопка «Импорт» в окне «Создать сборку»
- [x] В `CreateInstanceModal.tsx` добавить третью кнопку **«Импорт»** (`create-action-btn` + иконка загрузки/стрелки) рядом с «Создать» и «Отмена».
- [x] Клик по «Импорт» закрывает окно создания и открывает существующий `ImportModal` (переиспользовать `instancesApi.setImportModalOpen(true)` из `App.tsx` — модалка уже рендерится там).
- [x] Добавить переводы кнопки (ru/en) в `src/i18n.ts` (`importBtn` / `importBtnDesc`).
- [x] Обновить `HomeDashboard`/`CreateInstanceModal` пропсы: передать `onImport` из `App.tsx` (или вызывать открытие модалки напрямую через проп `onImport`).

### 7.2 Рабочий импорт из трёх лаунчеров (бэкенд)
- [x] **Prism Launcher** (.zip): `import_prism` в `src-tauri/src/imports.rs` — распаковка инстанса с `mmc-pack.json` + папкой `.minecraft`, перенос модов/конфигов, определение версии/загрузчика из `instance.cfg` / `mmc-pack.json`.
- [x] **CurseForge** (.zip): `import_curseforge` — чтение `manifest.json` (minecraft.version, minecraft.modLoaders, files[]), установка модов через Modrinth-маппинг + загрузчик (Forge/Fabric).
- [x] **Modrinth/Omega** (.mrpack): `import_mrpack` — Modrinth Index (`modrinth.index.json`): dependencies (minecraft, fabric-loader/forge), files (MODRINTH/CURSEFORGE), перенос/скачивание.
- [x] Проверить покрытие: `.mrpack` без интернета (офлайн-файлы) — fallback на извлечение файла прямо из архива (`extract_zip_entry`); zip с вложенной папкой `.minecraft` (Prism) — уже покрыт `extract_roots`; CurseForge zips с вложенной `minecraft/` — добавлен root.
- [x] Прогресс-событие `install-progress` для импорта из `imports.rs` (сейчас тосты только по завершении).
- [x] Мини-окно прогресса импорта в правом нижнем углу (`ImportProgressPopup.tsx`): появляется при импорте из любого стороннего лаунчера, анимация скачивания (пульсирующая иконка + бегущий прогресс-бар), детерминированный прогресс для `.mrpack` (N/M файлов), indeterminate-анимация для распаковки, кнопка скрытия.

### 7.3 Проверка
- [x] Импорт из каждого формата → сборка появляется на главном экране и запускается.
- [x] `npm run build`, `npm run test`, `cargo check` в `src-tauri`.

## Этап 8: Исправление багов (по отчёту пользователя)

- [x] **Баг 1. Панели/кнопки съезжают к центру при старте.** Убрана transform-анимация входа у дока (`dockOpacityFade` — только opacity), `DraggableWindow` выполняет `clampToViewport` после первого кадра с guard'ами (`innerWidth > 0`, offset-размеры вместо getBoundingClientRect + пере-клэп при изменении size), импортированные сборки больше не создаются в центре экрана (`window.innerWidth/2` → случайная позиция).
- [x] **Баг 2. Не грузятся иконки серверов.** Нативный `modern_ping` (network.rs) с фолбэком на legacy-пинг, favicon кешируется в БД (`servers.favicon` + миграция в db.rs, команда `db_save_server_favicon` зарегистрирована в lib.rs), `ServersPanel` рендерит favicon с fallback на ●/○/….
- [x] **Баг 3. Док дергается между вкладками.** Фиксированный слот под бейдж версии (`dock-version-slot` 18px) + скрытие через opacity, чтобы высота дока не менялась при переключении вкладок.
- [x] **Баг 4. Индикатор «Модов: N» меняет размер.** `min-width` для первого chip (`mod-chips-container .mod-chip:first-child`, 152px) — ширина бейджа фиксирована вне зависимости от числа.
- [x] **Баг 5. Сломанная подсветка выделенной сборки.** Убран `transform: translateY(-2px)` у `.recent-instance-item.selected` (резал верхний край из-за overflow контейнера), заменён на `box-shadow`.
- [x] **Баг 6. Смешанный язык интерфейса.** Все захардкоженные строки вынесены в i18n: ServersPanel, RecentInstancesPanel, ConsolePanel, FriendsPanel, InstancesPanel, InstanceContextMenu, InstanceModals, ImportModal, CatalogTabs, ShaderInstallModal, WorldSelectModal, InstallTargetModal, CreateInstanceModal, ModsPanel, toasts в App.tsx и useInstances (t прокинут в хук), SettingsPanel. Остались только данные (имена друзей, названия модов) и «Русский/English».
- [x] **Баг 7. Полный редизайн настроек.** `SettingsPanel.tsx` переписан под sketch-стилистику: сетка карточек с глифами (`settings-grid`/`settings-card`), секции: пути/JDK, память, автоподключение, фильтры версий (checkable-плитки), язык, тема с пикером.
- [x] **Мини-окно «Последние сборки» на главной.** Раньше показывало первые 3 сборки в порядке создания и не обновлялось. Теперь `HomeDashboard` получает `visibleInstances` (свежие сверху), а `moveInstanceToTop` (useInstances) при запуске сборки поднимает её наверх списка; порядок сохраняется в localStorage/БД.
- [x] **Статистика игры (бейдж внизу справа).** При спавне процесса `useGameSession` фиксирует начало сессии, при выходе (`Minecraft process exited`) — добавляет длительность через `recordPlaySession` (playTimeMs + lastPlayedAt) в `useInstances`, сохраняется в localStorage и БД (`instances.play_time_ms` / `last_played_at` + миграция в db.rs). Внизу справа бейдж: «Наиграно: X ч Y мин • Последний запуск: …».

## Этап 9: Omega-аккаунты и система друзей (Supabase, приоритет: средний)

### 9.1 Инфраструктура (шаг 0)
- [ ] Создать проект Supabase (бесплатный план), получить `SUPABASE_URL` + `SUPABASE_ANON_KEY` → в `.env` (добавить в `.gitignore`). *(нужны реальные ключи — см. README; `.env.example` и gitignore готовы)*
- [x] Добавить `@supabase/supabase-js` в `package.json` и единый клиент в `src/services/supabase.ts`.
- [x] SQL-схема в Supabase (`supabase/schema.sql`):
  - `profiles` (`id` uuid PK = `auth.users.id`, `username` unique, `friend_code` unique, `created_at`)
  - `friends` (`user_id`, `friend_id`, `status` pending|accepted, `created_at`, PK(`user_id`,`friend_id`))
- [x] RLS-политики: профили читаются всеми авторизованными (для поиска), изменяются только владельцем; друзья — только участник пары.
- [x] Секция «Настройка Supabase» в README с SQL-скриптом и политиками.

### 9.2 Omega-аккаунт (регистрация через лаунчер)
- [x] `src/hooks/useOmegaAuth.ts`: `register(email, username, password)`, `login`, `logout`, восстановление сессии (+ `src/services/omega.ts` — вызовы Supabase, `generateFriendCode`).
- [x] Окно `AccountModal` — новый метод входа **«Omega»** (форма регистрации/входа с переключателем), рядом с Microsoft и Offline.
- [x] Сессия в `localStorage` (supabase-js, источник для Realtime); аккаунт в списке профилей с типом `omega`.
- [x] Генерация `friend_code` формата `OMG-XXXXXX` в профиле при регистрации (ретрай при коллизии, + unit-тесты).

### 9.3 Друзья
- [x] Поиск по коду/нику (`search_profiles` RPC), отправка заявки, приём/отклонение, удаление (`src/services/friends.ts` + `useFriends.ts`).
- [x] `FriendsPanel.tsx`: реальные данные вместо моков; вкладки «Друзья» / «Заявки»; строка «Добавить по коду»; **свой friend_code с кнопкой «Скопировать»**; онлайн/офлайн через presence; удаление друга.
- [x] i18n-ключи (ru/en) для всех новых строк.

### 9.4 Присутствие (онлайн-статус)
- [x] `usePresence.ts` — Realtime-канал `presence:omega`: `online` / `in_game` (+ `instanceName`, `serverHost` — передаются при запуске с сервера и при обычном запуске).
- [x] Авто-статус «В игре (имя сборки / сервер)» из `useGameSession`; автоматически `offline` при остановке игры и выходе из сессии.

### 9.5 Присоединение по сети
- [x] У онлайн-друга кнопка **«Присоединиться»**: если играет на сервере (`serverHost`) — модалка выбора сборки → запуск с `--server host:port` (переиспользован auto-join из Этапа 5).
- [x] Приглашение через Realtime broadcast: «Пригласить в мир» → другу приходит баннер/тост с IP пригласившего (новые команда `get_local_ip` в Rust + `ipc.getLocalIp`) и кнопкой «Присоединиться»; получатель фильтрует по `toId`.
- [x] Fallback: друг «в главном меню» без сервера — кнопка «Пригласить в мир» вместо join.

### 9.6 Проверка
- [ ] Два запущенных лаунчера (два Omega-аккаунта) → добавление по коду, онлайн-статус в реальном времени, join с auto-join.
- [ ] `npm run build`, `npm run test`, `cargo check` в `src-tauri`.

## Порядок выполнения

```
Этап 1 ──► Этап 2 ──► Этап 3 ──► Этап 4 ──► Этап 5 ──► Этап 6
(1-2 нед.) (2-3 нед.) (1 нед.)  (3-4 дн.)  (1 нед.)   (1 нед.)
```

- **Этапы 1-2** — фундамент, без них дальше больно
- **Этап 3** — сразу после рефакторинга, чтобы не мигрировать дважды
- **Этапы 4-5** — можно параллелить
- **Этап 6** — постоянный процесс, не блокирует фичи
