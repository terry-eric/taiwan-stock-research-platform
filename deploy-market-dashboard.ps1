$ErrorActionPreference = "Stop"

$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
$adminToken = [string] $env:ADMIN_SYNC_TOKEN
if ([string]::IsNullOrWhiteSpace($adminToken)) {
  throw "ADMIN_SYNC_TOKEN must be set in the current process before running this script."
}

Write-Host "Applying D1 migrations..."
& "C:\Program Files\nodejs\npx.cmd" wrangler d1 migrations apply twstock-research-db --remote

Write-Host "Deploying Worker..."
& "C:\Program Files\nodejs\npx.cmd" wrangler deploy

function Invoke-OfficialSync {
  param(
    [string] $Name,
    [string[]] $Tasks,
    [int] $IndexMonths = 12
  )

  Write-Host "Triggering official data sync: $Name..."
  $body = @{
    crawler_name = $Name
    tasks = $Tasks
    trigger = "deploy-market-dashboard"
    wait = $true
    index_months = $IndexMonths
  } | ConvertTo-Json -Compress

  Invoke-WebRequest `
    -UseBasicParsing `
    -Method Post `
    "https://claw.terry878.org/api/admin/crawler/run" `
    -Headers @{ Authorization = "Bearer $adminToken" } `
    -ContentType "application/json" `
    -Body $body
}

Invoke-OfficialSync -Name "manual-daily-price-sync" -Tasks @("daily-price")
Invoke-OfficialSync -Name "manual-monthly-revenue-sync" -Tasks @("monthly-revenue")
Invoke-OfficialSync -Name "manual-institutional-flow-sync" -Tasks @("institutional-flow")
Invoke-OfficialSync -Name "manual-market-index-sync" -Tasks @("market-index")
Invoke-OfficialSync -Name "manual-dividend-sync" -Tasks @("dividend")

Write-Host "Done. Configure GOOGLE_CLIENT_ID in Cloudflare Worker variables before using Google watchlist login."
