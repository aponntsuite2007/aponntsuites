#!/bin/bash

echo "🔍 DEBUG DETALLADO DE RESPUESTA USUARIOS API"
echo "=============================================="
echo ""

# Login
echo "📝 Login..."
TOKEN_RESPONSE=$(curl -s "http://localhost:9998/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"123456","companyId":11}')

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Error en login"
  exit 1
fi

echo "✅ Login OK"
echo ""

# Get users
echo "📋 Obteniendo usuarios..."
USER_RESPONSE=$(curl -s "http://localhost:9998/api/v1/users" \
  -H "Authorization: Bearer $TOKEN")

echo ""
echo "📊 RESPUESTA COMPLETA (primer usuario):"
echo "$USER_RESPONSE" | jq '.users[0]'
echo ""

echo "🔍 Campos específicos del primer usuario:"
echo "  - canUseMobileApp: $(echo "$USER_RESPONSE" | jq -r '.users[0].canUseMobileApp')"
echo "  - canUseKiosk: $(echo "$USER_RESPONSE" | jq -r '.users[0].canUseKiosk')"
echo "  - can_use_mobile_app: $(echo "$USER_RESPONSE" | jq -r '.users[0].can_use_mobile_app')"
echo "  - can_use_kiosk: $(echo "$USER_RESPONSE" | jq -r '.users[0].can_use_kiosk')"
echo ""

echo "📋 TODOS los campos devueltos:"
echo "$USER_RESPONSE" | jq -r '.users[0] | keys[]' | sort
