#!/bin/bash

# Script de testing completo de todas las APIs del panel-empresa
# Ejecuta tests de cada módulo y reporta resultados

echo "======================================"
echo "🧪 TESTING COMPLETO DE MÓDULOS API"
echo "======================================"
echo ""

# Primero obtener un token válido
echo "📝 Intentando login..."
TOKEN_RESPONSE=$(curl -s "http://localhost:9998/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@isi.com","password":"123456","companyId":11}')

echo "Response: $TOKEN_RESPONSE"

# Intentar con credenciales alternativas
if [[ "$TOKEN_RESPONSE" == *"error"* ]]; then
  echo "⚠️ Primera credencial falló, intentando alternativa..."
  TOKEN_RESPONSE=$(curl -s "http://localhost:9998/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"identifier":"admin","password":"123456","companyId":11}')

  if [[ "$TOKEN_RESPONSE" == *"error"* ]]; then
    echo "❌ Login falló. No se puede continuar testing de APIs autenticadas."
    echo "   Continuando con testing de endpoints públicos..."
    TOKEN=""
  else
    TOKEN=$(echo "$TOKEN_RESPONSE" | python -m json.tool | grep '"token":' | awk -F'"' '{print $4}')
    echo "✅ Login exitoso! Token: ${TOKEN:0:20}..."
  fi
else
  TOKEN=$(echo "$TOKEN_RESPONSE" | python -m json.tool | grep '"token":' | awk -F'"' '{print $4}')
  echo "✅ Login exitoso! Token: ${TOKEN:0:20}..."
fi

echo ""
echo "======================================"
echo "1️⃣  TESTING MÓDULO: USUARIOS"
echo "======================================"

if [ -n "$TOKEN" ]; then
  echo "📋 GET /api/v1/users - Listar usuarios"
  USERS_RESPONSE=$(curl -s "http://localhost:9998/api/v1/users" -H "Authorization: Bearer $TOKEN")

  if [[ "$USERS_RESPONSE" == *"success"* ]]; then
    echo "✅ Usuarios listados correctamente"
    USER_COUNT=$(echo "$USERS_RESPONSE" | python -m json.tool | grep '"id":' | wc -l)
    echo "   📊 Total usuarios encontrados: $USER_COUNT"

    # Verificar si incluye campos nuevos
    if [[ "$USERS_RESPONSE" == *"canUseMobileApp"* ]]; then
      echo "✅ Campo canUseMobileApp presente"
    else
      echo "⚠️ Campo canUseMobileApp NO presente (puede ser NULL)"
    fi

    if [[ "$USERS_RESPONSE" == *"canUseKiosk"* ]]; then
      echo "✅ Campo canUseKiosk presente"
    else
      echo "⚠️ Campo canUseKiosk NO presente (puede ser NULL)"
    fi
  else
    echo "❌ Error listando usuarios"
    echo "   Response: $USERS_RESPONSE"
  fi
fi

echo ""
echo "======================================"
echo "2️⃣  TESTING MÓDULO: DEPARTAMENTOS"
echo "======================================"

if [ -n "$TOKEN" ]; then
  echo "📋 GET /api/v1/departments - Listar departamentos"
  DEPS_RESPONSE=$(curl -s "http://localhost:9998/api/v1/departments" -H "Authorization: Bearer $TOKEN")

  if [[ "$DEPS_RESPONSE" == *"success"* ]]; then
    echo "✅ Departamentos listados correctamente"
    DEP_COUNT=$(echo "$DEPS_RESPONSE" | python -m json.tool | grep '"id":' | wc -l)
    echo "   📊 Total departamentos: $DEP_COUNT"
  else
    echo "❌ Error listando departamentos"
    echo "   Response: $DEPS_RESPONSE"
  fi
fi

echo ""
echo "======================================"
echo "3️⃣  TESTING MÓDULO: KIOSCOS"
echo "======================================"

if [ -n "$TOKEN" ]; then
  echo "📋 GET /api/v1/kiosks - Listar kioscos"
  KIOSKS_RESPONSE=$(curl -s "http://localhost:9998/api/v1/kiosks" -H "Authorization: Bearer $TOKEN")

  if [[ "$KIOSKS_RESPONSE" == *"kiosks"* ]]; then
    echo "✅ Kioscos listados correctamente"
    KIOSK_COUNT=$(echo "$KIOSKS_RESPONSE" | python -m json.tool | grep '"id":' | wc -l)
    echo "   📊 Total kioscos: $KIOSK_COUNT"
  else
    echo "❌ Error listando kioscos"
    echo "   Response: $KIOSKS_RESPONSE"
  fi
fi

echo ""
echo "======================================"
echo "4️⃣  TESTING MÓDULO: VISITANTES"
echo "======================================"

if [ -n "$TOKEN" ]; then
  echo "📋 GET /api/v1/visitors - Listar visitantes"
  VISITORS_RESPONSE=$(curl -s "http://localhost:9998/api/v1/visitors" -H "Authorization: Bearer $TOKEN")

  if [[ "$VISITORS_RESPONSE" == *"visitors"* || "$VISITORS_RESPONSE" == *"success"* ]]; then
    echo "✅ Visitantes listados correctamente"
    VISITOR_COUNT=$(echo "$VISITORS_RESPONSE" | python -m json.tool | grep '"id":' | wc -l)
    echo "   📊 Total visitantes: $VISITOR_COUNT"
  else
    echo "❌ Error listando visitantes"
    echo "   Response: $VISITORS_RESPONSE"
  fi
fi

echo ""
echo "======================================"
echo "5️⃣  TESTING MÓDULO: NOTIFICACIONES"
echo "======================================"

if [ -n "$TOKEN" ]; then
  echo "📋 GET /api/v1/notifications - Listar notificaciones"
  NOTIF_RESPONSE=$(curl -s "http://localhost:9998/api/v1/notifications" -H "Authorization: Bearer $TOKEN")

  if [[ "$NOTIF_RESPONSE" == *"notifications"* || "$NOTIF_RESPONSE" == *"success"* ]]; then
    echo "✅ Notificaciones listadas correctamente"
    NOTIF_COUNT=$(echo "$NOTIF_RESPONSE" | python -m json.tool | grep '"id":' | wc -l)
    echo "   📊 Total notificaciones: $NOTIF_COUNT"

    # Test de contador de no leídas
    echo "📋 GET /api/v1/notifications/unread-count"
    UNREAD_RESPONSE=$(curl -s "http://localhost:9998/api/v1/notifications/unread-count" -H "Authorization: Bearer $TOKEN")
    echo "   Response: $UNREAD_RESPONSE"
  else
    echo "❌ Error listando notificaciones"
    echo "   Response: $NOTIF_RESPONSE"
  fi
fi

echo ""
echo "======================================"
echo "6️⃣  TESTING HEALTH CHECK"
echo "======================================"

echo "📋 GET /api/v1/health"
HEALTH_RESPONSE=$(curl -s "http://localhost:9998/api/v1/health")

if [[ "$HEALTH_RESPONSE" == *"OK"* ]]; then
  echo "✅ Health check OK"
  echo "   $HEALTH_RESPONSE"
else
  echo "❌ Health check FAILED"
  echo "   Response: $HEALTH_RESPONSE"
fi

echo ""
echo "======================================"
echo "📊 RESUMEN DE TESTING"
echo "======================================"
echo "✅ Tests completados"
echo "📝 Ver archivo de log para detalles completos"
echo ""
