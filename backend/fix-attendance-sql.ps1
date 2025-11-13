# Fix SQL queries in attendanceRoutes.js

$filePath = "C:\Bio\sistema_asistencia_biometrico\backend\src\routes\attendanceRoutes.js"

$content = Get-Content $filePath -Raw

# Fix 1: Change a.company_id to u.company_id in WHERE clause (line 414)
$content = $content -replace 'AND a\.company_id = :companyId', 'AND u.company_id = :companyId'

# Fix 2: Add INNER JOIN before WHERE clause in stats query (line 438)
$content = $content -replace '(avgWorkingHours"\s+FROM attendances a\s+WHERE)', '$1
      INNER JOIN users u ON a.user_id = u.user_id
      WHERE'

Set-Content $filePath -Value $content -Encoding UTF8

Write-Host "✅ Fixed attendanceRoutes.js SQL queries" -ForegroundColor Green
Write-Host "   - Changed a.company_id to u.company_id" -ForegroundColor Green
Write-Host "   - Added INNER JOIN users u in /stats/summary" -ForegroundColor Green
