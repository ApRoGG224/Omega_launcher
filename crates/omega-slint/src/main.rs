mod character_3d;

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex as StdMutex, RwLock};
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

    // Start 3D Character Animation Frame Loop (33 FPS, off-main-thread async rendering)
    let char_ui = ui_weak.clone();
    let char_ref = character_model.clone();
    let start_time = Instant::now();

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_millis(30));
        loop {
            interval.tick().await;
            let is_home = match char_ui.upgrade() {
                Some(ui) => ui.get_active_screen() == "home",
                None => break,
            };
            if !is_home {
                continue;
            }

            let elapsed = start_time.elapsed().as_secs_f32();
            let char_ref_clone = char_ref.clone();
            let (w, h) = (320u32, 440u32);

            let raw_pixels = tokio::task::spawn_blocking(move || {
                let char_guard = char_ref_clone.read().unwrap();
                char_guard.render(w, h, elapsed)
            })
            .await
            .unwrap_or_default();

            if raw_pixels.is_empty() {
                continue;
            }

            let char_ui_clone = char_ui.clone();
            let _ = slint::invoke_from_event_loop(move || {
                if let Some(ui) = char_ui_clone.upgrade() {
                    let mut pixel_buffer = slint::SharedPixelBuffer::<slint::Rgba8Pixel>::new(w, h);
                    pixel_buffer.make_mut_bytes().copy_from_slice(&raw_pixels);
                    let image = slint::Image::from_rgba8(pixel_buffer);
                    ui.set_character_preview(image);
                }
            });
        }
    });

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
                    motd: "".into(),
                })
                .collect();
            ui.set_servers(ModelRc::new(VecModel::from(srv_items)));
        }
    }

    // Helper: Async Server Ping Monitor
    let ping_all_servers = {
        let ui_weak = ui_weak.clone();
        let data_dir = data_dir.clone();
        Arc::new(move || {
            let ui_weak = ui_weak.clone();
            let data_dir = data_dir.clone();
            tokio::spawn(async move {
                let servers = if let Ok(conn) = omega_core::db::init_db(&data_dir) {
                    omega_core::db::load_servers(&conn).unwrap_or_default()
                } else {
                    Vec::new()
                };
                for s in servers {
                    let host = s.host.clone();
                    let port = s.port;
                    let ping_res = omega_core::network::ping_server(host.clone(), Some(port)).await;
                    let ping_ui = ui_weak.clone();

                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = ping_ui.upgrade() {
                            let mut updated: Vec<ServerItem> = Vec::new();
                            for srv in ui.get_servers().iter() {
                                let srv_host = srv.host.to_string();
                                let target_prefix = format!("{}:{}", host, port);
                                if srv_host == target_prefix || srv_host.starts_with(&host) {
                                    match &ping_res {
                                        Ok(info) if info.online => {
                                            let parsed_motd = omega_core::network::parse_minecraft_motd(&info.motd);
                                            updated.push(ServerItem {
                                                name: if info.name.is_empty() { srv.name } else { info.name.clone().into() },
                                                host: srv.host,
                                                ping: format!("{} ms", info.latency_ms).into(),
                                                players: format!("{}/{}", info.players_online, info.players_max).into(),
                                                motd: parsed_motd.into(),
                                            });
                                        }
                                        _ => {
                                            updated.push(ServerItem {
                                                name: srv.name,
                                                host: srv.host,
                                                ping: "Оффлайн".into(),
                                                players: "-/-".into(),
                                                motd: "Сервер недоступен".into(),
                                            });
                                        }
                                    }
                                } else {
                                    updated.push(srv);
                                }
                            }
                            ui.set_servers(ModelRc::new(VecModel::from(updated)));
                        }
                    });
                }
            });
        })
    };

    // Initial Server Ping on Startup
    ping_all_servers();

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

    // Create Instance callback (from dialog with version manifest & loader & RAM)
    let ui_handle = ui_weak.clone();
    let data_dir_clone = data_dir.clone();
    ui.on_submit_create_instance(move |name, version, loader, ram| {
        let Some(ui) = ui_handle.upgrade() else { return };
        let name_str = name.trim().to_string();
        let ver_str = version.trim().to_string();
        let ldr_str = loader.trim().to_string();
        let ram_val = ram as i32;

        let new_id = format!("inst_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());
        let inst_name = if name_str.is_empty() { format!("Сборка {}", &new_id[new_id.len().saturating_sub(4)..]) } else { name_str };

        let inst = omega_core::db::DbInstance {
            id: new_id.clone(),
            name: inst_name.clone(),
            mc_version: ver_str.clone(),
            loader: ldr_str.clone(),
            x: 0.0,
            y: 0.0,
            icon: Some("diamond_sword".to_string()),
            group_name: None,
            play_time_ms: Some(0),
            last_played_at: None,
        };

        let inst_mods_dir = data_dir_clone.join("instances").join(&new_id).join("minecraft").join("mods");
        let _ = std::fs::create_dir_all(&inst_mods_dir);

        if let Ok(conn) = omega_core::db::init_db(&data_dir_clone) {
            let _ = omega_core::db::save_instance(&conn, &inst);
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

        ui.set_active_instance_id(new_id.clone().into());
        ui.set_active_instance_name(inst_name.clone().into());
        ui.set_active_version(ver_str.clone().into());
        ui.set_active_loader(ldr_str.clone().into());
        ui.set_active_playtime("0 мин".into());
        ui.set_ram_mb(ram_val);

        let old = ui.get_log_content().to_string();
        ui.set_log_content(format!("{old}\n[launcher/INFO] Сборка '{inst_name}' ({ver_str} {ldr_str}, {ram_val} МБ) успешно сохранена в SQLite!").into());
    });

    ui.on_create_instance(move || {});

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

    // Modrinth State & Search Debounce
    let search_debounce_seq = Arc::new(AtomicU64::new(0));
    let active_category = Arc::new(RwLock::new("mods".to_string()));
    let pending_direct_connect = Arc::new(StdMutex::new(None::<String>));

    // Modrinth Search Query callback with 300ms Debounce
    let ui_handle = ui_weak.clone();
    let seq_token = search_debounce_seq.clone();
    let cat_ref = active_category.clone();
    ui.on_search_query(move |query| {
        let q_str = query.to_string();
        let seq = seq_token.fetch_add(1, Ordering::SeqCst) + 1;
        let seq_check = seq_token.clone();
        let ui_handle = ui_handle.clone();
        let cat_ref = cat_ref.clone();

        tokio::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            if seq_check.load(Ordering::SeqCst) != seq {
                return;
            }

            let cat_str = cat_ref.read().unwrap().clone();
            let project_type = match cat_str.as_str() {
                "shaders" => "shader",
                "textures" => "resourcepack",
                "modpacks" => "modpack",
                _ => "mod",
            };
            let loader = if project_type == "mod" { Some("fabric") } else { None };

            if let Ok(hits) = omega_core::modrinth::search_mods(&q_str, project_type, loader, 20, 0).await {
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
                                loader: if project_type == "mod" { "Fabric".into() } else { "Any".into() },
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
    let cat_ref = active_category.clone();
    ui.on_switch_category(move |category| {
        let cat_str = category.to_string();
        *cat_ref.write().unwrap() = cat_str.clone();

        let project_type = match cat_str.as_str() {
            "shaders" => "shader",
            "textures" => "resourcepack",
            "modpacks" => "modpack",
            _ => "mod",
        };
        let loader = if project_type == "mod" { Some("fabric") } else { None };
        let ui_handle = ui_handle.clone();

        tokio::spawn(async move {
            if let Ok(hits) = omega_core::modrinth::search_mods("", project_type, loader, 20, 0).await {
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
                                loader: if project_type == "mod" { "Fabric".into() } else { "Any".into() },
                            })
                            .collect();
                        ui.set_catalog_mods(ModelRc::new(VecModel::from(items)));
                    }
                });
            }
        });
    });

    // Direct Connect to Multiplayer Server callback (Synchronous mutex write prevents race conditions)
    let pending_conn_ref = pending_direct_connect.clone();
    let ui_handle = ui_weak.clone();
    ui.on_direct_connect(move |host| {
        let Some(ui) = ui_handle.upgrade() else { return };
        let host_str = host.to_string();
        let old = ui.get_log_content().to_string();
        ui.set_log_content(format!("{old}\n[launcher/INFO] Прямое подключение к серверу {host_str}...").into());
        *pending_conn_ref.lock().unwrap() = Some(host_str);
        // Triggers game launch with quickPlayMultiplayer
        ui.invoke_play_clicked();
    });

    // Refresh Servers Ping callback
    let ping_fn = ping_all_servers.clone();
    ui.on_refresh_servers(move || {
        ping_fn();
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
                            // Record installed mod in SQLite
                            if let Ok(conn) = omega_core::db::init_db(&data_dir) {
                                let rec = omega_core::db::DbModRecord {
                                    instance_id: inst_id.clone(),
                                    mod_id: mod_id_str.clone(),
                                    version: Some(mc_ver.clone()),
                                    filename: filename.clone(),
                                };
                                let _ = omega_core::db::record_installed_mod(&conn, &rec);
                            }
                            ui.set_log_content(format!("{old}\n[modrinth/INFO] Мод '{filename}' успешно установлен в сборку {inst_id}!").into());
                        }
                        Err(e) => {
                            ui.set_log_content(format!("{old}\n[modrinth/WARN] Ошибка установки мода: {e}").into());
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
                            Ok(Some((ms_token, refresh_token))) => {
                                match omega_core::auth::complete_minecraft_auth(&ms_token).await {
                                    Ok(mc_prof) => {
                                        let log_ui = ui_handle.clone();
                                        let data_dir = data_dir.clone();
                                        let player_name = mc_prof.name.clone();
                                        let player_uuid = mc_prof.uuid.clone();
                                        let player_token = mc_prof.access_token.clone();

                                        let auth_json = serde_json::json!({
                                            "name": player_name,
                                            "uuid": player_uuid,
                                            "access_token": player_token,
                                            "refresh_token": refresh_token,
                                        });
                                        let _ = omega_core::auth::write_cached_auth(&data_dir, &auth_json);

                                        let _ = slint::invoke_from_event_loop(move || {
                                            if let Some(ui) = log_ui.upgrade() {
                                                let old = ui.get_log_content().to_string();
                                                ui.set_log_content(format!("{old}\n[auth/INFO] Успешная авторизация Microsoft: {player_name}").into());
                                                ui.set_player_name(player_name.clone().into());
                                                ui.set_account_type("microsoft".into());

                                                if let Ok(conn) = omega_core::db::init_db(&data_dir) {
                                                    let acc = omega_core::db::DbAccount {
                                                        name: player_name.clone(),
                                                        account_type: "microsoft".to_string(),
                                                    };
                                                    let _ = omega_core::db::add_account(&conn, &acc);
                                                }
                                            }
                                        });
                                    }
                                    Err(err) => {
                                        let log_ui = ui_handle.clone();
                                        let _ = slint::invoke_from_event_loop(move || {
                                            if let Some(ui) = log_ui.upgrade() {
                                                let old = ui.get_log_content().to_string();
                                                ui.set_log_content(format!("{old}\n[auth/ERROR] Minecraft login failed: {err}").into());
                                            }
                                        });
                                    }
                                }
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

    // Play / Stop / Launching Button callback & Game Launch Execution
    let active_child = Arc::new(Mutex::new(None::<std::process::Child>));
    let is_running_flag = Arc::new(AtomicBool::new(false));
    let is_launching_flag = Arc::new(AtomicBool::new(false));
    let cancel_launch_token = Arc::new(AtomicBool::new(false));

    let ui_handle = ui_weak.clone();
    let child_lock = active_child.clone();
    let running_flag = is_running_flag.clone();
    let launching_flag = is_launching_flag.clone();
    let cancel_token = cancel_launch_token.clone();
    let data_dir_clone = data_dir.clone();
    let pending_conn_play = pending_direct_connect.clone();

    ui.on_play_clicked(move || {
        let Some(ui) = ui_handle.upgrade() else { return };
        let is_running = running_flag.load(Ordering::SeqCst);
        let is_launching = launching_flag.load(Ordering::SeqCst);

        if is_running {
            // Stop / Kill the game process
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
                        ui.set_launch_state("idle".into());
                        ui.set_is_game_running(false);
                        let old = ui.get_log_content().to_string();
                        ui.set_log_content(format!("{old}\n[launcher/INFO] Процесс Minecraft остановлен пользователем.").into());
                    }
                });
            });
            return;
        }

        if is_launching {
            // Cancel launch pipeline if requested during preparation/download
            println!("[launcher/INFO] Launch cancellation requested...");
            cancel_token.store(true, Ordering::SeqCst);
            launching_flag.store(false, Ordering::SeqCst);
            ui.set_launch_state("idle".into());
            ui.set_is_game_running(false);
            let old = ui.get_log_content().to_string();
            ui.set_log_content(format!("{old}\n[launcher/INFO] Запуск игры отменён пользователем.").into());
            return;
        }

        // 1. Prepare Launch Parameters
        let inst_name = ui.get_active_instance_name().to_string();
        let inst_id = ui.get_active_instance_id().to_string();
        let mc_ver = ui.get_active_version().to_string();
        let loader = ui.get_active_loader().to_string();
        let user = ui.get_player_name().to_string();
        let ram = ui.get_ram_mb() as u32;
        let gc = ui.get_gc_type().to_string();

        // Switch button state: ИГРАТЬ -> ЗАПУСК...
        ui.set_launch_state("launching".into());
        ui.set_is_game_running(false);

        // Check required Java runtime
        let req_java = omega_core::java::required_java_version(&mc_ver);
        let sys_java_opt = omega_core::java::find_system_java(req_java);

        let current_log = ui.get_log_content().to_string();
        let java_log = match &sys_java_opt {
            Some(path) => format!("[launcher/INFO] Java Runtime (v{req_java}+) обнаружена: {path}"),
            None => format!("[launcher/WARN] Системная Java {req_java}+ не найдена. Проверяем авто-загрузку Mojang JRE..."),
        };
        let new_log = format!("{current_log}\n[launcher/INFO] Запуск сборки {inst_name} ({mc_ver} {loader}) для игрока {user} [RAM: {ram} MB, GC: {gc}]...\n{java_log}");
        ui.set_log_content(new_log.into());

        launching_flag.store(true, Ordering::SeqCst);
        cancel_token.store(false, Ordering::SeqCst);

        let ui_handle = ui_handle.clone();
        let child_lock = child_lock.clone();
        let running_flag = running_flag.clone();
        let launching_flag = launching_flag.clone();
        let cancel_token = cancel_token.clone();
        let data_dir = data_dir_clone.clone();
        let pending_conn = pending_conn_play.clone();

        tokio::spawn(async move {
            let client = reqwest::Client::new();
            let vanilla_ver = mc_ver.split('-').next().unwrap_or(&mc_ver).to_string();
            let loader_lower = loader.to_lowercase();

            // 2. Download missing vanilla files and libraries via installer
            let log_ui_inst = ui_handle.clone();
            let res_vanilla = omega_core::installer::ensure_vanilla(
                &client,
                &vanilla_ver,
                &data_dir,
                Some(&move |msg: &str| {
                    let msg_str = msg.to_string();
                    let log_ui = log_ui_inst.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n{msg_str}").into());
                        }
                    });
                }),
            )
            .await;

            if let Err(e) = res_vanilla {
                launching_flag.store(false, Ordering::SeqCst);
                let log_ui = ui_handle.clone();
                let _ = slint::invoke_from_event_loop(move || {
                    if let Some(ui) = log_ui.upgrade() {
                        ui.set_launch_state("idle".into());
                        ui.set_is_game_running(false);
                        let old = ui.get_log_content().to_string();
                        ui.set_log_content(format!("{old}\n[installer/ERROR] Ошибка подготовки Vanilla файлов: {e}").into());
                    }
                });
                return;
            }

            // 3. If Fabric, ensure Fabric loader profile
            if loader_lower == "fabric" {
                let log_ui_fab = ui_handle.clone();
                let res_fab = omega_core::installer::install_fabric(
                    &client,
                    &vanilla_ver,
                    &data_dir,
                    Some(&move |msg: &str| {
                        let msg_str = msg.to_string();
                        let log_ui = log_ui_fab.clone();
                        let _ = slint::invoke_from_event_loop(move || {
                            if let Some(ui) = log_ui.upgrade() {
                                let old = ui.get_log_content().to_string();
                                ui.set_log_content(format!("{old}\n{msg_str}").into());
                            }
                        });
                    }),
                )
                .await;

                if let Err(e) = res_fab {
                    launching_flag.store(false, Ordering::SeqCst);
                    let log_ui = ui_handle.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            ui.set_launch_state("idle".into());
                            ui.set_is_game_running(false);
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n[installer/ERROR] Ошибка установки Fabric: {e}").into());
                        }
                    });
                    return;
                }
            }

            if cancel_token.load(Ordering::SeqCst) {
                launching_flag.store(false, Ordering::SeqCst);
                return;
            }

            // 4. Resolve Direct Connect (Quick Play)
            let quick_play = pending_conn.lock().unwrap().take();
            let opts = omega_core::launch::LaunchOptions {
                version: mc_ver.clone(),
                instance_id: inst_id.clone(),
                username: user.clone(),
                ram_mb: ram,
                custom_jvm_args: Some(format!("-XX:+Use{gc}")),
                quick_play_server: quick_play,
            };

            // 5. Launch Game Process
            let log_ui_launch = ui_handle.clone();
            let result = omega_core::launch::launch_game(
                &data_dir,
                opts,
                Some(&move |msg: &str| {
                    let msg_str = msg.to_string();
                    let log_ui = log_ui_launch.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n{msg_str}").into());
                        }
                    });
                }),
            )
            .await;

            launching_flag.store(false, Ordering::SeqCst);

            match result {
                Ok(mut active_game) => {
                    let pid = active_game.pid;
                    running_flag.store(true, Ordering::SeqCst);

                    // Switch button state: ЗАПУСК... -> СТОП
                    let log_ui = ui_handle.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            ui.set_launch_state("running".into());
                            ui.set_is_game_running(true);
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n[launcher/INFO] Minecraft успешно запущен (PID: {pid})!").into());
                        }
                    });

                    // Store child process handle
                    let stdout = active_game.child.stdout.take();
                    let stderr = active_game.child.stderr.take();

                    {
                        let mut guard = child_lock.lock().await;
                        *guard = Some(active_game.child);
                    }

                    // Stream stdout in real-time
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

                    // Stream stderr in real-time
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

                    // Monitor process until exit
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

                    // Switch button state: СТОП -> ИГРАТЬ
                    running_flag.store(false, Ordering::SeqCst);
                    let log_ui = ui_handle.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            ui.set_launch_state("idle".into());
                            ui.set_is_game_running(false);
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n[launcher/INFO] Процесс Minecraft завершён.").into());
                        }
                    });
                }
                Err(err) => {
                    running_flag.store(false, Ordering::SeqCst);
                    let log_ui = ui_handle.clone();
                    let _ = slint::invoke_from_event_loop(move || {
                        if let Some(ui) = log_ui.upgrade() {
                            ui.set_launch_state("idle".into());
                            ui.set_is_game_running(false);
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n[launcher/ERROR] Ошибка запуска: {err}").into());
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

    ui.show()?;
    ui.run()?;
    Ok(())
}
