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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
