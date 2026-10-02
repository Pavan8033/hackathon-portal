# REAL DATA SETUP & ONBOARDING GUIDE

This guide details exactly how hackathon organizers should format, prepare, and import real data into the **Hackathon Problem Statement Portal**.

---

## 1. PARTICIPANT EXCEL / SPREADSHEET PREPARATION

The portal contains an intelligent column mapper that accepts **Excel (.xlsx, .xls)**, **CSV (.csv)**, or **Text (.txt)** rosters.

### Supported & Recommended Column Headers

You can use standard column names. The parser is case-insensitive and normalizes spaces and punctuation:

| Recommended Header | Alternative Accepted Headers | Required? | Example Value | Description |
| :--- | :--- | :---: | :--- | :--- |
| **Team Name** | `Team`, `Name`, `team_name` | **YES** | `CyberVanguard` | Unique team display name (used as Username) |
| **Team Lead Registration Number** | `Registration Number`, `Reg No`, `Lead Reg`, `regno` | **YES** | `2023BCSE0142` | Official student ID (used as Password) |
| **Team Lead Name** | `Team Lead`, `Lead Name`, `Leader` | Recommended | `Ananya Sharma` | Full name of team leader |
| **Member 2** | `Member`, `Team Members` | Optional | `Rohan Verma` | Additional member name |
| **Member 3** | `Member 3` | Optional | `Priya Nair` | Additional member name |
| **Member 4** | `Member 4` | Optional | `Kavya Iyer` | Additional member name |
| **Email** | `Lead Email`, `Contact Email` | Recommended | `ananya@univ.edu` | Team contact email address |
| **Phone** | `Mobile`, `Contact` | Optional | `+91 98765 43210` | Team phone number |
| **College** | `University`, `Institution` | Optional | `National Institute of Technology` | Academic institution or department |
| **Team ID** | `ID`, `Team Code` | Optional | `TM-2026-101` | Unique code (Auto-generated if blank) |

### Minimum Viable Spreadsheet Example (.csv or .xlsx)

```csv
Team Name,Team Lead Registration Number,Team Lead Name,Member 2,Member 3,Email,College
CodeCrusaders,2023BCSE0101,Aarav Patel,Meera Joshi,Kunal Shah,aarav@univ.edu,School of Computing
DataDynamo,2022BEEE0204,Rhea Sen,Vikram Rao,,rhea@univ.edu,Dept of Electrical
```

### Security Note on Passwords
- The portal **NEVER** stores raw registration numbers in Cloud Firestore.
- Each registration number is salted and cryptographically hashed with **SHA-256** upon import.
- Plaintext passwords will not appear in Firestore documents or exported CSV files.

---

## 2. PROBLEM STATEMENT DOCUMENTS & METADATA

### Supported Document Formats
Organizers can attach official challenge briefs in:
- **PDF (.pdf)** — Recommended for technical problem statements. Renders an interactive in-browser preview modal.
- **Word (.doc, .docx)** — Supported for editable challenge specifications with one-click download.
- **Excel (.xls, .xlsx)** — Supported for data science challenge datasets and scoring rubrics.

*Maximum file size: **15 MB** per document.*

### Problem Metadata Structure

When creating a problem statement at `/admin/problems/new`:

1. **Problem ID** (Mandatory, Unique): e.g. `PRB-2026-01`, `AI-TRACK-01`
2. **Title** (Mandatory): Clear, descriptive challenge name (e.g. `Decentralized Supply Chain Verification`)
3. **Domain Category** (Mandatory): AI/ML, Web3, Healthcare, FinTech, Open Innovation, Sustainability, etc.
4. **Difficulty**: `Beginner`, `Intermediate`, `Advanced`
5. **Detailed Description** (Mandatory): Problem background, industrial context, and constraints.
6. **Expected Deliverables / Solution**: Specific technical artifacts required from teams.
7. **Evaluation Criteria**: Scoring breakdown (e.g. Innovation 30%, Execution 40%, Presentation 30%).
8. **Tags / Technologies**: e.g. `React`, `Python`, `Solidity`, `Docker`
9. **Status**:
   - `DRAFT`: Completely hidden from participant teams.
   - `SCHEDULED`: Automatically transitions to `PUBLISHED` once release timestamp is reached.
   - `PUBLISHED`: Immediately visible to participant teams.
   - `ARCHIVED`: Retained in history but hidden from participant exploration.

---

## 3. ANNOUNCEMENTS SYSTEM

Organizers can broadcast official updates to all teams at `/admin/announcements`:

- **Title**: e.g., `Mentorship Hours Open in Lab 3`
- **Message**: Clear briefing text
- **Priority**:
  - `NORMAL`: Standard grey badge
  - `IMPORTANT`: Blue badge with highlighted borders
  - `URGENT`: High-visibility red alert card for immediate attention
- **Expiry Date** (Optional): Automatically hides outdated notices once passed.

---

## 4. STEP-BY-STEP FIRST TIME SETUP SEQUENCE

Follow this exact order on hackathon launch day:

```
[1. Create Root Admin Account (/admin/setup)]
                  │
                  ▼
[2. Log In as Organizer (/admin/login)]
                  │
                  ▼
[3. Upload Real Participant Teams (/admin/participants)]
                  │
                  ▼
[4. Create Real Problem Statements (/admin/problems/new)]
                  │
                  ▼
[5. Upload Official PDF/DOCX Documents to Firebase Storage]
                  │
                  ▼
[6. Set Status to SCHEDULED or PUBLISHED (/admin/release-control)]
                  │
                  ▼
[7. Verify Selection Window is OPEN (/admin/settings)]
                  │
                  ▼
[8. Broadcast Welcome Announcement (/admin/announcements)]
                  │
                  ▼
[9. Monitor Real-Time Team Selections (/admin/selections & /admin/analytics)]
```
