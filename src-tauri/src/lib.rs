pub mod auth;
pub mod commands;
pub mod db;

use db::{init_db, DbState};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = if cfg!(debug_assertions) && !cfg!(any(target_os = "android", target_os = "ios")) {
                // In development, save the DB to the project's root `database/database`
                let current_dir = std::env::current_dir().unwrap();
                let root_dir = if current_dir.ends_with("src-tauri") {
                    current_dir.parent().unwrap().to_path_buf()
                } else {
                    current_dir
                };
                let dev_db_dir = root_dir.join("database");
                std::fs::create_dir_all(&dev_db_dir)
                    .expect("Failed to create dev database directory");
                dev_db_dir.join("database")
            } else {
                // In production, save the DB to the standard OS App Data directory
                let app_data_dir = app
                    .path()
                    .app_data_dir()
                    .expect("Failed to get app data dir");
                std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
                app_data_dir.join("inventory.db")
            };

            let conn = init_db(db_path).expect("Failed to initialize database");
            app.manage(DbState(Mutex::new(conn)));

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::login,
            commands::get_owner_identity_settings,
            commands::update_kp_identity_code,
            commands::save_export_file,
            commands::get_categories,
            commands::add_category,
            commands::update_category,
            commands::delete_category,
            commands::get_brands,
            commands::add_brand,
            commands::update_brand,
            commands::delete_brand,
            commands::get_partners,
            commands::add_partner,
            commands::update_partner,
            commands::delete_partner,
            commands::add_partner_account,
            commands::update_partner_account,
            commands::get_locations,
            commands::save_location,
            commands::delete_location,
            commands::save_level,
            commands::delete_level,
            commands::toggle_location_active,
            commands::toggle_level_active,
            commands::get_items,
            commands::add_item,
            commands::update_item,
            commands::delete_item,
            commands::get_transactions,
            commands::add_transaction,
            commands::delete_transaction,
            commands::get_notifications,
            commands::add_notification,
            commands::mark_notification_read,
            commands::mark_all_notifications_read,
            commands::delete_notification,
            commands::google_oauth_login,
            commands::save_arxiva_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
