# План рестайлинга лаунчера под палитру AuthKit

Задача: заменить текущую фиолетовую палитру лаунчера (акцент `#960DF2`, поверхности `rgba(14,11,22,…)`, текст `#8b8b9c`) на холодную палитру AuthKit (Midnight Canvas, Void Violet, Glass Edge и т.д.) **во всех вкладках**. Только цвета/стили — **без изменения раскладки, позиций и без новых анимаций**. Код: React + TypeScript + CSS (`src/App.css`), backend Rust/Tauri. Тексты UI — только через `t.*` ключи.

## 1. Новые токены в `:root` (`src/App.css:3-8`)

Добавить все 15 токенов AuthKit:
- `--color-midnight-canvas: #05060f`
- `--color-steel-plate: #2f343e`
- `--color-fog-veil: #9da7ba`
- `--color-moon-mist: #c7d3ea`
- `--color-frost-glow: #d1e4fa`
- `--color-ice-highlight: #d8ecf8` (+ градиент `linear-gradient(0deg, #d8ecf8, #98c0ef)`)
- `--color-pure-white: #ffffff`
- `--color-void-violet: #663af3`
- `--color-blueprint-blue: #b6d9fc`
- `--color-ember-glow: #e46d4c`
- `--color-signal-blue: #027dea`
- `--color-deep-teal: #269684`
- `--color-gridline-blue: #3f4959`
- `--color-glass-edge: #bad7f71f`
- `--color-luminous-fill: #c7d3ea1f`

Переопределить существующие:
- `--accent-color: #960DF2` → `#663af3`
- `--accent-color-rgb` → `102, 58, 243`
- `--accent-color-light: #AB3DF5` → `#8b5cf6`
- `--accent-color-dark: #6805ac` → `#4c2bd6`

## 2. Карта глобальных замен (App.css + 13 TSX-файлов)

| Старый | Новый | Роль |
|---|---|---|
| `#050408` | `#05060f` Midnight Canvas | фон |
| `#960DF2`, `#9333ea` | `#663af3` Void Violet | акцент |
| `#AB3DF5`, `#a78bfa` | `#8b5cf6` (светлый фиолет) | градиенты |
| `#c084fc`, `#e0d6f5`, `#e8e5f2` | `#d1e4fa` Frost Glow | текст-акцент |
| `#8b8b9c`, `#a0a0b0`, `#6b7280`, `#6b6b7a` | `#9da7ba` Fog Veil | вторичный текст |
| `#4a4a5a`, `#5b5b6c`, `#6b6b7c`, `#4b4b5c`, `#4a4a58`, `#3a3a48` | `#3f4959` Gridline Blue | тусклый текст |
| `#e8e8f0` | `#d8ecf8` Ice Highlight | заголовки |
| `#d7d7e3`, `#e2e8f0` | `#c7d3ea` Moon Mist | подписи |
| `#10b981`, `#4ade80`, `#059669`, `#34d399` | `#269684` Deep Teal | онлайн/успех |
| `#ef4444`, `#f87171`, `#fbbf24`, `#f97316` | `#e46d4c` Ember Glow | ошибки/варны |
| `#60a5fa` | `#b6d9fc` Blueprint Blue | инфо-логи |
| `#3b82f6` | `#027dea` Signal Blue | синий |
| `#2a2a35`, `#2a2a3e`, `#1f1f2e` | `#2f343e` Steel Plate | поверхности |
| `#14141e`, `#1a1528`, `#2a1f42` | тёмные `#05060f`-варианты | подложки |
| `#552077`, `#5b3aa8`, `#4f3296` | `#4c2bd6` | тёмный фиолет |
| `#7C5CFF`, `#c9b8f2` | `#8b5cf6` / `#b6d9fc` | доп. фиолет |
| `#a855f7` | `#663af3` | пресет/дефолт темы |

rgba-замены (App.css + TSX):
| Старый | Новый |
|---|---|
| `rgba(150, 13, 242, X)` | `rgba(102, 58, 243, X)` |
| `rgba(171, 61, 245, X)` | `rgba(139, 92, 246, X)` |
| `rgba(79, 50, 150, X)` | `rgba(102, 58, 243, X)` |
| `rgba(16, 185, 129, X)` | `rgba(38, 150, 132, X)` |
| `rgba(239, 68, 68, X)` | `rgba(228, 109, 76, X)` |
| `rgba(251, 191, 36, X)` / `rgba(255, 186, 8, X)` | `rgba(228, 109, 76, X)` |
| `rgba(5, 4, 8, X)` | `rgba(5, 6, 15, X)` |
| `rgba(14, 11, 22, X)` / `rgba(10, 8, 16, X)` / `rgba(10, 8, 20, X)` | `rgba(5, 6, 15, X)` |
| `rgba(20, 20, 30, X)` / `rgba(28, 28, 40, X)` / `rgba(24, 22, 36, X)` | `rgba(16, 19, 27, X)` |
| `rgba(30, 30, 40, X)` / `rgba(30, 30, 45, X)` | `rgba(24, 27, 36, X)` |
| `rgba(40, 40, 50, X)` / `rgba(40, 38, 54, X)` | `rgba(47, 52, 62, X)` |
| белые рамки `rgba(255,255,255,0.05–0.15)` | `rgba(186,215,247,0.08–0.16)` Glass Edge |

## 3. Спец-места (вручную)

- Фон-градиенты приложения (`App.css:52-59`) → холодные: violet halo + blueprint-blue halo вместо двух фиолетовых
- Градиент консоли → `rgba(102,58,243,0.06) → rgba(5,6,15,0.97)`
- Градиент dock-кнопки и активных sub-tabs `linear-gradient(135deg,#960DF2,#AB3DF5)` → `linear-gradient(135deg,#663af3,#8b5cf6)`
- Орбы в FriendsTab (фиолетовый/зелёный) → void violet / deep teal
- Спиннер `#10b981` → `#663af3`
- Playtime badge (градиент `#AB3DF5→#7C5CFF`) → `#8b5cf6 → #663af3`
- Скроллбары `rgba(171,61,245,0.2)` → `rgba(139,92,246,0.2)`
- Пресеты тем в `SettingsPanel.tsx`: Omega Purple → `#663af3`, Neon Green → `#269684`, Cyber Blue → `#027dea`, Crimson Red → `#e46d4c`, Sunset Orange → `#e46d4c`, Hot Pink → удалить/заменить
- Дефолт темы в `storage.ts:99`: `#a855f7` → `#663af3`

## 4. НЕ трогаем

- Логотипы Microsoft / CurseForge `#F16436` / Modrinth `#00AF5C` (брендовые цвета)
- `Debug.tsx` (служебная dev-страница)
- Раскладку, позиции, размеры, поведение, `t.*` ключи
- Существующие анимации (никаких новых)

## 5. Проверка

- `npm run build` (type-check + прод-сборка)
- **БЕЗ коммита и пуша** (инструкция пользователя важнее AGENTS.md)
