@echo off
echo ================================================
echo REINICIANDO SERVIDOR EN PUERTO 9998
echo ================================================
echo.

echo [1/3] Matando procesos en puerto 9998...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9998') do (
    if NOT "%%a"=="0" (
        echo    Matando PID %%a...
        taskkill /F /PID %%a >nul 2>&1
    )
)

echo.
echo [2/3] Esperando 3 segundos...
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Iniciando servidor...
cd C:\Bio\sistema_asistencia_biometrico\backend
set PORT=9998
echo.
echo ================================================
echo SERVIDOR INICIANDO EN PUERTO 9998
echo ================================================
echo.
node server.js
