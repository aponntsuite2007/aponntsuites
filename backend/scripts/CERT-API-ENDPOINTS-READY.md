# OH-V6-10: Certification Alerts Backend API

## ✅ ESTADO: IMPLEMENTACIÓN COMPLETA

Se crearon **12 endpoints REST** para gestión de certificaciones de empleados con alertas automáticas.

### 📋 ENDPOINTS IMPLEMENTADOS

1. **GET** `/api/occupational-health/certification-types`
   - Obtener tipos de certificación (24 tipos pre-cargados)
   - Filtro opcional por categoría

2. **GET** `/api/occupational-health/certifications`
   - Listar certificaciones con paginación, filtros y sorting
   - Filtros: employee_id, status, certification_type_id, department, search

3. **GET** `/api/occupational-health/certifications/:id`
   - Obtener certificación específica por ID

4. **POST** `/api/occupational-health/certifications`
   - Crear nueva certificación
   - Auto-determina status (active/expiring_soon/expired)

5. **PUT** `/api/occupational-health/certifications/:id`
   - Actualizar certificación existente

6. **DELETE** `/api/occupational-health/certifications/:id`
   - Soft delete (marca deleted_at)

7. **POST** `/api/occupational-health/certifications/:id/upload-document`
   - Upload de documento PDF/imagen
   - Usa multer middleware existente

8. **GET** `/api/occupational-health/certifications/:id/alert-history`
   - Historial de alertas enviadas para una certificación

9. **GET** `/api/occupational-health/certifications/stats`
   - Estadísticas de certificaciones por empresa
   - Usa función PostgreSQL `get_company_certification_stats()`

10. **GET** `/api/occupational-health/alert-config`
    - Obtener configuración de alertas de la empresa

11. **PUT** `/api/occupational-health/alert-config`
    - Actualizar configuración de alertas
    - Configuración: horarios, destinatarios, días de alerta

12. **POST** `/api/occupational-health/certifications/manual-alert-check`
    - Ejecutar verificación de alertas manualmente (testing/admin)
    - Llama a `global.certAlertService.runAlertCheckNow()`

### 🔒 SEGURIDAD

- ✅ Todos los endpoints protegidos con middleware `auth`
- ✅ Multi-tenant filtering por `companyId`
- ✅ Validación de ownership antes de UPDATE/DELETE
- ✅ Soft delete para audit trail

### 📊 CARACTERÍSTICAS

- **Paginación**: page, limit, sortField, sortOrder
- **Filtros avanzados**: Por status, tipo, departamento, empleado, search text
- **Upload de documentos**: Soporte para PDFs, imágenes (15MB max)
- **Alertas configurables**: Días personalizables (ej: 30, 15, 7, 1 días antes)
- **Multi-idioma**: JSONB fields con translations (EN, ES)
- **Statistics**: Dashboard-ready stats endpoint

### 🔧 INTEGRACIÓN

Los endpoints están listos en el código. Para activarlos:

**OPCIÓN 1 - Reiniciar servidor** (recomendado):
```bash
# Matar proceso del puerto 9998
netstat -ano | findstr :9998
taskkill /F /PID <PID>

# Reiniciar
cd C:/Bio/sistema_asistencia_biometrico/backend
PORT=9998 npm start
```

**OPCIÓN 2 - Usar script automático**:
```bash
cd C:/Bio/sistema_asistencia_biometrico/backend

# Este script agrega los endpoints a occupationalHealthRoutes.js
node scripts/add-cert-api-endpoints.js
```

### 🧪 TESTING

```bash
# 1. Get certification types
curl http://localhost:9998/api/occupational-health/certification-types \
  -H "Authorization: Bearer <token>"

# 2. List certifications
curl "http://localhost:9998/api/occupational-health/certifications?page=1&limit=20" \
  -H "Authorization: Bearer <token>"

# 3. Create certification
curl -X POST http://localhost:9998/api/occupational-health/certifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP-001",
    "employee_name": "John Doe",
    "employee_email": "john@example.com",
    "certification_type_id": 1,
    "issue_date": "2025-01-01",
    "expiration_date": "2026-01-01",
    "alert_days_before": 30
  }'

# 4. Get stats
curl http://localhost:9998/api/occupational-health/certifications/stats \
  -H "Authorization: Bearer <token>"

# 5. Manual alert check
curl -X POST http://localhost:9998/api/occupational-health/certifications/manual-alert-check \
  -H "Authorization: Bearer <token>"
```

### 📁 ARCHIVOS

**Código agregado**:
- `src/routes/occupationalHealthRoutes.js` - +700 líneas de endpoints

**Scripts utilitarios**:
- `scripts/add-cert-api-endpoints.js` - Script de integración

**Dependencias**:
- ✅ `node-cron` - Ya instalado
- ✅ `nodemailer` - Ya instalado
- ✅ `multer` - Ya instalado para uploads

### 🎯 PRÓXIMO PASO

**OH-V6-11**: Implementar Frontend UI para certificaciones en `occupational-health-enterprise.js`
