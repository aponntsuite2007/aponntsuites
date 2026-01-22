# MIGRACIÓN DMS - FUENTE ÚNICA DE VERDAD (SSOT)

**Fecha**: 2026-01-20
**Estado**: ✅ FASE 1 COMPLETADA
**Prioridad**: ALTA
**Última actualización**: 2026-01-20

---

## RESUMEN EJECUTIVO

El sistema actualmente tiene **23+ rutas de upload independientes** que almacenan documentos en diferentes directorios del filesystem. Esta migración centraliza TODO el manejo documental en el DMS para:

1. **Auditoría centralizada** - Un solo lugar para ver todos los documentos
2. **Versionamiento** - Historial de cambios por documento
3. **GDPR Compliance** - Derecho al olvido, exportación de datos
4. **Búsqueda unificada** - Full-text search en todos los documentos
5. **Permisos granulares** - Control de acceso por documento

---

## CAMBIOS COMPLETADOS ✅

### 1. DMSIntegrationService Extendido
**Archivo**: `src/services/dms/DMSIntegrationService.js`

Nuevos módulos agregados a `MODULE_CATEGORY_MAP`:
- `job-postings` → RRHH
- `recruitment` → RRHH
- `employee-documents` → RRHH
- `identity-documents` → RRHH
- `biometric` → OPERACIONES
- `biometric-consent` → LEGAL
- `suppliers` → PROVEEDORES
- `rfq` → PROVEEDORES
- `purchase-orders` → PROVEEDORES
- `supplier-invoices` → PROVEEDORES
- `supplier-messages` → PROVEEDORES
- `invoicing` → FINANCIERO
- `general` → GENERAL
- `uploads` → GENERAL

Nuevos tipos de documento en `MODULE_DOCUMENT_TYPES`:
- CVs de postulantes
- Documentos de identidad (DNI, pasaporte)
- Fotos biométricas
- Adjuntos de RFQ y PO
- Facturas de proveedores
- Recibos de pago
- Uploads genéricos

### 2. Middleware DMS Creado
**Archivo**: `src/middleware/dmsUploadMiddleware.js`

Funciones exportadas:
- `dmsUpload` - Instancia de multer con memoryStorage
- `registerWithDMS(module, documentType, options)` - Middleware para registrar en DMS
- `createDMSResponse(req, additionalData)` - Helper para respuestas
- `initializeDMSMiddleware(app, models, sequelize)` - Inicializador

### 3. Server.js Actualizado
**Archivo**: `server.js`

Cambio en `initializeDMS()`:
```javascript
// ✅ Registrar DMSIntegrationService globalmente para middleware
if (dmsServices.integrationService) {
  app.set('dmsIntegrationService', dmsServices.integrationService);
}
```

### 4. uploadRoutes.js Integrado
**Archivo**: `src/routes/uploadRoutes.js`

- Agregado helper `registerUploadInDMS()`
- `/single` y `/multiple` ahora registran en DMS
- Respuesta incluye `dms: { documentId, status, message }`

### 5. employeeDocumentRoutes.js Integrado ✅ (NUEVO)
**Archivo**: `src/routes/employeeDocumentRoutes.js`

- Agregado helper `registerEmployeeDocInDMS()`
- **4 endpoints** actualizados:
  - `POST /` - Crear documento con archivos
  - `PUT /:id` - Actualizar documento con archivos
  - `POST /dni/:userId/photos` - Fotos de DNI (frente/dorso)
  - `POST /passport/:userId` - Fotos de pasaporte (páginas 1-2)

### 6. medicalRoutes.js Integrado ✅ (NUEVO)
**Archivo**: `src/routes/medicalRoutes.js`

- Agregado helper `registerMedicalDocInDMS()`
- **3 endpoints** actualizados:
  - `POST /upload` - Upload genérico médico
  - `POST /photos/:id/upload` - Fotos médicas solicitadas
  - `POST /studies` - Estudios médicos

### 7. jobPostingsRoutes.js Integrado ✅ (NUEVO)
**Archivo**: `src/routes/jobPostingsRoutes.js`

- Agregado helper `registerCVInDMS()`
- **3 endpoints** actualizados:
  - `POST /public/apply` - Postulación pública con CV
  - `PUT /public/candidates/profile` - Actualizar perfil candidato con CV
  - `POST /applications` - Crear postulación (autenticado) con CV

### 8. supplierPortalAttachments.js Integrado ✅ (NUEVO)
**Archivo**: `src/routes/supplierPortalAttachments.js`

- Agregado helper `registerSupplierDocInDMS()`
- **5 endpoints** actualizados:
  - `POST /rfq/:rfqId/company-attachments` - Adjuntos empresa a RFQ
  - `POST /purchase-order/:poId/attachments` - Adjuntos empresa a PO
  - `POST /invoice/upload` - Facturas de proveedor
  - `POST /rfq/:rfqId/supplier-upload` - Adjuntos proveedor a RFQ (múltiples)
  - `POST /purchase-order/:poId/supplier-upload` - Adjuntos proveedor a PO (múltiples)

---

## CAMBIOS PENDIENTES ⏳ (FASE 2)

### PRIORIDAD MEDIA

#### 1. invoicingRoutes.js
**Archivo**: `src/routes/invoicingRoutes.js`
**Storage actual**: `/uploads/receipts/`
**Endpoints a modificar**:
- `POST /api/invoicing/payments`

**Cambio requerido**: Registrar recibos en DMS con tipo `INV_RECEIPT`.

### PRIORIDAD BAJA

#### 2. mobileRoutes.js
**Archivo**: `src/routes/mobileRoutes.js`
**Storage actual**: `/uploads/biometric/`
**Endpoints a modificar**:
- Uploads biométricos desde APK

#### 3. biometric-enterprise-routes.js
**Archivo**: `src/routes/biometric-enterprise-routes.js`
**Nota**: Usa memoryStorage, templates encriptados. Solo registrar metadata en DMS.

#### 4. medicalCaseRoutes.js
**Archivo**: `src/routes/medicalCaseRoutes.js`
**Storage actual**: `/uploads/medical-documents/`

---

## APKs FLUTTER - PENDIENTE

### Archivos a modificar:
1. `frontend_flutter/lib/services/api_service.dart`
2. `frontend_flutter/lib/employee_app/services/employee_api_service.dart`
3. `frontend_flutter/lib/screens/documents/document_requests_screen.dart`
4. `frontend_flutter/lib/screens/employee/photo_upload_screen.dart`

### Cambios requeridos:
- Verificar que los endpoints de upload devuelvan `dms.documentId`
- Opcionalmente almacenar `documentId` para referencia futura

---

## CÓDIGO DE EJEMPLO PARA MIGRACIÓN

### Patrón para agregar registro DMS a una ruta existente:

```javascript
// ANTES (sin DMS)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  // Guardar archivo en filesystem
  // ...
  res.json({ success: true, file: {...} });
});

// DESPUÉS (con DMS)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  // Guardar archivo en filesystem (mantener compatibilidad)
  // ...

  // ✅ Registrar en DMS
  const dmsService = req.app.get('dmsIntegrationService');
  let dmsResult = null;

  if (dmsService) {
    try {
      dmsResult = await dmsService.registerDocument({
        module: 'mi-modulo',
        documentType: 'tipo-documento',
        companyId: req.user.company_id,
        employeeId: req.body.employee_id || req.user.user_id,
        createdById: req.user.user_id,
        sourceEntityType: 'mi-entidad',
        sourceEntityId: req.body.entity_id,
        file: {
          buffer: fs.readFileSync(req.file.path),
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        },
        title: req.file.originalname,
        description: req.body.description || '',
        metadata: { /* datos adicionales */ }
      });
    } catch (err) {
      console.error('DMS registration failed:', err.message);
    }
  }

  res.json({
    success: true,
    file: {...},
    dms: dmsResult ? { documentId: dmsResult.document.id } : null
  });
});
```

---

## VERIFICACIÓN DE MIGRACIÓN

### Test Manual:
1. Subir documento desde cada ruta
2. Verificar en `/api/dms/documents` que aparece
3. Verificar que descarga funciona
4. Verificar auditoría en logs

### Script de Verificación:
```bash
# Contar documentos en DMS por módulo
curl -X GET "http://localhost:9998/api/dms/documents?groupBy=source_module" \
  -H "Authorization: Bearer $TOKEN"
```

---

## CRONOGRAMA SUGERIDO

| Fase | Archivos | Estimado |
|------|----------|----------|
| 1 | employeeDocumentRoutes.js, medicalRoutes.js | Sesión actual |
| 2 | jobPostingsRoutes.js, invoicingRoutes.js | Siguiente sesión |
| 3 | supplierPortalAttachments.js | Siguiente sesión |
| 4 | mobileRoutes.js, biometric routes | Siguiente sesión |
| 5 | APKs Flutter | Siguiente sesión |
| 6 | Testing E2E completo | Sesión final |

---

## NOTAS IMPORTANTES

1. **Retrocompatibilidad**: Mantener archivos en filesystem original mientras se migra. DMS guarda metadata + copia.

2. **Multi-tenant**: Todos los documentos DEBEN tener `company_id`.

3. **Adapters existentes**: Los 6 adapters (Vacation, Sanction, Medical, Training, Legal, Payroll) NO están conectados a sus módulos. Deben ser llamados explícitamente.

4. **APKs no bloquean**: Las APKs seguirán funcionando sin cambios, solo no tendrán la info de DMS en respuesta.

---

## CONTACTO

Documento generado por Claude Code durante sesión de migración DMS.
Para continuar: Leer este archivo y seguir las fases pendientes.
