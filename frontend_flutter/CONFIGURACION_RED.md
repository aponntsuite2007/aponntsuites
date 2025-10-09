# 🌐 Configuración de Red - APK Android

## 📋 Pasos para Configurar la Conexión

### 1. Obtener la IP del Servidor

**En tu PC (donde está el backend):**
```cmd
ipconfig
```
Busca tu IP local (ejemplo: `192.168.1.100`)

### 2. Actualizar la Configuración de Flutter

**Editar:** `lib/config/app_config.dart`

```dart
// Cambiar esta línea:
static const String baseUrlProd = 'http://192.168.137.1:3001';

// Por tu IP real:
static const String baseUrlProd = 'http://TU_IP_AQUI:3001';
```

**Ejemplo:**
```dart
static const String baseUrlProd = 'http://192.168.1.100:3001';
```

### 3. Verificar que el Backend esté Accesible

**Probar desde otro dispositivo en la red:**
```
http://TU_IP:3001/api/v1/auth/login
```

### 4. Configurar Firewall (Windows)

**Permitir conexiones en puerto 3001:**

1. Abrir "Firewall de Windows Defender"
2. Click en "Configuración avanzada"
3. Click en "Reglas de entrada" > "Nueva regla..."
4. Seleccionar "Puerto" > "TCP" > Puerto específico: `3001`
5. Permitir la conexión
6. Aplicar a todas las redes
7. Nombrar: "Node.js API Port 3001"

**O por comando (como administrador):**
```cmd
netsh advfirewall firewall add rule name="Node.js API" dir=in action=allow protocol=TCP localport=3001
```

### 5. Compilar y Instalar APK

```cmd
# Compilar APK
flutter build apk --release --target=lib/main_real.dart

# Instalar en dispositivo
adb install build/app/outputs/flutter-apk/app-release.apk
```

## 🧪 Pruebas de Conexión

### Credenciales de Prueba:
- **Admin:** `admin@empresa.com` / `admin123`
- **Usuario:** `EMP001` / `password123`

### Funciones Disponibles:
1. ✅ **Login con credenciales**
2. ✅ **Login biométrico facial**
3. ✅ **Registro de biometría facial**
4. ✅ **Selección de múltiples cámaras**
5. ✅ **Conexión a MySQL real**

## 🔧 Troubleshooting

### Error: "Network unreachable"
- Verificar que ambos dispositivos estén en la misma red WiFi
- Comprobar firewall del PC
- Probar ping desde el móvil al PC

### Error: "Connection refused"
- Verificar que el backend esté corriendo
- Verificar el puerto 3001 esté abierto
- Comprobar la IP en app_config.dart

### Error: "Certificate error" (HTTPS)
- El backend usa HTTP, no HTTPS
- Verificar que la URL no incluya `https://`

### Error: "Permission denied" (Camera)
- Dar permisos de cámara en la configuración del teléfono
- Reinstalar la app si es necesario

## 📱 Configuración de Android

### Permisos Requeridos:
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

### Network Security (para HTTP):
```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">192.168.1.1</domain>
        <domain includeSubdomains="true">192.168.137.1</domain>
        <domain includeSubdomains="true">TU_IP_AQUI</domain>
    </domain-config>
</network-security-config>
```

## 🗄️ Base de Datos

### Tablas Utilizadas:
- ✅ `users` - Usuarios del sistema
- ✅ `facial_biometric_data` - Datos biométricos faciales
- ✅ `employee_locations` - Ubicaciones de empleados

### APIs Utilizadas:
- ✅ `POST /api/v1/auth/login` - Login
- ✅ `GET /api/v1/users` - Lista usuarios
- ✅ `POST /api/v1/facial-biometric/register` - Registro biométrico
- ✅ `POST /api/v1/facial-biometric/verify` - Verificación biométrica
- ✅ `POST /api/v1/location/report` - Reporte ubicación

## 📈 Métricas y Monitoring

### Logs a Revisar:
- Backend: Consola Node.js
- Android: `adb logcat -s flutter`
- Network: Herramientas de desarrollador del navegador

---

**¡La APK está lista para usar con tu base de datos MySQL real!** 🚀