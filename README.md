# WoW-CSG Celebrate (SharePoint)

Celebrate runs on your **existing Fitness site** for lists/data. The UI can be hosted on **Azure Static Web Apps** or SharePoint Site Assets.

## Your links

| What | URL |
| --- | --- |
| **Azure app (live)** | https://brave-ocean-0cee0c80f.7.azurestaticapps.net |
| **Site (Fitness + Celebrate lists)** | https://csgsystems.sharepoint.com/sites/WoWCSGFitness |
| **SharePoint-hosted app (optional)** | https://csgsystems.sharepoint.com/sites/WoWCSGFitness/SiteAssets/CelebrateApp/index.html |

> `/sites/WoWCSGCelebrate` returns **404** because that site was never created. We do not need it.

## Azure hosting

Resource group: `rg-wow-csg-celebrate` · Static Web App: `wow-csg-celebrate` (Free, East US 2)

### Finish Entra sign-in (required once)

Your account can’t create app registrations via CLI. In [Entra admin](https://entra.microsoft.com) (or ask IT):

1. App registrations → **New registration** → name `WoW-CSG Celebrate`
2. Supported account types: **This organization only**
3. SPA redirect URIs:
   - `https://brave-ocean-0cee0c80f.7.azurestaticapps.net`
   - `http://localhost:5173`
4. API permissions (Delegated) + admin consent: `User.Read`, `Sites.ReadWrite.All`, `Files.ReadWrite.All`
5. Put Client ID into `.env.local` as `VITE_MSAL_CLIENT_ID`, then:

```powershell
cd wow-csg-celebrate-sharepoint
npm run build
npx @azure/static-web-apps-cli deploy ./dist --deployment-token <token> --env production
```

Get the token: Azure Portal → Static Web App → **Manage deployment token**.

## Step 1 — Add Celebrate lists to Fitness (run this)

In PowerShell (you must be a **site owner** on Fitness):

```powershell
cd "c:\Users\ojhmim02\OneDrive - CSG Systems Inc\Documents\Mobily\live-quiz-app\wow-csg-celebrate-sharepoint\provisioning"
.\Provision-CelebrateSite.ps1
```

Sign in when prompted. Success = you see `Provisioning complete` and Site contents shows:

`CelebratePosts`, `CelebrateComments`, `CelebrateLikes`, `CelebrateStories`, `CelebrateMedia`

Check: https://csgsystems.sharepoint.com/sites/WoWCSGFitness/_layouts/15/viewlsts.aspx

### Optional: create a separate Celebrate site later

Only if SharePoint admin allows new sites:

```powershell
.\Provision-CelebrateSite.ps1 -CreateNewSite
```

Then point `.env.local` to `/sites/WoWCSGCelebrate`.

## Step 2 — Entra ID app

1. [Entra admin](https://entra.microsoft.com) → App registrations → New
2. Name: `WoW-CSG Celebrate`
3. SPA redirect URIs:
   - `http://localhost:5173`
   - `https://csgsystems.sharepoint.com/sites/WoWCSGFitness/SiteAssets/CelebrateApp/index.html`
4. Delegated Graph permissions + admin consent: `User.Read`, `Sites.ReadWrite.All`, `Files.ReadWrite.All`
5. Put Client ID + Tenant ID in `.env.local`

## Step 3 — Build & upload

```powershell
cd "c:\Users\ojhmim02\OneDrive - CSG Systems Inc\Documents\Mobily\live-quiz-app\wow-csg-celebrate-sharepoint"
npm run build
```

Upload `dist/*` → Fitness site → **Site Assets** → folder `CelebrateApp`  
Open the App URL above.
