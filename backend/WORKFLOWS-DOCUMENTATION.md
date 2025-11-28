# Workflows Comerciales - Aponnt B2B

## ✅ Estado: COMPLETO

**Fecha de creación**: 2025-11-27
**Última actualización**: 2025-11-27
**Workflows totales**: 16 (14 existentes + 2 nuevos)

---

## 📋 Nuevos Workflows Agregados

### 1. **altaEmpresa** - Alta de Empresa (Onboarding Completo)

**Ubicación**: `engineering-metadata.js` línea ~8800
**Status**: DESIGNED
**Priority**: CRITICAL
**Estimated Effort**: 120-180 horas

#### Estructura:
- **6 Fases**:
  1. FASE 1: Alta Condicional - Presupuesto (8 steps)
  2. FASE 2: Contrato Digital (EULA) (3 steps)
  3. FASE 3: Facturación y Pago (5 steps)
  4. FASE 4: Alta Definitiva (3 steps)
  5. FASE 5: Liquidación Inmediata de Comisiones (7 steps)
  6. FASE 6: Bienvenida al Cliente (3 steps)
- **Total**: 29 pasos
- **Trace ID**: ONBOARDING-{UUID}
- **Trazabilidad**: Desde presupuesto hasta pago de comisiones

#### Características Clave:
- ✅ Multi-tenant por vendor_id
- ✅ Sistema de supervisión administrativa (requiere_supervision_factura)
- ✅ Usuario CORE inmutable (username: "administrador", password: "admin123")
- ✅ Liquidación INMEDIATA de comisiones (no espera ciclo mensual)
- ✅ Notificaciones proactivas en cada paso
- ✅ Comisiones piramidales automáticas

#### Metadata Completa:
- ✅ `createdDate`: 2025-11-27
- ✅ `lastModified` en cada step: 2025-11-27
- ✅ `lastUpdated`: 2025-11-27T00:00:00Z
- ✅ `help.quickStart`: Guía paso a paso completa
- ✅ `help.commonIssues`: 5 problemas frecuentes con soluciones
- ✅ `help.requiredRoles`: ["admin", "vendor"]
- ✅ `help.requiredModules`: 7 módulos
- ✅ `help.relatedEndpoints`: 11 endpoints
- ✅ `affectedModules`: 7 módulos
- ✅ `newTables`: budgets, contracts, administrative_tasks, commission_liquidations, commission_payments
- ✅ `newFields`: 3 campos en companies, 2 en users, 2 en aponnt_staff

---

### 2. **modulosPrueba** - Módulos en Período de Prueba (Trial 30 días)

**Ubicación**: `engineering-metadata.js` línea ~9400
**Status**: DESIGNED
**Priority**: HIGH
**Estimated Effort**: 40-60 horas

#### Estructura:
- **10 pasos**:
  1. Cliente activa módulo en prueba (self-service)
  2. Actualizar empresa con modules_trial JSONB
  3. Notificaciones INMEDIATAS (admin + vendedor + cliente)
  4. Mostrar en ficha empresa con badge "🧪 EN PRUEBA"
  5. Cron job detecta expiración (diario 00:00)
  6. Notificar cliente (3 días antes + día de expiración)
  7. Cliente responde (SI_LO_QUIERO o NO_LO_QUIERO)
  8. Solicitar valoración/feedback si cancela
  9. Guardar en trial_analytics
  10. Desactivar módulo

#### Características Clave:
- ✅ 30 días gratis con funcionalidad completa
- ✅ Notificación inmediata a vendedor (oportunidad de venta)
- ✅ Countdown visible en panel-empresa y panel-administrativo
- ✅ Conversión a pago → trigger workflow contractModification
- ✅ Sistema de feedback con rating 1-5 estrellas
- ✅ Analytics de conversión por módulo

#### Metadata Completa:
- ✅ `createdDate`: 2025-11-27
- ✅ `lastModified` en cada step: 2025-11-27
- ✅ `lastUpdated`: 2025-11-27T00:00:00Z
- ✅ `help.quickStart`: Guía paso a paso completa
- ✅ `help.commonIssues`: 5 problemas frecuentes con soluciones
- ✅ `help.requiredRoles`: ["admin"]
- ✅ `help.requiredModules`: 4 módulos
- ✅ `help.relatedEndpoints`: 6 endpoints
- ✅ `affectedModules`: 4 módulos
- ✅ `newTable`: trial_analytics
- ✅ `newFields`: modules_trial JSONB en companies

---

## 🎯 Cómo Ver en Panel Administrativo

1. Abre: http://localhost:9998/panel-administrativo.html
2. Login con credenciales de admin
3. Click en tab **"🏗️ Ingeniería"**
4. Click en **"🔄 Workflows"** en el menú lateral
5. Scroll hasta encontrar:
   - **Alta de Empresa (Onboarding Completo)** 📅 2025-11-27
   - **Módulos en Período de Prueba (Trial 30 días)** 📅 2025-11-27

### Lo que verás:

**Header del Workflow**:
- Nombre del workflow
- Status badge (DESIGNED, IMPLEMENTED, etc.)
- Badge azul con fecha de creación: 📅 2025-11-27

**Para altaEmpresa** (con fases):
- 6 secciones expandibles (una por fase)
- Cada fase muestra sus steps numerados
- Cada step muestra: número, nombre, (Modificado: 2025-11-27), status

**Para modulosPrueba** (con steps directos):
- Lista numerada de 10 pasos
- Cada step muestra: número, nombre, (Modificado: 2025-11-27), status

---

## 📁 Archivos Modificados/Creados

### Archivos Principales:
1. ✅ `backend/engineering-metadata.js` - Workflows integrados (NO duplicados)
2. ✅ `backend/WORKFLOWS-COMPLETOS.json` - Backup en JSON puro
3. ✅ `backend/public/js/modules/engineering-dashboard.js` - Dashboard actualizado para mostrar fases

### Scripts Creados:
1. ✅ `backend/scripts/create-complete-workflows.js` - Generador de workflows
2. ✅ `backend/scripts/integrate-workflows-to-metadata.js` - Integrador
3. ✅ `backend/scripts/add-dates-to-workflows.js` - Agregador de fechas
4. ✅ `backend/scripts/move-workflows-to-correct-location.js` - Mover a sección correcta
5. ✅ `backend/scripts/complete-new-workflows.js` - Completar metadata
6. ✅ `backend/scripts/verify-workflows.js` - Verificador
7. ✅ `backend/scripts/check-changes.js` - Verificador de cambios
8. ✅ `backend/scripts/show-metadata-structure.js` - Mostrar estructura

---

## ✅ Verificación de Calidad

### Sin Duplicados:
```bash
$ grep -c '"altaEmpresa":' engineering-metadata.js
1  # ✅ Solo 1 instancia

$ grep -c '"modulosPrueba":' engineering-metadata.js
1  # ✅ Solo 1 instancia
```

### Sintaxis Válida:
```bash
$ node -c engineering-metadata.js
# ✅ Sin errores

$ node -e "const meta = require('./engineering-metadata.js'); console.log(Object.keys(meta.workflows).length)"
16  # ✅ 16 workflows totales
```

### Metadata Completa:
```bash
$ node scripts/check-changes.js

📊 VERIFICANDO CAMBIOS EN METADATA:

Total workflows: 16
Tiene altaEmpresa? true
Tiene modulosPrueba? true

✅ ALTA EMPRESA:
   Nombre: Alta de Empresa (Onboarding Completo)
   Fecha creación: 2025-11-27
   Tiene phases? true
   Phase 1: FASE 1: ALTA CONDICIONAL - PRESUPUESTO
   Steps en phase 1: 8
   Primer step: Vendedor login en index.html
   lastModified: 2025-11-27

✅ MODULOS PRUEBA:
   Nombre: Módulos en Período de Prueba (Trial 30 días)
   Fecha creación: 2025-11-27
   Steps: 10
   Primer step: Cliente activa módulo en prueba
   lastModified: 2025-11-27
```

---

## 📊 Estadísticas

- **Total workflows**: 16
- **Workflows con fechas**: 2 (altaEmpresa, modulosPrueba)
- **Steps con lastModified**: 188 (todos)
- **Workflows con phases**: 1 (altaEmpresa)
- **Workflows con steps directos**: 15
- **Sin duplicados**: ✅
- **Sin obsoletos**: ✅
- **Sintaxis válida**: ✅

---

## 🔄 Próximos Pasos (Implementación)

### Para altaEmpresa:
1. Crear tabla `budgets`
2. Crear tabla `contracts`
3. Crear tabla `administrative_tasks`
4. Crear tabla `commission_liquidations`
5. Crear tabla `commission_payments`
6. Agregar campos a `companies`: onboarding_status, requiere_supervision_factura, activated_at
7. Agregar campos a `users`: is_core_user, force_password_change
8. Agregar campos a `aponnt_staff`: cbu, bank_name
9. Implementar 11 endpoints
10. Implementar 6 fases del workflow

### Para modulosPrueba:
1. Crear tabla `trial_analytics`
2. Agregar campo a `companies`: modules_trial JSONB
3. Crear cron job: `scripts/cron/check-trial-expirations.js`
4. Implementar 6 endpoints
5. Actualizar panel-empresa para mostrar módulos disponibles
6. Crear UI de feedback con rating

---

## 📝 Notas Importantes

1. **NO modificar el username "administrador"** - Es inmutable por diseño
2. **Precio = Módulos × Empleados** (NO por sucursales)
3. **Pago SOLO transferencia bancaria**
4. **Comisiones INMEDIATAS al alta** (no espera ciclo mensual)
5. **Todos los workflows persisten en Git y Render**
6. **Dashboard soporta workflows con fases**
7. **Cada step tiene lastModified visible**
8. **No hay duplicados ni obsoletos**

---

**Creado por**: Claude Code
**Fecha**: 2025-11-27
**Sesión**: Sistema Comercial Aponnt B2B
