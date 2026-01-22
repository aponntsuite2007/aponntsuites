# PENDIENTE: Test Completo de Email de Consentimiento

## Estado: PENDIENTE
**Fecha**: 2026-01-20
**Prioridad**: Alta

## Qué falta probar

### 1. Circuito de Email Completo
- [ ] Pablo Rivas (pablorivasjordan52@gmail.com) recibe el email
- [ ] El link de ACEPTAR funciona correctamente
- [ ] El link de RECHAZAR funciona correctamente
- [ ] Después de aceptar: puede usar APK Kiosk
- [ ] Después de rechazar: APK Kiosk lo bloquea con mensaje correcto

### 2. Datos del Usuario de Prueba
```
User ID: 34165bb5-373a-4d01-b399-2ca00f5939c4
Email: pablorivasjordan52@gmail.com
Empresa: ISI (company_id: 11)
Departamento: Sistemas (28)
Sucursal: Sede Central (3)
```

### 3. Token de Consentimiento
- Token generado y almacenado en `biometric_consents`
- Expira en 7 días
- Columna: `consent_token`

### 4. Scripts de Prueba
```bash
# Verificar estado del consentimiento
cd /c/Bio/sistema_asistencia_biometrico/backend
node scripts/complete-pablo-consent.js

# Probar conexión SMTP
node scripts/test-email-connection.js
```

### 5. Endpoints a Probar
- `POST /api/v1/biometric/consents/accept` - Con token válido
- `POST /api/v1/biometric/consents/reject` - Con token válido

### 6. Qué Verificar en UI (Expediente 360 y Perfil)
- [ ] Estado del consentimiento visible en perfil de usuario
- [ ] Tab de consentimientos en Expediente 360
- [ ] Dashboard admin de consentimientos

## Notas
- El email YA fue enviado exitosamente (SMTP verificado)
- Sistema de bloqueo ya implementado en 8 endpoints
- Filtro de estadísticas ya implementado
- Solo falta la validación E2E desde la perspectiva del usuario

## Cómo Retomar
Cuando retomes este test, ejecutar:
1. `node scripts/test-email-connection.js` - Verificar SMTP
2. Revisar bandeja de pablorivasjordan52@gmail.com
3. Hacer click en link de aceptar/rechazar
4. Verificar que el sistema responde correctamente
