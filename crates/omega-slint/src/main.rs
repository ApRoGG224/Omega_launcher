use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use slint::{ComponentHandle, ModelRc, VecModel};
use tokio::sync::Mutex;

slint::include_modules!();

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let ui = MainWindow::new()?;
    let ui_weak = ui.as_weak();

    let data_dir = omega_core::util::app_data_dir();
    println!("Omega Launcher Native Slint starting, data_dir: {}", data_dir.display());

    // 1. Initialize SQLite Database and load instances
    if let Ok(conn) = omega_core::db::init_db(&data_dir) {
        if let Ok(db_instances) = omega_core::db::load_instances(&conn) {
            if !db_instances.is_empty() {
                let slint_models: Vec<InstanceModel> = db_instances
                    .iter()
                    .map(|inst| InstanceModel {
                        id: inst.id.clone().into(),
                        name: inst.name.clone().into(),
                        mc_version: inst.mc_version.clone().into(),
                        loader: inst.loader.clone().into(),
                        play_time: format!("{} мин.", (inst.play_time_ms.unwrap_or(0) / 60000)).into(),
                    })
                    .collect();

                let first = &db_instances[0];
                ui.set_active_instance_name(first.name.clone().into());
                ui.set_active_version(first.mc_version.clone().into());
                ui.set_instances(ModelRc::new(VecModel::from(slint_models)));
            }
        }

        // Load active account if present
        if let Ok(accounts) = omega_core::db::load_accounts(&conn) {
            if let Some(acc) = accounts.first() {
                ui.set_player_name(acc.name.clone().into());
            }
        }
    }

    // Instance selection callback
    let ui_handle = ui_weak.clone();
    ui.on_select_instance(move |name, version| {
        if let Some(ui) = ui_handle.upgrade() {
            ui.set_active_instance_name(name);
            ui.set_active_version(version);
            ui.set_active_screen("home".into());
        }
    });

    // RAM change callback
    let ui_handle = ui_weak.clone();
    ui.on_change_ram(move |ram| {
        if let Some(ui) = ui_handle.upgrade() {
            ui.set_ram_mb(ram);
        }
    });

    // 2. Play / Stop Button callback & Game Launch Execution
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
                        ui.set_active_status("Готово к запуску".into());
                    }
                });
            });
            return;
        }

        // Launch Game
        let inst_name = ui.get_active_instance_name().to_string();
        let mc_ver = ui.get_active_version().to_string();
        let user = ui.get_player_name().to_string();
        let ram = ui.get_ram_mb() as u32;

        ui.set_is_game_running(true);
        ui.set_active_status("Запуск Minecraft...".into());

        let current_log = ui.get_log_content().to_string();
        let new_log = format!("{current_log}\n[launcher/INFO] Starting {inst_name} ({mc_ver}) for user {user} with {ram} MB RAM...");
        ui.set_log_content(new_log.into());

        running_flag.store(true, Ordering::SeqCst);

        let ui_handle = ui_handle.clone();
        let child_lock = child_lock.clone();
        let running_flag = running_flag.clone();
        let data_dir = data_dir_clone.clone();

        tokio::spawn(async move {
            let opts = omega_core::launch::LaunchOptions {
                version: mc_ver.clone(),
                instance_id: inst_name.clone(),
                username: user.clone(),
                ram_mb: ram,
                custom_jvm_args: Some("-XX:+UseG1GC".into()),
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
                            ui.set_active_status(format!("Игра запущена (PID: {pid})").into());
                        }
                    });

                    // Store child process handle
                    let mut stdout = active_game.child.stdout.take();
                    let mut stderr = active_game.child.stderr.take();

                    {
                        let mut guard = child_lock.lock().await;
                        *guard = Some(active_game.child);
                    }

                    // Stream stdout in background
                    if let Some(stdout) = stdout.take() {
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
                    if let Some(stderr) = stderr.take() {
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
                            ui.set_active_status("Готово к запуску".into());
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
                            ui.set_active_status("Ошибка запуска".into());
                            let old = ui.get_log_content().to_string();
                            ui.set_log_content(format!("{old}\n{err_msg}").into());
                        }
                    });
                }
            }
        });
    });

    ui.run()?;
    Ok(())
}
