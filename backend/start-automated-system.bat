@echo off
REM ═══════════════════════════════════════════════════════════════
REM INICIAR SISTEMA AUTOMATIZADO 100% - Ollama ↔ Claude Code
REM ═══════════════════════════════════════════════════════════════

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  🚀 SISTEMA AUTOMATIZADO 100%% - INICIANDO                   ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Verificar que estamos en el directorio correcto
if not exist "package.json" (
    echo ❌ ERROR: No estás en el directorio backend
    echo    Ejecuta este script desde: C:\Bio\sistema_asistencia_biometrico\backend
    pause
    exit /b 1
)

echo 📋 REQUISITOS:
echo    1. Node.js instalado ✅
echo    2. PostgreSQL corriendo ✅
echo    3. Dependencias instaladas (npm install) ✅
echo.

REM Verificar si el servidor ya está corriendo
netstat -ano | findstr :9998 > nul
if %errorlevel% == 0 (
    echo ⚠️  El servidor ya está corriendo en puerto 9998
    echo    ¿Quieres reiniciar? (s/n)
    set /p RESTART=
    if /i "%RESTART%" == "s" (
        echo 🔄 Matando proceso anterior...
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9998') do (
            taskkill /F /PID %%a > nul 2>&1
        )
        timeout /t 2 /nobreak > nul
    ) else (
        echo ⏭️  Omitiendo inicio de servidor
        goto :SKIP_SERVER
    )
)

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  PASO 1: Iniciar servidor backend (WebSocket)                ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

start "Backend Server (Port 9998)" cmd /k "cd /d %CD% && set PORT=9998 && npm start"

echo ✅ Servidor iniciado en nueva ventana
echo ⏳ Esperando 5 segundos para que el servidor se levante...
timeout /t 5 /nobreak > nul

:SKIP_SERVER

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  PASO 2: Iniciar Claude Code WebSocket Client (Reparador)    ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

start "Claude Code Agent" cmd /k "cd /d %CD% && node claude-code-websocket-client.js"

echo ✅ Claude Code Agent iniciado en nueva ventana
timeout /t 2 /nobreak > nul

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  PASO 3: ¿Qué tipo de testing quieres ejecutar?              ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo Opciones:
echo   [1] Demo rápido (crea tickets de ejemplo)
echo   [2] Daemon continuo 24/7 (testing cada 30 min)
echo   [3] No iniciar testing ahora (solo servidor + agent)
echo.
set /p TESTING_OPTION="Elige opción (1/2/3): "

if "%TESTING_OPTION%" == "1" (
    echo.
    echo 🧪 Iniciando demo de tickets...
    start "Ollama Ticket Demo" cmd /k "cd /d %CD% && node demo-ticket-system.js"
    echo ✅ Demo iniciado en nueva ventana
)

if "%TESTING_OPTION%" == "2" (
    echo.
    echo 🔁 Iniciando daemon de testing 24/7...
    start "Ollama Testing Daemon" cmd /k "cd /d %CD% && node ollama-testing-daemon.js"
    echo ✅ Daemon iniciado en nueva ventana
    echo.
    echo 💡 SUGERENCIA: Para producción, usa PM2:
    echo    pm2 start ollama-testing-daemon.js --name "ollama-tester"
    echo    pm2 start claude-code-websocket-client.js --name "claude-code-agent"
    echo    pm2 save
)

if "%TESTING_OPTION%" == "3" (
    echo.
    echo ⏭️  Testing no iniciado
    echo.
    echo Para iniciar manualmente más tarde:
    echo    node demo-ticket-system.js              (demo)
    echo    node ollama-testing-daemon.js           (daemon 24/7)
)

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║  ✅ SISTEMA AUTOMATIZADO INICIADO                             ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo 📊 ESTADO DEL SISTEMA:
echo.

REM Verificar servidor
netstat -ano | findstr :9998 > nul
if %errorlevel% == 0 (
    echo    🟢 Servidor backend: CORRIENDO (puerto 9998)
) else (
    echo    🔴 Servidor backend: NO DETECTADO
)

REM Contar ventanas abiertas
tasklist | findstr "node.exe" > nul
if %errorlevel% == 0 (
    echo    🟢 Agentes Node.js: CORRIENDO
) else (
    echo    🔴 Agentes Node.js: NO DETECTADOS
)

echo.
echo 🎯 PRÓXIMOS PASOS:
echo.
echo    1. Espera a que Ollama detecte errores (automático)
echo    2. Claude Code recibirá notificación vía WebSocket
echo    3. Claude Code reparará automáticamente
echo    4. Ollama re-testeará y cerrará tickets exitosos
echo    5. El ciclo se repite cada 30 minutos
echo.
echo 📝 MONITOREAR EL SISTEMA:
echo.
echo    - Revisar ventanas abiertas para ver logs en tiempo real
echo    - Archivo de notificaciones: .claude-notifications\latest-report.json
echo    - Base de datos: SELECT * FROM testing_tickets;
echo.
echo 🛑 DETENER EL SISTEMA:
echo.
echo    - Cerrar todas las ventanas de CMD abiertas
echo    - O ejecutar: taskkill /F /IM node.exe (CUIDADO: mata TODOS los procesos Node)
echo.
echo 📖 DOCUMENTACIÓN:
echo.
echo    - backend\AUTOMATIZACION-100-WEBSOCKET.md (guía completa)
echo    - backend\COMO-USAR-TICKETS-CLAUDE-CODE.md (opciones del sistema)
echo    - backend\.claude-notifications\README.md (cómo funciona)
echo.

pause
