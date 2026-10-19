# Bubu & Dudu — private native app starter

React Native + Expo development build + Supabase. This repository is a starter implementation, not yet a store-ready release. Chat text, basic media upload, one-time location sharing, OTP UI, RLS schema, and a WebRTC signalling starting point are included. Native call UI, push-call delivery, voice recording playback, and a complete mini-game experience need additional implementation and device testing before production.

## 0. Important privacy setup

- Use a **separate Supabase project** for Bubu & Dudu; do not reuse a shop/customer database.
- The two allowed phone numbers must be stored in `private.allowed_phone_numbers` on the server only.
- Replace `+62REPLACE_FIRST_NUMBER` and `+62REPLACE_SECOND_NUMBER` in `supabase/schema.sql` with the two numbers in E.164 format before running it. Example format: `+6281234567890`.
- Do not put a Supabase `service_role` key, TURN secret, or private allowlist in `.env` or app source. The mobile app may contain only the publishable/anon key; RLS is mandatory.
- Configure Supabase Auth > Phone provider and an SMS provider. SMS charges may apply.

## 1. Install

Install Node.js LTS, Git, Android Studio (Android SDK/emulator), and for iOS builds a Mac with Xcode. In this directory:

```bash
cp .env.example .env
# Fill in the Supabase project URL and publishable/anon key
npm install
```

In Supabase SQL Editor, run `supabase/schema.sql` after replacing both phone placeholders. Then enable Phone authentication and configure SMS OTP. Test both allowed numbers and a third number; the third must be rejected by the server trigger.

## 2. Start a native development build

```bash
npx expo prebuild
npx expo run:android
# iOS requires macOS + Xcode:
npx expo run:ios
```

`react-native-webrtc` does not work in Expo Go. Use a custom development build. If the WebRTC native module needs a config plugin for the selected Expo SDK, add a compatible plugin and regenerate native projects; verify package compatibility before upgrading Expo.

## 3. Supabase Auth notes

Use international phone format (E.164). OTP sign-in is not sufficient by itself; the SQL trigger rejects users whose phone is not on the server-side allowlist. Existing accounts should also be tested after removing/deactivating a number: production policy should additionally revoke their sessions and block requests if the account is disabled.

## 4. Current implementation scope

- Login screen: SMS OTP request and verification.
- Chat: read/send text and realtime refresh.
- Media: upload images/videos to a private bucket; metadata goes into messages. Production UI still needs signed-URL rendering and audio recording/playback.
- Location: one-time location share and a foreground live-location service helper with explicit stop function. The UI must add a visible active-sharing banner and stop button before enabling live sharing.
- Calls: WebRTC signalling scaffold. It currently uses STUN only; production calls need a TURN server, call state machine, incoming call screen, permissions, network-change handling, and device testing.
- Push notifications: not wired. Add Expo Push or native APNs/FCM plus server-side push dispatch; incoming iOS calls typically need native CallKit/PushKit integration for dependable background delivery.
- Mini games: database table is included; game UI and realtime state machine remain to be implemented.

## 5. Before production

1. Add server-side allowlist enforcement for all RPC/Edge Function entry points and account disable/revocation handling.
2. Add TURN credentials from a trusted provider or self-hosted coturn; never expose long-lived TURN secrets in the app.
3. Implement push token registration, APNs/FCM credentials, and server-side push sending.
4. Add audio recording using `expo-audio`, upload to `private-media`, and signed playback URLs.
5. Render signed URLs for media and maps for locations; expire/delete old location rows and media on a scheduled job.
6. Implement call controls (accept/reject/mute/speaker/camera switch/hang up) and visible live-location stop controls.
7. Add rate limits, audit logs, privacy policy, backup/retention settings, and security review.
8. Build and test on real Android and iPhone devices, including app killed/backgrounded, Wi-Fi/mobile transitions, denied permissions, and third-party phone rejection.

## 6. Recommended next implementation milestone

Finish the production-safe call flow and incoming-call notifications after the Supabase project and allowlist are verified. Do not distribute this starter as a finished app yet.
