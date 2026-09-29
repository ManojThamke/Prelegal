# Builds and starts Prelegal in Docker at http://localhost:8000.
Set-Location (Join-Path $PSScriptRoot "..") -ErrorAction Stop

docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Waiting for Prelegal to start..."
for ($i = 0; $i -lt 60; $i++) {
    try {
        Invoke-WebRequest -Uri "http://localhost:8000/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
        Write-Host "Prelegal is running at http://localhost:8000"
        exit 0
    } catch {
        Start-Sleep -Seconds 1
    }
}
Write-Error "Prelegal did not become healthy; see: docker compose logs prelegal"
exit 1
