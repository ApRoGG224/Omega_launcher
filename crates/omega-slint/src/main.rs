mod character_3d;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use image::RgbaImage;
use slint::{ComponentHandle, Model, ModelRc, VecModel};
use tokio::sync::Mutex;

slint::include_modules!();

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ui = MainWindow::new()?;
    let ui_weak = ui.as_weak();

    let data_dir = omega_core::util::app_data_dir();
    let _ = std::fs::create_dir_all(&data_dir);
    println!("Omega Launcher Native Slint starting, data_dir: {}", data_dir.display());

    // 1. Detect System Java
    let detected_java = omega_core::java::find_system_java(21)
        .or_else(|| omega_core::java::find_system_java(17))
        .or_else(|| omega_core::java::find_system_java(8))
        .unwrap_or_else(|| "/usr/bin/java".to_string());
    ui.set_java_path(format!("{detected_java} (Авто-определение)").into());

    // 2. Initialize 3D Character Renderer (Steve / Alex / ApRoGG 6-cuboid model with breathing animation)
    let default_skin_bytes = include_bytes!("../assets/skins/aprogg.png");
    let default_skin: RgbaImage = image::load_from_memory(default_skin_bytes)
        .map(|img| img.to_rgba8())
        .unwrap_or_else(|_| RgbaImage::new(64, 64));

    let character_model = Arc::new(std::sync::RwLock::new(character_3d::Character3D::new(default_skin, false)));

    // Start 3D Character Animation Frame Loop (40 FPS)
    let char_ui = ui_weak.clone();
    let char_ref = character_model.clone();
    let start_time = Instant::now();

    let render_timer = slint::Timer::default();
    render_timer.start(
        slint::TimerMode::Repeated,
        std::time::Duration::from_millis(25), // 40 FPS
        move || {
            let Some(ui) = char_ui.upgrade() else { return };
            if ui.get_active_screen() != "home" {
                return;
            }

            let elapsed = start_time.elapsed().as_secs_f32();
            let char_guard = char_ref.read().unwrap();
            let (w, h) = (320u32, 440u32);
            let raw_pixels = char_guard.render(w, h, elapsed);

            let mut pixel_buffer = slint::SharedPixelBuffer::<slint::Rgba8Pixel>::new(w, h);
            pixel_buffer.make_mut_bytes().copy_from_slice(&raw_pixels);
            let image = slint::Image::from_rgba8(pixel_buffer);
            ui.set_character_preview(image);
        },
    );

    // 3. Initialize SQLite Database & Load Data
    let db_conn = omega_core::db::init_db(&data_dir).ok();

    if let Some(ref conn) = db_conn {
        // Load Instances
        if let Ok(mut db_instances) = omega_core::db::load_instances(conn) {
            if db_instances.is_empty() {
                // Create Default Instances
                let default_inst = omega_core::db::DbInstance {
                    id: "inst_1".to_string(),
                    name: "test1".to_string(),
                    mc_version: "1.21.4".to_string(),
                    loader: "Fabric".to_string(),
                    x: 0.0,
                    y: 0.0,
                    icon: Some("diamond_sword".to_string()),
                    group_name: None,
                    play_time_ms: Some(0),
                    last_played_at: None,
                };
                let _ = omega_core::db::create_instance(conn, &default_inst);
                db_instances.push(default_inst);
            }

            let slint_models: Vec<InstanceItem> = db_instances
                .iter()
                .map(|inst| InstanceItem {
                    id: inst.id.clone().into(),
                    name: inst.name.clone().into(),
                    mc_version: inst.mc_version.clone().into(),
                    loader: inst.loader.clone().into(),
                    play_time: format!("{} мин", (inst.play_time_ms.unwrap_or(0) / 60000)).into(),
                    icon_name: inst.icon.clone().unwrap_or_else(|| "diamond_sword".to_string()).into(),
                })
                .collect();

            let active_idx = db_instances
                .iter()
                .position(|i| i.name == "Моя версія 1.21" || i.id == "inst_1794938714051")
                .unwrap_or(0);
            let active = &db_instances[active_idx];
            ui.set_active_instance_id(active.id.clone().into());
            ui.set_active_instance_name(active.name.clone().into());
            ui.set_active_version(active.mc_version.clone().into());
            ui.set_active_loader(active.loader.clone().into());
            ui.set_active_playtime(format!("{} мин", (active.play_time_ms.unwrap_or(0) / 60000)).into());
            ui.set_instances(ModelRc::new(VecModel::from(slint_models)));
        }

        // Load Accounts
        if let Ok(mut db_accounts) = omega_core::db::load_accounts(conn) {
            if db_accounts.is_empty() {
                let default_acc = omega_core::db::DbAccount {
                    name: "ApRoGG".to_string(),
                    account_type: "microsoft".to_string(),
                };
                let _ = omega_core::db::add_account(conn, &default_acc);
                db_accounts.push(default_acc);
            }

            let active_acc_idx = db_accounts
                .iter()
                .position(|a| a.name == "ApRoGG")
                .unwrap_or(0);
            let active_acc = &db_accounts[active_acc_idx];
            ui.set_player_name(active_acc.name.clone().into());
            ui.set_account_type(active_acc.account_type.clone().into());

            let acc_items: Vec<AccountItem> = db_accounts
                .iter()
                .enumerate()
                .map(|(idx, acc)| AccountItem {
                    name: acc.name.clone().into(),
                    account_type: acc.account_type.clone().into(),
                    is_active: idx == active_acc_idx,
                })
                .collect();
            ui.set_accounts(ModelRc::new(VecModel::from(acc_items)));
        }

        // Load Servers
        if let Ok(mut db_servers) = omega_core::db::load_servers(conn) {
            if db_servers.is_empty() {
                let defaults = vec![
                    omega_core::db::DbServer { host: "play.omegamc.net".to_string(), port: 25565, name: "Omega Network Lobby".to_string(), favicon: None },
                    omega_core::db::DbServer { host: "mc.hypixel.net".to_string(), port: 25565, name: "Hypixel Network".to_string(), favicon: None },
                    omega_core::db::DbServer { host: "127.0.0.1".to_string(), port: 25565, name: "Локальный сервер".to_string(), favicon: None },
                ];
                for s in &defaults {
                    let _ = omega_core::db::add_server(conn, s);
                }
                db_servers = defaults;
            }

            let srv_items: Vec<ServerItem> = db_servers
                .iter()
                .map(|s| ServerItem {
                    name: s.name.clone().into(),
                    host: format!("{}:{}", s.host, s.port).into(),
                    ping: "Опрос...".into(),
                    players: "0/0".into(),
                })
                .collect();
            ui.set_servers(ModelRc::new(VecModel::from(srv_items)));

            // Spawn background task to ping servers
            let ping_ui = ui_weak.clone();
            tokio::spawn(async move {
                for s in db_servers {
                    let host = s.host.clone();
                    let port = s.port;
                    if let Ok(info) = omega_core::network::ping_server(host.clone(), Some(port)).await {
                        let ping_ui = ping_ui.clone();
                        let _ = slint::invoke_from_event_loop(move || {
                            if let Some(ui) = ping_ui.upgrade() {
                                let mut updated: Vec<ServerItem> = Vec::new();
                                for srv in ui.get_servers().iter() {
                                    if srv.host.to_string().starts_with(&host) {
                                        updated.push(ServerItem {
                                            name: srv.name,
                                            host: srv.host,
                                            ping: format!("{} ms", info.latency_ms).into(),
                                            players: format!("{}/{}", info.players_online, info.players_max).into(),
                                        });
                                    } else {
                                        updated.push(srv);
                                    }
                                }
                                ui.set_servers(ModelRc::new(VecModel::from(updated)));
                            }
                        });
                    }
                }
            });
        }
    }

    // Initial Modrinth Catalog Search in Background
    let cat_ui = ui_weak.clone();
    tokio::spawn(async move {
        if let Ok(hits) = omega_core::modrinth::search_modrinth("", "mod", Some("fabric"), 15, 0).await {
            let _ = slint::invoke_from_event_loop(move || {
                if let Some(ui) = cat_ui.upgrade() {
                    let items: Vec<ModItem> = hits
                        .iter()
                        .map(|h| ModItem {
                            id: h.id.clone().into(),
                            title: h.title.clone().into(),
                            author: h.author.clone().into(),
                            description: h.description.clone().into(),
                            downloads: format!("{:.1}M", (h.downloads as f64) / 1_000_000.0).into(),
                            loader: "Fabric".into(),
                        })
                        .collect();
                    ui.set_catalog_mods(ModelRc::new(VecModel::from(items)));
                }
            });
        }
    });

    // 4. Register UI Callbacks

    // Instance Selection callback
    let ui_handle = ui_weak.clone();
    ui.on_select_instance(move |id, name, version, loader, playtime| {
        if let Some(ui) = ui_handle.upgrade() {
            ui.set_active_instance_id(id);
            ui.set_active_instance_name(name);
            ui.set_active_version(version);
            ui.set_active_loader(loader);
            ui.set_active_playtime(playtime);
            ui.set_active_screen("home".into());
        }
    });

    // Create Instance callback
    let ui_handle = ui_weak.clone();
    let data_dir_clone = data_dir.clone();
    ui.on_create_instance(move || {
        let Some(ui) = ui_handle.upgrade() else { return };
        let new_id = format!("inst_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
        let new_name = format!("Сборка {}", &new_id[new_id.len() - 4..]);

        let inst = omega_core::db::DbInstance {
            id: new_id.clone(),
            name: new_name.clone(),
            mc_version: "1.21.4".to_string(),
            loader: "Fabric".to_string(),
            x: 0.0,
            y: 0.0,
            icon: Some("diamond_sword".to_string()),
            group_name: None,
            play_time_ms: Some(0),
            last_played_at: None,
        };

        if let Ok(conn) = omega_core::db::init_db(&data_dir_clone) {
            let _ = omega_core::db::create_instance(&conn, &inst);
            if let Ok(list) = omega_core::db::load_instances(&conn) {
                let slint_models: Vec<InstanceItem> = list
                    .iter()
                    .map(|i| InstanceItem {
                        id: i.id.clone().into(),
                        name: i.name.clone().into(),
                        mc_version: i.mc_version.clone().into(),
                        loader: i.loader.clone().into(),
                        play_time: format!("{} мин", (i.play_time_ms.unwrap_or(0) / 60000)).into(),
                        icon_name: i.icon.clone().unwrap_or_else(|| "diamond_sword".to_string()).into(),
                    })
                    .collect();
                ui.set_instances(ModelRc::new(VecModel::from(slint_models)));
            }
        }

        let old = ui.get_log_content().to_string();
        ui.set_log_content(format!("{old}\n[launcher/INFO] Created new instance '{new_name}' (1.21.4 Fabric)").into());
    });

    // Delete Instance callback
    let ui_handle = ui_weak.clone();
    let data_dir_clone = data_dir.clone();
    ui.on_delete_instance(move |inst_id| {
        let Some(ui) = ui_handle.upgrade() else { return };
        let id_str = inst_id.to_string();
        if let Ok(conn) = omega_core::db::init_db(&data_dir_clone) {
            let _ = omega_core::db::delete_instance(&conn, &id_str);
            if let Ok(list) = omega_core::db::load_instances(&conn) {
                let slint_models: Vec<InstanceItem> = list
                    .iter()
                    .map(|i| InstanceItem {
                        id: i.id.clone().into(),
                        name: i.name.clone().into(),
                        mc_version: i.mc_version.clone().into(),
                        loader: i.loader.clone().into(),
                        play_time: format!("{} мин", (i.play_time_ms.unwrap_or(0) / 60000)).into(),
                        icon_name: i.icon.clone().unwrap_or_else(|| "diamond_sword".to_string()).into(),
                    })
                    .collect();
                ui.set_instances(ModelRc::new(VecModel::from(slint_models)));
            }
        }
        let old = ui.get_log_content().to_string();
        ui.set_log_content(format!("{old}\n[launcher/INFO] Deleted instance '{id_str}'").into());
    });

    // Skin Switcher callback
    let char_ref = character_model.clone();
    ui.on_switch_skin(move |skin_name| {
        let name_str = skin_name.to_string();
        let (bytes, is_alex) = match name_str.as_str() {
            "alex" => (include_bytes!("../assets/skins/alex.png").as_slice(), true),
            "technoblade" => (include_bytes!("../assets/skins/technoblade.png").as_slice(), false),
            "dream" => (include_bytes!("../assets/skins/dream.png").as_slice(), false),
            _ => (include_bytes!("../assets/skins/steve.png").as_slice(), false),
        };

        if let Ok(img) = image::load_from_memory(bytes) {
            let mut guard = char_ref.write().unwrap();
            *guard = character_3d::Character3D::new(img.to_rgba8(), is_alex);
        }
    });

    // Add Offline Account callback
    let ui_handle = ui_weak.clone();
    let data_dir_clone = data_dir.clone();
    ui.on_add_offline(move |name| {
        let Some(ui) = ui_handle.upgrade() else { return };
        let name_str = name.trim().to_string();
        if name_str.is_empty() {
            return;
        }

        let acc = omega_core::db::DbAccount {
            name: name_str.clone(),
            account_type: "offline".to_string(),
        };

        if let Ok(conn) = omega_core::db::init_db(&data_dir_clone) {
            let _ = omega_core::db::add_account(&conn, &acc);
            if let Ok(accounts) = omega_core::db::load_accounts(&conn) {
                let acc_items: Vec<AccountItem> = accounts
                    .iter()
                    .map(|a| AccountItem {
                        name: a.name.clone().into(),
                        account_type: a.account_type.clone().into(),
                        is_active: a.name == name_str,
                    })
                    .collect();
                ui.set_accounts(ModelRc::new(VecModel::from(acc_items)));
            }
        }

        ui.set_player_name(name_str.clone().into());
        ui.set_account_type("offline".into());

        let old = ui.get_log_content().to_string();
        ui.set_log_content(format!("{old}\n[auth/INFO] Offline profile '{name_str}' activated.").into());
    });

    // Switch Account callback
    let ui_handle = ui_weak.clone();
    ui.on_switch_account(move |name| {
        let Some(ui) = ui_handle.upgrade() else { return };
        ui.set_player_name(name.clone());
        let old = ui.get_log_content().to_string();
        ui.set_log_content(format!("{old}\n[auth/INFO] Switched active profile to '{name}'").into());
    });

    // Delete Account callback
    let ui_handle = ui_weak.clone();
    let data_dir_clone = data_dir.clone();
    ui.on_delete_account(move |name| {
        let Some(ui) = ui_handle.upgrade() else { return };
        let name_str = name.to_string();
        if let Ok(conn) = omega_core::db::init_db(&data_dir_clone) {
            let _ = omega_core::db::delete_account(&conn, &name_str);
            if let Ok(accounts) = omega_core::db::load_accounts(&conn) {
                let acc_items: Vec<AccountItem> = accounts
                    .iter()
                    .map(|a| AccountItem {
                        name: a.name.clone().into(),
                        account_type: a.account_type.clone().into(),
                        is_active: a.name == ui.get_player_name().to_string(),
                    })
                    .collect();
                ui.set_accounts(ModelRc::new(VecModel::from(acc_items)));
            }
        }
    });

    // Modrinth Search Query callback
    let ui_handle = ui_weak.clone();
    ui.on_search_query(move |query| {
        let q_str = query.to_string();
        let ui_handle = ui_handle.clone();
        tokio::spawn(async move {
            if let Ok(hits) = omega_core::modrinth::search_modrinth(&q_str, "mod", Some("fabric"), 15, 0).await {
                let _ = slint::invoke_from_event_loop(move || {
                    if let Some(ui) = ui_handle.upgrade() {
                        let items: Vec<ModItem> = hits
                            .iter()
                            .map(|h| ModItem {
                                id: h.id.clone().into(),
                                title: h.title.clone().into(),
                                author: h.author.clone().into(),
                                description: h.description.clone().into(),
                                downloads: format!("{:.1}M", (h.downloads as f64) / 1_000_000.0).into(),
                                loader: "Fabric".into(),
                            })
                            .collect();
                        ui.set_catalog_mods(ModelRc::new(VecModel::from(items)));
                    }
                });
            }
        });
    });

    // Modrinth Switch Category callback
    let ui_handle = ui_weak.clone();
    ui.on_switch_category(move |category| {
        let cat_str = match category.to_string().as_str() {
            "shaders" => "shader",
            "modpacks" => "modpack",
            _ => "mod",
        };
        let ui_handle = ui_handle.clone();
        tokio::spawn(async move {
            if let Ok(hits) = omega_core::modrinth::search_modrinth("", cat_str, None, 15, 0).await {
                let _ = slint::invoke_from_event_loop(move || {
                    if let Some(ui) = ui_handle.upgrade() {
                        let items: Vec<ModItem> = hits
                            .iter()
                            .map(|h| ModItem {
                                id: h.id.clone().into(),
                                title: h.title.clone().into(),
                                author: h.author.clone().into(),
                                description: h.description.clone().into(),
                                downloads: format!("{:.1}M", (h.downloads as f64) / 1_000_000.0).into(),
                                loader: "Any".into(),
                            })
                            .collect();
                        ui.set_catalog_mods(ModelRc::new(VecModel::from(items)));
                    }
                });
            }
        });
    });

    // Direct Connect to Multiplayer Server callback
    let ui_handle = ui_weak.clone();
    ui.on_direct_connect(move |host| {
        let Some(ui) = ui_handle.upgrade() else { return };
        let host_str = host.to_string();
        let old = ui.get_log_content().to_string();
        ui.set_log_content(format!("{old}\n[launcher/INFO] Direct connect requested to {host_str}...").into());
        // Triggers game launch with quickPlayMultiplayer
        ui.invoke_play_clicked();
    });

    // RAM change callback
    let ui_handle = ui_weak.clone();
    ui.on_change_ram(move |ram| {
        if let Some(ui) = ui_handle.upgrade() {
            ui.set_ram_mb(ram);
            let old = ui.get_log_content().to_string();
            ui.set_log_content(format!("{old}\n[settings/INFO] RAM memory limit set to {ram} MB").into());
        }
    });

    // GC change callback
    let ui_handle = ui_weak.clone();
    ui.on_change_gc(move |gc| {
        if let Some(ui) = ui_handle.upgrade() {
            ui.set_gc_type(gc.clone());
            let old = ui.get_log_content().to_string();
            ui.set_log_content(format!("{old}\n[settings/INFO] Selected Garbage Collector: {gc}").into());
        }
    });

    // Clear logs callback
    let ui_handle = ui_weak.clone();
    ui.on_clear_logs(move || {
        if let Some(ui) = ui_handle.upgrade() {
            ui.set_log_content("".into());
        }
    });

    // Modrinth Install callback
    let ui_handle = ui_weak.clone();
    let data_dir_clone = data_dir.clone();
    ui.on_install_mod(move |mod_id| {
        let Some(ui) = ui_handle.upgrade() else { return };
        let mod_id_str = mod_id.to_string();
        let inst_id = ui.get_active_instance_id().to_string();
        let mc_ver = ui.get_active_version().to_string();
        let loader = ui.get_active_loader().to_string();

        let old = ui.get_log_content().to_string();
        ui.set_log_content(format!("{old}\n[modrinth/INFO] Starting download for mod '{mod_id_str}'...").into());

        let ui_handle = ui_handle.clone();
        let data_dir = data_dir_clone.clone();

        tokio::spawn(async move {
            let dest_dir = data_dir.join("instances").join(&inst_id).join("minecraft").join("mods");
            let _ = std::fs::create_dir_all(&dest_dir);

            let log_ui = ui_handle.clone();
            let res = omega_core::modrinth::download_modrinth_version(
                &mod_id_str,
                &mc_ver,
                &loader,
                &dest_dir,
                Some(&move |msg: &str| {
                    let msg_str = msg.to_string();
                    let log_ui = log_ui.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n{msg_str}").into());
                        }
                    });
                }),
            )
            .await;

            let log_ui = ui_handle.clone();
            let _ = slint::invoke_from_event_loop(move || {
                if let Some(ui) = log_ui.upgrade() {
                    let old = ui.get_log_content().to_string();
                    match res {
                        Ok(filename) => {
                            ui.set_log_content(format!("{old}\n[modrinth/INFO] Successfully installed '{filename}'!").into());
                        }
                        Err(e) => {
                            ui.set_log_content(format!("{old}\n[modrinth/WARN] Installation failed: {e}").into());
                        }
                    }
                }
            });
        });
    });

    // Microsoft OAuth Device Code Flow callback
    let ui_handle = ui_weak.clone();
    let data_dir_clone = data_dir.clone();
    ui.on_login_microsoft(move || {
        let Some(ui) = ui_handle.upgrade() else { return };
        let old = ui.get_log_content().to_string();
        ui.set_log_content(format!("{old}\n[auth/INFO] Initiating Microsoft OAuth Device Flow...").into());

        let ui_handle = ui_handle.clone();
        let data_dir = data_dir_clone.clone();
        tokio::spawn(async move {
            match omega_core::auth::initiate_device_code().await {
                Ok(resp) => {
                    let log_msg = format!(
                        "[auth/INFO] Откройте {} в браузере и введите код: {}",
                        resp.verification_uri, resp.user_code
                    );
                    let log_ui = ui_handle.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n{log_msg}").into());
                        }
                    });

                    // Poll in background
                    let device_code = resp.device_code;
                    let interval = std::time::Duration::from_secs(resp.interval.max(3));
                    let timeout = std::time::Instant::now() + std::time::Duration::from_secs(resp.expires_in);

                    while std::time::Instant::now() < timeout {
                        tokio::time::sleep(interval).await;
                        match omega_core::auth::poll_device_code(&device_code).await {
                            Ok(Some((_access_token, _))) => {
                                let log_ui = ui_handle.clone();
                                let data_dir = data_dir.clone();
                                let _ = slint::invoke_from_event_loop(move || {
                                    if let Some(ui) = log_ui.upgrade() {
                                        let old = ui.get_log_content().to_string();
                                        ui.set_log_content(format!("{old}\n[auth/INFO] Успешная авторизация Microsoft!").into());
                                        ui.set_player_name("MicrosoftPlayer".into());
                                        ui.set_account_type("microsoft".into());

                                        if let Ok(conn) = omega_core::db::init_db(&data_dir) {
                                            let acc = omega_core::db::DbAccount {
                                                name: "MicrosoftPlayer".to_string(),
                                                account_type: "microsoft".to_string(),
                                            };
                                            let _ = omega_core::db::add_account(&conn, &acc);
                                        }
                                    }
                                });
                                break;
                            }
                            Ok(None) => {} // still pending
                            Err(e) => {
                                let log_ui = ui_handle.clone();
                                let _ = slint::invoke_from_event_loop(move || {
                                    if let Some(ui) = log_ui.upgrade() {
                                        let old = ui.get_log_content().to_string();
                                        ui.set_log_content(format!("{old}\n[auth/ERROR] {e}").into());
                                    }
                                });
                                break;
                            }
                        }
                    }
                }
                Err(e) => {
                    let log_ui = ui_handle.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n[auth/ERROR] Failed to initiate login: {e}").into());
                        }
                    });
                }
            }
        });
    });

    // Play / Stop Button callback & Game Launch Execution
    let active_child = Arc::new(Mutex::new(None::<std::process::Child>));
    let is_running_flag = Arc::new(AtomicBool::new(false));

    let ui_handle = ui_weak.clone();
    let child_lock = active_child.clone();
    let running_flag = is_running_flag.clone();
    let data_dir_clone = data_dir.clone();

    ui.on_play_clicked(move || {
        let Some(ui) = ui_handle.upgrade() else { return };
        let is_running = running_flag.load(Ordering::SeqCst);

        if is_running {
            // Stop / Kill the game
            println!("[launcher/INFO] Stop requested, terminating Minecraft process...");
            let child_lock = child_lock.clone();
            let ui_handle = ui_handle.clone();
            let running_flag = running_flag.clone();
            tokio::spawn(async move {
                let mut guard = child_lock.lock().await;
                if let Some(mut child) = guard.take() {
                    let _ = child.kill();
                    let _ = child.wait();
                }
                running_flag.store(false, Ordering::SeqCst);
                let _ = slint::invoke_from_event_loop(move || {
                    if let Some(ui) = ui_handle.upgrade() {
                        ui.set_is_game_running(false);
                    }
                });
            });
            return;
        }

        // Launch Game
        let inst_name = ui.get_active_instance_name().to_string();
        let inst_id = ui.get_active_instance_id().to_string();
        let mc_ver = ui.get_active_version().to_string();
        let user = ui.get_player_name().to_string();
        let ram = ui.get_ram_mb() as u32;
        let gc = ui.get_gc_type().to_string();

        ui.set_is_game_running(true);

        let current_log = ui.get_log_content().to_string();
        let new_log = format!("{current_log}\n[launcher/INFO] Starting {inst_name} ({mc_ver}) for user {user} with {ram} MB RAM (GC: {gc})...");
        ui.set_log_content(new_log.into());

        running_flag.store(true, Ordering::SeqCst);

        let ui_handle = ui_handle.clone();
        let child_lock = child_lock.clone();
        let running_flag = running_flag.clone();
        let data_dir = data_dir_clone.clone();

        tokio::spawn(async move {
            let opts = omega_core::launch::LaunchOptions {
                version: mc_ver.clone(),
                instance_id: inst_id.clone(),
                username: user.clone(),
                ram_mb: ram,
                custom_jvm_args: Some(format!("-XX:+Use{gc}")),
            };

            let log_ui = ui_handle.clone();
            let result = omega_core::launch::launch_game(
                &data_dir,
                opts,
                Some(&move |msg: &str| {
                    let msg_str = msg.to_string();
                    let log_ui = log_ui.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n{msg_str}").into());
                        }
                    });
                }),
            )
            .await;

            match result {
                Ok(mut active_game) => {
                    let pid = active_game.pid;
                    let log_ui = ui_handle.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n[launcher/INFO] Minecraft process running (PID: {pid})").into());
                        }
                    });

                    // Store child process handle
                    let stdout = active_game.child.stdout.take();
                    let stderr = active_game.child.stderr.take();

                    {
                        let mut guard = child_lock.lock().await;
                        *guard = Some(active_game.child);
                    }

                    // Stream stdout in background
                    if let Some(stdout) = stdout {
                        let log_ui = ui_handle.clone();
                        tokio::task::spawn_blocking(move || {
                            use std::io::BufRead;
                            let reader = std::io::BufReader::new(stdout);
                            for line in reader.lines().flatten() {
                                let line_str = line;
                                let log_ui = log_ui.clone();
                                let _ = slint::invoke_from_event_loop(move || {
                                    if let Some(ui) = log_ui.upgrade() {
                                        let old = ui.get_log_content().to_string();
                                        ui.set_log_content(format!("{old}\n{line_str}").into());
                                    }
                                });
                            }
                        });
                    }

                    // Stream stderr in background
                    if let Some(stderr) = stderr {
                        let log_ui = ui_handle.clone();
                        tokio::task::spawn_blocking(move || {
                            use std::io::BufRead;
                            let reader = std::io::BufReader::new(stderr);
                            for line in reader.lines().flatten() {
                                let line_str = line;
                                let log_ui = log_ui.clone();
                                let _ = slint::invoke_from_event_loop(move || {
                                    if let Some(ui) = log_ui.upgrade() {
                                        let old = ui.get_log_content().to_string();
                                        ui.set_log_content(format!("{old}\n{line_str}").into());
                                    }
                                });
                            }
                        });
                    }

                    // Monitor game process until exit
                    let child_lock = child_lock.clone();
                    tokio::task::spawn_blocking(move || {
                        loop {
                            std::thread::sleep(std::time::Duration::from_millis(500));
                            let mut guard = child_lock.blocking_lock();
                            if let Some(ref mut child) = *guard {
                                match child.try_wait() {
                                    Ok(Some(status)) => {
                                        println!("[launcher/INFO] Game process exited with status: {:?}", status);
                                        *guard = None;
                                        break;
                                    }
                                    Ok(None) => {}
                                    Err(_) => {
                                        *guard = None;
                                        break;
                                    }
                                }
                            } else {
                                break;
                            }
                        }
                    })
                    .await
                    .ok();

                    running_flag.store(false, Ordering::SeqCst);
                    let log_ui = ui_handle.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            ui.set_is_game_running(false);
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n[launcher/INFO] Minecraft process terminated.").into());
                        }
                    });
                }
                Err(err) => {
                    running_flag.store(false, Ordering::SeqCst);
                    let err_msg = format!("[launcher/ERROR] Launch failed: {err}");
                    let log_ui = ui_handle.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            ui.set_is_game_running(false);
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n{err_msg}").into());
                        }
                    });
                }
            }
        });
    });

    ui.on_open_github(move || {
        let _ = std::process::Command::new("xdg-open")
            .arg("https://github.com/ApRoGG224/Omega_launcher")
            .spawn();
    });

    ui.run()?;
    Ok(())
}
