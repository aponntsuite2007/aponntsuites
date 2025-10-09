@echo off
echo ===================================================
echo    SISTEMA DE ASISTENCIA BIOMÉTRICO - BUILD SCRIPT
echo    Compilando APK con conexión a MySQL Real
echo ===================================================
echo.

echo [1/5] Limpiando proyecto Flutter...
flutter clean

echo.
echo [2/5] Obteniendo dependencias...
flutter pub get

echo.
echo [3/5] Ejecutando análisis de código...
flutter analyze --no-fatal-infos

echo.
echo [4/5] Compilando APK de Release...
flutter build apk --release --target=lib/main_real.dart

echo.
echo [5/5] Verificando APK generado...
if exist "build\app\outputs\flutter-apk\app-release.apk" (
    echo ✅ APK compilado exitosamente
    echo 📍 Ubicación: build\app\outputs\flutter-apk\app-release.apk
    
    echo.
    echo 📊 Información del APK:
    for %%I in ("build\app\outputs\flutter-apk\app-release.apk") do (
        echo    Tamaño: %%~zI bytes ^(%%~zI / 1024 / 1024 MB^)
        echo    Fecha: %%~tI
    )
    
    echo.
    echo 🎯 PRÓXIMOS PASOS:
    echo   1. Instalar APK en dispositivo Android
    echo   2. Configurar IP del servidor en el dispositivo
    echo   3. Probar login con: admin@empresa.com / admin123
    echo   4. Probar captura biométrica facial
    echo.
    echo 📱 Comando para instalar via ADB:
    echo    adb install build\app\outputs\flutter-apk\app-release.apk
    echo.
    
) else (
    echo ❌ Error: No se pudo generar el APK
    echo    Revisa los logs arriba para más detalles
)

echo.
echo 🔧 CONFIGURACIÓN DE RED:
echo   - Servidor local: localhost:3001
echo   - IP de red: Actualizar en lib\config\app_config.dart
echo   - Base de datos: MySQL Real ^(attendance_system_mysql^)
echo.

pause