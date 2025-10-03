@echo off
echo ============================================
echo    INICIANDO SERVIDOR BIOMÉTRICO
echo ============================================
cd C:\Bio\sistema_asistencia_biometrico\backend

REM Detener proceso previo si existe
pm2 delete bio-server 2>nul

REM Iniciar con PM2
echo Iniciando servidor con PM2...
set PORT=9999
pm2 start server.js --name "bio-server" --env PORT=9999

REM Guardar configuración
pm2 save

echo.
echo ✅ Servidor iniciado con PM2
echo 🌐 URL: http://localhost:9999/admin-progressive.html
echo 📊 Panel Admin: http://localhost:9999/admin
echo.
echo Para ver logs: pm2 logs bio-server
echo Para parar: pm2 stop bio-server
echo Para reiniciar: pm2 restart bio-server
echo.
pause