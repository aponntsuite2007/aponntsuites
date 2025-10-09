#!/bin/bash
echo "🚀 Iniciando Sistema de Asistencia..."

# Verificar si existe el archivo .env
if [ ! -f backend/.env ]; then
  echo "❌ Error: No se encuentra archivo .env"
  echo "   Ejecute primero: ./install.sh"
  exit 1
fi

# Iniciar backend
cd backend
npm start &
BACKEND_PID=$!

echo "✅ Sistema iniciado"
echo ""
echo "📊 Panel de administración: http://localhost:3000"
echo "📖 Documentación: http://localhost:3000/docs"
echo "🔍 Estado del sistema: http://localhost:3000/health"
echo ""
echo "Presione Ctrl+C para detener"

# Esperar señal de terminación
trap "echo ''; echo '⏹️ Deteniendo sistema...'; kill $BACKEND_PID; exit 0" INT TERM

# Mantener el script ejecutándose
wait $BACKEND_PID
