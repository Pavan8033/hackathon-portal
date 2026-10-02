# Deploying the Hackathon Portal to Vercel & Render (Zero Firebase Required)

This portal is built as a high-performance React 19 + Vite Single Page Application (SPA). It is completely decoupled from any mandatory Firebase deployment and runs out-of-the-box on **Vercel**, **Render**, **Netlify**, or any static hosting platform.

---

## 🚀 Option 1: Deploy to Vercel (Recommended, Fastest)

### Method A: Deploy via GitHub (1-Click)
1. Push your repository to GitHub / GitLab / Bitbucket:
   ```bash
   git add .
   git commit -m "Add bulk problem import, participant passwords, and event controls"
   git push origin main
   ```
2. Open [vercel.com](https://vercel.com) and log in.
3. Click **"Add New..."** -> **"Project"**.
4. Import your Git repository.
5. Vercel automatically detects Vite:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Click **"Deploy"**.
7. In ~30 seconds, your site is live with an SSL HTTPS domain (e.g., `https://your-hackathon.vercel.app`).

### Method B: Deploy via Vercel CLI
Run directly in your terminal:
```bash
npx vercel
```
Follow the interactive prompts (defaults work automatically). For production:
```bash
npx vercel --prod
```

> **Note on Client Routing**: The included [vercel.json](file:///c:/Users/dpava/problem%20statement%20release/vercel.json) rewrites all deep URLs (like `/participant/problems`, `/admin/problems`, `/login`) to `/index.html` so client navigation never returns 404s.

---

## 🌐 Option 2: Deploy to Render

### Method A: Static Site via Render Dashboard
1. Push code to your GitHub repository.
2. Go to [dashboard.render.com](https://dashboard.render.com).
3. Click **"New +"** -> **"Static Site"**.
4. Connect your GitHub repository.
5. Set the build parameters:
   - **Name**: `hackathon-portal`
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
6. In **"Redirects / Rewrites"**, add:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
7. Click **"Create Static Site"**.

### Method B: Deploy via Blueprint (`render.yaml`)
Because this repository includes [render.yaml](file:///c:/Users/dpava/problem%20statement%20release/render.yaml), you can:
1. In Render, click **"New +"** -> **"Blueprint"**.
2. Select your repository.
3. Render will automatically read `render.yaml` and configure the static build, SPA rewrites, and asset cache headers.

---

## 🔑 Operational Features Summary

| Feature | Details |
|---|---|
| **Bulk Problem Upload** | Upload `.csv`, `.xlsx`, `.xls`, or `.pdf` directly on the Admin Problems page. Automatically extracts Problem ID, Title, Category, Difficulty, Description. |
| **Participant Login** | Import rosters with `team id`, `team name`, `password`. Login checks `team id` as username and individual team `password`. Non-registered credentials cannot log in. |
| **Event Creation & Limits** | Configure Event Name, Club Name, Club Logo, Event Banner, and Problem Selection Limit (default: 2) in Admin Settings. |
| **First-Come, First-Served** | Once [N] teams select a problem statement, other teams receive a polite message stating the problem is at full capacity, and the button is safely disabled. |
| **Manual Assignment** | Admin can manually assign or reassign any problem statement to any team, with optional limit override. |
| **Session Reset & Credential Revoke** | Clicking "Delete Session" purges all participant records, credentials, and selections, immediately invalidating active logins. |
| **No Firebase Required** | 100% resilient browser persistence with real-time state synchronization. Firebase is entirely optional. |
