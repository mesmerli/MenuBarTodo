use std::sync::{Arc, Mutex};
use std::path::PathBuf;
use serde_json::Value;
use tauri::{AppHandle, Manager, Rect, WebviewUrl, WebviewWindowBuilder, Emitter};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

struct AppState {
    pomo_time: Arc<Mutex<u32>>,
    pomo_running: Arc<Mutex<bool>>,
    pomo_duration: Arc<Mutex<u32>>,
    pomo_configured_seconds: Arc<Mutex<u32>>,
    undo_stack: Arc<Mutex<Vec<Value>>>,
    redo_stack: Arc<Mutex<Vec<Value>>>,
    last_show_time: Arc<Mutex<Option<std::time::Instant>>>,
    widget_mode: Arc<Mutex<bool>>,
    last_tray_position: Arc<Mutex<Option<(i32, i32)>>>,
    last_hide_time: Arc<Mutex<Option<std::time::Instant>>>,
}

fn get_user_data_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata).join("menubar-todo")
    } else {
        PathBuf::from("menubar-todo")
    }
}

fn emit_to_all(app_handle: &tauri::AppHandle, event: &str, payload: impl serde::Serialize + Clone) {
    let _ = app_handle.emit(event, payload);
}

fn open_in_browser(url: &str) {
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd").args(["/C", "start", url]).spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(url).spawn();
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(url).spawn();
}

#[cfg(windows)]
fn set_auto_launch_registry(enabled: bool, exe_path: String) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;
    
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_key = hkcu.open_subkey_with_flags(
        r"Software\Microsoft\Windows\CurrentVersion\Run",
        KEY_WRITE | KEY_READ
    ).map_err(|e| e.to_string())?;
    
    let keys = [
        "electron.app.MenuBar Todo",
        "electron.app.menubar-todo",
        "MenuBar Todo",
        "menubar-todo"
    ];
    
    if enabled {
        let val_data = format!("\"{}\"", exe_path);
        run_key.set_value("electron.app.MenuBar Todo", &val_data).map_err(|e| e.to_string())?;
    } else {
        for key in keys.iter() {
            let _ = run_key.delete_value(key);
        }
    }
    Ok(())
}

#[cfg(not(windows))]
fn set_auto_launch_registry(_enabled: bool, _exe_path: String) -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
fn get_auto_launch_registry() -> bool {
    use winreg::enums::*;
    use winreg::RegKey;
    
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(run_key) = hkcu.open_subkey_with_flags(
        r"Software\Microsoft\Windows\CurrentVersion\Run",
        KEY_READ
    ) {
        let keys = [
            "electron.app.MenuBar Todo",
            "electron.app.menubar-todo",
            "MenuBar Todo",
            "menubar-todo"
        ];
        for key in keys.iter() {
            if run_key.get_value::<String, _>(key).is_ok() {
                return true;
            }
        }
    }
    false
}

#[cfg(not(windows))]
fn get_auto_launch_registry() -> bool {
    false
}

fn archive_todos_internal(todos_to_archive: Vec<Value>) -> Option<i64> {
    let user_data_path = get_user_data_dir();
    let config_path = user_data_path.join("config.json");
    
    let mut config = serde_json::json!({
        "lang": "zh-TW",
        "archiveIndex": 1
    });
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(parsed) = serde_json::from_str::<Value>(&content) {
                config = parsed;
            }
        }
    }
    
    let mut current_index = config.get("archiveIndex").and_then(|idx| idx.as_i64()).unwrap_or(1);
    let mut archive_path = user_data_path.join(format!("archive_todos_{}.json", current_index));
    
    let mut archives = Vec::new();
    if archive_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&archive_path) {
            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                archives = parsed;
            }
        }
    }
    
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
        
    let new_archives: Vec<Value> = todos_to_archive.into_iter().map(|mut t| {
        if t.get("archiveAt").is_none() {
            if let Some(obj) = t.as_object_mut() {
                obj.insert("archiveAt".to_string(), serde_json::json!(now));
            }
        }
        t
    }).collect();
    
    let mut combined = new_archives.clone();
    combined.extend(archives);
    
    let combined_str = serde_json::to_string_pretty(&combined).unwrap_or_default();
    let max_size_bytes = 10 * 1024 * 1024; // 10MB
    
    if combined_str.len() > max_size_bytes {
        current_index = (current_index % 5) + 1;
        archive_path = user_data_path.join(format!("archive_todos_{}.json", current_index));
        let _ = std::fs::write(&archive_path, serde_json::to_string_pretty(&new_archives).unwrap_or_default());
        
        if let Some(obj) = config.as_object_mut() {
            obj.insert("archiveIndex".to_string(), serde_json::json!(current_index));
        }
        let _ = std::fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap_or_default());
    } else {
        let _ = std::fs::write(&archive_path, combined_str);
    }
    
    Some(current_index)
}

fn auto_archive_todos(todos: &mut Vec<Value>) {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    let mut to_archive = Vec::new();
    let mut remaining = Vec::new();

    const DAY_MS: i64 = 24 * 60 * 60 * 1000;
    const WEEK_MS: i64 = 7 * DAY_MS;
    const MONTH_MS: i64 = 30 * DAY_MS;

    for todo in todos.iter() {
        if let Some(completed) = todo.get("completed").and_then(|c| c.as_bool()) {
            if completed {
                if let Some(completed_at) = todo.get("completedAt").and_then(|t| t.as_i64()) {
                    let elapsed = now - completed_at;
                    let dim = todo.get("dimension").and_then(|d| d.as_str()).unwrap_or("day");
                    let limit = match dim {
                        "week" => WEEK_MS,
                        "month" => MONTH_MS,
                        _ => DAY_MS,
                    };
                    if elapsed > limit {
                        to_archive.push(todo.clone());
                        continue;
                    }
                }
            }
        }
        remaining.push(todo.clone());
    }

    if !to_archive.is_empty() {
        let _ = archive_todos_internal(to_archive);
        let store_path = get_user_data_dir().join("todos.json");
        if let Ok(content) = serde_json::to_string_pretty(&remaining) {
            let _ = std::fs::write(store_path, content);
        }
        *todos = remaining;
    }
}

fn start_pomo_timer(
    app_handle: AppHandle,
    pomo_time: Arc<Mutex<u32>>,
    pomo_running: Arc<Mutex<bool>>,
    pomo_duration: Arc<Mutex<u32>>,
    pomo_configured_seconds: Arc<Mutex<u32>>,
) {
    let mut running = pomo_running.lock().unwrap();
    if *running {
        return; // Already running
    }
    *running = true;
    
    let pomo_time_mutex = Arc::clone(&pomo_time);
    let pomo_running_mutex = Arc::clone(&pomo_running);
    let pomo_duration_mutex = Arc::clone(&pomo_duration);
    let pomo_configured_seconds_mutex = Arc::clone(&pomo_configured_seconds);
    
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            
            // Check if still running
            {
                let run = pomo_running_mutex.lock().unwrap();
                if !*run {
                    break;
                }
            }
            
            let mut time = pomo_time_mutex.lock().unwrap();
            if *time > 0 {
                *time -= 1;
                let current_time = *time;
                
                // Show window at 10s or 0s
                if current_time == 10 || current_time == 0 {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                
                // Broadcast
                let duration = *pomo_duration_mutex.lock().unwrap();
                let configured = *pomo_configured_seconds_mutex.lock().unwrap();
                let running = *pomo_running_mutex.lock().unwrap();
                let payload = serde_json::json!({
                    "pomoTime": current_time,
                    "pomoRunning": running,
                    "pomoDuration": duration,
                    "pomoConfiguredSeconds": configured
                });
                let _ = app_handle.emit("pomo-tick", payload);
                
                if current_time == 0 {
                    let mut run = pomo_running_mutex.lock().unwrap();
                    *run = false;
                    break;
                }
            } else {
                let mut run = pomo_running_mutex.lock().unwrap();
                *run = false;
                break;
            }
        }
    });
}

fn create_web_window(app_handle: &tauri::AppHandle, label: &str, title: &str, url: &str, width: f64, height: f64) {
    if let Some(window) = app_handle.get_webview_window(label) {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        if let Ok(new_win) = WebviewWindowBuilder::new(
            app_handle,
            label,
            WebviewUrl::App(std::path::PathBuf::from(url))
        )
        .title(title)
        .inner_size(width, height)
        .resizable(false)
        .fullscreen(false)
        .build() {
            let app_handle_clone = app_handle.clone();
            new_win.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(true) = event {
                    if let Some(main_win) = app_handle_clone.get_webview_window("main") {
                        if !main_win.is_visible().unwrap_or(false) {
                            if let Some(state) = main_win.try_state::<AppState>() {
                                *state.last_show_time.lock().unwrap() = Some(std::time::Instant::now());
                            }
                            let _ = main_win.show();
                            let _ = main_win.set_focus();
                            let _ = main_win.emit("window-show", ());
                        }
                    }
                }
            });
        }
    }
}

#[tauri::command]
async fn open_taskmanager_window(app_handle: tauri::AppHandle) {
    create_web_window(&app_handle, "taskmanager", "Task Manager", "taskmanager.html", 800.0, 600.0);
}

#[tauri::command]
async fn open_archive_window(app_handle: tauri::AppHandle) {
    create_web_window(&app_handle, "archive", "Archive", "archive.html", 800.0, 600.0);
}

fn position_window_near_tray(window: &tauri::WebviewWindow) {
    let last_pos = if let Some(state) = window.try_state::<AppState>() {
        *state.last_tray_position.lock().unwrap()
    } else {
        None
    };

    if let Some((x, y)) = last_pos {
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
    } else {
        let win_size = window.outer_size().unwrap_or(tauri::PhysicalSize::new(420, 600));
        let win_w = win_size.width as i32;
        let win_h = win_size.height as i32;
        
        if let Some(monitor) = window.primary_monitor().ok().flatten().or_else(|| window.current_monitor().ok().flatten()) {
            let monitor_size = monitor.size();
            let monitor_w = monitor_size.width as i32;
            let monitor_h = monitor_size.height as i32;
            
            let x = monitor_w - win_w - 10;
            let y = monitor_h - win_h - 50;
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
        }
    }
}

fn toggle_main_window(window: &tauri::WebviewWindow, rect: Rect) {
    let widget_mode = if let Some(state) = window.try_state::<AppState>() {
        *state.widget_mode.lock().unwrap()
    } else {
        false
    };
    
    if widget_mode {
        if let Some(state) = window.try_state::<AppState>() {
            *state.last_show_time.lock().unwrap() = Some(std::time::Instant::now());
        }
        if window.is_minimized().unwrap_or(false) {
            let _ = window.unminimize();
            let _ = window.set_focus();
            let _ = window.emit("window-show", ());
        } else {
            let _ = window.minimize();
        }
    } else {
        if window.is_visible().unwrap_or(false) {
            if let Some(state) = window.try_state::<AppState>() {
                *state.last_hide_time.lock().unwrap() = Some(std::time::Instant::now());
            }
            let _ = window.hide();
        } else {
            let should_show = if let Some(state) = window.try_state::<AppState>() {
                if let Some(last_hide) = *state.last_hide_time.lock().unwrap() {
                    last_hide.elapsed().as_millis() > 200
                } else {
                    true
                }
            } else {
                true
            };
            
            if should_show {
                if let Some(state) = window.try_state::<AppState>() {
                    *state.last_show_time.lock().unwrap() = Some(std::time::Instant::now());
                }
                
                // Not Standard Window Mode (Tray Popup Mode) - Position on top of the tray
                let (tray_x, tray_y) = match rect.position {
                    tauri::Position::Physical(p) => (p.x, p.y),
                    tauri::Position::Logical(p) => (p.x as i32, p.y as i32),
                };
                let (tray_w, tray_h) = match rect.size {
                    tauri::Size::Physical(s) => (s.width as i32, s.height as i32),
                    tauri::Size::Logical(s) => (s.width as i32, s.height as i32),
                };
                
                let win_size = window.outer_size().unwrap_or(tauri::PhysicalSize::new(420, 600));
                let win_w = win_size.width as i32;
                let win_h = win_size.height as i32;
                
                let mut x = tray_x + (tray_w / 2) - (win_w / 2);
                let y;
                
                if let Some(monitor) = window.current_monitor().ok().flatten() {
                    let monitor_size = monitor.size();
                    let monitor_h = monitor_size.height as i32;
                    let monitor_w = monitor_size.width as i32;
                    
                    if tray_y > monitor_h / 2 {
                        y = tray_y - win_h - 10;
                    } else {
                        y = tray_y + tray_h + 10;
                    }
                    
                    if x < 10 {
                        x = 10;
                    }
                    if x + win_w > monitor_w - 10 {
                        x = monitor_w - win_w - 10;
                    }
                } else {
                    y = tray_y + tray_h + 10;
                }
                
                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
                if let Some(state) = window.try_state::<AppState>() {
                    *state.last_tray_position.lock().unwrap() = Some((x, y));
                }
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.emit("window-show", ());
            }
        }
    }
}

fn broadcast_undo_state(app_handle: &tauri::AppHandle, state: &tauri::State<'_, AppState>) {
    let payload = serde_json::json!({
        "canUndo": !state.undo_stack.lock().unwrap().is_empty(),
        "canRedo": !state.redo_stack.lock().unwrap().is_empty()
    });
    let _ = app_handle.emit("undo-state-updated", payload);
}

fn update_tray_menu(app_handle: &tauri::AppHandle) {
    let user_data = get_user_data_dir();
    let config_path = user_data.join("config.json");
    let mut lang = "zh-TW".to_string();
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str::<Value>(&content) {
                if let Some(l) = config.get("lang").and_then(|v| v.as_str()) {
                    lang = l.to_string();
                }
            }
        }
    }

    let (show_text, about_text, exit_text) = if lang == "en" {
        ("Show Main Window", "About", "Exit")
    } else {
        ("顯示主視窗", "關於", "結束")
    };

    if let Some(tray) = app_handle.tray_by_id("main") {
        if let Ok(show_i) = MenuItemBuilder::with_id("show", show_text).build(app_handle) {
            if let Ok(about_i) = MenuItemBuilder::with_id("about", about_text).build(app_handle) {
                if let Ok(exit_i) = MenuItemBuilder::with_id("exit", exit_text).build(app_handle) {
                    if let Ok(menu) = MenuBuilder::new(app_handle)
                        .items(&[
                            &show_i, 
                            &tauri::menu::PredefinedMenuItem::separator(app_handle).unwrap(), 
                            &about_i, 
                            &tauri::menu::PredefinedMenuItem::separator(app_handle).unwrap(), 
                            &exit_i
                        ])
                        .build() {
                            let _ = tray.set_menu(Some(menu));
                        }
                }
            }
        }
    }
}

// IPC Commands
#[tauri::command]
fn load_todos() -> Result<Value, String> {
    let path = get_user_data_dir().join("todos.json");
    if path.exists() {
        let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
        let mut todos: Vec<Value> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        auto_archive_todos(&mut todos);
        Ok(serde_json::json!(todos))
    } else {
        Ok(serde_json::json!([]))
    }
}

#[tauri::command]
fn save_todos(app_handle: tauri::AppHandle, todos: Vec<Value>) -> Result<bool, String> {
    let path = get_user_data_dir().join("todos.json");
    let content = serde_json::to_string_pretty(&todos).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    emit_to_all(&app_handle, "todos-updated", ());
    Ok(true)
}

#[tauri::command]
fn archive_todos(app_handle: tauri::AppHandle, todos: Vec<Value>) -> Result<Option<i64>, String> {
    let idx = archive_todos_internal(todos);
    emit_to_all(&app_handle, "archives-updated", ());
    Ok(idx)
}

#[tauri::command]
fn load_config() -> Result<Value, String> {
    let path = get_user_data_dir().join("config.json");
    if path.exists() {
        let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
        let config: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        Ok(config)
    } else {
        Ok(serde_json::json!({ "lang": "zh-TW" }))
    }
}

#[tauri::command]
fn save_config(app_handle: tauri::AppHandle, config: Value) -> Result<bool, String> {
    let path = get_user_data_dir().join("config.json");
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    std::fs::write(path, content).map_err(|e| e.to_string())?;
    
    if let Some(lang) = config.get("lang").and_then(|l| l.as_str()) {
        emit_to_all(&app_handle, "language-changed", lang.to_string());
    }
    update_tray_menu(&app_handle);
    Ok(true)
}

#[tauri::command]
fn set_auto_launch(enabled: bool) -> Result<bool, String> {
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_str = exe_path.to_string_lossy().to_string();
        set_auto_launch_registry(enabled, exe_str)?;
        Ok(true)
    } else {
        Err("Failed to get current executable path".to_string())
    }
}

#[tauri::command]
fn get_auto_launch() -> bool {
    get_auto_launch_registry()
}

#[tauri::command]
fn load_archives() -> Result<Vec<Value>, String> {
    let user_data_path = get_user_data_dir();
    let mut all_archives = Vec::new();
    for i in 1..=5 {
        let file_path = user_data_path.join(format!("archive_todos_{}.json", i));
        if file_path.exists() {
            if let Ok(content) = std::fs::read_to_string(&file_path) {
                if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                    for mut item in parsed {
                        if let Some(obj) = item.as_object_mut() {
                            obj.insert("_fileIndex".to_string(), serde_json::json!(i));
                        }
                        all_archives.push(item);
                    }
                }
            }
        }
    }
    Ok(all_archives)
}

#[tauri::command]
fn delete_archive_item(id: i64, file_index: i64) -> Result<bool, String> {
    let user_data_path = get_user_data_dir();
    let file_path = user_data_path.join(format!("archive_todos_{}.json", file_index));
    if file_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&file_path) {
            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                let filtered: Vec<Value> = parsed.into_iter().filter(|item| {
                    item.get("id").and_then(|v| v.as_i64()) != Some(id)
                }).collect();
                if let Ok(out) = serde_json::to_string_pretty(&filtered) {
                    let _ = std::fs::write(file_path, out);
                    return Ok(true);
                }
            }
        }
    }
    Ok(false)
}

#[tauri::command]
fn restore_archive_item(app_handle: tauri::AppHandle, item: Value, file_index: i64) -> Result<bool, String> {
    let user_data_path = get_user_data_dir();
    let archive_path = user_data_path.join(format!("archive_todos_{}.json", file_index));
    if archive_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&archive_path) {
            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                if let Some(item_id) = item.get("id").and_then(|v| v.as_i64()) {
                    let filtered: Vec<Value> = parsed.into_iter().filter(|i| {
                        i.get("id").and_then(|v| v.as_i64()) != Some(item_id)
                    }).collect();
                    if let Ok(out) = serde_json::to_string_pretty(&filtered) {
                        let _ = std::fs::write(&archive_path, out);
                    }
                }
            }
        }
    }
    
    let main_store_path = user_data_path.join("todos.json");
    let mut main_todos = Vec::new();
    if main_store_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&main_store_path) {
            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                main_todos = parsed;
            }
        }
    }
    
    let mut item_to_restore = item.clone();
    if let Some(obj) = item_to_restore.as_object_mut() {
        obj.remove("_fileIndex");
        obj.remove("archiveAt");
    }
    
    main_todos.insert(0, item_to_restore);
    if let Ok(out) = serde_json::to_string_pretty(&main_todos) {
        let _ = std::fs::write(main_store_path, out);
    }
    
    emit_to_all(&app_handle, "todos-updated", ());
    emit_to_all(&app_handle, "archives-updated", ());
    Ok(true)
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    open_in_browser(&url);
    Ok(())
}

#[tauri::command]
fn request_show_window(app_handle: tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn pomo_toggle(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) {
    let mut running = state.pomo_running.lock().unwrap();
    if *running {
        *running = false;
        drop(running);
        
        let time = *state.pomo_time.lock().unwrap();
        let duration = *state.pomo_duration.lock().unwrap();
        let configured = *state.pomo_configured_seconds.lock().unwrap();
        
        let payload = serde_json::json!({
            "pomoTime": time,
            "pomoRunning": false,
            "pomoDuration": duration,
            "pomoConfiguredSeconds": configured
        });
        let _ = app_handle.emit("pomo-tick", payload);
    } else {
        drop(running);
        let mut time = state.pomo_time.lock().unwrap();
        if *time == 0 {
            *time = *state.pomo_configured_seconds.lock().unwrap();
        }
        drop(time);
        start_pomo_timer(
            app_handle,
            Arc::clone(&state.pomo_time),
            Arc::clone(&state.pomo_running),
            Arc::clone(&state.pomo_duration),
            Arc::clone(&state.pomo_configured_seconds),
        );
    }
}

#[tauri::command]
fn pomo_set_duration(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>, mins: u32) {
    let total_seconds = mins;
    let mins_val = total_seconds / 60;
    *state.pomo_duration.lock().unwrap() = mins_val;
    *state.pomo_configured_seconds.lock().unwrap() = total_seconds;
    *state.pomo_time.lock().unwrap() = total_seconds;
    
    let user_data_path = get_user_data_dir();
    let config_path = user_data_path.join("config.json");
    let mut config = serde_json::json!({});
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(parsed) = serde_json::from_str::<Value>(&content) {
                config = parsed;
            }
        }
    }
    if let Some(obj) = config.as_object_mut() {
        obj.insert("pomoConfiguredSeconds".to_string(), serde_json::json!(total_seconds));
    }
    let _ = std::fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap_or_default());
    
    let payload = serde_json::json!({
        "pomoTime": total_seconds,
        "pomoRunning": *state.pomo_running.lock().unwrap(),
        "pomoDuration": mins_val,
        "pomoConfiguredSeconds": total_seconds
    });
    let _ = app_handle.emit("pomo-tick", payload);
}

#[tauri::command]
fn pomo_get_state(state: tauri::State<'_, AppState>) -> Value {
    serde_json::json!({
        "pomoTime": *state.pomo_time.lock().unwrap(),
        "pomoRunning": *state.pomo_running.lock().unwrap(),
        "pomoDuration": *state.pomo_duration.lock().unwrap(),
        "pomoConfiguredSeconds": *state.pomo_configured_seconds.lock().unwrap()
    })
}

#[tauri::command]
fn get_version(app_handle: tauri::AppHandle) -> String {
    app_handle.package_info().version.to_string()
}

#[tauri::command]
fn set_widget_mode(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>, enabled: bool) -> Result<(), String> {
    let user_data_path = get_user_data_dir();
    let config_path = user_data_path.join("config.json");
    
    let mut config = serde_json::json!({});
    if config_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&config_path) {
            if let Ok(parsed) = serde_json::from_str::<Value>(&content) {
                config = parsed;
            }
        }
    }
    
    if let Some(obj) = config.as_object_mut() {
        obj.insert("widgetMode".to_string(), serde_json::json!(enabled));
        obj.insert("pomoRunning".to_string(), serde_json::json!(*state.pomo_running.lock().unwrap()));
        obj.insert("pomoTime".to_string(), serde_json::json!(*state.pomo_time.lock().unwrap()));
    }
    *state.widget_mode.lock().unwrap() = enabled;
    
    let _ = std::fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap_or_default());
    
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.set_skip_taskbar(!enabled);
        if enabled {
            let _ = window.hide();
            let _ = window.show();
            let _ = window.set_focus();
            let _ = window.emit("window-show", ());
        } else {
            let _ = window.hide();
        }
    }
    
    Ok(())
}

#[tauri::command]
fn push_undo_action(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>, action: Value) {
    {
        let mut undo = state.undo_stack.lock().unwrap();
        undo.push(action);
        if undo.len() > 30 {
            undo.remove(0);
        }
        let mut redo = state.redo_stack.lock().unwrap();
        redo.clear();
    }
    
    broadcast_undo_state(&app_handle, &state);
}

#[tauri::command]
fn get_undo_state(state: tauri::State<'_, AppState>) -> Value {
    serde_json::json!({
        "canUndo": !state.undo_stack.lock().unwrap().is_empty(),
        "canRedo": !state.redo_stack.lock().unwrap().is_empty()
    })
}

#[tauri::command]
fn perform_undo(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut undo = state.undo_stack.lock().unwrap();
    if undo.is_empty() {
        return Ok(false);
    }
    let action = undo.pop().unwrap();
    state.redo_stack.lock().unwrap().push(action.clone());
    drop(undo);
    
    let user_data_path = get_user_data_dir();
    let store_path = user_data_path.join("todos.json");
    
    let mut main_todos = Vec::new();
    if store_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&store_path) {
            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                main_todos = parsed;
            }
        }
    }
    
    let action_type = action.get("type").and_then(|t| t.as_str()).unwrap_or("");
    match action_type {
        "ARCHIVE" => {
            if let Some(items) = action.get("items").and_then(|i| i.as_array()) {
                if let Some(file_index) = action.get("fileIndex").and_then(|f| f.as_i64()) {
                    let archive_path = user_data_path.join(format!("archive_todos_{}.json", file_index));
                    if archive_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(&archive_path) {
                            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                                let item_ids: Vec<i64> = items.iter().filter_map(|item| item.get("id").and_then(|id| id.as_i64())).collect();
                                let filtered: Vec<Value> = parsed.into_iter().filter(|item| {
                                    if let Some(id) = item.get("id").and_then(|id| id.as_i64()) {
                                        !item_ids.contains(&id)
                                    } else {
                                        true
                                    }
                                }).collect();
                                let _ = std::fs::write(&archive_path, serde_json::to_string_pretty(&filtered).unwrap_or_default());
                            }
                        }
                    }
                }
                let mut prepended = items.clone();
                prepended.extend(main_todos);
                main_todos = prepended;
            }
        },
        "TOGGLE" => {
            if let Some(id) = action.get("id") {
                if let Some(todo) = main_todos.iter_mut().find(|t| t.get("id") == Some(id)) {
                    if let Some(obj) = todo.as_object_mut() {
                        if let Some(was_completed) = action.get("wasCompleted").and_then(|w| w.as_bool()) {
                            obj.insert("completed".to_string(), serde_json::json!(was_completed));
                            if !was_completed {
                                obj.remove("completedAt");
                            } else {
                                let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64;
                                obj.insert("completedAt".to_string(), serde_json::json!(now));
                            }
                        }
                    }
                }
            }
        },
        "EDIT_DUEDATE" => {
            if let Some(id) = action.get("id") {
                if let Some(todo) = main_todos.iter_mut().find(|t| t.get("id") == Some(id)) {
                    if let Some(obj) = todo.as_object_mut() {
                        let was_due_date = action.get("wasDueDate").unwrap_or(&Value::Null);
                        obj.insert("dueDate".to_string(), was_due_date.clone());
                    }
                }
            }
        },
        "EDIT_DIMENSION" => {
            if let Some(id) = action.get("id") {
                if let Some(todo) = main_todos.iter_mut().find(|t| t.get("id") == Some(id)) {
                    if let Some(obj) = todo.as_object_mut() {
                        let was_dimension = action.get("wasDimension").unwrap_or(&Value::Null);
                        obj.insert("dimension".to_string(), was_dimension.clone());
                    }
                }
            }
        },
        "RESTORE" => {
            if let Some(items) = action.get("items").and_then(|i| i.as_array()) {
                let item_ids: Vec<i64> = items.iter().filter_map(|item| item.get("id").and_then(|id| id.as_i64())).collect();
                main_todos = main_todos.into_iter().filter(|item| {
                    if let Some(id) = item.get("id").and_then(|id| id.as_i64()) {
                        !item_ids.contains(&id)
                    } else {
                        true
                    }
                }).collect();
                
                if let Some(file_index) = action.get("fileIndex").and_then(|f| f.as_i64()) {
                    let archive_path = user_data_path.join(format!("archive_todos_{}.json", file_index));
                    let mut archive_data = Vec::new();
                    if archive_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(&archive_path) {
                            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                                archive_data = parsed;
                            }
                        }
                    }
                    let mut prepended = items.clone();
                    prepended.extend(archive_data);
                    let _ = std::fs::write(&archive_path, serde_json::to_string_pretty(&prepended).unwrap_or_default());
                }
            }
        },
        "DELETE_PERM" => {
            if let Some(file_index) = action.get("fileIndex").and_then(|f| f.as_i64()) {
                if let Some(item) = action.get("item") {
                    let archive_path = user_data_path.join(format!("archive_todos_{}.json", file_index));
                    let mut archive_data = Vec::new();
                    if archive_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(&archive_path) {
                            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                                archive_data = parsed;
                            }
                        }
                    }
                    archive_data.insert(0, item.clone());
                    let _ = std::fs::write(&archive_path, serde_json::to_string_pretty(&archive_data).unwrap_or_default());
                }
            }
        },
        _ => {}
    }
    
    let content = serde_json::to_string_pretty(&main_todos).map_err(|e| e.to_string())?;
    std::fs::write(store_path, content).map_err(|e| e.to_string())?;
    
    emit_to_all(&app_handle, "todos-updated", ());
    emit_to_all(&app_handle, "archives-updated", ());
    broadcast_undo_state(&app_handle, &state);
    
    Ok(true)
}

#[tauri::command]
fn perform_redo(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut redo = state.redo_stack.lock().unwrap();
    if redo.is_empty() {
        return Ok(false);
    }
    let action = redo.pop().unwrap();
    state.undo_stack.lock().unwrap().push(action.clone());
    drop(redo);
    
    let user_data_path = get_user_data_dir();
    let store_path = user_data_path.join("todos.json");
    
    let mut main_todos = Vec::new();
    if store_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&store_path) {
            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                main_todos = parsed;
            }
        }
    }
    
    let action_type = action.get("type").and_then(|t| t.as_str()).unwrap_or("");
    match action_type {
        "ARCHIVE" => {
            if let Some(items) = action.get("items").and_then(|i| i.as_array()) {
                let item_ids: Vec<i64> = items.iter().filter_map(|item| item.get("id").and_then(|id| id.as_i64())).collect();
                main_todos = main_todos.into_iter().filter(|item| {
                    if let Some(id) = item.get("id").and_then(|id| id.as_i64()) {
                        !item_ids.contains(&id)
                    } else {
                        true
                    }
                }).collect();
                
                if let Some(file_index) = action.get("fileIndex").and_then(|f| f.as_i64()) {
                    let archive_path = user_data_path.join(format!("archive_todos_{}.json", file_index));
                    let mut archive_data = Vec::new();
                    if archive_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(&archive_path) {
                            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                                archive_data = parsed;
                            }
                        }
                    }
                    let mut prepended = items.clone();
                    prepended.extend(archive_data);
                    let _ = std::fs::write(&archive_path, serde_json::to_string_pretty(&prepended).unwrap_or_default());
                }
            }
        },
        "RESTORE" => {
            if let Some(items) = action.get("items").and_then(|i| i.as_array()) {
                if let Some(file_index) = action.get("fileIndex").and_then(|f| f.as_i64()) {
                    let archive_path = user_data_path.join(format!("archive_todos_{}.json", file_index));
                    if archive_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(&archive_path) {
                            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                                let item_ids: Vec<i64> = items.iter().filter_map(|item| item.get("id").and_then(|id| id.as_i64())).collect();
                                let filtered: Vec<Value> = parsed.into_iter().filter(|item| {
                                    if let Some(id) = item.get("id").and_then(|id| id.as_i64()) {
                                        !item_ids.contains(&id)
                                    } else {
                                        true
                                    }
                                }).collect();
                                let _ = std::fs::write(&archive_path, serde_json::to_string_pretty(&filtered).unwrap_or_default());
                            }
                        }
                    }
                }
                let mut prepended = items.clone();
                prepended.extend(main_todos);
                main_todos = prepended;
            }
        },
        "TOGGLE" => {
            if let Some(id) = action.get("id") {
                if let Some(todo) = main_todos.iter_mut().find(|t| t.get("id") == Some(id)) {
                    if let Some(obj) = todo.as_object_mut() {
                        if let Some(new_completed) = action.get("newCompleted").and_then(|n| n.as_bool()) {
                            obj.insert("completed".to_string(), serde_json::json!(new_completed));
                            if !new_completed {
                                obj.remove("completedAt");
                            } else {
                                let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as i64;
                                obj.insert("completedAt".to_string(), serde_json::json!(now));
                            }
                        }
                    }
                }
            }
        },
        "EDIT_DUEDATE" => {
            if let Some(id) = action.get("id") {
                if let Some(todo) = main_todos.iter_mut().find(|t| t.get("id") == Some(id)) {
                    if let Some(obj) = todo.as_object_mut() {
                        let new_due_date = action.get("newDueDate").unwrap_or(&Value::Null);
                        obj.insert("dueDate".to_string(), new_due_date.clone());
                    }
                }
            }
        },
        "EDIT_DIMENSION" => {
            if let Some(id) = action.get("id") {
                if let Some(todo) = main_todos.iter_mut().find(|t| t.get("id") == Some(id)) {
                    if let Some(obj) = todo.as_object_mut() {
                        let new_dimension = action.get("newDimension").unwrap_or(&Value::Null);
                        obj.insert("dimension".to_string(), new_dimension.clone());
                    }
                }
            }
        },
        "DELETE_PERM" => {
            if let Some(file_index) = action.get("fileIndex").and_then(|f| f.as_i64()) {
                if let Some(item) = action.get("item") {
                    let archive_path = user_data_path.join(format!("archive_todos_{}.json", file_index));
                    if archive_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(&archive_path) {
                            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(&content) {
                                if let Some(item_id) = item.get("id").and_then(|v| v.as_i64()) {
                                    let filtered: Vec<Value> = parsed.into_iter().filter(|i| {
                                        i.get("id").and_then(|v| v.as_i64()) != Some(item_id)
                                    }).collect();
                                    let _ = std::fs::write(&archive_path, serde_json::to_string_pretty(&filtered).unwrap_or_default());
                                }
                            }
                        }
                    }
                }
            }
        },
        _ => {}
    }
    
    let content = serde_json::to_string_pretty(&main_todos).map_err(|e| e.to_string())?;
    std::fs::write(store_path, content).map_err(|e| e.to_string())?;
    
    emit_to_all(&app_handle, "todos-updated", ());
    emit_to_all(&app_handle, "archives-updated", ());
    broadcast_undo_state(&app_handle, &state);
    
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new()
            .with_handler(|app, shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    if shortcut.matches(Modifiers::CONTROL | Modifiers::SHIFT, Code::Space) {
                        if let Some(window) = app.get_webview_window("main") {
                            let widget_mode = if let Some(state) = window.try_state::<AppState>() {
                                *state.widget_mode.lock().unwrap()
                            } else {
                                false
                            };
                            
                            if widget_mode {
                                if let Some(state) = window.try_state::<AppState>() {
                                    *state.last_show_time.lock().unwrap() = Some(std::time::Instant::now());
                                }
                                if window.is_minimized().unwrap_or(false) {
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                    let _ = window.emit("window-show", ());
                                } else {
                                    let _ = window.minimize();
                                }
                            } else {
                                if window.is_visible().unwrap_or(false) {
                                    if let Some(state) = window.try_state::<AppState>() {
                                        *state.last_hide_time.lock().unwrap() = Some(std::time::Instant::now());
                                    }
                                    let _ = window.hide();
                                } else {
                                    if let Some(state) = window.try_state::<AppState>() {
                                        *state.last_show_time.lock().unwrap() = Some(std::time::Instant::now());
                                    }
                                    position_window_near_tray(&window);
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                    let _ = window.emit("window-show", ());
                                }
                            }
                        }
                    }
                }
            })
            .build()
        )
        .manage(AppState {
            pomo_time: Arc::new(Mutex::new(25 * 60)),
            pomo_running: Arc::new(Mutex::new(false)),
            pomo_duration: Arc::new(Mutex::new(25)),
            pomo_configured_seconds: Arc::new(Mutex::new(25 * 60)),
            undo_stack: Arc::new(Mutex::new(Vec::new())),
            redo_stack: Arc::new(Mutex::new(Vec::new())),
            last_show_time: Arc::new(Mutex::new(None)),
            widget_mode: Arc::new(Mutex::new(false)),
            last_tray_position: Arc::new(Mutex::new(None)),
            last_hide_time: Arc::new(Mutex::new(None)),
        })
        .setup(|app| {
            let shortcut = Shortcut::new(
                Some(Modifiers::CONTROL | Modifiers::SHIFT),
                Code::Space
            );
            let _ = app.global_shortcut().register(shortcut);
            
            let user_data = get_user_data_dir();
            let config_path = user_data.join("config.json");
            let mut widget_mode = false;
            let mut widget_x = 0;
            let mut widget_y = 0;
            let mut pomo_configured_seconds = 25 * 60;
            let mut pomo_running = false;
            let mut pomo_time = pomo_configured_seconds;
            
            if config_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&config_path) {
                    if let Ok(config) = serde_json::from_str::<Value>(&content) {
                        if let Some(w_mode) = config.get("widgetMode").and_then(|w| w.as_bool()) {
                            widget_mode = w_mode;
                        }
                        if let Some(x) = config.get("widgetX").and_then(|x| x.as_i64()) {
                            widget_x = x as i32;
                        }
                        if let Some(y) = config.get("widgetY").and_then(|y| y.as_i64()) {
                            widget_y = y as i32;
                        }
                        if let Some(pomo_secs) = config.get("pomoConfiguredSeconds").and_then(|p| p.as_i64()) {
                            pomo_configured_seconds = pomo_secs as u32;
                            pomo_time = pomo_configured_seconds;
                        }
                        if let Some(p_running) = config.get("pomoRunning").and_then(|p| p.as_bool()) {
                            pomo_running = p_running;
                            if let Some(p_time) = config.get("pomoTime").and_then(|t| t.as_i64()) {
                                pomo_time = p_time as u32;
                            }
                        }
                    }
                }
            }
            
            let app_state = app.state::<AppState>();
            *app_state.widget_mode.lock().unwrap() = widget_mode;
            *app_state.pomo_configured_seconds.lock().unwrap() = pomo_configured_seconds;
            *app_state.pomo_duration.lock().unwrap() = pomo_configured_seconds / 60;
            *app_state.pomo_time.lock().unwrap() = pomo_time;
            
            if pomo_running {
                if config_path.exists() {
                    if let Ok(content) = std::fs::read_to_string(&config_path) {
                        if let Ok(mut config) = serde_json::from_str::<Value>(&content) {
                            if let Some(obj) = config.as_object_mut() {
                                obj.remove("pomoRunning");
                                obj.remove("pomoTime");
                            }
                            let _ = std::fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap_or_default());
                        }
                    }
                }
                
                let app_handle = app.handle().clone();
                start_pomo_timer(
                    app_handle,
                    Arc::clone(&app_state.pomo_time),
                    Arc::clone(&app_state.pomo_running),
                    Arc::clone(&app_state.pomo_duration),
                    Arc::clone(&app_state.pomo_configured_seconds),
                );
            }
            
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_skip_taskbar(!widget_mode);
            
            let w = window.clone();
            let config_path_clone = config_path.clone();
            
            if widget_mode {
                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(widget_x, widget_y)));
                let _ = window.show();
            }
            
            window.on_window_event(move |event| {
                match event {
                    tauri::WindowEvent::Moved(pos) => {
                        if pos.x <= -30000 || pos.y <= -30000 {
                            return;
                        }
                        let is_widget = if let Some(state) = w.try_state::<AppState>() {
                            *state.widget_mode.lock().unwrap()
                        } else {
                            false
                        };
                        if is_widget {
                            let mut config = serde_json::json!({});
                            if config_path_clone.exists() {
                                if let Ok(content) = std::fs::read_to_string(&config_path_clone) {
                                    if let Ok(parsed) = serde_json::from_str::<Value>(&content) {
                                        config = parsed;
                                    }
                                }
                            }
                            if let Some(obj) = config.as_object_mut() {
                                obj.insert("widgetX".to_string(), serde_json::json!(pos.x));
                                obj.insert("widgetY".to_string(), serde_json::json!(pos.y));
                            }
                            let _ = std::fs::write(&config_path_clone, serde_json::to_string_pretty(&config).unwrap_or_default());
                        }
                    }
                    tauri::WindowEvent::Focused(true) => {
                        let is_widget = if let Some(state) = w.try_state::<AppState>() {
                            *state.widget_mode.lock().unwrap()
                        } else {
                            false
                        };
                        if is_widget {
                            let app_handle = w.app_handle();
                            for win in app_handle.webview_windows().values() {
                                if win.is_visible().unwrap_or(false) {
                                    let _ = win.set_always_on_top(true);
                                    let _ = win.set_always_on_top(false);
                                }
                            }
                            let _ = w.set_focus();
                        }
                    }
                    tauri::WindowEvent::Focused(false) => {
                        let is_widget = if let Some(state) = w.try_state::<AppState>() {
                            *state.widget_mode.lock().unwrap()
                        } else {
                            false
                        };
                        if !is_widget {
                            let should_hide = if let Some(state) = w.try_state::<AppState>() {
                                if let Some(last_show) = *state.last_show_time.lock().unwrap() {
                                    last_show.elapsed().as_millis() > 200
                                } else {
                                    true
                                }
                            } else {
                                true
                            };
                            if should_hide {
                                if let Some(state) = w.try_state::<AppState>() {
                                    *state.last_hide_time.lock().unwrap() = Some(std::time::Instant::now());
                                }
                                let _ = w.hide();
                            }
                        }
                    }
                    _ => {}
                }
            });
            
            // Build the tray icon
            let icon_bytes = include_bytes!("../icons/32x32.png");
            let tray_icon = tauri::image::Image::from_bytes(icon_bytes).expect("Failed to load tray icon");

            let last_click = Arc::new(Mutex::new(std::time::Instant::now() - std::time::Duration::from_secs(1)));
            let last_click_clone = last_click.clone();

            let _tray = TrayIconBuilder::with_id("main")
                .icon(tray_icon)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(move |tray, event| {
                    if let TrayIconEvent::Click { button, rect, .. } = event {
                        if button == MouseButton::Left {
                            let mut last_click_time = last_click_clone.lock().unwrap();
                            if last_click_time.elapsed() > std::time::Duration::from_millis(500) {
                                *last_click_time = std::time::Instant::now();
                                if let Some(window) = tray.app_handle().get_webview_window("main") {
                                    toggle_main_window(&window, rect);
                                }
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let widget_mode = if let Some(state) = window.try_state::<AppState>() {
                                    *state.widget_mode.lock().unwrap()
                                } else {
                                    false
                                };
                                if !widget_mode {
                                    position_window_near_tray(&window);
                                }
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("window-show", ());
                            }
                        }
                        "about" => {
                            create_web_window(app, "about", "About", "about.html", 350.0, 300.0);
                        }
                        "exit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;
                
            update_tray_menu(app.handle());
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_todos,
            save_todos,
            archive_todos,
            load_config,
            save_config,
            set_auto_launch,
            get_auto_launch,
            open_taskmanager_window,
            open_archive_window,
            load_archives,
            delete_archive_item,
            restore_archive_item,
            open_url,
            request_show_window,
            pomo_toggle,
            pomo_set_duration,
            pomo_get_state,
            get_version,
            set_widget_mode,
            push_undo_action,
            get_undo_state,
            perform_undo,
            perform_redo
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
