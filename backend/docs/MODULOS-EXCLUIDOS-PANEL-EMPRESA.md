# Módulos Excluidos de Panel-Empresa

**Fecha**: 2025-12-30
**Actualizado**: 2025-12-30 (v2 - Todos los cambios aplicados)
**Propósito**: Documentar módulos que NO deben aparecer como tarjetas en panel-empresa y dónde corresponden.

## ESTADO: COMPLETADO

**Total módulos excluidos**: 18
**Total módulos visibles en panel-empresa**: 46

**Filtro aplicado en** `modulesRoutes.js`:
```sql
SELECT module_key FROM system_modules
WHERE module_type IN ('submodule', 'container')
   OR available_in IN ('none', 'admin')
   OR metadata->>'hideFromDashboard' = 'true'
```

---

## 1. MÓDULOS DE SISTEMA (No son módulos comerciales)

### Dashboard Principal (`dashboard`)
- **Qué es**: Contenedor principal donde se renderizan los módulos
- **Por qué excluido**: No es un módulo, es el framework/contenedor
- **Cambios BD**: `module_type='container'`, `available_in='none'`, `hideFromDashboard=true`
- **Dónde va**: En ningún lado como tarjeta - es el contenedor

### Temporary Access (`temporary-access`)
- **Qué es**: Sistema de permisos temporales para acceso fuera de horario
- **Por qué excluido**: Es parte del sistema de fichaje vinculado con kioscos
- **Uso real**: Empleado viene fuera de horario por: capacitación, reunión, reclamo RRHH
- **Cambios BD**: `hideFromDashboard=true`
- **Dónde va**: Integrado en sistema de kioscos, no tiene UI propia en dashboard

---

## 2. SUBMODULES (Son tabs/secciones de otros módulos)

### Gestión de Departamentos (`departments`)
- **Qué es**: CRUD de departamentos
- **Padre**: `organizational-structure` (Estructura Organizacional)
- **Cambios BD**: `module_type='submodule'`, `parent_module_key='organizational-structure'`
- **Es CORE**: Sí - viene incluido, no se cotiza por separado

### Gestión de Turnos (`shifts`)
- **Qué es**: CRUD de turnos laborales
- **Padre**: `organizational-structure` (Estructura Organizacional)
- **Cambios BD**: `module_type='submodule'`, `parent_module_key='organizational-structure'`
- **Es CORE**: Sí - viene incluido, no se cotiza por separado

### Roles y Permisos (`roles-permissions`)
- **Qué es**: Gestión de roles de usuario y permisos del sistema
- **Padre**: `organizational-structure` (Estructura Organizacional)
- **Cambios BD**: `module_type='submodule'`, `parent_module_key='organizational-structure'`
- **Es CORE**: Sí - viene incluido, no se cotiza por separado
- **TODO**: Integrar como tab en organizational-structure si no está

### Panel Ejecutivo de Horas (`hours-cube-dashboard`)
- **Qué es**: Dashboard de visualización de horas trabajadas
- **Padre**: `attendance` (Control de Asistencia)
- **Cambios BD**: `module_type='submodule'`, `parent_module_key='attendance'`
- **TODO**: Verificar que esté accesible desde módulo attendance

---

## 3. MÓDULOS DE PANEL-ADMINISTRATIVO (Solo para admins de APONNT)

### Dashboard de Ingeniería (`engineering-dashboard`)
- **Qué es**: Panel de control de desarrollo con Gantt, PERT, roadmap, métricas
- **Uso**: Equipo de desarrollo de APONNT para tracking de proyectos
- **Cambios BD**: `available_in='admin'`, `hideFromDashboard=true`
- **Dónde va**: `panel-administrativo.html` - Tab Ingeniería

### Gestión de Empresas (`companies`)
- **Qué es**: Alta/baja de empresas clientes de APONNT
- **Uso**: Solo administradores de APONNT para gestionar clientes
- **Cambios BD**: `available_in='admin'`, `hideFromDashboard=true`
- **Dónde va**: `panel-administrativo.html` - Sección Empresas

### Vendedores (`vendors`)
- **Qué es**: Gestión de vendedores/comerciales de APONNT
- **Uso**: Administración comercial de APONNT
- **Cambios BD**: `available_in='admin'`, `hideFromDashboard=true`
- **Dónde va**: `panel-administrativo.html`

### Auditor Dashboard (`auditor`)
- **Qué es**: Panel de auditoría del sistema con testing automatizado
- **Uso**: Solo administradores de APONNT para QA
- **Cambios BD**: `available_in='admin'`, `hideFromDashboard=true`
- **Dónde va**: `panel-administrativo.html`

### Predictive Workforce Dashboard (`predictive-workforce-dashboard`)
- **Qué es**: Analytics predictivo de fuerza laboral con ML
- **Uso**: Análisis avanzado (aún en desarrollo)
- **Cambios BD**: `available_in='admin'`, `hideFromDashboard=true`
- **TODO**: Definir alcance y ubicación final

---

## 4. MÓDULOS DE PANEL-ASOCIADOS (Partners/Revendedores)

### Asociados APONNT (`associate-marketplace`)
- **Qué es**: Marketplace de servicios de partners APONNT
- **Uso**: Partners pueden ofrecer servicios complementarios
- **Cambios BD**: `available_in='admin'`, `hideFromDashboard=true`
- **Dónde va**: `panel-asociados.html` o sección Partners en admin
- **TODO**: Definir panel-asociados y mover ahí

### Panel de Workflow de Asociados (`associate-workflow-panel`)
- **Qué es**: Gestión de workflows de partners/asociados APONNT
- **Uso**: Partners gestionan sus procesos
- **Cambios BD**: `available_in='admin'`, `hideFromDashboard=true`
- **Dónde va**: `panel-asociados.html`
- **TODO**: Definir panel-asociados y mover ahí

### Sistema de Scoring de Partners (`partner-scoring-system`)
- **Qué es**: Sistema de puntuación y evaluación de partners
- **Uso**: Evaluar performance de revendedores/partners
- **Cambios BD**: `available_in='admin'`, `hideFromDashboard=true`
- **Dónde va**: `panel-asociados.html` o `panel-administrativo.html` (sección Partners)
- **TODO**: Definir ubicación exacta

### Asociados (`partners`)
- **Qué es**: Gestión de partners y revendedores de APONNT
- **Uso**: CRUD de partners
- **Cambios BD**: Ya tiene `available_in='admin'`
- **Dónde va**: `panel-administrativo.html` - Sección Partners

---

## 5. APKs (Aplicaciones móviles - No son módulos web)

### APK Kiosko Android (`kiosks-apk`)
- **Qué es**: Aplicación Flutter para terminales Android de fichaje biométrico
- **Por qué excluido**: Es una APK, no un módulo web
- **Cambios BD**: `available_in='none'`, `hideFromDashboard=true`, `isAPK=true`
- **Dónde va**: Se descarga/instala en tablets Android, no aparece en ningún panel web
- **Relacionado con**: Módulo `kiosks` (gestión de dispositivos)

---

## Resumen de cambios en BD

```sql
-- Verificar estado actual
SELECT module_key, module_type, parent_module_key, available_in,
       metadata->>'hideFromDashboard' as hidden
FROM system_modules
WHERE module_key IN (
  'dashboard', 'temporary-access',
  'departments', 'shifts', 'roles-permissions', 'hours-cube-dashboard',
  'engineering-dashboard', 'companies', 'vendors',
  'associate-marketplace', 'associate-workflow-panel', 'partner-scoring-system', 'partners',
  'kiosks-apk'
)
ORDER BY module_key;
```

---

## TODOs pendientes

1. [ ] Integrar `roles-permissions` como tab en `organizational-structure`
2. [ ] Verificar que `hours-cube-dashboard` sea accesible desde `attendance`
3. [ ] Crear/definir `panel-asociados.html` para módulos de partners
4. [ ] Mover módulos de asociados al panel correcto
5. [ ] Verificar que APKs tengan su propia sección de descarga (no como módulos)
