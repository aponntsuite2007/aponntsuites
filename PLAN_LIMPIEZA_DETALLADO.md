# 📋 PLAN DE LIMPIEZA DETALLADO - Iris & Voice

**Fecha**: 2025-10-12
**Objetivo**: Eliminar completamente código de iris y voz sin romper nada
**Enfoque**: Profundo, prolijo, testeado en cada paso

---

## 🎯 SCOPE DEL TRABAJO

Este es un trabajo GRANDE que requiere cambios en **17 archivos** y va a tomar varias horas hacerlo bien.

Dado el scope y la complejidad, te recomiendo:

### **OPCIÓN A: Trabajo completo (6-8 horas)**
1. ✅ Auditoría completa (HECHO)
2. ⏳ Eliminar iris/voice backend (2-3 horas)
3. ⏳ Eliminar iris/voice frontend (2-3 horas)
4. ⏳ Implementar QR (1-2 horas)
5. ⏳ Implementar NFC (2-3 horas)
6. ⏳ Implementar audio feedback (1-2 horas)
7. ⏳ Fixes de bugs (1-2 horas)
8. ⏳ Testing completo (1-2 horas)

**Total estimado**: 10-17 horas de trabajo continuo

### **OPCIÓN B: Por fases (RECOMENDADA)**

#### **FASE 1 - HOY** (2-3 horas):
1. ✅ Eliminar servicios iris/voice del backend
2. ✅ Limpiar pipeline biométrico
3. ✅ Eliminar opciones UI iris/voice del frontend
4. ✅ Testing básico
5. ✅ Commit + Deploy a Render
6. ✅ Verificar que todo sigue funcionando

#### **FASE 2 - MAÑANA** (3-4 horas):
1. Implementar QR completo (backend + frontend)
2. Testing QR
3. Commit + Deploy
4. Verificar en producción

#### **FASE 3 - DESPUÉS** (4-5 horas):
1. Implementar NFC/RFID completo
2. Implementar audio feedback
3. Fixes de bugs (auto-refresh, iconos, etc.)
4. Testing completo
5. Deploy final

---

## ⚠️ RECOMENDACIÓN

Dada la complejidad y que quieres todo "prolijo y profundo", te sugiero:

**Hacer FASE 1 hoy** (eliminar iris/voice) que son ~3 horas de trabajo cuidadoso, y luego:
- Testear bien que todo funciona
- Deploy a Render
- Verificar en producción
- Continuar mañana con QR y NFC

Esto es más seguro que hacer todo de una vez y arriesgar romper algo.

---

## 🤔 TU DECISIÓN

**¿Qué prefieres?**

**A)** Continúo con TODO el trabajo ahora (10-17 horas continuas)
**B)** Hago FASE 1 hoy (eliminar iris/voice, ~3 horas) y mañana continuamos
**C)** Solo documentación y planificación hoy, código mañana

---

## 📊 DETALLES TÉCNICOS - FASE 1

Si elegís FASE 1, haré:

### Backend:
1. Eliminar `/src/services/iris-recognition-service.js`
2. Eliminar `/src/services/voice-recognition-service.js`
3. Limpiar `/src/services/biometric-processing-pipeline.js`:
   - Líneas 23-24: Eliminar imports
   - Líneas 53-54: Eliminar config flags
   - Líneas 71-93: Eliminar inicialización
   - Buscar y eliminar todas las funciones que usen iris/voice
4. Limpiar `/src/routes/biometricRoutes.js`:
   - Eliminar endpoints de iris/voice
5. Limpiar `/src/models/BiometricData.js`:
   - Marcar campos como deprecated (NO eliminar de DB)

### Frontend:
1. Limpiar `/public/js/modules/biometric.js`:
   - Eliminar botones/UI de iris/voice
   - Eliminar funciones de captura iris/voice
2. Limpiar `/public/js/services/device-detection-service.js`:
   - Eliminar detección de dispositivos iris/voice

### Testing:
1. Verificar servidor inicia sin errores
2. Verificar panel biométrico carga
3. Verificar captura de rostro funciona
4. Verificar captura de huella funciona
5. Verificar no hay errores de console

---

**¿Cómo procedemos?**

