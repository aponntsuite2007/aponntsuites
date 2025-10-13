# 🔍 AUDITORÍA: Limpieza de Código Iris y Voice

**Fecha**: 2025-10-12
**Objetivo**: Eliminar completamente código relacionado con iris y voz

---

## 📊 ARCHIVOS ENCONTRADOS

### ❌ ELIMINAR COMPLETAMENTE:
1. `backend/src/services/iris-recognition-service.js` - Servicio completo de iris
2. `backend/src/services/voice-recognition-service.js` - Servicio completo de voz

### 🧹 LIMPIAR REFERENCIAS:
3. `backend/src/services/biometric-processing-pipeline.js` - Pipeline que importa iris/voice
4. `backend/public/js/modules/biometric.js` - UI que muestra opciones iris/voice
5. `backend/src/routes/biometricRoutes.js` - Rutas que manejan iris/voice
6. `backend/src/models/BiometricData.js` - Modelo con campos iris/voice
7. `backend/create_biometric_tables.sql` - SQL con campos iris/voice
8. `backend/public/js/services/device-detection-service.js` - Detecta dispositivos iris/voice
9. `backend/public/js/modules/attendance.js` - Referencias a iris/voice
10. `backend/package-lock.json` - Dependencias (revisar)

### ⚠️ REVISAR (puede ser false positive):
11. `backend/public/panel-administrativo.html` - Verificar si hay UI de iris/voice
12. `backend/src/routes/aponntDashboard.js` - Verificar referencias
13. `backend/src/routes/apkRoutes.js` - Verificar referencias
14. `backend/public/siac-panel-empresa.html` - Verificar referencias
15. `backend/src/models/aponntModels.js` - Verificar referencias
16. `backend/database/postgresql-partitioning-professional.sql` - Verificar particiones
17. `backend/src/services/postgresql-partitioning-service.js` - Verificar particiones

---

## 🎯 PLAN DE ACCIÓN

### FASE 1: Eliminación de Servicios
- [ ] Eliminar `iris-recognition-service.js`
- [ ] Eliminar `voice-recognition-service.js`
- [ ] Verificar que no rompan imports en otros archivos

### FASE 2: Limpieza de Pipeline
- [ ] Eliminar imports de iris/voice en `biometric-processing-pipeline.js`
- [ ] Eliminar funciones relacionadas
- [ ] Actualizar exports

### FASE 3: Limpieza de Frontend
- [ ] Eliminar opciones iris/voice en `biometric.js`
- [ ] Eliminar UI de captura iris/voice
- [ ] Eliminar device detection para iris/voice

### FASE 4: Limpieza de Backend
- [ ] Eliminar rutas iris/voice en `biometricRoutes.js`
- [ ] Eliminar validaciones iris/voice
- [ ] Actualizar modelos

### FASE 5: Limpieza de Base de Datos
- [ ] Revisar `BiometricData.js` - quitar campos iris/voice
- [ ] Revisar `create_biometric_tables.sql` - quitar columnas iris/voice
- [ ] **NO eliminar datos** - solo marcar como deprecated

### FASE 6: Verificación
- [ ] Grep para buscar referencias restantes
- [ ] Verificar que no haya imports rotos
- [ ] Testing completo

---

## ✅ CRITERIOS DE ÉXITO

1. ✅ No hay archivos `iris-recognition-service.js` ni `voice-recognition-service.js`
2. ✅ Grep de "iris" y "voice" solo retorna comentarios o strings no funcionales
3. ✅ Servidor inicia sin errores
4. ✅ UI solo muestra opciones: Rostro, Huella, QR, NFC
5. ✅ Endpoints de registro solo aceptan: face, fingerprint, qr, nfc
6. ✅ Tests pasan correctamente

---

## 🚨 PRECAUCIONES

1. **NO eliminar datos de BD** - Solo deprecar columnas
2. **Hacer backup** antes de cada cambio
3. **Commits incrementales** - No todo de una vez
4. **Testing después de cada paso**

---

## 📝 LOG DE CAMBIOS

### 2025-10-12 - Auditoría inicial
- ✅ Identificados 17 archivos con referencias
- ✅ Plan de acción creado
- ⏳ Pendiente: Inicio de eliminación

