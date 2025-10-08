# INSTRUCCIONES DE EJECUCIÓN - Sistema de Asistencia Biométrico

## 🔧 CORRECCIÓN DEL SCHEMA EN PRODUCCIÓN

### ESTADO ACTUAL

✅ **Completado**:
1. Auditoría completa del sistema
2. Script SQL de corrección generado
3. Endpoint temporal de ejecución creado
4. Modelo Attendance actualizado
5. Commits pusheados a GitHub
6. Documentación completa (SYSTEM-FIX-REPORT.md)

🔄 **Pendiente de EJECUCIÓN**:
- Ejecutar script SQL en Render.com
- Verificar columnas agregadas
- Testing de endpoints
- Eliminar endpoint temporal

---

## 📋 PASOS PARA EJECUTAR LA CORRECCIÓN

### OPCIÓN 1: Ejecución Remota vía Endpoint Temporal (RECOMENDADO)

El sistema incluye un endpoint temporal para ejecutar el script SQL directamente en producción.

**Paso 1: Verificar que el deploy está completo**

Abrir en navegador:
```
https://aponntsuites.onrender.com/api/v1/health
```

Debería mostrar: `"status": "ok"` y `"database": "connected"` (o al menos que diagnostic funciona)

**Paso 2: Ejecutar el script SQL**

Usar Postman, Insomnia, o curl para hacer un POST request:

```bash
curl -X POST https://aponntsuites.onrender.com/api/v1/diagnostic/execute-fix-schema
```

**O usando PowerShell:**

```powershell
Invoke-WebRequest -Uri "https://aponntsuites.onrender.com/api/v1/diagnostic/execute-fix-schema" -Method POST
```

**O usando navegador con extensión REST Client:**
```
POST https://aponntsuites.onrender.com/api/v1/diagnostic/execute-fix-schema
```

**Respuesta esperada (exitosa):**
```json
{
  "success": true,
  "message": "Schema corregido exitosamente",
  "verification": {
    "users_columns": 60,
    "attendances_columns": 41,
    "departments_columns": 14
  }
}
```

**Paso 3: Verificar columnas agregadas**

Verificar tabla users:
```
https://aponntsuites.onrender.com/api/v1/diagnostic/table-columns/users
```

Debería mostrar ~60 columnas (antes eran 15).

Verificar tabla attendances:
```
https://aponntsuites.onrender.com/api/v1/diagnostic/table-columns/attendances
```

Debería mostrar ~41 columnas (antes eran 21).

Verificar tabla departments:
```
https://aponntsuites.onrender.com/api/v1/diagnostic/table-columns/departments
```

Debería mostrar ~14 columnas (antes eran 9).

**Paso 4: Testing de endpoints**

Probar que los endpoints de asistencia funcionan:

```
GET https://aponntsuites.onrender.com/api/v1/attendance
GET https://aponntsuites.onrender.com/api/v1/attendance/stats/summary
GET https://aponntsuites.onrender.com/api/v1/attendance/stats/chart
GET https://aponntsuites.onrender.com/api/v1/users
GET https://aponntsuites.onrender.com/api/v1/departments
```

**Paso 5: ELIMINAR endpoint temporal**

Una vez verificado que todo funciona, ELIMINAR el endpoint temporal:

1. Editar `backend/src/routes/diagnostic.js`
2. Eliminar la función `router.post('/execute-fix-schema', ...)`
3. Commit y push:
   ```bash
   cd backend
   git add src/routes/diagnostic.js
   git commit -m "chore: Remove temporary schema fix endpoint after successful execution"
   git push origin master
   ```

---

### OPCIÓN 2: Ejecución Manual via Render Dashboard

Si el endpoint temporal no funciona, ejecutar manualmente en Render:

**Paso 1: Acceder a Render Dashboard**

1. Ir a https://dashboard.render.com
2. Seleccionar el servicio PostgreSQL: `attendance_system_866u`
3. Click en "Connect" y copiar la URL de conexión externa

**Paso 2: Conectar vía psql**

```bash
psql "postgresql://attendance_system_866u_user:PASSWORD@HOST/attendance_system_866u"
```

(Reemplazar con la URL real de Render)

**Paso 3: Ejecutar script SQL**

Copiar y pegar el contenido completo de:
```
backend/migrations/fix-schema-complete.sql
```

En la consola psql y presionar Enter.

**Paso 4: Verificar**

```sql
-- Contar columnas de users
SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'users';

-- Contar columnas de attendances
SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'attendances';

-- Contar columnas de departments
SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'departments';
```

---

## 🧪 VERIFICACIÓN POST-EJECUCIÓN

### Checklist de Verificación

- [ ] Script SQL ejecutado sin errores
- [ ] Tabla `users` tiene ~60 columnas
- [ ] Tabla `attendances` tiene ~41 columnas
- [ ] Tabla `departments` tiene ~14 columnas
- [ ] Endpoint `/api/v1/attendance` responde 200
- [ ] Endpoint `/api/v1/attendance/stats/summary` responde 200
- [ ] Endpoint `/api/v1/attendance/stats/chart` responde con datos
- [ ] Endpoint `/api/v1/users` responde 200
- [ ] Endpoint `/api/v1/departments` responde 200
- [ ] Panel administrativo (https://aponntsuites.onrender.com/panel-administrativo.html) carga sin errores
- [ ] Panel empresa (https://aponntsuites.onrender.com/panel-empresa.html) carga sin errores
- [ ] Endpoint temporal `/execute-fix-schema` ELIMINADO

### Testing con Autenticación

Para probar endpoints que requieren autenticación, primero obtener un token:

```bash
# Generar token de prueba
curl https://aponntsuites.onrender.com/api/v1/company-modules/test-token
```

Respuesta:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "...",
    "company_id": 1,
    "role": "admin"
  }
}
```

Luego usar ese token en las requests:

```bash
curl -H "Authorization: Bearer TOKEN_AQUÍ" \
  https://aponntsuites.onrender.com/api/v1/attendance
```

---

## 📊 COMPARACIÓN ANTES/DESPUÉS

### Tabla `users`

| Aspecto | Antes | Después |
|---|---|---|
| Columnas | 15 | ~60 |
| Índices | 3 | 17 |
| Foreign Keys | 1 | 2 |
| Funcionalidades | Básicas | Completas |

**Nuevas capacidades**:
- ✅ Control de acceso a kioscos y app móvil
- ✅ Sistema de autorización de llegadas tardías
- ✅ Datos biométricos (fingerprint, facial)
- ✅ Geolocalización GPS
- ✅ Seguridad 2FA
- ✅ Sistema de permisos JSONB
- ✅ Campos para vendors/vendedores
- ✅ Horarios flexibles

### Tabla `attendances`

| Aspecto | Antes | Después |
|---|---|---|
| Columnas | 21 | ~41 |
| Índices | 5 | 23 |
| Foreign Keys | 2 | 4 |
| Funcionalidades | Básicas | Completas |

**Nuevas capacidades**:
- ✅ Multi-tenant (company_id)
- ✅ Tracking de breaks (break_in, break_out)
- ✅ Geolocalización GPS (PostGIS)
- ✅ Tracking de IPs
- ✅ Batch processing (batch_id, processing_queue)
- ✅ Aprobaciones (approved_by, approved_at)
- ✅ Horas extras (overtime_hours)
- ✅ Sistema de turnos (shift_id)

### Tabla `departments`

| Aspecto | Antes | Después |
|---|---|---|
| Columnas | 9 | ~14 |
| Índices | 2 | 6 |
| Foreign Keys | 1 | 2 |
| Funcionalidades | Básicas | Completas |

**Nuevas capacidades**:
- ✅ Geolocalización GPS (gps_lat, gps_lng)
- ✅ Radio de cobertura (coverage_radius)
- ✅ Soft delete (deleted_at)
- ✅ Dirección física (address)

---

## ⚠️ ADVERTENCIAS Y PRECAUCIONES

### ANTES de Ejecutar

1. **Backup NO necesario**: El script usa `IF NOT EXISTS`, no destruye datos
2. **Tiempo de ejecución**: 30-60 segundos
3. **Downtime**: NINGUNO - El sistema sigue funcionando durante la ejecución
4. **Reversibilidad**: Las columnas agregadas pueden ser eliminadas con DROP COLUMN si es necesario

### DURANTE la Ejecución

- No interrumpir el proceso
- Verificar que no haya errores en la respuesta
- Los logs de Render mostrarán el progreso

### DESPUÉS de Ejecutar

- **CRÍTICO**: Eliminar el endpoint temporal `/execute-fix-schema`
- Verificar que todos los endpoints respondan correctamente
- Monitorear logs de Render por 24 horas para detectar issues

---

## 🐛 TROUBLESHOOTING

### Error: "Script SQL no se ejecuta completamente"

**Solución**: Ejecutar manualmente usando Opción 2 (Render Dashboard + psql)

### Error: "Endpoint 404 - execute-fix-schema no encontrado"

**Causa**: Deploy de Render todavía no terminó

**Solución**:
1. Verificar en Render Dashboard que el deploy esté completo
2. Esperar 2-3 minutos más
3. Intentar de nuevo

### Error: "Column already exists"

**Causa**: Script SQL ya fue ejecutado previamente

**Solución**: ¡Todo bien! Verificar que las columnas existan usando endpoints de diagnostic.

### Error 500 en endpoints después de ejecutar script

**Causa**: Modelo Sequelize todavía usa nombres antiguos de columnas

**Solución**: Ya corregido en commit `96e4a1f`. Verificar que el deploy incluya ese commit.

### Queries SQL siguen fallando

**Causa**: Routes usan nombres de columnas incorrectos

**Solución**: Revisar `attendanceRoutes.js` y otros routes. Usar nombres de columnas según schema de Render:
- `check_in` (NO `clock_in`)
- `check_out` (NO `clock_out`)
- `checkInMethod` (NO `clock_in_method`)
- `workingHours` (NO `work_hours`)

---

## 📞 SOPORTE

Si encuentras algún problema:

1. Revisar logs en Render Dashboard
2. Verificar schema con endpoints de diagnostic
3. Consultar SYSTEM-FIX-REPORT.md para detalles técnicos
4. Revisar los commits en GitHub para ver los cambios exactos

---

## 📝 REGISTRO DE EJECUCIÓN

**Completar después de ejecutar:**

- [ ] **Fecha de ejecución**: _______________
- [ ] **Hora de inicio**: _______________
- [ ] **Hora de fin**: _______________
- [ ] **Resultado**: ☐ Exitoso  ☐ Con errores
- [ ] **Errores encontrados**: _______________
- [ ] **Columnas agregadas (users)**: _______________
- [ ] **Columnas agregadas (attendances)**: _______________
- [ ] **Columnas agregadas (departments)**: _______________
- [ ] **Endpoints verificados**: _______________
- [ ] **Endpoint temporal eliminado**: ☐ Sí  ☐ No

---

**Generado por**: Claude Code Autonomous Audit System
**Fecha**: 2025-10-08
**Versión**: 1.0.0
