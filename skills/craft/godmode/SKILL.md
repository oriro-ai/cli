---
name: godmode
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  G0DM0D3 — Expert-level mobile and data engineering at 10/10 depth, zero gaps.
  Activate for ANY iOS task (App Store Connect, TestFlight, APNs, ITMS errors,
  provisioning, BGTaskScheduler, privacy manifests, App Review, in-app purchase),
  ANY Android task (Play Console, versionCode, AAB, Play App Signing, FCM v1,
  SHA-1/OAuth, ProGuard, target SDK), ANY Expo/EAS task (eas.json, EAS Build,
  EAS Submit, SDK 54, OTA updates, config plugins, EAS errors), and ANY data task
  (PostgreSQL, Prisma 5, Cloud SQL, zero-downtime migrations, Cloud Scheduler,
  BigQuery, connection pooling, fintech data modeling, GCP secrets).
  ALWAYS trigger for: mobile builds, TestFlight, Play Store, submission errors,
  certificates, SHA-1, provisioning, APNs, EAS failures, Prisma schema, migrations,
  scheduler jobs, or any build-to-launch mobile/data work. When in doubt — use this.
---

# G0DM0D3 — Mobile & Data Engineering

Complete expert reference for iOS, Android, Expo/EAS, and GCP data engineering.
Zero gaps. Production-grade. Tuned to <project>'s exact stack.

**Stack context:** React Native + Expo SDK 54 · EAS Build/Submit · com.<project>.shield
· Next.js 14/TypeScript on Cloud Run · PostgreSQL (Cloud SQL) · Prisma ORM · GCP

---

## Routing — Which Reference to Load

| Task                                                                                           | Reference File                 |
| ---------------------------------------------------------------------------------------------- | ------------------------------ |
| iOS: App Store Connect, TestFlight, APNs, certificates, provisioning, ITMS errors, App Review  | `references/ios-launch.md`     |
| Android: Play Console, versionCode, AAB, Play App Signing, FCM, SHA-1, ProGuard                | `references/android-launch.md` |
| Expo/EAS: eas.json, EAS Build, EAS Submit, SDK 54, OTA, config plugins, EAS errors             | `references/expo-eas.md`       |
| Data: Prisma, Cloud SQL, PostgreSQL, migrations, Cloud Scheduler, BigQuery, connection pooling | `references/data-gcp.md`       |

**Load only the relevant reference(s). Don't front-load all four.**

---

## Universal Mobile Build Protocol

Before touching any build, confirm:

1. `eas.json` production profile is correct for target platform
2. `app.json` version/versionCode/buildNumber is incremented
3. `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are in repo root
4. No incompatible native packages in `package.json`
5. Secrets (API keys, signing passwords) are in EAS secrets, not committed to repo

**<project> package name:** `com.<project>.shield` — NEVER changes.
**EAS account:** `expo.dev/accounts/<project>`
**Apple Team ID:** `LZT4U6348K`
**Bundle ID:** `com.<project>.shield`
**App Store Connect App ID:** `6762309517` (note: different from Firebase iOS App ID)
**Firebase Android App ID:** `1:929418470411:android:d88ddc48cf7656271d130e`
**Firebase iOS App ID:** `1:929418470411:ios:99e76d550aaf4eff1d130e`

---

## Quick-Reference: Current Version State

| Platform         | versionCode / buildNumber | Version | Status                                                        |
| ---------------- | ------------------------- | ------- | ------------------------------------------------------------- |
| Android          | 14                        | 2.3.0   | Under Play Store review                                       |
| iOS              | 15                        | 2.3.0   | TestFlight submission FAILED — check Expo submission 595e31cf |
| Next versionCode | 15                        | 2.4.0   | Future                                                        |

**Always increment versionCode by 1 (Android) and buildNumber by 1 (iOS) for each new build.**
iOS buildNumber is a string in app.json. Android versionCode is an integer.

---

## Data Stack Quick Reference

| Component         | Detail                                                    |
| ----------------- | --------------------------------------------------------- |
| ORM               | Prisma 5.x                                                |
| DB                | Cloud SQL PostgreSQL 15                                   |
| GCP project       | <gcp-project>                                             |
| Regions           | us-central1 (primary), us-east1, asia-south1              |
| Tables            | 55+ (UnitAccount, GuardianDevice, UpiLinkedAccount, etc.) |
| Active schedulers | 61 Cloud Scheduler jobs                                   |
| Connection        | DATABASE_URL in GCP Secret Manager                        |
