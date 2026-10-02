# MANUAL ACTIONS GUIDE

This document lists every manual step that you as the hackathon organizer must perform before launching the portal. Automated code modifications cannot substitute for actions requiring your private Firebase console, credentials, or official hackathon files.

---

## A. MUST DO BEFORE LAUNCH

### 1. Supply Real Firebase Project Credentials in `.env`
1. **What you need to do**: Create a `.env` file in the project root by copying `.env.example` and paste your web app credentials.
2. **Why it is required**: The portal currently runs in local fallback mode because `.env` contains blank Firebase credentials. To connect to Cloud Firestore, Firebase Authentication, and Firebase Storage, real credentials must be supplied.
3. **Exact page/console**: Firebase Console (`https://console.firebase.google.com/`) → Project Overview → Project Settings (Gear Icon) → **Your apps** → Web app (`</>`).
4. **Exact button/menu**: Under **SDK setup and configuration**, select **Config** and copy the `firebaseConfig` object.
5. **Exact value to enter**: In `c:\Users\dpava\problem statement release\.env`:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   ```
6. **What result you should see**: Dev server terminal will display: `[Firebase] Connected successfully to project: <your-project-id>`.
7. **How to verify success**: Open browser DevTools console at `http://127.0.0.1:5173/` and verify the log `[Firebase] Connected successfully to project: ...` with no initialization warnings.

---

## B. FIREBASE CONSOLE ACTIONS

### 2. Enable Email/Password Authentication
1. **What you need to do**: Enable Email/Password provider for organizer administrative accounts.
2. **Why it is required**: Admins authenticate using Firebase Authentication email and password.
3. **Exact page/console**: Firebase Console → Select Project → **Build** menu → **Authentication**.
4. **Exact button/menu**: Click **Sign-in method** tab → click **Email/Password** → toggle **Enable** (leave Email link disabled) → click **Save**.
5. **Exact value to enter**: None (just enable the toggle).
6. **What result you should see**: **Email/Password** shows status as **Enabled** in the Sign-in providers table.
7. **How to verify success**: Go to `/admin/setup` on the portal, register the primary admin email/password, and verify the user appears in Firebase Console under the **Users** tab.

### 3. Provision Cloud Firestore Database
1. **What you need to do**: Create Cloud Firestore database in production mode.
2. **Why it is required**: To store problems, teams, selections, announcements, settings, and audit logs.
3. **Exact page/console**: Firebase Console → **Build** menu → **Firestore Database**.
4. **Exact button/menu**: Click **Create database** → Choose location (recommend `asia-south1` for India / Mumbai) → Select **Start in production mode** → click **Create**.
5. **Exact value to enter**: Location: `asia-south1` (or your nearest regional location).
6. **What result you should see**: Firestore Data tab opens showing an empty database root.
7. **How to verify success**: Creating a problem or registering an admin will write collections (`users`, `problems`, etc.) into Firestore.

### 4. Deploy Firestore Security Rules & Indexes
1. **What you need to do**: Deploy the provided `firestore.rules` and `firestore.indexes.json`.
2. **Why it is required**: Enforces database-level one-selection-per-team locking, admin authorization, and query sorting.
3. **Exact page/console**: In terminal running inside the project root:
   ```bash
   firebase login
   firebase use <your-firebase-project-id>
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   *(Alternatively, copy the exact contents of `firestore.rules` and paste into Firebase Console → Firestore Database → Rules tab → click **Publish**).*
4. **Exact button/menu**: If using Console: **Firestore Database** → **Rules** → Paste → **Publish**.
5. **Exact value to enter**: File contents of `firestore.rules`.
6. **What result you should see**: Message `Rules published successfully`.
7. **How to verify success**: Attempting unauthorized client writes from browser console will be rejected with `permission-denied`.

### 5. Provision Firebase Cloud Storage & Deploy Rules
1. **What you need to do**: Initialize Cloud Storage bucket and deploy `storage.rules`.
2. **Why it is required**: For storing official problem statements attachments (.pdf, .doc, .docx, .xls, .xlsx) up to 15MB.
3. **Exact page/console**: Firebase Console → **Build** menu → **Storage**.
4. **Exact button/menu**: Click **Get started** → choose **Start in production mode** → click **Done**.
5. **Exact value to enter**: In terminal: `firebase deploy --only storage:rules` (or paste `storage.rules` in Storage → Rules tab → click **Publish**).
6. **What result you should see**: Storage bucket active with `problem-documents/` path permissions configured.
7. **How to verify success**: In `/admin/problems/new`, upload a challenge PDF; verify it uploads and receives a download URL without errors.

---

## C. REAL DATA ACTIONS

### 6. Create Primary Organizer Admin Account
1. **What you need to do**: Navigate to `/admin/setup` and create the initial root organizer account.
2. **Why it is required**: To gain admin privileges without hardcoding credentials in the source code.
3. **Exact page/console**: Web Browser → `http://127.0.0.1:5173/admin/setup` (or `https://<your-domain>/admin/setup`).
4. **Exact button/menu**: Fill in **Admin Full Name**, **Official Email**, **Secure Password** (min 6 chars), and click **INITIALIZE ADMINISTRATOR ACCOUNT**.
5. **Exact value to enter**: Your official hackathon email and strong master password.
6. **What result you should see**: Redirected to `/admin` operations dashboard with active session `Organizer Admin`.
7. **How to verify success**: Check Firebase Console → Authentication → Users to see your admin account UID.

### 7. Import Real Participant Teams Roster
1. **What you need to do**: Upload your participant spreadsheet (.xlsx, .xls, or .csv).
2. **Why it is required**: To register real teams so they can log in using their Team Name and Team Lead Registration Number.
3. **Exact page/console**: Portal → `/admin/participants` → Click **IMPORT PARTICIPANTS**.
4. **Exact button/menu**: Drag & drop or browse your file → verify the preview summary (valid rows, duplicates, warnings) → click **IMPORT TEAMS**.
5. **Exact value to enter**: An Excel or CSV spreadsheet containing columns:
   `Team Name`, `Team Lead Registration Number`, `Team Lead Name`, `Member 2`, `Member 3`, `Member 4`, `Email`, `Phone`, `College`.
6. **What result you should see**: Toast notification `Imported X teams successfully`, with directory populated.
7. **How to verify success**: Open `/login`, enter one team name and lead registration number, and confirm participant dashboard loads.

### 8. Create & Upload Real Problem Statements
1. **What you need to do**: Add challenges with descriptions and official documents (.pdf, .docx, .xlsx).
2. **Why it is required**: Participants need access to official challenge specifications.
3. **Exact page/console**: Portal → `/admin/problems/new`.
4. **Exact button/menu**: Fill Title, Problem ID (e.g. `PRB-2026-01`), Category, Difficulty, Description, attach document file, and select Status (`DRAFT` or `PUBLISHED`) → click **SAVE PROBLEM STATEMENT**.
5. **Exact value to enter**: Official challenge details.
6. **What result you should see**: Problem statement saved and listed on `/admin/problems`.
7. **How to verify success**: Log in as a team on `/login` and confirm that only `PUBLISHED` challenges are visible on `/participant/problems`.

---

## D. DEPLOYMENT ACTIONS

### 9. Build and Deploy Production Web Bundle
1. **What you need to do**: Build the production bundle with `npm run build` and deploy to Firebase Hosting (or Vercel).
2. **Why it is required**: To make the portal accessible to all participants on a public domain with HTTPS.
3. **Exact page/console**: Local Terminal.
4. **Exact button/menu**: Run:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```
5. **Exact value to enter**: Your Firebase project name when prompted.
6. **What result you should see**: Terminal displays:
   `✔ Deploy complete!`
   `Hosting URL: https://<project-id>.web.app`
7. **How to verify success**: Open the Hosting URL on mobile, tablet, and desktop browsers to verify the live portal.

---

## E. OPTIONAL ACTIONS

### 10. Configure Global Problem Statement Release Countdown
1. **What you need to do**: Configure a unified release date and time in `/admin/release-control`.
2. **Why it is required**: If all challenges should go live at an exact time (e.g., 09:00 AM IST on hackathon day).
3. **Exact page/console**: Portal → `/admin/release-control` → **Global Release Event** card.
4. **Exact button/menu**: Set **Date**, **Time**, and click **Save Global Schedule**.
5. **Exact value to enter**: e.g., `2026-10-15` at `09:00`.
6. **What result you should see**: Participant dashboard displays live countdown timer.
7. **How to verify success**: When countdown reaches 00:00:00:00, the page automatically revalidates and displays live challenges.
