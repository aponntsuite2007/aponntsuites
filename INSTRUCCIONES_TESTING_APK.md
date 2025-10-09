# 📱 Instrucciones de Testing - APK Kiosk Android

## ⚠️ Estado Actual

**APK Compilada:** ✅ Completada
**Ubicación:** `frontend_flutter/build/app/outputs/flutter-apk/app-release.apk`
**Tamaño:** 74.6 MB
**Configuración:** ✅ Apunta a Render (https://aponntsuites.onrender.com)
**Company ID:** 11 (MLK IT)

**Emulador Android:** ❌ No disponible (sin espacio en disco)
**Testing Automático:** ⏸️ Pausado - Requiere dispositivo físico o liberar espacio

---

## 🚀 Opción 1: Testing con Dispositivo Físico Android

### Paso 1: Conectar Dispositivo

1. Habilitar "Opciones de Desarrollador" en Android:
   - Ir a Configuración → Acerca del teléfono
   - Tocar 7 veces en "Número de compilación"

2. Habilitar "Depuración USB":
   - Ir a Configuración → Opciones de Desarrollador
   - Activar "Depuración USB"

3. Conectar teléfono a PC con cable USB

4. Verificar conexión:
```bash
cd C:\Bio\sistema_asistencia_biometrico
C:/Users/notebook/AppData/Local/Android/Sdk/platform-tools/adb.exe devices
```

Debe mostrar:
```
List of devices attached
ABC123XYZ    device
```

### Paso 2: Instalar APK

```bash
C:/Users/notebook/AppData/Local/Android/Sdk/platform-tools/adb.exe install -r frontend_flutter/build/app/outputs/flutter-apk/app-release.apk
```

### Paso 3: Iniciar App

```bash
C:/Users/notebook/AppData/Local/Android/Sdk/platform-tools/adb.exe shell am start -n com.example.attendance_system/.MainActivity
```

### Paso 4: Monitorear Logs en Tiempo Real

```bash
C:/Users/notebook/AppData/Local/Android/Sdk/platform-tools/adb.exe logcat | grep "KIOSK\|CONFIG\|VERIFY"
```

---

## 🧪 Suite de Testing Completa

### Test 1: Verificar Conexión Automática a Render

**Objetivo:** Confirmar que APK se conecta automáticamente a Render sin configuración manual

**Pasos:**
1. Abrir APK en dispositivo
2. Verificar logs (adb logcat)
3. Buscar línea: `🌐 [KIOSK] Servidor: https://aponntsuites.onrender.com | Company: 11`

**Resultado Esperado:**
- ✅ URL completa debe ser HTTPS
- ✅ Company ID debe ser 11
- ✅ No debe mostrar errores de SSL

---

### Test 2: Login Multi-tenant

**Objetivo:** Verificar autenticación correcta con servidor Render

**Datos de Login:**
- **Usuario:** `testuser`
- **Password:** `test123`
- **Company ID:** 11 (auto-seleccionado)

**Pasos:**
1. En pantalla de login, ingresar credenciales
2. Tocar "Iniciar Sesión"
3. Verificar logs: `✅ [LOGIN-DEBUG] Guardado company ID: 11`

**Resultado Esperado:**
- ✅ Login exitoso
- ✅ Token guardado en SharedPreferences
- ✅ Navega a BiometricSelectorScreen
- ✅ Muestra opciones: "Reconocimiento Facial" y "Huella Digital"

**Verificar en Logs:**
```
✅ [LOGIN-DEBUG] Guardado company ID: 11
✅ [LOGIN-DEBUG] Verificando: 11
```

---

### Test 3: Kiosk Facial - Detección de Rostro

**Objetivo:** Verificar que la cámara y Google ML Kit funcionan correctamente

**Pasos:**
1. Seleccionar "Reconocimiento Facial"
2. Permitir permisos de cámara (si solicita)
3. Verificar que la cámara frontal se activa
4. Mostrar rostro frente a la cámara
5. Observar semáforo en pantalla

**Resultado Esperado:**
- ✅ Cámara frontal activa
- ✅ Streaming continuo visible
- ✅ Semáforo muestra 🟡 Amarillo (standby)
- ✅ Google ML Kit detecta rostro
- ✅ SmartCapture evalúa calidad

**Verificar en Logs:**
```
🚀 [STREAM] Iniciando detección continua con Google ML Kit...
✅ [STREAM] Streaming activo
📊 [ML-KIT] Quality: 0.XX | Faces: 1 | Tracking ID: XXX
```

---

### Test 4: Reconocimiento Facial con Servidor Render

**Objetivo:** Verificar match facial contra template en PostgreSQL Render

**Pre-requisito:** Debe existir al menos 1 empleado con template biométrico en company_id=11

**Pasos:**
1. Mostrar rostro del empleado registrado
2. Esperar captura automática (quality > 0.65)
3. Observar semáforo

**Resultado Esperado - RECONOCIDO:**
- ✅ SmartCapture detecta buena calidad
- ✅ Captura imagen de alta resolución
- ✅ Envía a `/api/v2/biometric-attendance/verify-real`
- ✅ Backend compara con templates
- ✅ Similarity > 0.75
- ✅ Semáforo cambia a 🟢 Verde por 1 segundo
- ✅ Muestra nombre del empleado (opcional)
- ✅ Vuelve a 🟡 Amarillo

**Resultado Esperado - NO RECONOCIDO:**
- ✅ SmartCapture detecta buena calidad
- ✅ Captura imagen
- ✅ Backend no encuentra match
- ✅ Semáforo cambia a 🔴 Rojo por 1 segundo
- ✅ Vuelve a 🟡 Amarillo

**Verificar en Logs APK:**
```
✅ [SMART-CAPTURE] Calidad óptima (0.XX) - Capturando...
🔍 [VERIFY-REAL] Processing for company: 11
✅ [MATCH] Success: Juan Perez (0.895)
```

**Verificar en Logs Backend Render:**
```
🔍 [VERIFY-REAL] Processing for company: 11
🎯 [MATCH] Employee Juan Perez: 0.895
✅ [MATCH] Success: Juan Perez (0.895)
📥 [AUTO] INGRESO detectado para Juan Perez
✅ [AUTO] CLOCK_IN registrado: Juan Perez - 2025-10-08T12:00:00Z
```

---

### Test 5: Registro en Base de Datos

**Objetivo:** Verificar que se crea registro correcto en tabla `attendances`

**Pasos:**
1. Después de reconocimiento exitoso (semáforo 🟢)
2. Ejecutar query en PostgreSQL Render

**Query SQL:**
```sql
-- Verificar attendance creada
SELECT
  a.id,
  a.check_in,
  a.check_out,
  a.status,
  a."checkInMethod",
  u."firstName" || ' ' || u."lastName" as employee_name,
  u."employeeId" as legajo
FROM attendances a
JOIN users u ON a.user_id = u.user_id
WHERE a.company_id = 11
  AND DATE(a.check_in) = CURRENT_DATE
ORDER BY a.check_in DESC
LIMIT 1;
```

**Resultado Esperado:**
- ✅ Registro existe
- ✅ check_in tiene timestamp correcto
- ✅ check_out es NULL (primera vez)
- ✅ checkInMethod = 'face'
- ✅ status = 'present'
- ✅ employee_name coincide con el reconocido

---

### Test 6: Log en biometric_detections

**Objetivo:** Verificar que se registra TODA detección, no solo las que crean attendance

**Query SQL:**
```sql
SELECT
  id,
  employee_name,
  similarity,
  was_registered,
  operation_type,
  skip_reason,
  detection_timestamp,
  processing_time_ms
FROM biometric_detections
WHERE company_id = 11
  AND DATE(detection_timestamp) = CURRENT_DATE
ORDER BY detection_timestamp DESC
LIMIT 5;
```

**Resultado Esperado:**
- ✅ Registro existe para cada detección facial
- ✅ similarity muestra valor (ej: 0.895)
- ✅ was_registered = true (primera vez)
- ✅ operation_type = 'clock_in' (primera vez)
- ✅ skip_reason = NULL (primera vez)
- ✅ processing_time_ms < 1000

---

### Test 7: Cooldown de 10 Minutos

**Objetivo:** Verificar que el sistema NO registra múltiples attendances en corto tiempo

**Pasos:**
1. Hacer fichaje exitoso (clock-in)
2. Esperar solo 1 minuto
3. Volver a mostrar mismo rostro
4. Observar semáforo y verificar BD

**Resultado Esperado:**
- ✅ Reconoce rostro (🟢 Verde)
- ✅ NO crea nuevo registro en `attendances`
- ✅ SÍ crea log en `biometric_detections`

**Query SQL:**
```sql
SELECT
  was_registered,
  operation_type,
  skip_reason
FROM biometric_detections
WHERE company_id = 11
  AND DATE(detection_timestamp) = CURRENT_DATE
ORDER BY detection_timestamp DESC
LIMIT 2;
```

**Primera detección:**
- was_registered: true
- operation_type: 'clock_in'
- skip_reason: NULL

**Segunda detección (dentro de cooldown):**
- was_registered: false
- operation_type: NULL
- skip_reason: 'recent_detection'

---

### Test 8: Clock-out Automático

**Objetivo:** Verificar que el sistema detecta automáticamente la salida

**Pre-requisito:** Debe existir attendance de hoy sin check_out

**Pasos:**
1. Tener un clock-in registrado
2. Esperar 30 segundos mínimo (anti-spam)
3. Volver a mostrar mismo rostro

**Resultado Esperado:**
- ✅ Reconoce rostro (🟢 Verde)
- ✅ Backend detecta que ya tiene clock-in de hoy
- ✅ Backend actualiza el MISMO registro con check_out
- ✅ operationType en respuesta = 'clock_out'

**Query SQL:**
```sql
SELECT
  id,
  check_in,
  check_out,
  "checkInMethod",
  "checkOutMethod",
  "workingHours"
FROM attendances
WHERE company_id = 11
  AND user_id = (
    SELECT user_id
    FROM users
    WHERE company_id = 11
    LIMIT 1
  )
  AND DATE(check_in) = CURRENT_DATE
ORDER BY check_in DESC
LIMIT 1;
```

**Resultado Esperado:**
- ✅ UN SOLO registro (no dos)
- ✅ check_in tiene timestamp de entrada
- ✅ check_out tiene timestamp de salida
- ✅ checkInMethod = 'face'
- ✅ checkOutMethod = 'face'
- ✅ workingHours calculado (opcional)

**Verificar en Logs Backend:**
```
📤 [AUTO] SALIDA detectada para Juan Perez
✅ [AUTO] CLOCK_OUT registrado: Juan Perez
```

---

### Test 9: Panel-Empresa Visualización

**Objetivo:** Verificar que los fichajes de la APK aparecen en el panel web

**Pasos:**
1. Abrir https://aponntsuites.onrender.com/panel-empresa.html
2. Login como usuario admin de MLK IT
3. Ir a módulo "Asistencias" (Attendance)
4. Filtrar por fecha de hoy

**Resultado Esperado:**
- ✅ Aparece fichaje facial de la APK
- ✅ Muestra nombre del empleado
- ✅ Hora de entrada correcta
- ✅ Método: "face" (icono de rostro)
- ✅ Si hizo clock-out, muestra hora de salida

---

### Test 10: Llegadas Tardías (Opcional)

**Objetivo:** Verificar autorización de empleados fuera de horario

**Pre-requisito:** Debe haber shifts configurados para el empleado

**Pasos:**
1. Fichar FUERA del horario de turno (ej: 2 horas tarde)
2. Observar respuesta de la APK

**Resultado Esperado - Sin Shifts:**
- ✅ Permite ingreso normal (validación deshabilitada)
- ✅ Log muestra: "allowing entry (shift check disabled)"

**Resultado Esperado - Con Shifts:**
- ✅ APK muestra alerta naranja "FUERA DE TURNO"
- ✅ Mensaje: "Aguarde autorización"
- ✅ Backend crea registro con authorization_status = 'pending'
- ✅ Panel-empresa muestra notificación para autorizar

---

## 📊 Checklist de Testing Completo

```
□ Test 1: Conexión HTTPS a Render
□ Test 2: Login multi-tenant (company_id=11)
□ Test 3: Cámara y ML Kit activos
□ Test 4: Reconocimiento facial exitoso
□ Test 5: Registro en tabla attendances
□ Test 6: Log en biometric_detections
□ Test 7: Cooldown 10 minutos (no duplica)
□ Test 8: Clock-out automático
□ Test 9: Visualización en panel-empresa
□ Test 10: Llegadas tardías (opcional)
```

---

## 🐛 Troubleshooting

### Problema: APK no conecta a Render

**Síntomas:**
- Error "Failed to connect"
- Timeout en requests

**Solución:**
1. Verificar que dispositivo tiene internet activo
2. Probar abrir https://aponntsuites.onrender.com en navegador del dispositivo
3. Verificar logs: `adb logcat | grep "ERROR\|TIMEOUT"`

### Problema: Semáforo siempre Rojo

**Síntomas:**
- Rostro detectado pero siempre 🔴 Rojo
- No aparece en attendances

**Posibles Causas:**
1. **No hay template biométrico:** Verificar `SELECT COUNT(*) FROM biometric_templates WHERE company_id=11 AND is_active=true`
2. **Similarity muy baja:** Verificar logs `biometric_detections` para ver similarity real
3. **Lighting pobre:** Probar con mejor iluminación
4. **Cara muy pequeña:** Acercarse más a la cámara

### Problema: No registra en attendances (siempre skip_reason)

**Síntomas:**
- biometric_detections muestra was_registered=false
- skip_reason = 'recent_detection'

**Causa:**
- Cooldown de 10 minutos activo

**Solución:**
- Esperar 10 minutos entre fichajes del mismo empleado
- O usar otro empleado con template

### Problema: "No se detectó rostro"

**Síntomas:**
- Cámara activa pero no detecta rostro
- Google ML Kit no encuentra cara

**Solución:**
1. Asegurar buena iluminación frontal
2. Rostro completamente visible (sin mascarilla, gorra, etc.)
3. Mirar directo a la cámara
4. Mantener distancia apropiada (30-50cm)

---

## 📸 Captura de Evidencia

### Screenshots Requeridos

1. **Pantalla Login:**
   - Campos llenos con testuser/test123
   - Company ID: 11

2. **BiometricSelectorScreen:**
   - Opciones: Reconocimiento Facial / Huella Digital

3. **Kiosk Facial Activo:**
   - Cámara mostrando rostro
   - Semáforo 🟡 Amarillo

4. **Reconocimiento Exitoso:**
   - Semáforo 🟢 Verde
   - (opcional) Nombre del empleado

5. **Logs ADB:**
   - Captura de terminal mostrando logs de VERIFY-REAL

6. **Query SQL attendances:**
   - Resultado mostrando registro creado

7. **Query SQL biometric_detections:**
   - Resultado mostrando log de detección

8. **Panel-Empresa:**
   - Módulo Asistencias mostrando fichaje facial

### Comando para Capturar Screenshot desde ADB

```bash
# Tomar screenshot
C:/Users/notebook/AppData/Local/Android/Sdk/platform-tools/adb.exe shell screencap -p > screenshot_kiosk.png

# Ver en Windows
start screenshot_kiosk.png
```

---

## 📋 Reporte Final

Una vez completados todos los tests, crear archivo `APK_TESTING_REPORT.md` con:

1. Fecha y hora de testing
2. Dispositivo usado (modelo, Android version)
3. Checklist marcado
4. Screenshots adjuntos
5. Logs relevantes (éxitos y errores)
6. Queries SQL ejecutadas y resultados
7. Conclusiones y observaciones

**Template:**
```markdown
# APK Testing Report - [FECHA]

## Dispositivo
- Modelo: [XXX]
- Android Version: [X.X]
- Conexión: WiFi / Datos móviles

## Tests Ejecutados
✅ Test 1: Conexión HTTPS - OK
✅ Test 2: Login - OK
... etc

## Screenshots
![Login](screenshots/login.png)
![Kiosk](screenshots/kiosk.png)

## Logs Destacados
```
[logs aquí]
```

## Queries SQL
[resultados aquí]

## Conclusiones
- Sistema funciona end-to-end: ✅
- Performance: < 1s respuesta
- Tasa de reconocimiento: XX%
```

---

**Generado por:** Claude Code (Autonomous Mode)
**Fecha:** 2025-10-08
**APK Version:** 2.0.0+1
**Backend:** https://aponntsuites.onrender.com
