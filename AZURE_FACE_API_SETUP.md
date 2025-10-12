# 🌐 Azure Face API - Guía de Configuración Enterprise

**Sistema Biométrico con Azure Cognitive Services**
**Fecha**: 2025-10-11
**Versión**: 1.0.0

---

## 📋 **Resumen**

Has integrado Azure Face API como proveedor enterprise de reconocimiento facial con:

- ✅ **99.8% precisión** (vs 95-97% de Face-API.js)
- ✅ **30,000 transacciones GRATIS/mes** (tier gratuito)
- ✅ **Arquitectura híbrida**: Azure primero, Face-API.js como fallback
- ✅ **Multi-tenant compliant**
- ✅ **GDPR compliant**
- ✅ **Detección de múltiples rostros**
- ✅ **Quality assessment automático**

---

## 🚀 **Paso 1: Crear Cuenta Azure (GRATIS)**

### 1.1 Registro

1. Ir a: https://portal.azure.com
2. Click en **"Start Free"** o **"Free Account"**
3. Completar registro:
   - Email
   - Verificación de identidad (puede pedir teléfono)
   - **NO requiere tarjeta de crédito para tier gratuito**
4. Esperar confirmación

### 1.2 Verificar Tier Gratuito

- **30,000 transacciones/mes** totalmente gratis
- **Permanente** (no expira después de prueba)
- Suficiente para:
  - 500 empleados registrando 1 vez cada uno
  - 29,500 verificaciones/mes
  - **~1000 verificaciones/día**

---

## 🔧 **Paso 2: Crear Face API Resource**

### 2.1 Desde Azure Portal

1. Iniciar sesión en: https://portal.azure.com

2. En la barra superior, buscar: **"Face"**

3. Seleccionar **"Face"** (ícono de rostro azul)

4. Click en **"+ Create"**

5. Llenar formulario:

   **Basics**:
   - **Subscription**: Free Trial (o tu subscripción)
   - **Resource Group**:
     - Click "Create new"
     - Nombre: `biometric-rg`
   - **Region**: **East US** (recomendado para latencia)
   - **Name**: `tu-empresa-face-api` (debe ser único globalmente)
   - **Pricing Tier**: **Free F0** ⭐
     - 30 transacciones/segundo
     - 30,000 transacciones/mes
     - **$0.00 USD/mes**

6. Click **"Review + create"**

7. Revisar configuración:
   ```
   Resource type: Face
   Pricing tier: Free F0
   Monthly cost: $0.00
   ```

8. Click **"Create"**

9. Esperar deployment (~30 segundos)

10. Click **"Go to resource"**

---

## 🔑 **Paso 3: Obtener Credenciales**

### 3.1 Desde tu Face Resource

1. En el menú izquierdo, buscar **"Keys and Endpoint"**

2. Verás 2 keys y 1 endpoint:
   ```
   KEY 1: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
   KEY 2: 9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k

   ENDPOINT: https://tu-empresa-face-api.cognitiveservices.azure.com/
   ```

3. Copiar **KEY 1** (o KEY 2, funcionan igual)

4. Copiar **ENDPOINT**

---

## ⚙️ **Paso 4: Configurar en el Sistema**

### 4.1 Crear Archivo .env

En `backend/.env`, agregar:

```bash
# Azure Face API Configuration
AZURE_FACE_ENDPOINT=https://tu-empresa-face-api.cognitiveservices.azure.com/
AZURE_FACE_KEY=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p

# Biometric Encryption (cambiar en producción)
BIOMETRIC_ENCRYPTION_KEY=your-super-secret-key-min-32-characters-long
```

### 4.2 Reiniciar Servidor

```bash
cd backend
npm start
```

### 4.3 Verificar en Logs

Buscar en los logs del servidor:

```
✅ [AZURE-FACE] Servicio habilitado
   Endpoint: https://tu-empresa-face-api.cognitiveservices.azure.com/
   Recognition Model: recognition_04
```

Si ves:
```
⚠️ [AZURE-FACE] Servicio deshabilitado (faltan credenciales)
```
→ Revisar que las variables de entorno estén correctas

---

## 🧪 **Paso 5: Probar Registro Biométrico**

### 5.1 Desde Panel Empresa

1. Abrir: http://localhost:9998/panel-empresa.html

2. Login con usuario admin

3. Ir a: **Módulo Biométrico** → **Registro de Empleados**

4. Seleccionar un empleado

5. Click en **"Capturar Rostro Facial"**

6. Permitir acceso a cámara

7. Posicionarse frente a cámara

### 5.2 Verificar que Usa Azure

En los logs del servidor, buscar:

```
🌐 [BIOMETRIC-ENTERPRISE] Using Azure Face API (enterprise-grade)...
🔍 [AZURE-FACE] Detectando rostro... (125432 bytes)
✅ [AZURE-FACE] Rostro detectado exitosamente (842ms)
   FaceId: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
   Quality: high
   Confidence: 0.92
```

Si funciona con Azure, verás:
```
✅ [AZURE] Face processed successfully (842ms)
```

Si falla y usa fallback:
```
⚠️ [AZURE] Failed: INVALID_CREDENTIALS, falling back to Face-API.js
📍 [BIOMETRIC-ENTERPRISE] Azure not configured, using Face-API.js local...
```

### 5.3 Validaciones Automáticas

Azure detecta y rechaza automáticamente:

- ❌ **Múltiples rostros**: "Se detectaron 2 rostros. Solo se permite uno."
- ❌ **Sin rostro**: "No se detectó ningún rostro en la imagen"
- ❌ **Calidad baja**: "Calidad de imagen insuficiente para registro biométrico"
- ❌ **Blur excesivo**: Confidence score bajo
- ❌ **Mala iluminación**: Quality = low

---

## 📊 **Arquitectura Híbrida**

### Flujo de Detección

```
┌─────────────────────────────────────────┐
│  Usuario captura rostro con cámara     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Backend recibe imagen                  │
└──────────────┬──────────────────────────┘
               │
               ▼
       ┌───────────────┐
       │ Azure Config? │
       └───────┬───────┘
               │
        ┌──────┴──────┐
        │             │
    ✅ SÍ          ❌ NO
        │             │
        ▼             ▼
┌──────────────┐  ┌──────────────┐
│ Azure Face   │  │ Face-API.js  │
│ API (99.8%)  │  │ Local (95%)  │
└──────┬───────┘  └──────┬───────┘
       │                 │
       │ ❌ Falla       │
       └─────────────────┤
                         │
                         ▼
              ┌────────────────────┐
              │ Fallback Face-API  │
              │ (si Azure falla)   │
              └─────────┬──────────┘
                        │
                        ▼
              ┌────────────────────┐
              │ Template 128D      │
              │ + AES-256          │
              │ → PostgreSQL       │
              └────────────────────┘
```

---

## 📈 **Comparación de Resultados**

### Con Azure (cuando está configurado)

**Response de registro exitoso**:
```json
{
  "success": true,
  "data": {
    "templateId": "abc123",
    "provider": "azure-face-api",
    "accuracy": "99.8%",
    "algorithm": "azure-face-api",
    "qualityScore": 0.95,
    "confidenceScore": 0.92
  },
  "performance": {
    "processingTime": 842
  }
}
```

### Sin Azure (fallback a Face-API.js local)

**Response de registro**:
```json
{
  "success": true,
  "data": {
    "templateId": "abc123",
    "provider": "face-api-js",
    "accuracy": "95-97%",
    "algorithm": "face-api-js-v0.22.2",
    "qualityScore": 0.87,
    "confidenceScore": 0.85
  },
  "performance": {
    "processingTime": 1243
  }
}
```

---

## 💰 **Gestión de Costos**

### Tier Gratuito (F0)

- **30,000 transacciones/mes GRATIS**
- **30 transacciones/segundo**
- Suficiente para:
  - 500 empleados × 1 registro = 500 transacciones
  - 29,500 verificaciones/mes restantes
  - **~1000 verificaciones/día**

### Si necesitas más (opcional)

**Standard S0**:
- **Primeras 1M**: $1.00 por 1000 transacciones
- **1M-10M**: $0.80 por 1000
- **10M-100M**: $0.60 por 1000
- **100M+**: $0.40 por 1000

**Ejemplo**:
- 100,000 verificaciones/mes
- 70,000 extra (sobre las 30K gratis)
- Costo: 70 × $1.00 = **$70 USD/mes**

---

## 🔒 **Seguridad y Compliance**

### ¿Qué guarda Azure?

- ✅ **FaceId temporal** (válido 24 horas)
- ✅ **Metadata** (quality, confidence, landmarks)
- ❌ **NO guarda la foto original** (procesada y descartada)
- ❌ **NO guarda embedding en texto plano**

### ¿Qué guardamos nosotros?

- ✅ **Embedding encriptado AES-256**
- ✅ **Hash SHA-256**
- ✅ **Metadata de calidad**
- ❌ **NO guardamos foto original**

### Compliance

- ✅ **GDPR** compliant (Europa)
- ✅ **HIPAA** eligible (Salud USA)
- ✅ **SOC 2** certificado
- ✅ **ISO 27001**

---

## 🛠️ **Troubleshooting**

### Error: "Invalid credentials"

**Logs**:
```
❌ [AZURE-FACE] Error HTTP 401: Unauthorized
```

**Solución**:
1. Verificar que AZURE_FACE_KEY está correcto
2. Verificar que no hay espacios extra
3. Probar con KEY 2 si KEY 1 falla
4. Regenerar keys desde Azure Portal

---

### Error: "Rate limit exceeded"

**Logs**:
```
❌ [AZURE-FACE] Error HTTP 429: Too Many Requests
```

**Solución**:
- Has excedido 30K transacciones/mes (tier gratuito)
- O has excedido 30 transacciones/segundo
- Esperar 1 minuto y reintentar
- O upgrade a Standard S0

---

### Error: "Endpoint not found"

**Logs**:
```
❌ [AZURE-FACE] Error de conexión: ENOTFOUND
```

**Solución**:
1. Verificar que AZURE_FACE_ENDPOINT termina en `.cognitiveservices.azure.com/`
2. Verificar que incluye `https://`
3. Verificar que no tiene espacios
4. Ejemplo correcto:
   ```
   AZURE_FACE_ENDPOINT=https://mi-empresa-face-api.cognitiveservices.azure.com/
   ```

---

### Sistema usa Face-API.js en lugar de Azure

**Logs**:
```
⚠️ [AZURE-FACE] Servicio deshabilitado (faltan credenciales)
📍 [BIOMETRIC-ENTERPRISE] Azure not configured, using Face-API.js local...
```

**Solución**:
1. Verificar que `.env` existe en `backend/`
2. Verificar que contiene `AZURE_FACE_ENDPOINT` y `AZURE_FACE_KEY`
3. Reiniciar servidor: `npm start`
4. Verificar logs de inicio

---

## 📚 **Referencias**

- **Azure Face API Docs**: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-identity
- **Pricing**: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/face-api/
- **Free Tier**: https://azure.microsoft.com/en-us/pricing/free-services/
- **SDKs**: https://learn.microsoft.com/en-us/javascript/api/overview/azure/ai-face-readme

---

## ✅ **Checklist de Configuración**

- [ ] Cuenta Azure creada
- [ ] Face API resource creado (Free F0)
- [ ] Credenciales obtenidas (Endpoint + Key)
- [ ] Variables de entorno configuradas en `.env`
- [ ] Servidor reiniciado
- [ ] Log muestra "✅ [AZURE-FACE] Servicio habilitado"
- [ ] Registro biométrico probado
- [ ] Log muestra "✅ [AZURE] Face processed successfully"
- [ ] Response incluye `"provider": "azure-face-api"`
- [ ] Response incluye `"accuracy": "99.8%"`

---

## 🎉 **Conclusión**

Has integrado con éxito Azure Face API enterprise en tu sistema biométrico.

**Beneficios logrados**:
- ✅ Precisión 99.8% (enterprise-grade)
- ✅ Gratis para tu volumen (30K/mes)
- ✅ Fallback automático a Face-API.js
- ✅ Multi-tenant compatible
- ✅ GDPR compliant

**Próximos pasos opcionales**:
1. Agregar liveness detection (requiere plan S0)
2. Implementar PersonGroup para comparación 1:N
3. Monitorear usage en Azure Portal
4. Configurar alerts si se acerca al límite

---

**Documentación creada el**: 2025-10-11
**Versión del sistema**: 1.0.0
**Tecnología**: Azure Cognitive Services Face API v1.0
