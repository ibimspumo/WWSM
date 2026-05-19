mod commands;
mod user_data;
mod webhook;

use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

use webhook::{VoteSession, WebhookConfig, WebhookHandle};

pub struct AppState {
    pub webhook: Mutex<Option<WebhookHandle>>,
    pub config: Mutex<WebhookConfig>,
    pub session: Arc<Mutex<VoteSession>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        // Persistiert Position/Größe/Maximized-Status pro Fenster zwischen Sessions.
        // Datei liegt unter ~/Library/Application Support/.../window-state.json (macOS)
        // bzw. %APPDATA%\...\window-state.json (Windows).
        builder = builder
            .plugin(tauri_plugin_window_state::Builder::new().build())
            .plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .setup(|app| {
            let state = Arc::new(AppState {
                webhook: Mutex::new(None),
                config: Mutex::new(WebhookConfig::default()),
                session: Arc::new(Mutex::new(VoteSession::default())),
            });
            app.manage(state.clone());

            // Webhook-Server mit Default-Config sofort starten — Frontend kann
            // später per `webhook_apply_settings` neue Werte schicken.
            let app_handle = app.handle().clone();
            let cfg = WebhookConfig::default();
            let session = state.session.clone();
            tauri::async_runtime::spawn(async move {
                if cfg.enabled {
                    match webhook::start_server(app_handle.clone(), session, cfg.clone()).await {
                        Ok(h) => {
                            if let Some(st) = app_handle.try_state::<Arc<AppState>>() {
                                *st.webhook.lock().await = Some(h);
                            }
                        }
                        Err(e) => eprintln!("Webhook-Start fehlgeschlagen: {}", e),
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::webhook_apply_settings,
            commands::webhook_get_local_ip,
            commands::webhook_arm_question,
            commands::webhook_disarm_question,
            commands::webhook_reset_session,
            commands::webhook_get_status,
            user_data::user_questions_load,
            user_data::user_questions_save,
            user_data::history_load,
            user_data::history_append,
            user_data::history_clear,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
