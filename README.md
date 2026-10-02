# Hackathon Problem Statement Portal

A mission-critical challenge release and team problem selection platform designed for university and enterprise hackathons. Built with React 19, TypeScript, Tailwind CSS, and Firebase.

Designed around a **Minimal Professional** aesthetic featuring Warm Ivory (`#F7F5EF`), Deep Forest Green (`#164A36`), refined typography, and strict real-data integrity.

---

## Key Features

### For Hackathon Participants
- **Secure Team Authentication**: Password-less credential authorization via Team Name and Lead Registration Number with client-side SHA-256 validation.
- **Challenge Explorer & Search**: Instant filter and search across domains, difficulty levels, and file types.
- **Official Specification Dossiers**: Comprehensive problem details, evaluation criteria, deliverables, and official downloadable files (`.pdf`, `.docx`, `.xlsx`).
- **Atomic One-Problem Selection**: Strict one-selection-per-team enforcement backed by Firestore transactions. Once confirmed, selections are locked.
- **Real-Time Broadcasts**: Instant participant notification for announcements, mentorship office hours, and deadline alerts.
- **Countdown Release Timer**: Dynamic countdown display for scheduled releases and global release events.

### For Hackathon Organizers & Admins
- **Release Control Management (`/admin/release-control`)**:
  - Full control over problem statement release states: `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`.
  - Granular scheduling with automatic database availability transitions.
  - Bulk release actions (`PUBLISH SELECTED`, `SCHEDULE SELECTED`, `ARCHIVE SELECTED`).
  - Validation before publishing (verifies ID, Title, Description, and required attachments).
  - Global release event configuration with real-time countdown.
- **Participant Roster Import & Management (`/admin/participants`)**:
  - Batch import of participant teams from Excel (`.xlsx`, `.xls`) or CSV.
  - Case-insensitive, whitespace-normalized duplicate detection.
  - Team credential resets and individual team dossiers.
- **Team Selection Monitoring (`/admin/selections`)**:
  - Real-time live table of confirmed team selections.
  - Multi-condition selection window switch (`OPEN` / `CLOSED`) and deadline enforcement.
  - Administrative selection resets with mandatory reason recording and audit logging.
- **Data Integrity & Cleanup Tool (`/admin/data-integrity`)**:
  - Detection of duplicate teams, duplicate problems, and orphaned selections.
  - Safe, confirmed remediation actions without automated silent data deletion.
- **Live Analytics & Export (`/admin/analytics`)**:
  - Real metrics calculated purely from live database records (no fake/placeholder numbers).
  - Problem popularity rankings and chronological selection stream.
  - Clean CSV exports for teams, selections, and problem distributions.
- **Comprehensive Audit Trail (`auditLogs`)**:
  - Logs every critical administrative operation with timestamps, admin ID, and metadata.

---

## Tech Stack & Architecture

- **Frontend**: React 19, TypeScript 5.7, Vite 8, React Router v7
- **Styling**: Tailwind CSS, Lucide React Icons
- **Backend / Database**: Firebase Authentication, Cloud Firestore (Atomic Transactions & Listeners), Firebase Cloud Storage
- **File Parsing**: SheetJS (`xlsx`) for roster imports
- **Security**: Firestore Security Rules, Storage Security Rules, SHA-256 Credential Hashing

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── auth/           # Protected routes and role guards
│   │   ├── common/         # Countdown timer, ErrorBoundary
│   │   ├── layout/         # Navbar, Footer, AdminLayout
│   │   ├── ui/             # Buttons, Badges, Modals, ConfirmDialogs
│   ├── config/             # Hackathon configuration & identity
│   ├── context/            # AuthContext, ToastContext
│   ├── lib/                # Centralized Firebase initialization
│   ├── pages/
│   │   ├── Admin/          # Dashboard, Release Control, Problems, Selections,
│   │   │                   # Participants, Announcements, Analytics, Data Integrity, Setup
│   │   ├── Guidelines/     # Hackathon submission rules & rubric
│   │   ├── Home/           # Public landing page
│   │   ├── Login/          # Team login, Admin login
│   │   └── Participant/    # Dashboard, Explorer, Problem Detail, Announcements
│   ├── routes/             # AppRoutes with role-based routing
│   ├── services/           # Firebase services (auth, team, problem, selection,
│   │                       # announcement, audit, settings, fileParser)
│   ├── types/              # Unified TypeScript definitions
│   └── utils/              # Formatters, classes, date helpers
├── firestore.rules         # Production Firestore security rules
├── storage.rules           # Production Firebase Storage security rules
├── DEPLOYMENT.md           # Production deployment & setup guide
└── .env.example            # Environment variables template
```

---

## Local Development

### 1. Prerequisites
- Node.js 18+ and npm
- A Firebase project (or use local offline simulation)

### 2. Installation
```bash
git clone <repository-url>
cd "problem statement release"
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your Firebase credentials in `.env`.

### 4. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Documentation & Guides

| Document | Purpose |
| :--- | :--- |
| **[FINAL_AUDIT_REPORT.md](file:///c:/Users/dpava/problem%20statement%20release/FINAL_AUDIT_REPORT.md)** | Full audit results, verification statuses, and launch checklist |
| **[MANUAL_ACTIONS.md](file:///c:/Users/dpava/problem%20statement%20release/MANUAL_ACTIONS.md)** | Step-by-step actions required in the Firebase Console before launch |
| **[REAL_DATA_SETUP.md](file:///c:/Users/dpava/problem%20statement%20release/REAL_DATA_SETUP.md)** | Participant roster Excel formatting & problem statement creation guide |
| **[DEPLOYMENT.md](file:///c:/Users/dpava/problem%20statement%20release/DEPLOYMENT.md)** | Hosting instructions for Firebase CLI and Vercel |

---

## Automated Features vs. Manual Organizer Actions

### Automated by Codebase
- **Zero Mock Data**: No fake teams, fake selections, or placeholder statistics exist.
- **Atomic Locking**: Firestore transaction + `!exists()` rule prevents any team from selecting multiple problems.
- **Scheduled Releases**: Timezone-aware promotion of scheduled challenges once release timestamp arrives.
- **Credential Protection**: Automatic client-side SHA-256 salted hashing with zero plaintext passwords stored.
- **Data Normalization**: Universal spreadsheet header mapper and duplicate team name detector.
- **Sanitized Exports**: Automated CSV generation stripping passwords, registration numbers, and secrets.

### Required Manual Actions (By Organizer)
- **Firebase Provisioning**: Creating project, enabling Email/Password auth, and activating Firestore/Storage.
- **Rules Deployment**: Executing `firebase deploy --only firestore:rules,storage:rules,firestore:indexes`.
- **First Admin Setup**: Creating master organizer account at `/admin/setup`.
- **Real Data Upload**: Importing official participant Excel roster and challenge PDF dossiers.

---

## Security Notes

1. **Real Data Principle**: If data does not exist in Firebase, it is never invented. Dashboards show `0` or explicit empty states when no records exist.
2. **Atomic Selections**: Double selection is prohibited server-side using Firestore transactions.
3. **No Plaintext Passwords**: Team credentials are never stored or logged in plaintext.
4. **Timezone Standardization**: All hackathon timestamps are normalized and rendered in Indian Standard Time (`Asia/Kolkata` / `IST`).
