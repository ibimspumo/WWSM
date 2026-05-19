use std::sync::Arc;

use tauri::{AppHandle, State};

use crate::webhook::{self, WebhookConfig};
use crate::AppState;

#[tauri::command]
pub async fn webhook_apply_settings(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    port: u16,
    enabled: bool,
    bind_all: bool,
) -> Result<(), String> {
    let new_cfg = WebhookConfig {
        port,
        enabled,
        bind_all,
    };

    // Kurzschluss bei identischer Config — verhindert Race mit dem Initial-Start
    // (Frontend schickt beim Mount die Defaults; Server bindet asynchron).
    let current_cfg = state.config.lock().await.clone();
    if current_cfg.port == new_cfg.port
        && current_cfg.enabled == new_cfg.enabled
        && current_cfg.bind_all == new_cfg.bind_all
    {
        return Ok(());
    }

    webhook::restart_server(
        app,
        state.session.clone(),
        new_cfg,
        &state.webhook,
        &state.config,
    )
    .await
}

#[tauri::command]
pub fn webhook_get_local_ip() -> String {
    match local_ip_address::local_ip() {
        Ok(ip) => ip.to_string(),
        Err(_) => String::new(),
    }
}

#[tauri::command]
pub async fn webhook_arm_question(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    buffer_seconds: Option<f64>,
) -> Result<(), String> {
    let buf = buffer_seconds.unwrap_or(3.0);
    webhook::arm_question(state.session.clone(), app, buf).await;
    Ok(())
}

#[tauri::command]
pub async fn webhook_disarm_question(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    webhook::disarm_question(state.session.clone()).await;
    Ok(())
}

#[tauri::command]
pub async fn webhook_reset_session(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
) -> Result<(), String> {
    webhook::reset_session(state.session.clone(), app).await;
    Ok(())
}

#[tauri::command]
pub async fn webhook_get_status(state: State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    let cfg = state.config.lock().await.clone();
    let running = state.webhook.lock().await.is_some();
    Ok(serde_json::json!({
        "port": cfg.port,
        "enabled": cfg.enabled,
        "bindAll": cfg.bind_all,
        "running": running,
    }))
}
