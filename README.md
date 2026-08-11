# WoW-CSG Celebrate

Shared team feed — everyone sees the same posts, stories, likes, and views.

## Hosting: Firebase (recommended)

Data persists in **Firestore** + **Cloud Storage** (not wiped on deploy).  
Requires the **Blaze** plan (set a budget alert / spend cap in Google Cloud Billing).

### One-time setup

1. Install tools:
   ```bash
   npm i -g firebase-tools
   firebase login
   ```
2. Create a Firebase project in [Firebase Console](https://console.firebase.google.com) (Blaze).
3. Enable:
   - **Firestore** (create database, production mode — rules are deployed from this repo)
   - **Storage**
   - **Functions**
4. Update `.firebaserc` with your project id:
   ```json
   { "projects": { "default": "YOUR_PROJECT_ID" } }
   ```
5. Optional admin emails (comma-separated):
   ```bash
   firebase functions:secrets:set ADMIN_EMAILS
   ```
   Or set param during deploy when prompted: `ADMIN_EMAILS=you@csgi.com`

### Deploy

```bash
npm run firebase:deploy
```

Live URL will look like:
`https://YOUR_PROJECT_ID.web.app`

### Budget tips (Blaze)

1. Google Cloud → **Billing → Budgets & alerts** → alert on $5–$10/month  
2. Spend caps (one project + one service at a time), e.g. **Cloud Functions**  
3. This app caps Functions at `maxInstances: 5` in `functions/index.mjs`

### Custom domain

Firebase Console → Hosting → **Add custom domain** (e.g. after CSG IT creates DNS for `wowcsgcelebrate.csg`).

---

## Local / Render (legacy)

Render still works with the local `server.mjs` + disk store (ephemeral on free tier).

```bash
npm ci
npm run build
npm start
```

Source: https://github.com/mimohcsg/wow-csg-celebrate
