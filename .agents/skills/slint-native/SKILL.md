---
name: slint-native
description: Engineering and architectural skill for building ultra-lightweight, 60 FPS native desktop applications using Rust, Slint UI, Tokio, and wgpu. Use when writing, reviewing, optimizing, or debugging Slint UI layouts, Slint-Rust property bindings, asynchronous Tokio bridges, and wgpu/software pixel buffer integrations.
---

# Slint & Native Rust Desktop Engineering Skill

This skill provides core guidelines, patterns, and best practices for developing native desktop applications using **Slint UI (1.9+)**, **Rust**, **Tokio**, and **wgpu**.

## 1. Slint Threading Model & Async Execution

### The Golden Rule
Slint UI operates synchronously on the main thread via its event loop (`ui.run()`). **Never perform blocking I/O, heavy computation, disk scans, or synchronous HTTP requests on the Slint thread.** Doing so drops frames below 60 FPS and freezes the UI window.

### Async Tokio Bridge Pattern
To interact with background tasks:
1. Capture a weak handle to the window: `let ui_handle = ui.as_weak();`
2. Spawn the asynchronous work on Tokio: `tokio::spawn(async move { ... });`
3. Dispatch results back to the UI thread using `slint::invoke_from_event_loop`:
   ```rust
   let ui_weak = ui.as_weak();
   tokio::spawn(async move {
       let result = omega_core::network::ping_server("mc.hypixel.net").await;
       let _ = slint::invoke_from_event_loop(move || {
           if let Some(ui) = ui_weak.upgrade() {
               ui.set_server_ping(result.ping_ms.to_string().into());
           }
       });
   });
   ```

## 2. Slint UI Architecture & Component Guidelines

### Component Modularity
- Split large UI trees into focused components (`topbar.slint`, `dock.slint`, `screens.slint`, `components.slint`).
- Pass callback handles (`callback play_clicked();`) up to `MainWindow` and bind them in `main.rs`.
- Use `ModelRc<VecModel<T>>` for dynamic lists (instances, mods, servers, logs).

### Layout & Animations
- Always declare responsive dimensions with `min-width`, `preferred-width`, `horizontal-stretch`, and `vertical-stretch`.
- Use Slint transitions with easing curves for smooth UI feel:
  ```slint
  in-out property <float> screen-opacity: 1.0;
  in-out property <length> screen-offset-y: 0px;
  animate screen-opacity { duration: 200ms; easing: ease-out; }
  animate screen-offset-y { duration: 200ms; easing: cubic-bezier(0.16, 1, 0.3, 1); }
  ```
- Button hover and press states:
  ```slint
  states [
      pressed when touch.pressed: {
          bg.background: #161b24;
      }
      hovered when touch.has-hover: {
          bg.background: #22262e;
      }
  ]
  ```

## 3. High Performance 3D & Pixel Buffer Rendering

### Image Buffer Integration
To render offscreen wgpu graphics or voxel characters into Slint:
1. Allocate a `slint::SharedPixelBuffer<slint::Rgba8Pixel>` matching the viewport dimensions.
2. Render frame into the pixel buffer using wgpu or software rasterizer.
3. Convert to `slint::Image`:
   ```rust
   let mut pixel_buffer = slint::SharedPixelBuffer::<slint::Rgba8Pixel>::new(width, height);
   // render frame into pixel_buffer.make_slice_mut() ...
   let image = slint::Image::from_rgba8(pixel_buffer);
   ui.set_character_frame(image);
   ```

## 4. Compilation Verification
Always run:
```bash
cargo check -p omega-slint
```
to verify that all `.slint` properties, models, types, and Rust bindings are strictly synchronized.
