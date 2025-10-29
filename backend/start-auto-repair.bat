@echo off
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║  🤖 SISTEMA DE AUTO-REPARACIÓN AUTOMÁTICA                     ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 📋 Este script iniciará el ciclo automático de reparación:
echo.
echo    1. Ejecutará tests automáticamente
echo    2. Ollama analizará errores
echo    3. Generará reportes detallados
echo    4. Sistema intentará auto-reparar
echo    5. Re-ejecutará tests
echo    6. Repetirá hasta alcanzar 90%% de éxito
echo.
echo ⚠️  NOTA: El servidor debe estar corriendo en puerto 9998
echo.
echo ⏱️  Tiempo estimado: 30-60 minutos (dependiendo de errores)
echo.
echo.
pause

echo.
echo 🚀 Iniciando agente autónomo...
echo.
node autonomous-repair-agent.js
