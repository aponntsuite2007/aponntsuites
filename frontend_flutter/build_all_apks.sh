#!/bin/bash

# =========================================================
# BUILD SCRIPT - 4 APKs INDEPENDIENTES
# =========================================================
# Genera las 4 APKs con applicationId únicos:
# - Employee (com.aponnt.attendance.employee)
# - Kiosk (com.aponnt.attendance.kiosk)
# - Medical (com.aponnt.attendance.medical)
# - Admin (com.aponnt.attendance.admin)
#
# Uso: ./build_all_apks.sh
#
# Fecha: 2025-12-09
# =========================================================

echo ""
echo "========================================"
echo " APONNT ECOSISTEMA INTELIGENTE"
echo " Build de 4 APKs independientes"
echo "========================================"
echo ""

# Limpiar builds anteriores
echo "[1/5] Limpiando builds anteriores..."
flutter clean
if [ $? -ne 0 ]; then
    echo "ERROR: Flutter clean falló"
    exit 1
fi

echo ""
echo "[2/5] Descargando dependencias..."
flutter pub get
if [ $? -ne 0 ]; then
    echo "ERROR: Flutter pub get falló"
    exit 1
fi

echo ""
echo "========================================"
echo " Building APK 1/4: EMPLOYEE"
echo "========================================"
flutter build apk --release --flavor employee --target=lib/main_employee.dart
if [ $? -ne 0 ]; then
    echo "ERROR: Build de Employee falló"
    exit 1
fi

echo ""
echo "========================================"
echo " Building APK 2/4: KIOSK"
echo "========================================"
flutter build apk --release --flavor kiosk --target=lib/main_kiosk.dart
if [ $? -ne 0 ]; then
    echo "ERROR: Build de Kiosk falló"
    exit 1
fi

echo ""
echo "========================================"
echo " Building APK 3/4: MEDICAL"
echo "========================================"
flutter build apk --release --flavor medical --target=lib/main_medical.dart
if [ $? -ne 0 ]; then
    echo "ERROR: Build de Medical falló"
    exit 1
fi

echo ""
echo "========================================"
echo " Building APK 4/4: ADMIN"
echo "========================================"
flutter build apk --release --flavor admin --target=lib/main_admin.dart
if [ $? -ne 0 ]; then
    echo "ERROR: Build de Admin falló"
    exit 1
fi

echo ""
echo "========================================"
echo " BUILDS COMPLETADOS"
echo "========================================"
echo ""
echo "APKs generados en:"
echo ""
echo "1. Employee: build/app/outputs/flutter-apk/app-employee-release.apk"
echo "   - Package: com.aponnt.attendance.employee"
echo "   - Titulo: Aponnt Ecosistema Inteligente - Empleados"
echo ""
echo "2. Kiosk:    build/app/outputs/flutter-apk/app-kiosk-release.apk"
echo "   - Package: com.aponnt.attendance.kiosk"
echo "   - Titulo: Aponnt Ecosistema Inteligente - Kiosco Biométrico"
echo ""
echo "3. Medical:  build/app/outputs/flutter-apk/app-medical-release.apk"
echo "   - Package: com.aponnt.attendance.medical"
echo "   - Titulo: Aponnt Ecosistema Inteligente - Área Médica"
echo ""
echo "4. Admin:    build/app/outputs/flutter-apk/app-admin-release.apk"
echo "   - Package: com.aponnt.attendance.admin"
echo "   - Titulo: Aponnt Ecosistema Inteligente - Administrador"
echo ""
echo "========================================"
echo " Todas las APKs se pueden instalar simultáneamente"
echo " sin pisarse porque tienen applicationId diferentes"
echo "========================================"
echo ""

# Copiar APKs a carpeta de distribución
echo "Copiando APKs a carpeta dist..."
mkdir -p dist
cp build/app/outputs/flutter-apk/app-employee-release.apk dist/aponnt-employee.apk
cp build/app/outputs/flutter-apk/app-kiosk-release.apk dist/aponnt-kiosk.apk
cp build/app/outputs/flutter-apk/app-medical-release.apk dist/aponnt-medical.apk
cp build/app/outputs/flutter-apk/app-admin-release.apk dist/aponnt-admin.apk

echo ""
echo "APKs también disponibles en: dist/"
echo "- aponnt-employee.apk"
echo "- aponnt-kiosk.apk"
echo "- aponnt-medical.apk"
echo "- aponnt-admin.apk"
echo ""
echo "BUILD EXITOSO!"
echo ""
