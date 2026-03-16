# TEDx Feedback Platform

A production-quality real-time feedback and analytics platform for TEDx events, built with React, TypeScript, Firebase, and TailwindCSS.

Live deployment: [https://tedx-task-ji6w.onrender.com](https://tedx-task-ji6w.onrender.com)

---

## 1. What the App Does

The platform serves three distinct user roles:

**Attendees** visit a public `/feedback` page (optionally pre-filled via `?session=<id>`) and submit a star rating (1–5) plus an optional comment. They cannot read or modify feedback after submission.

**Stage Managers** log in to see a real-time dashboard for their 4 assigned sessions. Each session card shows the live response count, average rating (with a visual warning when below 3.0), and the most recent comments. A line chart (Recharts) shows daily average ratings over the past 365 days per session.

**Event Directors** see a high-level real-time overview: total responses, overall average, total 1-star ratings, and a satisfaction percentage — all read from aggregated documents, never from the raw feedback collection. A live leaderboard shows the top 5 sessions by average rating. An alert banner fires whenever a new 1-star rating arrives. The director can also request an AI-generated summary for any date.

---

## 2. Firestore Schema Design

| Collection / Document | Purpose |
|---|---|
| `users/{uid}` | Stores role, name, stageId, and assigned sessions |
| `sessions/{sessionId}` | Session metadata: title, stage, manager UID, times |
| `feedback/{feedbackId}` | Raw attendee submissions (write-once) |
| `session_stats/{sessionId}` | Aggregated counters per session (maintained by Cloud Function) |
| `event_stats/main` | Single aggregated document for event-wide metrics |
| `daily_session_stats/{sessionId}/days/{YYYY-MM-DD}` | Per-day aggregates for the graph |

### Why aggregated documents?

The `feedback` collection can grow into the millions. Reading it on every dashboard load would be expensive and slow. Instead, `onFeedbackCreate` Cloud Function updates counter documents in a single Firestore transaction whenever a new feedback doc is created. Dashboards read only the tiny aggregate documents — O(1) reads regardless of feedback volume.

---

## 3. Architecture Decisions

- **Vite + React + TypeScript** — fast HMR, strict typing throughout.
- **Firebase modular SDK (v10)** — tree-shakeable, only imports what is used.
- **Firestore real-time listeners** — `onSnapshot` on `session_stats` and `event_stats/main` gives push-based updates without polling.
- **Cloud Functions triggered on write** — keeps aggregation logic server-side and transactional; no client can manipulate stats.
- **Separate `AuthContext`** — single source of truth for auth state and user profile; routes guard against wrong-role access.
- **Role-based routing** — `ProtectedRoute` in `App.tsx` redirects unauthenticated users and wrong-role users immediately.
- **Recharts** for the daily trend graph — lightweight, composable, works well with responsive containers.

---

## 4. Security Rules Explanation

```
feedback/{feedbackId}
  allow create: if true;          // Anyone can submit (public form)
  allow read:   if stageManager owning that session, or event director
  allow update, delete: if false; // Immutable — no edits ever
```

```
session_stats / event_stats / daily_session_stats
  allow write: if false;  // Only Cloud Functions (admin SDK) write here
  allow read:  by appropriate role
```

```
sessions
  allow read: stage manager sees only their sessions; director sees all
  allow write: if false;
```

All write-path rules for aggregated collections reject client writes — only the server-side Admin SDK used by Cloud Functions can modify them.

---

## 5. AI Usage Explanation

The `generateDayReport` HTTP Cloud Function:

1. Queries the `feedback` collection for all documents on the selected date.
2. Extracts non-empty comments (capped at 150 to stay within token limits).
3. Sends a structured prompt to **OpenAI `gpt-4o-mini`** requesting a JSON response with three keys: `wentWell`, `wentWrong`, and `recommendation`.
4. Uses `response_format: { type: 'json_object' }` to guarantee parseable JSON output.

**Failure handling:**
- If no OpenAI API key is configured → returns the raw comments with a clear error message.
- If the OpenAI call throws (network, quota, etc.) → returns `summary: null` + error string.
- If JSON parsing fails → `summary` is `null`, comments are still returned.
- The frontend gracefully shows each failure mode with a distinct UI state.

### Configuring the OpenAI key

```bash
firebase functions:config:set openai.key="sk-..."
firebase deploy --only functions
```

---

## 6. Setup Instructions

### Prerequisites

- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with **Firestore**, **Authentication**, and **Functions** enabled

### 1. Install frontend dependencies

```bash
npm install
```

### 1.5 Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`

Optional (for AI day report):

- `VITE_OPENAI_API_KEY`

### 2. Start the development server

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

### Demo login credentials (dev seed)

After running the seed page at `/dev-seed`, you can log in with:

| Role | Name | Email | Password |
|---|---|---|---|
| Event Director | Alex Director | `director@tedx.dev` | `TEDx@2024!` |
| Stage Manager (Stage A) | Sam Manager | `sam@tedx.dev` | `TEDx@2024!` |
| Stage Manager (Stage B) | Jordan Manager | `jordan@tedx.dev` | `TEDx@2024!` |
| Stage Manager (Stage C) | Casey Manager | `casey@tedx.dev` | `TEDx@2024!` |

### 3. Deploy Firestore rules and indexes

```bash
firebase login
firebase use <your-project-id>
firebase deploy --only firestore
```

### 4. Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 5. Seed Firestore data

Use the Firebase Console or a seed script to create:

- A `users/{uid}` document with `role: "stage_manager"` and `sessions: ["session-001", ...]`
- Corresponding `sessions/{sessionId}` documents
- An `event_stats/main` document (can start at all zeros)

### 6. Create Firebase Auth users

In the Firebase Console → Authentication → Add user, create accounts for your Stage Managers and Event Director. Their UIDs must match the `users/{uid}` documents.

### 7. Build for production

```bash
npm run build
firebase deploy --only hosting
```

### 8. Deploy on Render

This repository includes a `render.yaml` blueprint for static deployment.

1. Push this repo to GitHub.
2. In Render, click **New +** → **Blueprint**.
3. Select this repository.
4. Render reads `render.yaml` and creates a static web service.
5. Set the environment variables in Render:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_OPENAI_API_KEY` (optional)
6. Trigger deploy.

The blueprint already includes SPA routing rewrite (`/*` → `/index.html`) so routes like `/login`, `/feedback`, `/director`, and `/stage-manager` work after refresh.

---

## 7. What I Would Improve With More Time

1. **Firebase Emulator Suite integration** — run `firebase emulators:start` in dev with a pre-seeded dataset so the full stack works offline without touching the production project.

2. **Seed script** — a one-command script to populate Firestore with realistic demo data (users, sessions, feedback) for easy local development.

3. **Pagination on the Stage Manager's comment list** — currently fetches the 5 most recent; a "load more" cursor approach would scale better.

4. **Attendee authentication** — right now attendees can create feedback without auth. Adding anonymous Firebase Auth would allow rate-limiting (one submission per session per device) and prevent spam.

5. **End-to-end tests** — Playwright tests covering the full feedback submission → Cloud Function aggregation → dashboard update loop.

6. **Export to CSV/PDF** — Event Directors would benefit from being able to export the day report as a PDF or export all feedback as CSV.

7. **Push notifications** — use Firebase Cloud Messaging to notify Stage Managers when their session drops below 3.0, instead of only showing the warning in-browser.

8. **Multi-language support** — internationalize the feedback form for non-English speakers using `react-i18next`.

9. **OpenAI streaming** — stream the AI report token-by-token to show a progressive loading experience rather than a full round-trip wait.

10. **Rate limiting on the Cloud Function** — add IP-based or auth-based rate limiting to `generateDayReport` to prevent abuse/cost overruns.
