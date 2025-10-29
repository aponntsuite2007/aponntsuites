@echo off
echo ========================================
echo  REINICIANDO SERVIDOR CON NUEVAS RUTAS
echo ========================================
echo.

echo Matando procesos en puerto 9998...
taskkill /F /PID 9376 2>nul
taskkill /F /PID 2772 2>nul
echo.

echo Esperando 5 segundos...
timeout /t 5 /nobreak >nul
echo.

echo Levantando servidor en puerto 9998...
cd C:\Bio\sistema_asistencia_biometrico\backend
set PORT=9998
node server.js
