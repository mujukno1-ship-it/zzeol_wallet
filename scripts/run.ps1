
param(
  [int]$Port = 8080
)
Write-Host "Running local server on http://localhost:$Port"
python -m http.server $Port -d .
