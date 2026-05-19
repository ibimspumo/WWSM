// Persistenz für User-Fragen-Overrides und Frage-Historie.
// Beide Dateien liegen im App-Data-Verzeichnis (separat vom Resource-Bundle),
// damit Edits App-Updates überleben.
//
// Pfade (Beispiel macOS):
//   ~/Library/Application Support/<bundle-id>/user-questions.json
//   ~/Library/Application Support/<bundle-id>/question-history.json

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};
use tokio::fs;

const USER_QUESTIONS_FILE: &str = "user-questions.json";
const HISTORY_FILE: &str = "question-history.json";
const HISTORY_LIMIT: usize = 200;

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct UserQuestionsFile {
    /// Edit-Overrides für Build-Default-Fragen (Schlüssel: stabile ID).
    #[serde(default)]
    pub overrides: serde_json::Map<String, Value>,
    /// User-eigene neue Fragen (Liste, jede mit eigener ID).
    #[serde(default)]
    pub additions: Vec<Value>,
    /// IDs gelöschter Build-Default-Fragen.
    #[serde(default)]
    pub tombstones: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct HistoryFile {
    #[serde(default)]
    pub entries: Vec<HistoryEntry>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryEntry {
    pub id: String,
    pub q: String,
    pub level: u8,
    #[serde(rename = "askedAt")]
    pub asked_at: i64,
}

async fn ensure_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {e}"))?;
    fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("mkdir {dir:?}: {e}"))?;
    Ok(dir)
}

async fn read_json<T: for<'de> Deserialize<'de> + Default>(
    app: &AppHandle,
    filename: &str,
) -> Result<T, String> {
    let dir = ensure_dir(app).await?;
    let path = dir.join(filename);
    match fs::read(&path).await {
        Ok(bytes) => serde_json::from_slice::<T>(&bytes)
            .map_err(|e| format!("parse {filename}: {e}")),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(T::default()),
        Err(e) => Err(format!("read {filename}: {e}")),
    }
}

async fn write_json<T: Serialize>(
    app: &AppHandle,
    filename: &str,
    data: &T,
) -> Result<(), String> {
    let dir = ensure_dir(app).await?;
    let path = dir.join(filename);
    let tmp = dir.join(format!("{filename}.tmp"));
    let bytes = serde_json::to_vec_pretty(data).map_err(|e| format!("serialize: {e}"))?;
    fs::write(&tmp, &bytes)
        .await
        .map_err(|e| format!("write tmp: {e}"))?;
    fs::rename(&tmp, &path)
        .await
        .map_err(|e| format!("rename: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn user_questions_load(app: AppHandle) -> Result<UserQuestionsFile, String> {
    read_json::<UserQuestionsFile>(&app, USER_QUESTIONS_FILE).await
}

#[tauri::command]
pub async fn user_questions_save(
    app: AppHandle,
    data: UserQuestionsFile,
) -> Result<(), String> {
    write_json(&app, USER_QUESTIONS_FILE, &data).await
}

#[tauri::command]
pub async fn history_load(app: AppHandle) -> Result<HistoryFile, String> {
    read_json::<HistoryFile>(&app, HISTORY_FILE).await
}

#[tauri::command]
pub async fn history_append(app: AppHandle, entry: HistoryEntry) -> Result<HistoryFile, String> {
    let mut file: HistoryFile = read_json(&app, HISTORY_FILE).await?;
    file.entries.push(entry);
    if file.entries.len() > HISTORY_LIMIT {
        let drop = file.entries.len() - HISTORY_LIMIT;
        file.entries.drain(0..drop);
    }
    write_json(&app, HISTORY_FILE, &file).await?;
    Ok(file)
}

#[tauri::command]
pub async fn history_clear(app: AppHandle) -> Result<(), String> {
    write_json(&app, HISTORY_FILE, &HistoryFile::default()).await
}
