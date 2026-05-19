// Webhook-Server für Chat-Voting (A/B/C/D).
//
// Eingangs-URL: GET/POST /vote?choice=a&username=Foo
// Dedupe pro Frage über Username (case-insensitive). Letzte Stimme zählt.
// 3-Sekunden-Puffer beim Arm: Stimmen vor `armed_at` werden verworfen, damit
// Nachzügler aus der letzten Frage nicht in die neue Runde rutschen.

use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::Arc;
use std::time::Duration;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::{get, on, MethodFilter},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};
use tokio::sync::{oneshot, Mutex};
use tokio::time::Instant;
use tower_http::cors::CorsLayer;

#[derive(Clone, Debug)]
pub struct WebhookConfig {
    pub port: u16,
    pub enabled: bool,
    pub bind_all: bool,
}

impl Default for WebhookConfig {
    fn default() -> Self {
        Self {
            port: 8080,
            enabled: true,
            bind_all: false,
        }
    }
}

pub struct WebhookHandle {
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl WebhookHandle {
    pub fn shutdown(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

/// Aktive Voting-Session. Ein `None` in `armed_at` bedeutet: kein Voting läuft.
#[derive(Default)]
pub struct VoteSession {
    pub armed_at: Option<Instant>,
    pub votes: HashMap<String, u8>, // username (lowercased) → choice 0..=3
}

impl VoteSession {
    pub fn counts(&self) -> [u32; 4] {
        let mut c = [0u32; 4];
        for v in self.votes.values() {
            if (*v as usize) < 4 {
                c[*v as usize] += 1;
            }
        }
        c
    }
    pub fn total(&self) -> u32 {
        self.votes.len() as u32
    }
}

#[derive(Clone)]
struct AxumState {
    app: AppHandle,
    session: Arc<Mutex<VoteSession>>,
}

#[derive(Deserialize)]
struct VoteParams {
    choice: Option<String>,
    username: Option<String>,
}

fn build_router(state: AxumState) -> Router {
    let any = MethodFilter::GET.or(MethodFilter::POST);
    Router::new()
        .route("/vote", on(any, handle_vote))
        .route("/", get(handle_root))
        .with_state(state)
        .layer(CorsLayer::permissive())
}

pub async fn start_server(
    app: AppHandle,
    session: Arc<Mutex<VoteSession>>,
    config: WebhookConfig,
) -> Result<WebhookHandle, String> {
    let ip = if config.bind_all {
        IpAddr::V4(Ipv4Addr::UNSPECIFIED)
    } else {
        IpAddr::V4(Ipv4Addr::LOCALHOST)
    };
    let addr = SocketAddr::new(ip, config.port);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Port {} konnte nicht gebunden werden: {}", config.port, e))?;

    let (tx, rx) = oneshot::channel();
    let router = build_router(AxumState {
        app: app.clone(),
        session,
    });

    tokio::spawn(async move {
        let server = axum::serve(listener, router).with_graceful_shutdown(async move {
            let _ = rx.await;
        });
        if let Err(e) = server.await {
            eprintln!("Webhook-Server beendet: {}", e);
        }
    });

    println!(
        "Webhook-Server läuft auf {}:{} (bind_all={})",
        ip, config.port, config.bind_all
    );

    Ok(WebhookHandle {
        shutdown_tx: Some(tx),
    })
}

// =============== Handlers ===============

async fn handle_root() -> impl IntoResponse {
    Json(json!({
        "app": "WWSM",
        "endpoints": ["/vote?choice=a&username=NAME (a|b|c|d)"]
    }))
}

async fn handle_vote(
    State(s): State<AxumState>,
    Query(params): Query<VoteParams>,
) -> impl IntoResponse {
    let raw_choice = match params.choice {
        Some(v) => v.trim().to_lowercase(),
        None => return json_err(StatusCode::BAD_REQUEST, "Parameter 'choice' fehlt"),
    };
    let choice = match raw_choice.as_str() {
        "a" | "0" => 0u8,
        "b" | "1" => 1u8,
        "c" | "2" => 2u8,
        "d" | "3" => 3u8,
        _ => return json_err(StatusCode::BAD_REQUEST, "choice muss a, b, c oder d sein"),
    };
    let raw_user = params.username.unwrap_or_default();
    let username = raw_user.trim().to_lowercase();
    if username.is_empty() {
        return json_err(StatusCode::BAD_REQUEST, "Parameter 'username' fehlt");
    }

    let mut session = s.session.lock().await;

    // Sperre: noch im 3s-Puffer ODER Voting nicht armiert?
    let now = Instant::now();
    let active = match session.armed_at {
        Some(t) => now >= t,
        None => false,
    };
    if !active {
        return json_err_status(
            StatusCode::ACCEPTED,
            "Voting nicht aktiv (Puffer oder zwischen Fragen)",
        );
    }

    // Letzte Stimme zählt
    session.votes.insert(username.clone(), choice);
    let counts = session.counts();
    let total = session.total();
    drop(session);

    let payload = json!({
        "counts": counts,
        "total": total,
    });
    let _ = s.app.emit("wwsm:chat-vote", payload.clone());

    let letter = ["A", "B", "C", "D"][choice as usize];
    (
        StatusCode::OK,
        Json(json!({
            "ok": true,
            "choice": letter,
            "username": raw_user,
            "votes": payload,
        })),
    )
        .into_response()
}

// =============== Helpers ===============

fn json_err(status: StatusCode, msg: &str) -> axum::response::Response {
    (status, Json(json!({ "ok": false, "error": msg }))).into_response()
}

fn json_err_status(status: StatusCode, msg: &str) -> axum::response::Response {
    (status, Json(json!({ "ok": false, "info": msg }))).into_response()
}

// Hilfsfunktion: Server (neu)starten basierend auf neuer Config
pub async fn restart_server(
    app: AppHandle,
    session: Arc<Mutex<VoteSession>>,
    new_cfg: WebhookConfig,
    handle_slot: &Mutex<Option<WebhookHandle>>,
    config_slot: &Mutex<WebhookConfig>,
) -> Result<(), String> {
    {
        let mut guard = handle_slot.lock().await;
        if let Some(mut h) = guard.take() {
            h.shutdown();
        }
    }

    // Socket-Freigabe abwarten
    tokio::time::sleep(Duration::from_millis(150)).await;

    if new_cfg.enabled {
        let new_handle = start_server(app.clone(), session, new_cfg.clone()).await?;
        *handle_slot.lock().await = Some(new_handle);
    }

    *config_slot.lock().await = new_cfg;
    Ok(())
}

/// Wirft die alten Stimmen weg und armiert für eine neue Frage mit 3s-Puffer.
pub async fn arm_question(
    session: Arc<Mutex<VoteSession>>,
    app: AppHandle,
    buffer_seconds: f64,
) {
    let mut s = session.lock().await;
    s.votes.clear();
    s.armed_at = Some(Instant::now() + Duration::from_millis((buffer_seconds * 1000.0) as u64));
    let payload = json!({ "counts": [0, 0, 0, 0], "total": 0 });
    drop(s);
    let _ = app.emit("wwsm:chat-vote", payload);
}

/// Stoppt das Voting für die aktuelle Frage (keine neuen Stimmen mehr).
pub async fn disarm_question(session: Arc<Mutex<VoteSession>>) {
    let mut s = session.lock().await;
    s.armed_at = None;
}

/// Reset (z. B. Zurück ins Menü).
pub async fn reset_session(session: Arc<Mutex<VoteSession>>, app: AppHandle) {
    let mut s = session.lock().await;
    s.votes.clear();
    s.armed_at = None;
    drop(s);
    let payload: Value = json!({ "counts": [0, 0, 0, 0], "total": 0 });
    let _ = app.emit("wwsm:chat-vote", payload);
}
