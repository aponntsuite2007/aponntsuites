@echo off
title Sistema de Asistencia Biometrico - Auto Start
color 0A

echo ===============================================
echo  SISTEMA DE ASISTENCIA BIOMETRICO v1.0
echo  Iniciador Automatico
echo ===============================================
echo.

cd /d "C:\Bio\sistema_asistencia_biometrico\backend"

echo Verificando servidor...
netstat -an | find ":3000" >nul
if errorlevel 1 (
    echo Servidor no detectado. Iniciando...
    echo.
    start "Sistema Backend" cmd /c "npm start & pause"
    timeout /t 5
) else (
    echo Servidor ya esta corriendo en puerto 3000
)

echo.
echo Abriendo navegador...
start http://localhost:3000/launcher.html

echo.
echo Presiona cualquier tecla para salir...
pause >nul