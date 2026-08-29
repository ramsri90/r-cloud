// main.rs - Desktop entry point
// For mobile (Android/iOS), lib.rs is used via tauri::mobile_entry_point
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    r_cloud_lib::run();
}
