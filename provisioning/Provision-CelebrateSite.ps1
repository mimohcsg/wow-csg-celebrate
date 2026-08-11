<#
.SYNOPSIS
  Adds WoW-CSG Celebrate lists + media library to an EXISTING SharePoint site.

.DESCRIPTION
  Default target is the live Fitness site (no new site collection required):
    https://csgsystems.sharepoint.com/sites/WoWCSGFitness

  Requires PnP.PowerShell and site-owner rights on that site.

.EXAMPLE
  .\Provision-CelebrateSite.ps1
.EXAMPLE
  .\Provision-CelebrateSite.ps1 -SiteUrl "https://csgsystems.sharepoint.com/sites/WoWCSGCelebrate"
#>
[CmdletBinding()]
param(
  [string]$TenantHost = "csgsystems.sharepoint.com",

  # Default: reuse Fitness site (already exists — avoids 404 on new site)
  [string]$SiteUrl = "https://csgsystems.sharepoint.com/sites/WoWCSGFitness",

  [string]$SiteTitle = "WoW-CSG Celebrate",

  [string]$SiteAlias = "WoWCSGCelebrate",

  # Only used if -CreateNewSite is passed
  [switch]$CreateNewSite
)

$ErrorActionPreference = "Stop"

if (-not (Get-Module -ListAvailable -Name PnP.PowerShell)) {
  Write-Host "Installing PnP.PowerShell..." -ForegroundColor Yellow
  Install-Module PnP.PowerShell -Scope CurrentUser -Force -AllowClobber
}

Import-Module PnP.PowerShell

if ($CreateNewSite) {
  $SiteUrl = "https://$TenantHost/sites/$SiteAlias"
  Write-Host "CreateNewSite requested → $SiteUrl" -ForegroundColor Cyan
  try {
    Connect-PnPOnline -Url $SiteUrl -Interactive
    Write-Host "Connected to existing Celebrate site." -ForegroundColor Green
  }
  catch {
    Write-Host "Site missing — creating communication site via admin center..." -ForegroundColor Yellow
    $adminUrl = "https://$($TenantHost.Replace('.sharepoint.com', '-admin.sharepoint.com'))"
    Connect-PnPOnline -Url $adminUrl -Interactive
    New-PnPSite -Type CommunicationSite -Title $SiteTitle -Url $SiteUrl -Lcid 1033 | Out-Null
    Start-Sleep -Seconds 5
    Connect-PnPOnline -Url $SiteUrl -Interactive
    Write-Host "Site created." -ForegroundColor Green
  }
}
else {
  Write-Host "Using existing site: $SiteUrl" -ForegroundColor Cyan
  Write-Host "(This avoids creating /sites/WoWCSGCelebrate which currently 404s)" -ForegroundColor DarkGray
  Connect-PnPOnline -Url $SiteUrl -Interactive
  Write-Host "Connected." -ForegroundColor Green
}

function Ensure-TextField {
  param($List, $InternalName, $DisplayName, [int]$Max = 255, [switch]$Required)
  $f = Get-PnPField -List $List -Identity $InternalName -ErrorAction SilentlyContinue
  if (-not $f) {
    Add-PnPField -List $List -DisplayName $DisplayName -InternalName $InternalName -Type Text -AddToDefaultView | Out-Null
    if ($Required) { Set-PnPField -List $List -Identity $InternalName -Values @{ Required = $true } }
  }
}

function Ensure-NoteField {
  param($List, $InternalName, $DisplayName)
  $f = Get-PnPField -List $List -Identity $InternalName -ErrorAction SilentlyContinue
  if (-not $f) {
    Add-PnPField -List $List -DisplayName $DisplayName -InternalName $InternalName -Type Note -AddToDefaultView | Out-Null
  }
}

function Ensure-NumberField {
  param($List, $InternalName, $DisplayName)
  $f = Get-PnPField -List $List -Identity $InternalName -ErrorAction SilentlyContinue
  if (-not $f) {
    Add-PnPField -List $List -DisplayName $DisplayName -InternalName $InternalName -Type Number -AddToDefaultView | Out-Null
  }
}

function Ensure-DateField {
  param($List, $InternalName, $DisplayName)
  $f = Get-PnPField -List $List -Identity $InternalName -ErrorAction SilentlyContinue
  if (-not $f) {
    Add-PnPField -List $List -DisplayName $DisplayName -InternalName $InternalName -Type DateTime -AddToDefaultView | Out-Null
  }
}

# --- Posts list ---
$posts = Get-PnPList -Identity "CelebratePosts" -ErrorAction SilentlyContinue
if (-not $posts) {
  New-PnPList -Title "CelebratePosts" -Template GenericList -OnQuickLaunch | Out-Null
  $posts = Get-PnPList -Identity "CelebratePosts"
  Write-Host "Created list CelebratePosts" -ForegroundColor Green
}
Ensure-NoteField $posts "Caption" "Caption"
Ensure-TextField $posts "AuthorEmail" "Author Email" -Required
Ensure-TextField $posts "AuthorName" "Author Name"
Ensure-TextField $posts "AuthorAvatar" "Author Avatar" 500
Ensure-NoteField $posts "MediaJson" "Media JSON"
Ensure-NumberField $posts "LikeCount" "Like Count"
Ensure-NumberField $posts "CommentCount" "Comment Count"
Ensure-TextField $posts "Hashtags" "Hashtags" 500

# --- Comments ---
$comments = Get-PnPList -Identity "CelebrateComments" -ErrorAction SilentlyContinue
if (-not $comments) {
  New-PnPList -Title "CelebrateComments" -Template GenericList | Out-Null
  $comments = Get-PnPList -Identity "CelebrateComments"
  Write-Host "Created list CelebrateComments" -ForegroundColor Green
}
Ensure-TextField $comments "PostId" "Post Id" -Required
Ensure-NoteField $comments "CommentText" "Comment Text"
Ensure-TextField $comments "AuthorEmail" "Author Email" -Required
Ensure-TextField $comments "AuthorName" "Author Name"
Ensure-TextField $comments "AuthorAvatar" "Author Avatar" 500

# --- Likes ---
$likes = Get-PnPList -Identity "CelebrateLikes" -ErrorAction SilentlyContinue
if (-not $likes) {
  New-PnPList -Title "CelebrateLikes" -Template GenericList | Out-Null
  $likes = Get-PnPList -Identity "CelebrateLikes"
  Write-Host "Created list CelebrateLikes" -ForegroundColor Green
}
Ensure-TextField $likes "PostId" "Post Id" -Required
Ensure-TextField $likes "AuthorEmail" "Author Email" -Required

# --- Stories (24h) ---
$stories = Get-PnPList -Identity "CelebrateStories" -ErrorAction SilentlyContinue
if (-not $stories) {
  New-PnPList -Title "CelebrateStories" -Template GenericList | Out-Null
  $stories = Get-PnPList -Identity "CelebrateStories"
  Write-Host "Created list CelebrateStories" -ForegroundColor Green
}
Ensure-TextField $stories "AuthorEmail" "Author Email" -Required
Ensure-TextField $stories "AuthorName" "Author Name"
Ensure-TextField $stories "AuthorAvatar" "Author Avatar" 500
Ensure-TextField $stories "MediaUrl" "Media Url" 500
Ensure-DateField $stories "ExpiresAt" "Expires At"

# --- Media library ---
$lib = Get-PnPList -Identity "CelebrateMedia" -ErrorAction SilentlyContinue
if (-not $lib) {
  New-PnPList -Title "CelebrateMedia" -Template DocumentLibrary -OnQuickLaunch | Out-Null
  Write-Host "Created library CelebrateMedia" -ForegroundColor Green
}

Write-Host ""
Write-Host "Provisioning complete on:" -ForegroundColor Green
Write-Host "  $SiteUrl"
Write-Host ""
Write-Host "Next:"
Write-Host "  1) Confirm lists under Site contents (CelebratePosts, CelebrateMedia, ...)"
Write-Host "  2) Entra app + .env.local (see README)"
Write-Host "  3) npm run build → upload dist to Site Assets / CelebrateApp"
Write-Host "  App URL: $SiteUrl/SiteAssets/CelebrateApp/index.html"
