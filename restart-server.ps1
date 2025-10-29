# Script para reiniciar SOLO el servidor en puerto 9998
# NO mata otros procesos Node.js (como Claude Code)

Write-Host "🔄 Reiniciando servidor en puerto 9998..." -ForegroundColor Cyan

# Obtener PIDs específicos del puerto 9998
$pids = netstat -ano | Select-String ":9998" | ForEach-Object {
    if ($_ -match "\s+(\d+)\s*$") {
        $matches[1]
    }
} | Select-Object -Unique | Where-Object { $_ -ne "0" }

Write-Host "📍 PIDs encontrados en puerto 9998: $($pids -join ', ')" -ForegroundColor Yellow

# Matar cada PID
foreach ($pid in $pids) {
    Write-Host "   ⚔️  Matando PID $pid..." -ForegroundColor Gray
    taskkill /F /PID $pid 2>$null
}

Write-Host "⏳ Esperando 3 segundos..." -ForegroundColor Gray
Start-Sleep -Seconds 3

Write-Host "✅ Procesos eliminados. Ahora iniciá el servidor manualmente:" -ForegroundColor Green
Write-Host ""
Write-Host "   cd C:\Bio\sistema_asistencia_biometrico\backend" -ForegroundColor White
Write-Host "   `$env:PORT = '9998'" -ForegroundColor White
Write-Host "   node server.js" -ForegroundColor White
Write-Host ""
