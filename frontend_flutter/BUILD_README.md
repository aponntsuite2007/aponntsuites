# 📱 Aponnt Ecosistema Inteligente - Build APKs

## 🎯 Resumen

Este proyecto genera **4 APKs independientes** con diferentes `applicationId`, lo que permite instalarlas **simultáneamente** en el mismo dispositivo sin que se pisen entre sí.

## 📦 Las 4 APKs

| APK | Package ID | Título | Subtítulo | Color Principal |
|-----|-----------|---------|-----------|-----------------|
| **Employee** | `com.aponnt.attendance.employee` | Aponnt Ecosistema Inteligente | Empleados | Azul (#1976D2) |
| **Kiosk** | `com.aponnt.attendance.kiosk` | Aponnt Ecosistema Inteligente | Kiosco Biométrico | Azul (#1976D2) |
| **Medical** | `com.aponnt.attendance.medical` | Aponnt Ecosistema Inteligente | Área Médica | Verde (#00796B) |
| **Admin** | `com.aponnt.attendance.admin` | Aponnt Ecosistema Inteligente | Administrador | Azul (#1976D2) |

## 🚀 Cómo compilar las 4 APKs

### Opción 1: Script automático (Recomendado)

#### Windows:
```bash
cd C:\Bio\sistema_asistencia_biometrico\frontend_flutter
.\build_all_apks.bat
```

#### Linux/Mac:
```bash
cd /c/Bio/sistema_asistencia_biometrico/frontend_flutter
chmod +x build_all_apks.sh
./build_all_apks.sh
```

Este script:
1. Limpia builds anteriores (`flutter clean`)
2. Descarga dependencias (`flutter pub get`)
3. Compila las 4 APKs en modo release
4. Copia las APKs a la carpeta `dist/` con nombres amigables

### Opción 2: Compilación manual individual

```bash
# 1. Employee
flutter build apk --release --flavor employee --target=lib/main_employee.dart

# 2. Kiosk
flutter build apk --release --flavor kiosk --target=lib/main_kiosk.dart

# 3. Medical
flutter build apk --release --flavor medical --target=lib/main_medical.dart

# 4. Admin
flutter build apk --release --flavor admin --target=lib/main_admin.dart
```

## 📁 Ubicación de las APKs generadas

### Carpeta build (nombres generados por Flutter):
```
build/app/outputs/flutter-apk/
├── app-employee-release.apk
├── app-kiosk-release.apk
├── app-medical-release.apk
└── app-admin-release.apk
```

### Carpeta dist (nombres amigables, copiados por el script):
```
dist/
├── aponnt-employee.apk
├── aponnt-kiosk.apk
├── aponnt-medical.apk
└── aponnt-admin.apk
```

## 🔧 Configuración del Backend

Las 4 APKs están configuradas para conectarse a:

- **Producción (móvil)**: `https://www.aponnt.com`
- **Desarrollo (web/desktop)**: `http://localhost:9998`

Para cambiar la URL del backend, editar:
```dart
// lib/config/app_config.dart
static const String baseUrlProd = 'https://www.aponnt.com';
```

## 📲 Instalación en dispositivos

### Instalar todas las APKs simultáneamente:

```bash
# Conectar dispositivo por USB y habilitar depuración USB

# Instalar Employee
adb install dist/aponnt-employee.apk

# Instalar Kiosk
adb install dist/aponnt-kiosk.apk

# Instalar Medical
adb install dist/aponnt-medical.apk

# Instalar Admin
adb install dist/aponnt-admin.apk
```

**✅ IMPORTANTE**: Las 4 apps **NO se pisarán** porque cada una tiene un `applicationId` diferente.

### Verificar que las 4 están instaladas:

```bash
adb shell pm list packages | grep aponnt
```

Deberías ver:
```
package:com.aponnt.attendance.employee
package:com.aponnt.attendance.kiosk
package:com.aponnt.attendance.medical
package:com.aponnt.attendance.admin
```

## 🎨 Diferencias entre las apps

| Característica | Employee | Kiosk | Medical | Admin |
|----------------|----------|-------|---------|-------|
| **Orientación** | Portrait | Portrait | Ambas | Ambas |
| **Pantalla principal** | Employee Navigation | Biometric Selector | Medical Panel | Admin Dashboard |
| **Funcionalidad** | Gestión personal del empleado | Fichaje biométrico masivo | Panel médico | Administración general |

## 🛠️ Troubleshooting

### Error: "App not installed"
- Desinstalar versión anterior: `adb uninstall com.example.attendance_system`
- Verificar espacio en dispositivo

### Error al compilar un flavor:
```bash
# Limpiar y rebuild
flutter clean
flutter pub get
flutter build apk --release --flavor employee --target=lib/main_employee.dart
```

### APKs muy grandes (>100 MB):
```bash
# Compilar APKs separados por arquitectura (reduce tamaño)
flutter build apk --release --split-per-abi --flavor employee --target=lib/main_employee.dart
```

Esto genera 3 APKs por flavor:
- `app-employee-armeabi-v7a-release.apk` (ARM 32-bit)
- `app-employee-arm64-v8a-release.apk` (ARM 64-bit)
- `app-employee-x86_64-release.apk` (Intel 64-bit)

Instala solo el que corresponda a tu dispositivo.

## 🔐 Firma de APKs (para Play Store)

Para publicar en Play Store, necesitas firmar las APKs con tu keystore:

1. Crear keystore (una sola vez):
```bash
keytool -genkey -v -keystore aponnt-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias aponnt
```

2. Configurar en `android/key.properties`:
```properties
storePassword=<password>
keyPassword=<password>
keyAlias=aponnt
storeFile=../../aponnt-release-key.jks
```

3. Editar `android/app/build.gradle` (ya configurado para usar debug signature).

## 📊 Tamaños aproximados

- Employee: ~40-60 MB
- Kiosk: ~40-60 MB
- Medical: ~40-60 MB
- Admin: ~35-55 MB

**Total en dispositivo**: ~160-240 MB (si instalas las 4)

## 🌐 URLs de los servidores

Las apps detectan automáticamente el entorno:

- **Móvil/Tablet**: Usa `baseUrlProd` (https://www.aponnt.com)
- **Web**: Usa `baseUrl` (http://localhost:9998)
- **Desktop**: Usa `baseUrl` (http://localhost:9998)

## ✅ Checklist antes de distribuir

- [ ] Compilar las 4 APKs con el script
- [ ] Probar instalación de las 4 en un dispositivo físico
- [ ] Verificar que todas se instalan sin errores
- [ ] Probar conexión al backend de producción (www.aponnt.com)
- [ ] Verificar que cada app muestra su nombre correcto
- [ ] Probar login en cada app
- [ ] Copiar APKs de `dist/` a carpeta de distribución final

## 📞 Soporte

Si tienes problemas compilando o instalando las APKs, revisa:

1. Versión de Flutter: `flutter --version` (debe ser >=3.1.0)
2. Versión de Android SDK: `flutter doctor`
3. Logs de compilación: `flutter build apk --verbose`

---

**Última actualización**: 2025-12-09
**Versión**: 2.0.0
