# PowerShell script to test GET endpoint
Write-Host "Testing GET endpoint for user..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "Authorization" = "Bearer test-token-from-console"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "http://localhost:9998/api/v1/users/766de495-e4f3-4e91-a509-1a495c52e15c" `
    -Method Get `
    -Headers $headers

Write-Host "Response:" -ForegroundColor Green
$response | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "User object:" -ForegroundColor Yellow
$response.user | ConvertTo-Json -Depth 10

Write-Host ""
Write-Host "gpsEnabled: $($response.user.gpsEnabled)" -ForegroundColor Magenta
Write-Host "allowOutsideRadius: $($response.user.allowOutsideRadius)" -ForegroundColor Magenta
