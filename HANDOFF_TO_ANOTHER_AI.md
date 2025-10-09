# 🔄 HANDOFF DOCUMENT - FLUTTER APK PROJECT
**Fecha:** 2025-10-01
**Destino:** IA con capacidades de testing Android
**Contexto:** Proyecto Flutter bloqueado 1 mes sin avances con metodología actual

---

## 📋 RESUMEN EJECUTIVO

### Proyecto
- **Nombre:** Sistema de Asistencia Biométrico
- **Tipo:** App Flutter Android (APK)
- **Ubicación:** `C:\Bio\sistema_asistencia_biometrico\frontend_flutter`
- **APK Compilada:** ✅ `build/app/outputs/flutter-apk/app-release.apk` (48.8 MB)
- **Estado:** APK compila correctamente, pero **NO se ha testeado funcionalmente**

### Problema Principal
El desarrollador está **estancado hace 1 mes** porque:
- La APK se compila sin errores
- **NO se puede testear** el comportamiento real sin instalar en dispositivo/emulador
- No hay forma de validar si la cámara, biometría, y backend funcionan correctamente
- Claude Code **NO puede ejecutar ni testear la APK** (limitación de herramientas)

### Lo que se necesita
Una IA que pueda:
1. ✅ **Ejecutar la APK** en emulador Android
2. ✅ **Testear funcionalidades** (login, cámara, biometría, GPS)
3. ✅ **Debugging en vivo** con logs de Android
4. ✅ **Iteración rápida**: error → fix → rebuild → test
5. ✅ **Validar integración** con backend Node.js

---

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Tecnológico
```yaml
Flutter: 3.35.1 (stable)
Dart SDK: >=3.1.0 <4.0.0
Android:
  - compileSdk: 36
  - minSdk: 21 (Flutter default)
  - targetSdk: 33
  - NDK: flutter.ndkVersion
Backend:
  - Node.js + Express
  - PostgreSQL (real)
  - Puerto: 3001 (configurable)
```

### Dependencias Clave
```yaml
# State Management
provider: ^6.1.1

# Camera & Biometric
camera: ^0.10.5+7
image_picker: ^1.0.5
local_auth: ^2.1.7
# google_mlkit_face_detection: ^0.9.0 (comentado temporalmente)

# Network
dio: ^5.3.3
http: ^1.1.0

# Location
geolocator: ^10.1.0
geocoding: ^2.1.1

# Storage
shared_preferences: ^2.2.2
flutter_secure_storage: ^9.0.0

# JWT
dart_jsonwebtoken: ^2.12.2
```

### Estructura del Proyecto
```
frontend_flutter/
├── lib/
│   ├── main_real.dart                    # ⚠️ ENTRY POINT ACTUAL
│   ├── services/
│   │   ├── real_auth_service.dart        # Auth + biometría
│   │   ├── simple_face_service.dart      # Captura facial
│   │   ├── camera_service.dart
│   │   ├── location_service.dart
│   │   └── biometric_auth_service.dart
│   ├── screens/
│   │   ├── auth/
│   │   │   └── real_login_screen.dart    # Login principal
│   │   ├── attendance/
│   │   │   └── main_attendance_screen.dart
│   │   ├── admin/
│   │   ├── medical/
│   │   └── biometric/
│   ├── providers/
│   ├── models/
│   └── config/
├── android/
│   └── app/
│       ├── build.gradle                  # Config Android
│       └── src/main/AndroidManifest.xml
└── pubspec.yaml                          # Dependencias
```

### Total de Archivos
- **125 archivos .dart**
- **37+ screens** (login, admin, médicos, biometría)
- **Múltiples servicios** (auth, cámara, GPS, WebSocket)

---

## 🔍 ANÁLISIS DE CÓDIGO CRÍTICO

### 1. Entry Point (`lib/main_real.dart`)
```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Portrait only
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialize auth service
  await RealAuthService.initialize();

  runApp(BiometricAttendanceApp());
}

// App flow:
// AuthChecker → RealLoginScreen | MainAttendanceScreen
```

### 2. Servicio de Autenticación (`services/real_auth_service.dart`)
**Hardcoded:** `http://localhost:3001/api/v1`

**Endpoints:**
- `POST /auth/login` - Login con email/employeeId
- `POST /facial-biometric/register` - Registrar biometría facial
- `POST /facial-biometric/verify` - Verificar biometría facial
- `GET /users` - Listar usuarios (admin)
- `POST /location/report` - Reportar GPS

**Problema detectado:**
```dart
static const String _baseUrl = 'http://localhost:3001/api/v1';
```
🚨 **CRÍTICO:** En Android, `localhost` NO funciona. Debe ser:
- `10.0.2.2:3001` (emulador Android)
- `IP_LOCAL:3001` (dispositivo físico)

### 3. Login Screen (`screens/auth/real_login_screen.dart`)
**Flujos:**
1. Login tradicional (email/password)
2. Login biométrico facial (cámara)

**Estado actual:**
- ✅ UI implementada
- ❓ NO testeado en dispositivo real
- ❓ Manejo de permisos de cámara desconocido

### 4. Permisos Android (`AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

**⚠️ Falta validar:**
- Runtime permissions request (necesario Android 6+)
- Manejo de permisos denegados

---

## 🐛 BUGS CONOCIDOS Y POTENCIALES

### 🔴 CRÍTICOS (casi seguro fallan)

#### 1. Localhost hardcodeado
**Archivo:** `lib/services/real_auth_service.dart:7`
```dart
static const String _baseUrl = 'http://localhost:3001/api/v1';
```
**Impacto:** ❌ NO funcionará en emulador/dispositivo
**Fix:** Cambiar a `10.0.2.2:3001` o permitir configuración dinámica

#### 2. Network Security Config
**Archivo:** `android/app/src/main/AndroidManifest.xml:19`
```xml
android:networkSecurityConfig="@xml/network_security_config"
```
**Problema:** Archivo `network_security_config.xml` debe permitir cleartext HTTP
**Verificar:** `android/app/src/main/res/xml/network_security_config.xml` existe

#### 3. Permisos Runtime
**Problema:** No se ve código de request de permisos
**Impacto:** Cámara y GPS pueden fallar silenciosamente
**Fix:** Agregar `permission_handler` en `initState()`

### 🟡 PROBABLES (necesitan testing)

#### 4. Captura Facial
**Archivo:** `services/simple_face_service.dart`
**Estado:** Existe pero no analizado en detalle
**Riesgo:**
- ML Kit deshabilitado en `pubspec.yaml:40` (comentado)
- ¿Cómo se genera `faceEmbedding`?

#### 5. Multiple Entry Points
**Archivos encontrados:**
- `main_real.dart` ⭐ (actual)
- `main_smart.dart`
- `main_enhanced.dart`
- `main_backup.dart`
- ... más versiones

**Problema:** Confusión sobre cuál es el entry point correcto
**Verificar:** `pubspec.yaml` no tiene definido el main

---

## 🎯 PLAN DE TESTING SUGERIDO

### Fase 1: Setup Inicial ⚙️
1. **Levantar backend**
   ```bash
   cd C:\Bio\sistema_asistencia_biometrico\backend
   PORT=3001 npm start
   ```

2. **Fix localhost en código Flutter**
   ```dart
   // Cambiar en real_auth_service.dart
   static const String _baseUrl = 'http://10.0.2.2:3001/api/v1';
   ```

3. **Rebuild APK**
   ```bash
   cd frontend_flutter
   flutter clean
   flutter pub get
   flutter build apk --release
   ```

### Fase 2: Testing Básico 🧪
1. **Instalar en emulador/dispositivo**
   ```bash
   adb install build/app/outputs/flutter-apk/app-release.apk
   ```

2. **Verificar logs**
   ```bash
   adb logcat | grep -i "flutter\|auth\|camera\|error"
   ```

3. **Test flow login:**
   - [ ] App abre correctamente
   - [ ] Splash screen muestra
   - [ ] Login screen carga
   - [ ] Typing en campos funciona
   - [ ] Submit login → verificar red

4. **Validar errores esperados:**
   - ¿Timeout de red?
   - ¿Permisos denegados?
   - ¿Crashes de null pointer?

### Fase 3: Testing Biométrico 📸
1. **Abrir cámara:**
   - Tap "Login con Biometría Facial"
   - Verificar request de permisos
   - Camera preview debe aparecer

2. **Captura facial:**
   - Tomar foto
   - Verificar logs de procesamiento
   - Validar envío a backend

3. **Backend validation:**
   - Verificar POST `/facial-biometric/verify`
   - Revisar response del servidor
   - Validar token JWT

### Fase 4: Testing GPS & Location 📍
1. Verificar permisos de location
2. Mock GPS en emulador
3. Validar endpoint `/location/report`

### Fase 5: Edge Cases 🔍
- [ ] Sin conexión a internet
- [ ] Backend offline
- [ ] Permisos todos denegados
- [ ] Token expirado
- [ ] Rotación de pantalla (debería bloquearse)

---

## 📊 CHECKLIST DE FUNCIONALIDADES

### Autenticación
- [ ] Login email/password
- [ ] Login biométrico facial
- [ ] Logout
- [ ] Persistencia de sesión
- [ ] Token refresh

### Cámara
- [ ] Permiso solicitado correctamente
- [ ] Preview funciona
- [ ] Captura de imagen
- [ ] Procesamiento ML (si habilitado)

### Backend Integration
- [ ] Conecta a API
- [ ] Manejo de errores HTTP
- [ ] Timeout configurado
- [ ] Headers JWT correctos

### UI/UX
- [ ] Splash screen
- [ ] Login screen
- [ ] Dashboard (MainAttendanceScreen)
- [ ] Navegación entre screens
- [ ] Loading states
- [ ] Error messages

### Permisos
- [ ] Camera
- [ ] Location (GPS)
- [ ] Biometric (fingerprint/face device)
- [ ] Storage

---

## 🔧 COMANDOS ÚTILES

### Flutter
```bash
# Verificar doctor
flutter doctor -v

# Limpiar build
flutter clean && flutter pub get

# Build debug APK (más rápido para testing)
flutter build apk --debug

# Build release APK
flutter build apk --release

# Ejecutar en dispositivo conectado
flutter run

# Ver logs en tiempo real
flutter logs
```

### ADB (Android Debug Bridge)
```bash
# Listar dispositivos conectados
adb devices

# Instalar APK
adb install -r app-release.apk

# Logs filtrados
adb logcat | grep flutter
adb logcat | grep -E "Exception|Error|FATAL"

# Clear app data
adb shell pm clear com.example.attendance_system

# Desinstalar
adb uninstall com.example.attendance_system

# Screenshot
adb exec-out screencap -p > screenshot.png

# Grabar pantalla
adb shell screenrecord /sdcard/test.mp4
```

### Backend Node.js
```bash
cd C:\Bio\sistema_asistencia_biometrico\backend

# Start server
PORT=3001 npm start

# Verificar que levantó
curl http://localhost:3001/api/v1/health

# Ver logs en tiempo real
# (El servidor ya muestra logs por defecto)
```

---

## 📚 CONTEXTO DEL SISTEMA COMPLETO

### Backend (Node.js + PostgreSQL)
**Ubicación:** `C:\Bio\sistema_asistencia_biometrico\backend`

**Rutas clave:**
- `src/routes/auth.js` - Autenticación
- `src/routes/companies.js` - Empresas (multi-tenant)
- `src/routes/aponntDashboard.js` - Dashboard admin

**Base de datos:**
- PostgreSQL
- Multi-tenant (cada empresa tiene sus empleados)
- Tablas: users, companies, attendance, facial_biometric_templates

**Comando start:**
```bash
cd backend && PORT=3001 npm start
```

### Frontend Web (HTML + Vanilla JS)
**Ubicación:** `backend/public/*.html`
- `panel-administrativo.html` - Dashboard admin (web)
- `panel-empresa.html` - Dashboard empresa (web)

**NO confundir** con la APK Flutter (es otro frontend separado)

---

## 🎓 GUÍAS DE REFERENCIA

### Documentos del proyecto
1. `TECHNICAL_ARCHITECTURE.md` - Arquitectura general
2. `DEVELOPER_ONBOARDING_GUIDE.md` - Guía de onboarding
3. `REAL_BIOMETRIC_ENTERPRISE_DOCUMENTATION.md` - Docs biometría
4. `CLAUDE.md` - Guía de trabajo para Claude

### URLs útiles
- Backend health: `http://localhost:3001/api/v1/health`
- Companies API: `http://localhost:3001/api/aponnt/dashboard/companies`
- Panel admin: `http://localhost:9998/panel-administrativo.html`

---

## ⚠️ ADVERTENCIAS Y LIMITACIONES

### Lo que NO funciona aún
1. ❌ **ML Kit deshabilitado** - `google_mlkit_face_detection` comentado en pubspec
2. ❌ **Localhost hardcodeado** - Necesita fix inmediato
3. ❓ **Verificación facial** - `simple_face_service.dart` no revisado en detalle
4. ❓ **Múltiples main.dart** - Confusión sobre versión correcta
5. ❓ **Runtime permissions** - No verificado si se solicitan

### Problemas conocidos del backend
- Campo `latitude, longitude, postal_code` NO existen en tabla companies
- Algunos endpoints fallan (corregir en `aponntDashboard.js`)

---

## 🤝 EXPECTATIVAS DEL DESARROLLADOR

### Lo que el desarrollador necesita
> "Quiero una IA que **testee la APK de forma autónoma** sin mi intervención constante."

### Ciclo ideal esperado
```
IA → Instala APK en emulador
IA → Testea login
IA → Detecta error X
IA → Analiza código
IA → Aplica fix
IA → Rebuild APK
IA → Re-testea
IA → ✅ Login funciona
IA → Continúa con siguiente feature
```

### Frustración actual
- 1 mes dando vueltas
- Metodología "dame logs → analizo → fix → dame logs" **no funciona**
- Necesita feedback loop inmediato

---

## 🚀 SIGUIENTE PASO RECOMENDADO

### Para la próxima IA:

**PRIMERO:**
1. Verificar que puedes ejecutar emulador Android
2. Confirmar acceso a `adb` y `flutter`
3. Levantar backend Node.js

**LUEGO:**
1. Fix localhost → `10.0.2.2:3001`
2. Rebuild APK
3. Instalar en emulador
4. **TESTEAR LOGIN BÁSICO**
5. Reportar resultados reales

**Si falla:**
- Adjuntar logs completos de `adb logcat`
- Screenshot de error
- Identificar root cause
- Aplicar fix
- Re-testear

**Si funciona:**
- Continuar con testing de cámara
- Luego GPS
- Luego biometría completa

---

## 📞 CONTACTO Y HANDOFF

**Desarrollador:** Usuario original
**Proyecto:** Sistema de Asistencia Biométrico
**Duración bloqueado:** 1 mes
**Urgencia:** Alta
**Expectativa:** Progreso medible en 1-3 días con IA adecuada

**Archivos críticos para la nueva IA:**
- ✅ Este documento (HANDOFF_TO_ANOTHER_AI.md)
- ✅ APK compilada (build/app/outputs/flutter-apk/app-release.apk)
- ✅ Backend funcionando (backend/)
- ✅ Docs técnicos (TECHNICAL_ARCHITECTURE.md, etc.)

---

## ✅ CRITERIOS DE ÉXITO

La próxima IA habrá tenido éxito cuando:

1. **Login funciona** - Usuario puede loguearse con email/password
2. **Cámara abre** - Botón biométrico abre cámara sin crashes
3. **Backend conecta** - Requests HTTP llegan al servidor
4. **GPS funciona** - Location service reporta coordenadas
5. **APK estable** - No crashes al navegar pantallas

**Meta final:**
APK instalable y funcional para testing de usuario final.

---

**Documento generado:** 2025-10-01
**Por:** Claude Code (antes de handoff)
**Versión:** 1.0
**Para:** IA con capacidades Android testing
