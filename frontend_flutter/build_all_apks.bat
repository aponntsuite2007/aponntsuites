@echo off
REM =========================================================
REM BUILD SCRIPT - 4 APKs INDEPENDIENTES
REM =========================================================
REM Genera las 4 APKs con applicationId únicos:
REM - Employee (com.aponnt.attendance.employee)
REM - Kiosk (com.aponnt.attendance.kiosk)
REM - Medical (com.aponnt.attendance.medical)
REM - Admin (com.aponnt.attendance.admin)
REM
REM Uso: build_all_apks.bat
REM
REM Fecha: 2025-12-09
REM =========================================================

echo.
echo ========================================
echo  APONNT ECOSISTEMA INTELIGENTE
echo  Build de 4 APKs independientes
echo ========================================
echo.

REM Limpiar builds anteriores
echo [1/5] Limpiando builds anteriores...
call flutter clean
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Flutter clean fallo
    pause
    exit /b 1
)

echo.
echo [2/5] Descargando dependencias...
call flutter pub get
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Flutter pub get fallo
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Building APK 1/4: EMPLOYEE
echo ========================================
call flutter build apk --release --flavor employee --target=lib/main_employee.dart
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build de Employee fallo
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Building APK 2/4: KIOSK
echo ========================================
call flutter build apk --release --flavor kiosk --target=lib/main_kiosk.dart
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build de Kiosk fallo
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Building APK 3/4: MEDICAL
echo ========================================
call flutter build apk --release --flavor medical --target=lib/main_medical.dart
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build de Medical fallo
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Building APK 4/4: ADMIN
echo ========================================
call flutter build apk --release --flavor admin --target=lib/main_admin.dart
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build de Admin fallo
    pause
    exit /b 1
)

echo.
echo ========================================
echo  BUILDS COMPLETADOS
echo ========================================
echo.
echo APKs generados en:
echo.
echo 1. Employee: build\app\outputs\flutter-apk\app-employee-release.apk
echo    - Package: com.aponnt.attendance.employee
echo    - Titulo: Aponnt Ecosistema Inteligente - Empleados
echo.
echo 2. Kiosk:    build\app\outputs\flutter-apk\app-kiosk-release.apk
echo    - Package: com.aponnt.attendance.kiosk
echo    - Titulo: Aponnt Ecosistema Inteligente - Kiosco Biometrico
echo.
echo 3. Medical:  build\app\outputs\flutter-apk\app-medical-release.apk
echo    - Package: com.aponnt.attendance.medical
echo    - Titulo: Aponnt Ecosistema Inteligente - Area Medica
echo.
echo 4. Admin:    build\app\outputs\flutter-apk\app-admin-release.apk
echo    - Package: com.aponnt.attendance.admin
echo    - Titulo: Aponnt Ecosistema Inteligente - Administrador
echo.
echo ========================================
echo  Todas las APKs se pueden instalar simultaneamente
echo  sin pisarse porque tienen applicationId diferentes
echo ========================================
echo.

REM Copiar APKs a carpeta de distribución
echo Copiando APKs a carpeta dist...
if not exist dist mkdir dist
copy /Y build\app\outputs\flutter-apk\app-employee-release.apk dist\aponnt-employee.apk
copy /Y build\app\outputs\flutter-apk\app-kiosk-release.apk dist\aponnt-kiosk.apk
copy /Y build\app\outputs\flutter-apk\app-medical-release.apk dist\aponnt-medical.apk
copy /Y build\app\outputs\flutter-apk\app-admin-release.apk dist\aponnt-admin.apk

echo.
echo APKs tambien disponibles en: dist\
echo - aponnt-employee.apk
echo - aponnt-kiosk.apk
echo - aponnt-medical.apk
echo - aponnt-admin.apk
echo.
echo BUILD EXITOSO!
echo.
pause
