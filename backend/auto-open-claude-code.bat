@echo off
REM ═══════════════════════════════════════════════════════════════
REM AUTO-OPEN CLAUDE CODE CON TICKETS PENDIENTES
REM ═══════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  🤖 AUTO-OPEN CLAUDE CODE - SISTEMA DE TICKETS               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Verificar si hay tickets pendientes
set REPORT_FILE=.claude-notifications\latest-report.json

if not exist "%REPORT_FILE%" (
    echo ❌ No hay reporte de tickets pendientes
    echo    Archivo no encontrado: %REPORT_FILE%
    pause
    exit /b 1
)

REM Leer cantidad de tickets pendientes
echo ✅ Reporte de tickets encontrado
echo.

REM Mostrar contenido del reporte
type "%REPORT_FILE%"
echo.
echo.

REM Preguntar si quiere abrir Claude Code
set /p OPEN_CLAUDE="¿Abrir Claude Code para reparar tickets? (y/n): "

if /i "%OPEN_CLAUDE%" neq "y" (
    echo ❌ Cancelado por usuario
    pause
    exit /b 0
)

echo.
echo 🚀 Abriendo Claude Code...
echo.
echo 📋 INSTRUCCIONES PARA CLAUDE CODE:
echo.
echo    1. Al abrir, Claude Code debería detectar automáticamente
echo       el archivo .claude-notifications/latest-report.json
echo.
echo    2. Si NO lo detecta automáticamente, ejecuta:
echo       Read C:\Bio\sistema_asistencia_biometrico\backend\.claude-notifications\latest-report.json
echo.
echo    3. Luego ejecuta el reparador de tickets:
echo       node claude-ticket-processor.js
echo.

REM Abrir Claude Code en el directorio del proyecto
REM NOTA: Ajusta la ruta al ejecutable de Claude Code según tu instalación
REM Opciones comunes:
REM - claude-code (si está en PATH)
REM - C:\Program Files\Claude Code\claude-code.exe
REM - code (si usas VSCode con extensión Claude Code)

REM OPCIÓN 1: Si Claude Code está en PATH
claude-code C:\Bio\sistema_asistencia_biometrico

REM OPCIÓN 2: Si usas VSCode con extensión
REM code C:\Bio\sistema_asistencia_biometrico

REM OPCIÓN 3: Ruta completa al ejecutable
REM "C:\Program Files\Claude Code\claude-code.exe" C:\Bio\sistema_asistencia_biometrico

pause
