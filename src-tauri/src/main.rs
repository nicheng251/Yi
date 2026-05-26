#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod db;

use db::Database;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, State,
};
use tracing::{info, error};
use tracing_subscriber::{fmt, layer::SubscriberExt, EnvFilter};
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;

struct AppState {
    db: Mutex<Option<Database>>,
    app_data_dir: PathBuf,
}

#[derive(Debug, Serialize, Deserialize)]
struct CommandResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

impl<T> CommandResponse<T> {
    fn ok(data: T) -> Self {
        CommandResponse {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    fn err(msg: &str) -> Self {
        CommandResponse {
            success: false,
            data: None,
            error: Some(msg.to_string()),
        }
    }
}

/// Macro: unwrap DB state from State + lock, then call `$body`.
/// Converts `Ok(data)` → `CommandResponse::ok(data)`, `Err(e)` → `CommandResponse::err(e)`.
macro_rules! with_db {
    ($state:expr, |$db:ident| $body:expr) => {{
        let db_guard = $state.db.lock().map_err(|e| e.to_string())?;
        let $db = db_guard.as_ref().ok_or("Database not initialized")?;
        match $body {
            Ok(data) => Ok(CommandResponse::ok(data)),
            Err(e) => Ok(CommandResponse::err(&e.to_string())),
        }
    }};
}

fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?;

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("Yi - 专注生产力工具")
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.eval("window.dispatchEvent(new CustomEvent('tauri-quit'))");
                    }
                    let _ = app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { button: tauri::tray::MouseButton::Left, .. } = event {
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[tauri::command]
fn get_projects(state: State<AppState>) -> Result<CommandResponse<Vec<db::Project>>, String> {
    with_db!(state, |db| db.get_projects(false))
}

#[tauri::command]
fn get_archived_projects(state: State<AppState>) -> Result<CommandResponse<Vec<db::Project>>, String> {
    with_db!(state, |db| db.get_archived_projects())
}

#[tauri::command]
fn create_project(name: String, category_id: Option<String>, tags: Vec<String>, state: State<AppState>) -> Result<CommandResponse<db::Project>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("Database not initialized")?;
    if name.trim().is_empty() {
        return Ok(CommandResponse::err("Project name cannot be empty"));
    }
    if name.len() > 255 {
        return Ok(CommandResponse::err("Project name must be 255 characters or less"));
    }
    match db.create_project(&name, category_id.as_deref(), tags) {
        Ok(project) => Ok(CommandResponse::ok(project)),
        Err(e) => Ok(CommandResponse::err(&e.to_string())),
    }
}

#[tauri::command]
fn reorder_projects(project_ids: Vec<String>, state: State<AppState>) -> Result<CommandResponse<()>, String> {
    with_db!(state, |db| db.reorder_projects(&project_ids))
}

#[tauri::command]
fn update_project(id: String, name: String, category_id: Option<String>, tags: Vec<String>, state: State<AppState>) -> Result<CommandResponse<()>, String> {
    with_db!(state, |db| db.update_project(&id, &name, category_id.as_deref(), tags))
}

#[tauri::command]
fn archive_project(id: String, state: State<AppState>) -> Result<CommandResponse<()>, String> {
    with_db!(state, |db| db.archive_project(&id))
}

#[tauri::command]
fn unarchive_project(id: String, state: State<AppState>) -> Result<CommandResponse<()>, String> {
    with_db!(state, |db| db.unarchive_project(&id))
}

#[tauri::command]
fn delete_project(id: String, state: State<AppState>) -> Result<CommandResponse<()>, String> {
    with_db!(state, |db| db.delete_project(&id))
}

#[tauri::command]
fn get_categories(state: State<AppState>) -> Result<CommandResponse<Vec<db::Category>>, String> {
    with_db!(state, |db| db.get_categories())
}

#[tauri::command]
fn create_category(name: String, state: State<AppState>) -> Result<CommandResponse<db::Category>, String> {
    with_db!(state, |db| db.create_category(&name))
}

#[tauri::command]
fn start_session(project_id: String, state: State<AppState>) -> Result<CommandResponse<db::Session>, String> {
    with_db!(state, |db| db.start_new_session(&project_id))
}

#[tauri::command]
fn end_session(session_id: String, state: State<AppState>) -> Result<CommandResponse<Option<i64>>, String> {
    with_db!(state, |db| db.end_session(&session_id))
}

#[tauri::command]
fn get_active_session(state: State<AppState>) -> Result<CommandResponse<Option<db::Session>>, String> {
    with_db!(state, |db| db.get_active_session())
}

#[tauri::command]
fn get_daily_record(date: String, state: State<AppState>) -> Result<CommandResponse<Option<db::DailyRecord>>, String> {
    with_db!(state, |db| db.get_daily_record(&date))
}

#[tauri::command]
fn get_daily_records_for_month(year: i32, month: i32, state: State<AppState>) -> Result<CommandResponse<Vec<db::DailyRecord>>, String> {
    with_db!(state, |db| db.get_daily_records_for_month(year, month))
}

#[tauri::command]
fn save_daily_record(date: String, content: String, state: State<AppState>) -> Result<CommandResponse<db::DailyRecord>, String> {
    with_db!(state, |db| db.save_daily_record(&date, &content))
}

#[tauri::command]
fn search_records(query: String, state: State<AppState>) -> Result<CommandResponse<Vec<db::DailyRecord>>, String> {
    with_db!(state, |db| db.search_records(&query))
}

#[tauri::command]
fn get_statistics(start_date: i64, end_date: i64, state: State<AppState>) -> Result<CommandResponse<Vec<db::ProjectStat>>, String> {
    with_db!(state, |db| db.get_statistics(start_date, end_date))
}

#[tauri::command]
fn get_project_total_minutes(project_id: String, state: State<AppState>) -> Result<CommandResponse<i64>, String> {
    with_db!(state, |db| db.get_project_total_minutes(&project_id))
}

#[tauri::command]
fn get_monthly_sessions(year: i32, month: i32, state: State<AppState>) -> Result<CommandResponse<Vec<db::DailySessionStat>>, String> {
    with_db!(state, |db| db.get_monthly_sessions(year, month))
}

#[tauri::command]
fn get_setting(key: String, state: State<AppState>) -> Result<CommandResponse<Option<String>>, String> {
    with_db!(state, |db| db.get_setting(&key))
}

#[tauri::command]
fn set_setting(key: String, value: String, state: State<AppState>) -> Result<CommandResponse<()>, String> {
    with_db!(state, |db| db.set_setting(&key, &value))
}

#[tauri::command]
fn export_data(state: State<AppState>) -> Result<CommandResponse<String>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("Database not initialized")?;

    let projects = db.get_projects(true).map_err(|e| e.to_string())?;
    let archived = db.get_archived_projects().map_err(|e| e.to_string())?;
    let categories = db.get_categories().map_err(|e| e.to_string())?;
    let sessions = db.get_all_sessions().map_err(|e| e.to_string())?;
    let daily_records = db.get_all_daily_records().map_err(|e| e.to_string())?;
    let all_projects: Vec<_> = projects.into_iter().chain(archived.into_iter()).collect();

    let export = serde_json::json!({
        "projects": all_projects,
        "categories": categories,
        "sessions": sessions,
        "daily_records": daily_records,
        "exported_at": chrono::Utc::now().to_rfc3339(),
    });

    serde_json::to_string_pretty(&export).map_err(|e| e.to_string()).map(|s| CommandResponse::ok(s))
}

#[tauri::command]
fn import_data(json_data: String, state: State<AppState>) -> Result<CommandResponse<()>, String> {
    let db_guard = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_guard.as_ref().ok_or("Database not initialized")?;

    let mut data: serde_json::Value = serde_json::from_str(&json_data).map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().timestamp();
    if let Some(sessions) = data.get_mut("sessions").and_then(|s| s.as_array_mut()) {
        for session in sessions.iter_mut() {
            if session.get("ended_at").is_none() {
                let started_at = session.get("started_at").and_then(|s| s.as_i64()).unwrap_or(now);
                let minutes = (now - started_at) / 60;
                let minutes = if minutes > 0 { minutes } else { 0 };
                session["ended_at"] = serde_json::json!(now);
                session["minutes"] = serde_json::json!(minutes);
            }
        }
    }

    db.begin_transaction().map_err(|e| e.to_string())?;

    if let Err(e) = db.clear_all_data() {
        db.rollback_transaction().ok();
        return Ok(CommandResponse::err(&e.to_string()));
    }

    if let Some(categories) = data.get("categories").and_then(|c| c.as_array()) {
        for cat_val in categories {
            let name = cat_val.get("name").and_then(|n| n.as_str()).unwrap_or("Unnamed");
            if let Err(e) = db.create_category(name) {
                tracing::warn!("Failed to import category {}: {}", name, e);
            }
        }
    }

    if let Some(projects) = data.get("projects").and_then(|p| p.as_array()) {
        for project_val in projects {
            let id = project_val.get("id").and_then(|i| i.as_str()).unwrap_or("");
            let name = project_val.get("name").and_then(|n| n.as_str()).unwrap_or("Unnamed");
            let category_id = project_val.get("category_id").and_then(|c| c.as_str());
            let tags_val = project_val.get("tags").and_then(|t| t.as_array());
            let tags: Vec<String> = tags_val
                .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                .unwrap_or_default();
            let is_archived = project_val.get("is_archived").and_then(|a| a.as_bool()).unwrap_or(false);
            let display_order = project_val.get("display_order").and_then(|o| o.as_i64()).unwrap_or(0);

            if let Err(e) = db.import_project(id, name, category_id, tags, is_archived, display_order) {
                db.rollback_transaction().ok();
                return Ok(CommandResponse::err(&format!("Failed to import project {}: {}", name, e)));
            }
        }
    }

    if let Some(sessions) = data.get("sessions").and_then(|s| s.as_array()) {
        for session_val in sessions {
            let id = session_val.get("id").and_then(|i| i.as_str()).unwrap_or("");
            let project_id = session_val.get("project_id").and_then(|p| p.as_str()).unwrap_or("");
            let started_at = session_val.get("started_at").and_then(|s| s.as_i64()).unwrap_or(0);
            let ended_at = session_val.get("ended_at").and_then(|e| e.as_i64());
            let minutes = session_val.get("minutes").and_then(|m| m.as_i64());

            if let Err(e) = db.import_session(id, project_id, started_at, ended_at, minutes) {
                db.rollback_transaction().ok();
                return Ok(CommandResponse::err(&format!("Failed to import session: {}", e)));
            }
        }
    }

    if let Some(records) = data.get("daily_records").and_then(|r| r.as_array()) {
        for record_val in records {
            let id = record_val.get("id").and_then(|i| i.as_str()).unwrap_or("");
            let date = record_val.get("date").and_then(|d| d.as_str()).unwrap_or("");
            let content = record_val.get("content").and_then(|c| c.as_str());
            let created_at = record_val.get("created_at").and_then(|c| c.as_i64()).unwrap_or(0);
            let updated_at = record_val.get("updated_at").and_then(|u| u.as_i64()).unwrap_or(0);

            if let Err(e) = db.import_daily_record(id, date, content, created_at, updated_at) {
                db.rollback_transaction().ok();
                return Ok(CommandResponse::err(&format!("Failed to import daily record: {}", e)));
            }
        }
    }

    db.commit_transaction().map_err(|e| e.to_string())?;
    Ok(CommandResponse::ok(()))
}

#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.config().version.as_ref().map(|s| s.as_str()).unwrap_or("0.0.0").to_string()
}

#[tauri::command]
fn get_app_data_dir(state: State<AppState>) -> String {
    state.app_data_dir.to_string_lossy().to_string()
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    info!("Quitting application via quit_app command");
    app.exit(0);
}

#[tauri::command]
fn set_global_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<CommandResponse<()>, String> {
    let _ = app.global_shortcut().unregister_all();
    match shortcut.parse::<Shortcut>() {
        Ok(s) => match app.global_shortcut().register(s) {
            Ok(_) => {
                info!("Global shortcut set: {}", shortcut);
                Ok(CommandResponse::ok(()))
            }
            Err(e) => Ok(CommandResponse::err(&format!("Failed to register: {}", e))),
        },
        Err(e) => Ok(CommandResponse::err(&format!("Invalid shortcut: {}", e))),
    }
}

fn init_global_shortcut(app: &tauri::AppHandle, state: &AppState) {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(_) => return,
    };
    let db = match db_guard.as_ref() {
        Some(d) => d,
        None => return,
    };
    let shortcut_str = db.get_setting("global_shortcut")
        .ok()
        .flatten()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "Ctrl+Shift+Y".to_string());
    drop(db_guard);

    match shortcut_str.parse::<Shortcut>() {
        Ok(s) => {
            if let Err(e) = app.global_shortcut().register(s) {
                error!("Failed to register shortcut {}: {}", shortcut_str, e);
            } else {
                info!("Global shortcut registered: {}", shortcut_str);
            }
        }
        Err(e) => {
            error!("Invalid shortcut '{}': {}", shortcut_str, e);
        }
    }
}

fn setup_logging(app_data_dir: &PathBuf) {
    let logs_dir = app_data_dir.join("logs");
    std::fs::create_dir_all(&logs_dir).ok();

    let file_appender = RollingFileAppender::new(Rotation::DAILY, logs_dir, "yi.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    let subscriber = tracing_subscriber::registry()
        .with(filter)
        .with(fmt::layer().with_writer(non_blocking).with_ansi(false).with_target(false));

    tracing::subscriber::set_global_default(subscriber).ok();
}

fn main() {
    let app_data_dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("yi");

    std::fs::create_dir_all(&app_data_dir).ok();

    setup_logging(&app_data_dir);
    info!("Yi starting up...");
    info!("App data directory: {:?}", app_data_dir);

    std::panic::set_hook(Box::new(|panic_info| {
        error!("PANIC: {}", panic_info);
    }));

    let db = match Database::new(app_data_dir.clone()) {
        Ok(db) => {
            info!("Database initialized successfully");
            db
        }
        Err(e) => {
            error!("Failed to initialize database: {}", e);
            panic!("Database initialization failed: {}", e);
        }
    };

    let app_state = AppState {
        db: Mutex::new(Some(db)),
        app_data_dir: app_data_dir.clone(),
    };

    let result = tauri::Builder::default()
        .plugin(
            tauri_plugin_autostart::Builder::new()
                .app_name("Yi")
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|app, _payload, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(app_state)
        .setup(|app| {
            setup_tray(app.handle())?;
            init_global_shortcut(app.handle(), &app.state::<AppState>());
            info!("System tray initialized");
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
                info!("Window hidden to tray");
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_projects,
            get_archived_projects,
            create_project,
            reorder_projects,
            update_project,
            archive_project,
            unarchive_project,
            delete_project,
            get_categories,
            create_category,
            start_session,
            end_session,
            get_active_session,
            get_daily_record,
            get_daily_records_for_month,
            save_daily_record,
            search_records,
            get_statistics,
            get_project_total_minutes,
            get_monthly_sessions,
            get_setting,
            set_setting,
            export_data,
            import_data,
            get_app_version,
            get_app_data_dir,
            quit_app,
            set_global_shortcut,
        ])
        .run(tauri::generate_context!());

    if let Err(e) = result {
        error!("Failed to run Tauri application: {}", e);
        std::process::exit(1);
    }
}