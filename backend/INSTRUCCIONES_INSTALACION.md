# 🚀 INSTRUCCIONES DE INSTALACIÓN - Sistema de Notificaciones V2.0

## ✅ COMPLETADO AUTOMÁTICAMENTE

Las siguientes tareas ya han sido completadas:

- ✅ Dependencias NPM instaladas (`pdfkit`, `qrcode`)
- ✅ Directorio de reportes creado (`backend/reports/audit`)
- ✅ Cron jobs configurados en `src/utils/cronJobs.js`
- ✅ Rutas registradas en `src/index.js`
- ✅ Todos los servicios implementados
- ✅ Toda la documentación creada

---

## 🔴 PENDIENTE: MIGRACIÓN DE BASE DE DATOS

La única tarea pendiente es ejecutar las migraciones SQL en PostgreSQL.

### Opción 1: Usando psql (Recomendado)

```bash
# 1. Ejecutar migración principal (crea todas las tablas)
psql -U postgres -d aponnt_asistencia -f "C:\Bio\sistema_asistencia_biometrico\backend\database\migrations\20251016_create_notification_system_tables.sql"

# 2. Insertar datos iniciales (reglas de compliance, tipos de solicitud, módulos)
psql -U postgres -d aponnt_asistencia -f "C:\Bio\sistema_asistencia_biometrico\backend\database\migrations\20251016_insert_notification_system_data.sql"
```

**Nota:** Ajusta el usuario (`postgres`) y el nombre de la base de datos (`aponnt_asistencia`) según tu configuración.

---

### Opción 2: Usando pgAdmin

1. Abre **pgAdmin**
2. Conecta a tu base de datos `aponnt_asistencia`
3. Click derecho en la base de datos → **Query Tool**
4. Abre el archivo `20251016_create_notification_system_tables.sql`
5. Ejecuta el script (botón ▶️)
6. Repite los pasos 3-5 con el archivo `20251016_insert_notification_system_data.sql`

---

### Opción 3: Usando DBeaver

1. Abre **DBeaver**
2. Conecta a tu base de datos `aponnt_asistencia`
3. Click derecho en la base de datos → **SQL Editor** → **Open SQL Script**
4. Selecciona `20251016_create_notification_system_tables.sql`
5. Ejecuta el script (Ctrl+Enter o botón Execute)
6. Repite los pasos 3-5 con `20251016_insert_notification_system_data.sql`

---

### Verificación de Instalación

Después de ejecutar las migraciones, verifica que las tablas fueron creadas:

```sql
-- Verificar tablas del sistema de notificaciones
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'compliance_rules',
    'compliance_violations',
    'sla_metrics',
    'proactive_rules',
    'proactive_executions',
    'cost_budgets',
    'cost_transactions',
    'audit_reports',
    'report_access_log',
    'notification_groups',
    'notification_messages'
  )
ORDER BY table_name;
```

**Resultado esperado:** Debe devolver 11 tablas.

---

## 🔧 CONFIGURACIÓN OPCIONAL

### Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# Audit Reports
VERIFICATION_URL=https://tu-dominio.com/verify

# SLA Target
SLA_TARGET_HOURS=48
SLA_WARNING_THRESHOLD=36

# Proactive Notifications
PROACTIVE_CHECK_FREQUENCY=hourly

# Timezone
TIMEZONE=America/Argentina/Buenos_Aires
```

---

## 🚀 REINICIAR SERVIDOR

Después de ejecutar las migraciones, reinicia el servidor:

```bash
# Opción 1: Reinicio normal
npm restart

# Opción 2: Modo desarrollo
npm run dev

# Opción 3: PM2 (si está instalado)
pm2 restart all
```

---

## ✅ VERIFICACIÓN FINAL

Verifica que todos los endpoints estén funcionando:

```bash
# 1. Test de compliance
curl -X POST http://localhost:5000/api/compliance/validate \
  -H "Content-Type: application/json" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"

# 2. Test de SLA
curl -X GET "http://localhost:5000/api/sla/dashboard" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"

# 3. Test de recursos
curl -X GET "http://localhost:5000/api/resources/dashboard" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"

# 4. Test de reglas proactivas
curl -X GET "http://localhost:5000/api/proactive/rules" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"

# 5. Test de tipos de reportes
curl -X GET "http://localhost:5000/api/audit-reports/types" \
  -H "x-company-id: 11" \
  -H "x-role: rrhh"
```

**Resultado esperado:** Todos los endpoints deben responder con `success: true`.

---

## 📊 CRON JOBS ACTIVOS

Después del reinicio, estos trabajos programados estarán activos:

| Trabajo | Frecuencia | Hora | Descripción |
|---------|-----------|------|-------------|
| **Compliance Validation** | Diario | 02:30 AM | Valida cumplimiento legal |
| **Proactive Rules** | Cada hora | :00 | Ejecuta reglas preventivas |
| **SLA Metrics** | Diario | 03:00 AM | Calcula métricas de rendimiento |
| **Workload Overload** | Diario | 18:30 | Detecta sobrecarga de trabajo |
| **Monthly Reports** | Mensual | 1er día, 01:00 AM | Genera reportes automáticos |

Puedes verificar el estado de los cron jobs:

```bash
curl -X GET http://localhost:5000/api/cron/status \
  -H "x-role: admin"
```

---

## 📚 DOCUMENTACIÓN DISPONIBLE

Cada módulo tiene su documentación completa:

1. **`COMPLIANCE_EJEMPLOS.md`** - Ejemplos de uso de Compliance Dashboard
2. **`SLA_EJEMPLOS.md`** - Ejemplos de SLA Tracking
3. **`RESOURCE_CENTER_EJEMPLOS.md`** - Ejemplos de Resource Center
4. **`PROACTIVE_NOTIFICATIONS_EJEMPLOS.md`** - Ejemplos de Notificaciones Proactivas
5. **`AUDIT_REPORTS_EJEMPLOS.md`** - Ejemplos de Reportes de Auditoría
6. **`SISTEMA_NOTIFICACIONES_V2_RESUMEN.md`** - Resumen completo del sistema

---

## 🆘 PROBLEMAS COMUNES

### Error: "relation does not exist"
**Causa:** Las migraciones no se ejecutaron correctamente.
**Solución:** Ejecuta las migraciones SQL manualmente (ver arriba).

### Error: "Cannot find module 'pdfkit'"
**Causa:** Las dependencias no se instalaron.
**Solución:** `npm install pdfkit qrcode`

### Error: "ENOENT: no such file or directory, mkdir 'reports/audit'"
**Causa:** El directorio de reportes no existe.
**Solución:** `mkdir -p backend/reports/audit`

### Los cron jobs no se ejecutan
**Causa:** El servidor no se reinició después de los cambios.
**Solución:** `npm restart` o `pm2 restart all`

---

## 📞 SOPORTE

Para cualquier problema o consulta:
- **Email**: contacto@aponnt.com
- **WhatsApp**: +11-2657-673741
- **Owner**: Valentino Rivas Jordan

---

## 🎉 ¡LISTO!

Una vez ejecutadas las migraciones SQL, el Sistema de Notificaciones Avanzado V2.0 estará completamente funcional.

**Próximos pasos recomendados:**
1. Crear reglas proactivas personalizadas para tu empresa
2. Configurar umbrales de compliance específicos
3. Generar reportes de prueba
4. Implementar los componentes React del frontend
5. Configurar notificaciones por email/WhatsApp
