# 📱 Configuración APK Kiosk Android - Render

## ✅ Configuración Actualizada (11/10/2025)

### 🌐 Backend URL por Defecto

La APK del kiosk Android ahora está configurada para conectarse **automáticamente** al backend de Render:

**URL**: `https://aponntsuites.onrender.com`

### 📋 Archivos Modificados

1. **`frontend_flutter/lib/config/dynamic_server_config.dart`**
   - Línea 25-30: Configuración de producción actualizada
   ```dart
   'production': {
     'name': 'Producción Render',
     'host': 'aponntsuites.onrender.com',
     'port': 443,
     'protocol': 'https'
   }
   ```

2. **`frontend_flutter/lib/services/config_service.dart`**
   - Línea 13: URL por defecto
   ```dart
   static const String DEFAULT_BASE_URL = 'aponntsuites.onrender.com';
   ```
   - Línea 15: Company ID por defecto MLK IT
   ```dart
   static const String DEFAULT_COMPANY_ID = '11';
   ```

### 🔄 Flujo de Funcionamiento

1. **Primera apertura de la APK**:
   - Se conecta automáticamente a `https://aponntsuites.onrender.com`
   - Company ID predeterminado: `11` (MLK IT)

2. **Configuración inicial**:
   - Solo pide configurar:
     - Nombre de la empresa (opcional, se puede cambiar)
     - ID de empresa (si es diferente de 11)
     - Usuario administrador para autenticar el kiosk

3. **Funcionamiento**:
   - Una vez configurado, el kiosk queda listo para fichaje
   - Se sincroniza automáticamente con `panel-empresa.html` en Render
   - Comparte la misma base de datos PostgreSQL de Render

### 🏢 Multi-Tenant

El sistema respeta el aislamiento multi-tenant:
- Cada kiosk solo muestra empleados de su empresa (company_id)
- Los fichajes se registran con el company_id correcto
- No hay cruces de datos entre empresas

### 📱 Sincronización con Panel Empresa

La APK trabaja en conjunto con el panel web:

- **Panel Web**: `https://aponntsuites.onrender.com/panel-empresa.html`
- **APK Kiosk**: Se conecta al mismo backend
- **Base de Datos**: PostgreSQL compartida en Render

### 🔧 Cambio de Hosting

Si el backend se mueve a otro hosting:

1. Solo actualizar 2 archivos:
   - `frontend_flutter/lib/config/dynamic_server_config.dart` (línea 27)
   - `frontend_flutter/lib/services/config_service.dart` (línea 13)

2. Recompilar la APK:
   ```bash
   cd frontend_flutter
   flutter clean
   flutter pub get
   flutter build apk --release
   ```

3. La nueva APK se conectará al nuevo hosting automáticamente

### 📦 Ubicación de la APK

Después de compilar, la APK estará en:
```
frontend_flutter/build/app/outputs/flutter-apk/app-release.apk
```

### 🧪 Prueba en Emulador

```bash
# Iniciar emulador
emulator -avd Medium_Phone_API_36.0 -no-snapshot-load

# Instalar APK
adb install frontend_flutter/build/app/outputs/flutter-apk/app-release.apk

# Ver logs
adb logcat | grep -E "(KIOSK|Flutter)"
```

### ✅ Verificación

La APK debe mostrar en los logs:
```
🌐 [KIOSK] Servidor: https://aponntsuites.onrender.com | Company: 11
✅ Conexión establecida con el servidor
```

### 🔐 Seguridad

- HTTPS automático para Render (`.onrender.com` detectado)
- Tokens JWT para autenticación
- Company_id validation en todas las operaciones
- Aislamiento de datos por empresa

### 📞 Soporte

Si la APK no se conecta:

1. **Verificar internet** en el dispositivo
2. **Verificar que Render esté activo**: https://aponntsuites.onrender.com/api/v1/health
3. **Revisar logs** con `adb logcat`
4. **Resetear configuración** desde ajustes de la APK

---

**Última actualización**: 11 de octubre de 2025
**Backend activo**: https://aponntsuites.onrender.com
**Base de datos**: PostgreSQL en Render (dpg-d3i4mqjipnbc73dsnd6g-a)
