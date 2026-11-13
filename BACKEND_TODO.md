# Omega Launcher — Backend Roadmap & TODO (`BACKEND_TODO.md`)

В данном документе подробно описана архитектура бэкенда Omega Launcher, уже подключенные нативные Rust-команды к обновленному фронтенду (Layered Architecture из `Omega_Remaster`), а также список недостающих и рекомендуемых к реализации эндпоинтов в `src-tauri/src/`.

---

## 1. Текущий статус: Что уже реализовано и подключено

Новый интерфейс лаунчера из `Omega_Remaster` (5 слоёв: Atmosphere, Stage3D, HUD, Dock, Screens) полностью интегрирован с существующим Rust-бэкендом Tauri v2:

| Категория | Команда Tauri / Сервис | Статус подключения к UI |
|---|---|---|
| **Запуск игры** | `launch_minecraft` | **Подключено:** Вызывается из нижнего дока (`DockLayer`), верхнего бара (`HudLayer`), карточек сборки (`InstancesScreen`) и прямого подключения серверов (`ServersScreen`). |
| **Остановка игры** | `kill_minecraft` | **Подключено:** Вызывается кнопкой «СТОП» при активном процессе. |
| **Жизненный цикл** | События `"download-progress"` | **Подключено:** Отслеживается PID запуска (`Minecraft process spawned with PID:`), статус завершения игры, а также транслируется в реальном времени в консоль `ConsoleScreen`. |
| **База версий** | `db_load_instances`, `db_save_instances`, `db_delete_instance` | **Подключено:** Сборки загружаются из SQLite и синхронизируются при любых изменениях (создание, удаление, редактирование). |
| **Моды версий** | `count_installed_mods`, `list_installed_mod_files` | **Подключено:** Подсчитывает реальные `.jar` файлы в папке `mods/` каждой версии. |
| **Папки и ярлыки** | `open_folder`, `create_shortcut`, `open_path` | **Подключено:** Кнопки «Папка» и «Ярлык» в карточках версий открывают системный проводник и создают рабочий ярлык на Desktop. |
| **Серверы** | `db_load_servers`, `db_save_server`, `db_delete_server` | **Подключено:** Список серверов хранится в SQLite. |
| **Пинг серверов** | `ping_server` | **Подключено:** При открытии `ServersScreen` опрашивает серверы по TCP, получает реальный пинг (ms), MOTD (очищенный от цветовых кодов §), количество игроков онлайн и фавиконку. |
| **Java Runtime** | `find_system_java` | **Подключено:** В `SettingsScreen` кнопка «Автодетект Java» находит системную Java через Adoptium / JAVA_HOME / `/usr/lib/jvm`. |
| **Microsoft Аккаунт** | `login_microsoft`, `get_cached_microsoft_account`, `logout_microsoft` | **Подключено:** В `AccountsScreen` кнопка «Войти через Microsoft OAuth2» запускает device code flow и сохраняет токен. |
| **Скины игроков** | `get_microsoft_skin`, `upload_microsoft_skin` | **Подключено:** Получает официальные скины по никнейму, поддерживает загрузку скина в профиль Mojang. |
| **Каталог скинов** | `fetch_minecraft_inside_skins`, `fetch_skin_as_data_url` | **Подключено:** Rust-прокси для каталога скинов без проблем с CORS. |
| **Ely.by аккаунт** | `open_ely_login` | **Подключено:** Открытие окна авторизации Ely.by. |
| **Логирование** | `"download-progress"`, `"auth-log"` | **Подключено:** Все события игры и авторизации стекаются в `liveLogs` и отображаются в `ConsoleScreen` с фильтрами (`INFO`, `WARN`, `ERROR`, `AUTH`). |

---

## 2. Недостающий бэкенд: Что необходимо дописать (`TODO`)

Ниже перечислены эндпоинты и функционал, который требуется дописать в `src-tauri/src/`, чтобы интерфейс получил 100% покрытие нативными возможностями.

---

### 2.1. Нативный диалог выбора папок и файлов (`tauri_plugin_dialog`)

**Где в UI:**
- `SettingsScreen.tsx`: кнопка «Обзор…» для выбора рабочей директории `.minecraft` и файла Java.
- `InstancesScreen.tsx`: кнопка «Импорт сборки» для выбора файла `.mrpack`, `.zip` или архива CurseForge.

**Что нужно добавить в Rust (`src-tauri/src/lib.rs` или отдельный модуль `src-tauri/src/dialogs.rs`):**

```rust
#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle, default_path: Option<String>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let mut builder = app.dialog().file();
    if let Some(path) = default_path {
        builder = builder.set_directory(path);
    }
    let folder = builder.blocking_pick_folder();
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn pick_file(app: tauri::AppHandle, filter_name: String, extensions: Vec<String>) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let ext_refs: Vec<&str> = extensions.iter().map(|s| s.as_str()).collect();
    let file = app.dialog()
        .file()
        .add_filter(filter_name, &ext_refs)
        .blocking_pick_file();
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}
```

---

### 2.2. Запуск нативной сборки Minecraft Rust (Beta)

**Где в UI:**
- По умолчанию в списке версий есть `Minecraft Rust (Beta)` с тегом `[RUST]`, версией `26.3` и лоадером `Rust`.

**Что нужно добавить в Rust (`src-tauri/src/launch.rs`):**
В функции `launch_minecraft` добавить проверку лоадера:
```rust
if loader.eq_ignore_ascii_case("rust") {
    // 1. Проверить наличие нативного бинарника в ~/.omega-launcher/bin/minecraft-rust
    // 2. Если бинарник отсутствует — скачать предсобранный релиз под текущую платформу (Linux x86_64, Windows x64, macOS arm64)
    // 3. Запустить нативный процесс:
    //    let child = Command::new(&rust_bin_path)
    //        .arg("--username").arg(&username)
    //        .arg("--game-dir").arg(&instance_dir)
    //        .spawn()?;
}
```

---

### 2.3. CurseForge API интеграция для загрузки сборок и модов

**Где в UI:**
- `ModrinthScreen.tsx`: переключатель источника «CurseForge» и категории «Сборки / Моды / Шейдеры».

**Что нужно добавить в Rust (`src-tauri/src/download.rs`):**
1. Добавить поиск через официальный или проксированный эндпоинт CurseForge Core API:
```rust
#[tauri::command]
pub async fn search_curseforge(
    query: String,
    class_id: u32, // 6 = mods, 4471 = modpacks, 6552 = shaders
    game_version: Option<String>,
    page: u32,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let mut url = format!(
        "https://api.curseforge.com/v1/mods/search?gameId=432&classId={class_id}&searchFilter={}",
        urlencoding::encode(&query)
    );
    if let Some(v) = game_version {
        url.push_str(&format!("&gameVersion={v}"));
    }
    url.push_str(&format!("&index={}", page * 20));

    let res = client.get(&url)
        .header("x-api-key", "$2a$10$...") // или ключ из переменных окружения
        .send().await.map_err(|e| e.to_string())?;

    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(json)
}
```

---

### 2.4. Экспорт сборок прямо из интерфейса версий

**Где в UI:**
- `InstancesScreen.tsx`: кнопка «Экспорт сборки» в контекстном меню или в модалке редактирования версии.

**Что уже есть в бэкенде:**
- В `src-tauri/src/imports.rs` уже есть готовые функции `export_modpack` (MrPack) и `export_omega` (нативный формат Omega Launcher).
**Что нужно дописать в `src/components/screens/InstancesScreen.tsx`:**
- Добавить кнопку вызова `ipc.exportModpack({ instanceId: inst.id, instanceName: inst.name, exportPath })` или `ipc.exportOmega`.

---

### 2.5. P2P туннелирование для игры с друзьями без белого IP (UPnP / STUN / Relay)

**Где в UI:**
- `FriendsScreen.tsx`: вкладка «Совместная игра» / кнопка подключения к миру друга по коду лобби.

**Что нужно добавить в Rust (`src-tauri/src/network.rs`):**
1. **UPnP порт-форвардинг**: открытие локального порта Minecraft (по умолчанию 25565 или случайного LAN-порта) в домашнем роутере через `igd` crate:
```rust
#[tauri::command]
pub async fn open_upnp_port(local_port: u16) -> Result<u16, String> {
    use igd::search_gateway;
    let gateway = search_gateway(Default::default()).map_err(|e| e.to_string())?;
    let ip = local_ip().map_err(|e| e.to_string())?;
    gateway.add_port(
        igd::PortMappingProtocol::TCP,
        local_port,
        std::net::SocketAddrV4::new(ip, local_port),
        3600,
        "Omega Launcher LAN Host",
    ).map_err(|e| e.to_string())?;
    Ok(local_port)
}
```
2. **P2P Relay / Tunneling**: интеграция легковесного туннеля (Playit.gg / Ngrok / Cloudflare Tunnel SDK) для автоматического предоставления другу публичного адреса `connect.omega.network:xxxxx`.

---

### 2.6. Система Косметики и Питомцев (In-Game Sync)

**Где в UI:**
- `StoreScreen.tsx`: вкладки «Питомцы» (Малая панда, Дракончик Края, Слаймик) и «Косметика» (Крылья Архангела, Корона Монарха, Ореол).

**Что нужно на бэкенде:**
1. Локальное хранение выбранных аксессуаров в JSON конфиге профиля (`minecraft_data/omega_cosmetics.json`).
2. При запуске версии (`launch_minecraft`):
   - Автоматически инжектировать легковесный клиентский companion-мод `omega-cosmetics-fabric.jar` в папку `mods/` (или через classpath JVM agent).
   - Мод считывает локальный `omega_cosmetics.json` и спавнит питомца / рендерит 3D меши крыльев и корон на игроке во время игры.

---

### 2.7. Обновление установленных модов одной кнопкой

**Где в UI:**
- Карточка версии в `InstancesScreen.tsx` или вкладка «Моды».

**Что уже есть в бэкенде:**
- В `src-tauri/src/download.rs` уже есть функция `update_all_mods(instance_id: String) -> Result<usize, String>`, которая опрашивает Modrinth API для каждого установленного файла и скачивает свежие версии.
**Что нужно добавить в интерфейс:**
- Кнопка «Проверить обновления модов» в карточке версии с вызовом `ipc.updateAllMods(inst.id)`.

---

## 3. Сводная таблица задач для бэкенд-разработчика

| Задача | Файл в `src-tauri/` | Сложность | Приоритет |
|---|---|---|---|
| **1. Диалоги выбора файлов и папок** | `src-tauri/src/lib.rs` | Низкая (15 мин) | **Высокий** |
| **2. Поддержка кастомных JVM аргументов в запуске** | `src-tauri/src/launch.rs` | Низкая (20 мин) | **Высокий** |
| **3. Поиск и загрузка модов CurseForge** | `src-tauri/src/download.rs` | Средняя (1-2 ч) | **Средний** |
| **4. Запуск Minecraft Rust Beta runtime** | `src-tauri/src/launch.rs` | Средняя (2-3 ч) | **Средний** |
| **5. UPnP / P2P туннелирование для лобби друзей** | `src-tauri/src/network.rs` | Высокая (3-4 ч) | **Средний** |
| **6. Мод инъекции косметики/питомцев в игру** | `src-tauri/src/installer.rs` | Высокая (моддинг) | **Будущий этап** |

---

*Документ актуален для версии Omega Launcher Remaster v1.0.0 и полностью синхронизирован со структурой фронтенда.*
