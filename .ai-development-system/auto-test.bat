@echo off
REM 🤖 AI AUTONOMOUS TESTING - Windows Script
REM ==========================================
REM Ejecuta ciclo completo de testing autónomo

echo.
echo ========================================
echo   AI AUTONOMOUS DEVELOPMENT - AUTO TEST
echo ========================================
echo.

cd /d "%~dp0"

REM Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js no encontrado. Instalar Node.js primero.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
echo.

REM Ejecutar CLI
echo 🚀 Iniciando testing autónomo...
echo.

node automation-cli.js full-cycle

echo.
echo ========================================
echo   TESTING COMPLETADO
echo ========================================
echo.
echo 📊 Revisar logs en: .ai-development-system\logs\
echo.

pause
