# Builds and starts Prelegal in Docker at http://localhost:8000.
Set-Location (Join-Path $PSScriptRoot "..") -ErrorAction Stop

docker compose up -d --build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Wait for the prelegal container's own health check, not just anything on port 8000.
Write-Host "Waiting for Prelegal to start..."
for ($i = 0; $i -lt 60; $i++) {
    $health = docker inspect -f "{{.State.Health.Status}}" prelegal 2>$null
    if ($health -eq "healthy") {
        Write-Host "Prelegal is running at http://localhost:8000"
        exit 0
    }
    Start-Sleep -Seconds 1
}
Write-Error "Prelegal did not become healthy; see: docker compose logs prelegal"
exit 1
