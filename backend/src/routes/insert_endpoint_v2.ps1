# Read files
$filePath = "C:\Bio\sistema_asistencia_biometrico\backend\src\routes\attendanceRoutes.js"
$endpointPath = "C:\Bio\sistema_asistencia_biometrico\backend\src\routes\attendanceRoutes_chart_endpoint.txt"

$lines = Get-Content $filePath
$newEndpoint = Get-Content $endpointPath

# Find line 450 (index 449 in 0-based array)
$insertAfterLine = 450
$newContent = @()

for ($i = 0; $i -lt $lines.Count; $i++) {
    $newContent += $lines[$i]

    if ($i -eq ($insertAfterLine - 1)) {
        # Insert blank line and new endpoint
        $newContent += ""
        $newContent += $newEndpoint
    }
}

# Write back
Set-Content $filePath -Value $newContent
Write-Host "Endpoint insertado en linea $insertAfterLine"
