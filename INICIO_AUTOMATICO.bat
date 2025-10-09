@echo off
title Sistema de Asistencia Biometrico - Auto Inicio
color 0A

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║     🚀 SISTEMA DE ASISTENCIA BIOMÉTRICO - AUTO INICIO    ║
echo ║     ✅ Iniciando servicios automáticamente               ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo 🔍 Verificando servicios...
echo.

REM Verificar si MySQL está corriendo
echo ⚡ 1. Verificando MySQL Server...
netstat -an | find ":3306" > nul
if %errorlevel% == 0 (
    echo    ✅ MySQL Server ya está ejecutándose en puerto 3306
) else (
    echo    ❌ MySQL Server no está corriendo
    echo    🔄 Intentando iniciar MySQL...
    net start mysql80 > nul 2>&1
    if %errorlevel% == 0 (
        echo    ✅ MySQL Server iniciado correctamente
    ) else (
        echo    ⚠️  Iniciando MySQL mediante servicios...
        sc start mysql > nul 2>&1
        timeout /t 3 > nul
        netstat -an | find ":3306" > nul
        if %errorlevel% == 0 (
            echo    ✅ MySQL Server iniciado correctamente
        ) else (
            echo    ❌ Error: No se pudo iniciar MySQL Server
            echo    💡 Inicia MySQL manualmente desde Servicios de Windows
            echo    💡 O usa MySQL Workbench/phpMyAdmin para iniciar
        )
    )
)

echo.

REM Verificar si el backend está corriendo
echo ⚡ 2. Verificando Backend Node.js...
netstat -an | find ":9999" > nul
if %errorlevel% == 0 (
    echo    ✅ Backend ya está ejecutándose en puerto 9999
) else (
    echo    🔄 Iniciando Backend...
    cd /d "C:\Bio\sistema_asistencia_biometrico\backend"
    start "Backend Server" cmd /c "PORT=9999 npm start"
    echo    ✅ Backend iniciándose en puerto 9999...
)

echo.
echo ⏳ Esperando que los servicios se estabilicen...
timeout /t 5 > nul

echo.
echo 🌐 Verificando conectividad...
curl -s http://localhost:3001/health > nul 2>&1
if %errorlevel% == 0 (
    echo    ✅ Servidor Backend responde correctamente
) else (
    echo    ⚠️  Backend aún está iniciándose, esperando...
    timeout /t 5 > nul
    curl -s http://localhost:3001/health > nul 2>&1
    if %errorlevel% == 0 (
        echo    ✅ Servidor Backend ahora responde correctamente
    ) else (
        echo    ❌ Backend no responde - revisar consola del servidor
    )
)

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║     🎯 SISTEMA LISTO PARA USAR                           ║
echo ║                                                           ║
echo ╠═══════════════════════════════════════════════════════════╣
echo ║                                                           ║
echo ║     🌐 Panel Admin: http://localhost:3001/admin-progressive.html ║
echo ║     📊 Admin Simple: http://localhost:3001/admin-simple.html    ║
echo ║     🖥️  Kiosco: http://localhost:3001/kiosk.html              ║
echo ║     ❤️  Estado: http://localhost:3001/health                   ║
echo ║                                                           ║
echo ║     💾 Base de datos: MySQL (puerto 3306)                ║
echo ║     🚀 Backend: Node.js (puerto 3001)                    ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

echo 🚀 Abriendo panel de administración...
timeout /t 2 > nul
start http://localhost:3001/admin-progressive.html

echo.
echo ✅ Sistema iniciado automáticamente
echo 💡 Usa este archivo (.bat) cada vez que quieras iniciar el sistema
echo.
pause