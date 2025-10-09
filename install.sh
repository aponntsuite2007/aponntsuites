#!/bin/bash
echo "╔══════════════════════════════════════════════════════╗"
echo "║     INSTALADOR - SISTEMA DE ASISTENCIA v1.0         ║"
echo "╚══════════════════════════════════════════════════════╝"

# Verificar requisitos
command -v node >/dev/null 2>&1 || { echo "❌ Node.js no instalado"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ NPM no instalado"; exit 1; }

echo "✅ Requisitos verificados"

# Instalar Backend
echo ""
echo "📦 Instalando dependencias del Backend..."
cd backend
npm install --production
cd ..

# Configurar base de datos
echo ""
echo "💾 Configurando base de datos..."
echo "Seleccione el modo de instalación:"
echo "1) Local (SQLite)"
echo "2) Red (MySQL)"
read -p "Opción (1-2): " DB_MODE

if [ "$DB_MODE" = "2" ]; then
  read -p "Host MySQL: " DB_HOST
  read -p "Usuario MySQL: " DB_USER
  read -sp "Contraseña MySQL: " DB_PASS
  echo
  read -p "Nombre de base de datos: " DB_NAME
  
  # Actualizar .env
  sed -i "s/CONNECTION_MODE=local/CONNECTION_MODE=network/" backend/.env
  sed -i "s/DB_DIALECT=sqlite/DB_DIALECT=mysql/" backend/.env
  sed -i "s/DB_HOST=localhost/DB_HOST=$DB_HOST/" backend/.env
  sed -i "s/DB_USER=root/DB_USER=$DB_USER/" backend/.env
  sed -i "s/DB_PASSWORD=/DB_PASSWORD=$DB_PASS/" backend/.env
  sed -i "s/DB_NAME=attendance_system/DB_NAME=$DB_NAME/" backend/.env
  
  # Crear base de datos
  mysql -h $DB_HOST -u $DB_USER -p$DB_PASS < database/schema.sql
fi

# Configurar Flutter
echo ""
echo "📱 ¿Desea compilar la aplicación Android? (s/n)"
read -p "Respuesta: " BUILD_APK

if [ "$BUILD_APK" = "s" ]; then
  command -v flutter >/dev/null 2>&1 || { echo "⚠️ Flutter no instalado"; }
  
  cd frontend_flutter
  flutter pub get
  flutter build apk --release --split-per-abi
  echo "✅ APKs generados en: build/app/outputs/flutter-apk/"
  cd ..
fi

echo ""
echo "✅ Instalación completada"
echo ""
echo "Para iniciar el sistema:"
echo "  ./start.sh"
echo ""
echo "Credenciales iniciales:"
echo "  Usuario: admin"
echo "  Contraseña: Admin123!"
echo "  Legajo: ADMIN001"
echo ""
echo "⚠️ IMPORTANTE: Cambiar contraseña después del primer acceso"
