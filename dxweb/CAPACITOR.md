# Capacitor – iOS & Android (How It’s Done)

This project uses [Capacitor](https://capacitorjs.com/) to run the same Angular app inside native iOS and Android shells.

## What Was Done

1. **Dependencies** (in `dxweb`)
   - `@capacitor/core` – runtime in the app
   - `@capacitor/cli` – CLI for sync and add
   - `@capacitor/ios` – iOS native project template
   - `@capacitor/android` – Android native project template

2. **Config**
   - `capacitor.config.ts` at `dxweb` root:
     - `appId`: `com.namit.splitkit`
     - `appName`: `SplitKit`
     - `webDir`: `dist/dxweb` (Angular build output)
   - Optional `server.url` for live reload on device.

3. **Native projects**
   - `dxweb/android/` – Android app (open in Android Studio)
   - `dxweb/ios/` – iOS app (open on Mac in Xcode)

4. **Scripts** (run from `dxweb`)
   - `npm run build` – build Angular (production; may hit budget limits)
   - `npm run build:mobile` – same as above
   - `npm run cap:sync` – build production + copy web app into native projects
   - `npm run cap:sync:dev` – build development + sync (avoids budget errors, good for testing)
   - `npm run cap:open:android` – open Android project in Android Studio
   - `npm run cap:open:ios` – open iOS project in Xcode (Mac only)

## How It Works

- **Build:** Angular builds to `dist/dxweb` (HTML, JS, CSS, assets).
- **Sync:** `cap sync` copies `dist/dxweb` into each native project and updates native config.
- **Runtime:** The native app loads that web content in a WebView. Your Angular app runs the same as in the browser; Capacitor provides a bridge to native APIs when you use plugins.

## Workflow

1. **Develop (web):**  
   `npm run start` → change code → test in browser.

2. **Run on device/emulator:**
   - Build and sync:  
     `npm run cap:sync:dev` (or `cap:sync` when production build is fixed)
   - Android: `npm run cap:open:android` → run from Android Studio (emulator or device)
   - iOS (Mac): `npm run cap:open:ios` → run from Xcode (simulator or device)

3. **After code changes:**  
   Run `npm run cap:sync:dev` (or `cap:sync`) again so the native app gets the latest web build.

## Notes

- **API URL:** The app uses the same base URL as in the browser. For a real device, point to your machine’s IP or a deployed API (e.g. set in environment or `capacitor.config.ts` `server` if needed).
- **iOS:** Build and run require a Mac with Xcode and (for a real device) an Apple Developer account.
- **Production build:** If `ng build` fails on bundle/style budgets, use `cap:sync:dev` for testing, or increase budgets in `angular.json` for production.
