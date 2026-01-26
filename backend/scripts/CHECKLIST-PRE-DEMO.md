# CHECKLIST PRE-DEMO - Sistema de Asistencia Biométrico

## ⚠️ EJECUTAR ANTES DE CADA DEMO

---

## 1. VERIFICACIONES CRÍTICAS (30 min antes)

### 1.1 Servidor
```bash
# Verificar que el servidor está corriendo
curl http://localhost:9998/api/v1/health

# Si no responde, iniciar:
cd C:\Bio\sistema_asistencia_biometrico\backend
PORT=9998 npm start
```

### 1.2 Base de Datos
```bash
# El health check incluye verificación de BD
# Si hay error de conexión, verificar PostgreSQL está corriendo
```

### 1.3 Rate Limiting (IMPORTANTE)
```
⚠️ CUIDADO: El login tiene límite de 10 intentos cada 15 minutos por IP

Si se bloquea durante la demo:
1. Esperar 15 minutos, O
2. Reiniciar el servidor (limpia el rate limiter en memoria)
```

---

## 2. CREDENCIALES DE DEMO

### Empresa: ISI
| Rol | Usuario | Password |
|-----|---------|----------|
| Admin RRHH | `rrhh2@isi.test` | `admin123` |
| Admin | `admin@isi.com` | `admin123` |
| Soporte | `soporte-11@aponnt.internal` | `admin123` |

### URLs
- Panel Empresa: http://localhost:9998/panel-empresa.html
- Panel Admin: http://localhost:9998/panel-administrativo.html

---

## 3. DATOS DISPONIBLES PARA MOSTRAR

| Módulo | Cantidad | Notas |
|--------|----------|-------|
| Empleados | 50+ | Datos de prueba con Faker |
| Departamentos | 8 | Estructura completa |
| Turnos | 5 | Mañana, Tarde, Noche, Rotativo, Flexible |
| Capacitaciones | 56 | Con asignaciones |
| Asistencias | 1,009 | Historial de 3 meses |
| Vacaciones | 20 | Solicitudes variadas |
| Notificaciones | 91+ | Por categoría |
| Sanciones | 6 | Con flujo de aprobación |
| Exámenes médicos | 88 | Preocupacionales y periódicos |

---

## 4. FLUJOS RECOMENDADOS PARA DEMO

### 4.1 Flujo Empleado (5 min)
1. Login como `rrhh2@isi.test`
2. Ver dashboard personal
3. Mostrar historial de asistencias
4. Mostrar turnos asignados
5. Ver capacitaciones pendientes
6. Ver notificaciones

### 4.2 Flujo Supervisor (5 min)
1. Login como `admin@isi.com`
2. Ver lista de empleados
3. Mostrar asistencias del equipo
4. Mostrar tardanzas pendientes de aprobación
5. Aprobar una tardanza (si hay)
6. Ver reportes

### 4.3 Flujo RRHH Completo (10 min)
1. Mostrar organigrama
2. Mostrar gestión de vacaciones
3. Mostrar expediente 360
4. Mostrar capacitaciones
5. Mostrar nómina/liquidaciones

---

## 5. BUGS CONOCIDOS (Evitar mostrar)

| Endpoint | Problema | Alternativa |
|----------|----------|-------------|
| `/shifts/:id/users` | Error 500 | Usar lista general de turnos |
| `/organizational/hierarchy/tree` | Función PostgreSQL faltante | Usar `/positions` |
| `/trainings/my-assignments` | Conflicto de rutas | Usar `/trainings` general |

---

## 6. SERVICIOS OPCIONALES

### Ollama (Chat IA)
```bash
# Verificar si está corriendo
curl http://localhost:11434/api/tags

# Si no está, el chat mostrará "Ollama no disponible"
# Esto NO es crítico para la demo
```

---

## 7. TEST AUTOMATIZADO

Ejecutar el test de pre-producción:
```bash
cd C:\Bio\sistema_asistencia_biometrico\backend
node scripts/test-pre-production.js
```

**Resultado esperado**: Todos los tests críticos ✅

---

## 8. PLAN B - Si algo falla

### Login no funciona
1. Verificar que el servidor esté corriendo
2. Verificar credenciales (companySlug = `isi`)
3. Si hay rate limiting, reiniciar servidor

### Módulo no carga datos
1. Verificar que la empresa tiene datos seeded
2. Ejecutar: `node scripts/seed-isi-rrhh-fixed.js`

### Error 500 en algún endpoint
1. Ver logs del servidor
2. Si es un bug conocido, usar alternativa
3. Si es nuevo, documentar y continuar con otro flujo

---

## 9. CONTACTO DE EMERGENCIA

Si algo falla durante la demo:
1. Tener el terminal abierto para ver logs
2. Poder reiniciar el servidor rápidamente
3. Tener esta guía a mano

---

## 10. DESPUÉS DE LA DEMO

1. Revisar logs para errores no detectados
2. Documentar cualquier issue nuevo
3. Ejecutar tests completos:
   ```bash
   node scripts/test-rrhh-user-journey.js
   node scripts/test-pre-production.js
   ```

---

**Última actualización**: 2026-01-25
**Tests pasando**: 139/139 (100%)
