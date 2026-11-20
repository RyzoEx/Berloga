use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WindowEvent,
};
use tauri_plugin_updater::UpdaterExt;

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

// Update only on startup or on explicit user request; never run periodic
// background updates that could interrupt a live voice chat.
async fn check_and_install_update(app: AppHandle) {
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => {
                println!("Berloga: installing update {}", update.version);
                match update.download_and_install(
                    |_chunk_length, _total| {},
                    || {},
                ).await {
                    Ok(()) => app.restart(),
                    Err(error) => eprintln!("Berloga: update install failed: {error}"),
                }
            }
            Ok(None) => println!("Berloga: already up to date"),
            Err(error) => eprintln!("Berloga: update check failed: {error}"),
        },
        Err(error) => eprintln!("Berloga: updater unavailable: {error}"),
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Открыть Berloga", true, None::<&str>)?;
            let update = MenuItem::with_id(app, "update", "Проверить обновления", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Выйти (покинуть войс)", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &update, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Berloga")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "update" => {
                        let handle = app.clone();
                        tauri::async_runtime::spawn(check_and_install_update(handle));
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            // The updater checks once per app launch. No polling during calls.
            // Only a release newer than this installed Tauri version is applied.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(check_and_install_update(handle));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("ошибка запуска Berloga");
}
