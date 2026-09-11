# Nova Lane

Nova Lane is a fast, one-thumb endless arcade game for Android. Shift between three cosmic lanes, dodge hazards, collect shards, unlock ships, and survive a high-intensity **Rift level every 10 levels**.

The level system is procedural: there is no final level. Speed, spawn frequency, multi-hazard probability, scoring, and Rift pressure all scale from the current level.

## What is included

- Infinite procedural levels with a harder level 10, 20, 30, and every tenth level after that
- Touch, swipe, and keyboard controls
- Responsive portrait gameplay for small and large phone screens
- Score, lives, shards, near-miss bonuses, shield power-up, and persistent progress
- Unlockable ship hangar and soft-currency economy
- Leaderboard user interface and local player score
- Rewarded-ad and in-app-purchase adapter points
- Pause, results, settings, haptics, sound preference, and onboarding copy
- Capacitor Android project with minimum SDK 29 (Android 10)
- GitHub Actions workflow that builds a debug APK and unsigned release AAB

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Create a production web build:

```bash
npm run build
```

## Android

Requirements: Android Studio, JDK 21, and Android SDK 35.

```bash
npm install
npm run android:sync
npm run android:open
```

In Android Studio, select **Build > Build Bundle(s) / APK(s)**. The project targets SDK 35 and supports Android 10/API 29 and newer.

Every push to `main` also runs the **Android Build** GitHub Action. Download `nova-lane-debug-apk` from a completed workflow run to install the debug APK.

## Production services checklist

The included monetization adapter deliberately uses simulated success in development so no accidental purchases or live ads occur. Before publishing:

1. Create the app in Google Play Console and reserve `com.novalane.game`.
2. Add Play App Signing and store the upload keystore only in encrypted GitHub secrets.
3. Replace `src/services/monetization.ts` with real Google Mobile Ads rewarded/interstitial calls and Google Play Billing product verification.
4. Create the `nova_starter_pack` in-app product, add prices/localization, and test with Play license testers.
5. Connect Google Play Games Services or a backend such as Firebase for authoritative global leaderboards. The current leaderboard is a polished demonstration board and local best-score view.
6. Add consent management, a privacy policy, age rating, Families-policy settings, and child-safe ad configuration before targeting children.
7. Replace test IDs with production IDs only after closed-track testing.

Do not trust scores or purchases reported only by the client in production; verify both on a secure backend.

## Architecture

- `src/game/NovaScene.ts` — Phaser gameplay, procedural progression, collision, scoring, and Rift rules
- `src/main.ts` — menus, hangar, leaderboard, results, pause, and settings
- `src/services/storage.ts` — Capacitor Preferences persistence
- `src/services/monetization.ts` — safe integration boundary for ads and billing
- `android/` — native Capacitor Android shell

## License

Copyright © 2026. All rights reserved. Replace this section with the license you want before accepting external contributions.
