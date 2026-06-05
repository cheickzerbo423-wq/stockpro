# ============================================================
# deploy.ps1 -- Deploiement automatique WariGest
# Usage : .\deploy.ps1 "Description de la modification"
# ============================================================

param(
    [string]$message = "Mise a jour"
)

$projectRoot = "C:\Users\hp\Desktop\StockPro_Source\stockpro_source"
$workspace   = "C:\Users\hp\Documents\Claude\Projects\warigest\StockPro_Source\stockpro_source"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WariGest -- Deploiement automatique"   -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $projectRoot)) {
    Write-Host "ERREUR : Dossier projet introuvable : $projectRoot" -ForegroundColor Red
    exit 1
}

Write-Host "[1/3] Synchronisation des fichiers..." -ForegroundColor Yellow

$srcFrontend = "$workspace\frontend\src"
$dstFrontend = "$projectRoot\frontend\src"
if (Test-Path $srcFrontend) {
    Copy-Item -Path "$srcFrontend\*" -Destination $dstFrontend -Recurse -Force
    Write-Host "      frontend/src/ OK" -ForegroundColor Green
}

$srcBackend = "$workspace\backend\src"
$dstBackend = "$projectRoot\backend\src"
if (Test-Path $srcBackend) {
    Copy-Item -Path "$srcBackend\*" -Destination $dstBackend -Recurse -Force
    Write-Host "      backend/src/ OK" -ForegroundColor Green
}

$extraFiles = @(
    @{ s = "$workspace\frontend\vercel.json";  d = "$projectRoot\frontend\vercel.json" },
    @{ s = "$workspace\frontend\package.json"; d = "$projectRoot\frontend\package.json" },
    @{ s = "$workspace\backend\package.json";  d = "$projectRoot\backend\package.json" },
    @{ s = "$workspace\backend\.env.example";  d = "$projectRoot\backend\.env.example" }
)
foreach ($f in $extraFiles) {
    if (Test-Path $f.s) {
        Copy-Item -Path $f.s -Destination $f.d -Force
        Write-Host "      $($f.s.Split('\')[-1]) OK" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[2/3] Commit Git..." -ForegroundColor Yellow
Set-Location $projectRoot

git add .
git commit -m $message

if ($LASTEXITCODE -ne 0) {
    Write-Host "      Rien de nouveau a committer." -ForegroundColor Gray
} else {
    Write-Host "      Commit : $message" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/3] Push vers GitHub..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "      Push reussi !" -ForegroundColor Green
} else {
    Write-Host "ERREUR lors du push." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploiement lance !"                   -ForegroundColor Green
Write-Host "  Vercel  : https://vercel.com/dashboard" -ForegroundColor White
Write-Host "  Railway : https://railway.app/dashboard" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
