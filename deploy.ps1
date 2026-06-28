# RedHotDealz Deploy Script
# Run this from PowerShell to deploy the latest index.html

$repoPath = "C:\Users\johno\RedHotDealz\Red-Hot-Dealz"
$downloadPath = "$env:USERPROFILE\Downloads"

# Find the NEWEST index.html in Downloads
$files = Get-ChildItem "$downloadPath\index*.html" | Sort-Object LastWriteTime -Descending
if ($files.Count -eq 0) {
    Write-Host "ERROR: No index.html found in Downloads folder" -ForegroundColor Red
    exit
}

$newest = $files[0]
Write-Host "Found: $($newest.FullName) - Size: $($newest.Length) bytes - Modified: $($newest.LastWriteTime)" -ForegroundColor Cyan

# Copy to repo
Copy-Item $newest.FullName "$repoPath\index.html" -Force
$deployed = (Get-Item "$repoPath\index.html").Length
Write-Host "Copied to repo. Size: $deployed bytes" -ForegroundColor Green

if ($deployed -lt 100000) {
    Write-Host "WARNING: File seems too small. Check you downloaded the right file." -ForegroundColor Yellow
    exit
}

# Push to GitHub
Set-Location $repoPath
git add -f index.html
git commit -m "Deploy update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git push origin main

Write-Host "DONE - Vercel will deploy in ~60 seconds" -ForegroundColor Green
