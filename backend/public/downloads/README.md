# APK Kiosko Biométrico - Sistema de Asistencia

## 📱 Aplicación Android para Kioscos de Control de Asistencia

Esta APK convierte cualquier tablet o smartphone Android en un **kiosko biométrico** para control de asistencia con reconocimiento facial.

### ✨ Características Pre-configuradas

- **URL del Servidor**: `https://aponntsuites.onrender.com` (pre-cargada)
- **Multi-tenant**: El company_id se obtiene automáticamente al loguearse
- **Login Simplificado**: Solo requiere credenciales de administrador de empresa

### 🔧 Instalación y Configuración

1. **Descargar** la APK desde el panel de empresa (Gestión de Kioscos → Descargar APK)
2. **Instalar** en el dispositivo Android (permitir instalación desde fuentes desconocidas)
3. **Primer Inicio**:
   - Ingresar credenciales de **administrador de empresa**
   - El sistema detecta automáticamente el company_id
   - La configuración queda guardada localmente

### 📋 Requisitos

- Android 7.0 o superior
- Cámara frontal para reconocimiento facial
- Conexión a internet
- Permisos de cámara y almacenamiento

### 🚦 Modo Kiosko

Una vez configurado, el kiosko opera en modo continuo:

- **Semáforo amarillo**: Standby, esperando rostro
- **Semáforo verde**: Empleado reconocido ✅
- **Semáforo rojo**: Rostro no reconocido ❌
- **Alerta naranja**: Llegada tardía (requiere autorización)

### 🔐 Seguridad

- Token de autenticación encriptado
- Comunicación HTTPS con backend
- Validación multi-tenant en todas las requests
- Logs de acceso con foto de seguridad

### 📞 Soporte

Para soporte técnico, contacte al administrador del sistema.

---

**Versión**: 1.0.0
**Última actualización**: Octubre 2025
**Desarrollado por**: Aponnt Suites
