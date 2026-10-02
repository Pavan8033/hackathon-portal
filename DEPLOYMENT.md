# PRODUCTION DEPLOYMENT GUIDE

This document provides complete instructions for deploying the **Hackathon Problem Statement Portal** to production.

---

## 1. Hosting Architecture Overview

The portal is a high-performance Single Page Application (SPA) built with:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend & Persistence**: Google Cloud Firestore + Firebase Authentication + Firebase Storage
- **Hosting Options**: Firebase Hosting (Primary / Recommended) or Vercel / Cloudflare Pages

---

## 2. Firebase Production Setup

### Step 2.1 — Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project**, name it (e.g. `hackathon-portal-2026`).
3. Click **Create project**.

### Step 2.2 — Register Web App
1. On the project overview, click the **Web icon (`</>`)**.
2. Set nickname: `Hackathon Problem Portal`.
3. Check **Also set up Firebase Hosting for this app**.
4. Copy the `firebaseConfig` keys into `.env`.

### Step 2.3 — Enable Authentication
1. Go to **Authentication** → **Get Started** → **Sign-in method**.
2. Click **Email/Password** → toggle **Enable** → click **Save**.
3. Under **Authorized domains**, ensure your custom domain and Firebase hosting domains (`<project>.web.app`, `<project>.firebaseapp.com`) are listed.

### Step 2.4 — Provision Cloud Firestore
1. Go to **Firestore Database** → **Create database**.
2. Choose database location: `asia-south1` (Mumbai) for India / Asia/Kolkata timezone.
3. Select **Start in production mode** → click **Create**.

### Step 2.5 — Provision Cloud Storage
1. Go to **Storage** → **Get Started**.
2. Choose **Start in production mode** → Select the same regional location → click **Done**.

---

## 3. Security Rules & Indexes Deployment

Deploy the repository's production configuration using the Firebase CLI:

```bash
# 1. Install Firebase CLI globally (if not installed)
npm install -g firebase-tools

# 2. Login to Google account
firebase login

# 3. Associate local directory with your Firebase project
firebase use --add

# 4. Deploy rules and indexes
firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

### What These Rules Guarantee
- **One Problem Lock**: `teamSelections/{teamId}` can only be created if it does not already exist. It cannot be updated or deleted by participants once locked.
- **Problem Protection**: Participants can only read challenges with status `PUBLISHED`. DRAFT, SCHEDULED, and ARCHIVED challenges are inaccessible.
- **Storage Constraints**: Attachments are strictly restricted to PDF, DOC, DOCX, XLS, and XLSX under 15MB. Only authenticated organizers can upload or delete files.

---

## 4. Production Build & Deployment

### Option A: Firebase Hosting (Recommended)

1. Ensure `.env` contains your production Firebase configuration.
2. Build the optimized production bundle:
   ```bash
   npm run build
   ```
3. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```
4. Firebase will output your live URL:
   ```
   Hosting URL: https://<your-project-id>.web.app
   ```

### Option B: Vercel Deployment

1. Push your repository to GitHub / GitLab.
2. In Vercel, click **Add New** → **Project** → Import repository.
3. In **Build & Output Settings**:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. In **Environment Variables**, add:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
5. Click **Deploy**.

---

## 5. Post-Deployment Verification Checklist

Once deployed, perform this 5-minute health check:

- [ ] **Home Page Loads**: Check `https://<your-domain>/` for clean UI rendering.
- [ ] **Empty State**: Verify `/participant/problems` shows *"No problem statements have been released yet."* when no problems are published.
- [ ] **Admin Setup**: Navigate to `/admin/setup` and create your organizer account.
- [ ] **Team Import**: Upload a test roster with 2 teams at `/admin/participants`.
- [ ] **Challenge Upload**: Create 1 draft and 1 published problem statement with a PDF attachment.
- [ ] **Participant Login**: Log in with Team 1 on `/login` and confirm only the published challenge appears.
- [ ] **One-Selection Lock**: Confirm challenge selection and verify the lock badge appears and cannot be changed.
- [ ] **Admin Monitor**: Check `/admin/selections` to see Team 1's confirmed selection.
- [ ] **CSV Export**: Click **EXPORT SELECTIONS** and confirm registration numbers and secrets are NOT present in the file.
