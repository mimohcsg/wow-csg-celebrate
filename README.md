# WoW-CSG Celebrate

Shared team feed — everyone sees the same posts, stories, likes, and views.

## Hosting: Firebase (recommended)

**Project:** `csg-celebrate`  
**Live site:** https://csg-celebrate.web.app

Data persists in **Firestore** + **Cloud Storage** (not wiped on deploy).  
Cloud Functions require the **Blaze** plan on this project.

### Finish Functions / Storage (required for API)

1. Upgrade this project to Blaze:  
   https://console.firebase.google.com/project/csg-celebrate/usage/details
2. In the same console, create **Firestore** (production) and **Storage** (start in production mode — rules come from this repo).
3. Redeploy:
   ```bash
   # From project root (unset VSCODE_CWD if running inside Cursor)
   npm run build
   npm --prefix functions ci
   npx firebase deploy --project csg-celebrate
   ```

### Budget tips (Blaze)

1. Google Cloud → **Billing → Budgets & alerts** → alert on $5–$10/month  
2. Spend caps (one project + one service), e.g. **Cloud Functions** / **Cloud Run**  
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
