@echo off
echo Matando TODOS los procesos Node.js excepto Claude Code...

REM Obtener PID de Claude Code (generalmente el más viejo)
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /NH ^| find /I "node.exe" ^| head -1') do set CLAUDE_PID=%%i

REM Matar todos los Node.js EXCEPTO el primero (Claude Code)
for /f "skip=1 tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /NH ^| find /I "node.exe"') do (
    echo Matando PID %%i
    taskkill /F /PID %%i 2>nul
)

echo Esperando 3 segundos...
timeout /t 3 /nobreak >nul

echo Levantando servidor en puerto 9998...
cd /d C:\Bio\sistema_asistencia_biometrico\backend
PORT=9998 npm start
