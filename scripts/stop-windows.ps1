# Stops Prelegal. The database is temporary and is discarded with the container.
Set-Location (Join-Path $PSScriptRoot "..") -ErrorAction Stop

docker compose down
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Prelegal stopped."
