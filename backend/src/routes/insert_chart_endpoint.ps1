# Read the original file
$filePath = "C:\Bio\sistema_asistencia_biometrico\backend\src\routes\attendanceRoutes.js"
$endpointPath = "C:\Bio\sistema_asistencia_biometrico\backend\src\routes\attendanceRoutes_chart_endpoint.txt"

$content = Get-Content $filePath -Raw
$newEndpoint = Get-Content $endpointPath -Raw

# Find the position where we need to insert (before the calculateAttendanceStats function)
$pattern = "(?s)(});[\r\n]+)(\/\*\*[\r\n]+ \* Función auxiliar para calcular estadísticas de asistencia)"

if ($content -match $pattern) {
    $content = $content -replace $pattern, "`$1`r`n$newEndpoint`r`n`r`n`$2"
    Set-Content $filePath -Value $content -NoNewline
    Write-Host "✅ Endpoint insertado exitosamente"
} else {
    Write-Host "❌ No se encontró el patrón en el archivo"
}
