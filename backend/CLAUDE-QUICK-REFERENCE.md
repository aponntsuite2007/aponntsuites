# 🚀 CLAUDE QUICK REFERENCE CARD

## ⚡ WORKFLOW OBLIGATORIO

```
┌─────────────────────────────────────────────────────────────┐
│  ANTES DE CUALQUIER COSA                                    │
│  ↓                                                           │
│  📖 Read: backend/engineering-metadata.js                   │
│     • Check module status                                    │
│     • Check knownIssues                                      │
│     • Check if feature already exists                        │
│     • Check dependencies                                     │
└─────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│  ESCRIBIR CÓDIGO                                            │
│  ↓                                                           │
│  💻 Make your changes                                       │
│  🧪 Test                                                    │
└─────────────────────────────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ ACTUALIZAR METADATA (OBLIGATORIO)                      │
│  ↓                                                           │
│  🔄 node scripts/update-engineering-metadata.js             │
│     --task VH-1 --done                                       │
│                                                              │
│  O MANUAL:                                                   │
│  📝 Edit backend/engineering-metadata.js                    │
│     • Update progress                                        │
│     • Update status                                          │
│     • Update lastUpdated                                     │
│     • Mark task.done = true                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 COMANDOS MÁS USADOS

### Actualizar metadata:
```bash
# Tarea completada
node scripts/update-engineering-metadata.js --task VH-1 --done

# Progreso de módulo
node scripts/update-engineering-metadata.js --module users --progress 85

# Estado de módulo
node scripts/update-engineering-metadata.js --module users --status IN_PROGRESS

# Agregar bug conocido
node scripts/update-engineering-metadata.js --module users --add-issue "Error en validación"
```

### Iniciar servidor:
```bash
cd backend && PORT=9998 npm start
```

### Reiniciar servidor (SEGURO):
```bash
netstat -ano | findstr :9998
taskkill /F /PID <PID>
PORT=9998 npm start
```

---

## 🗺️ NAVEGACIÓN RÁPIDA EN METADATA

```javascript
// backend/engineering-metadata.js

// Ver estado general del proyecto
metadata.project.totalProgress  // % global

// Ver apps del ecosistema
metadata.applications.panelAdministrativo.status
metadata.applications.apkEmpleados.status

// Ver módulos
metadata.modules.users.progress
metadata.modules.users.knownIssues
metadata.modules.users.features.crud.done

// Ver roadmap
metadata.roadmap.phase1_vendorHierarchy.tasks
metadata.roadmap.phase1_vendorHierarchy.progress

// Ver workflows
metadata.workflows.contractModification.steps

// Ver tablas de BD
metadata.database.tables.companies.status
metadata.database.tables.companies.pendingChanges

// Ver código deprecado
metadata.deprecated.vendorsJson.status
```

---

## ✅ CHECKLIST - ANTES DE COMMIT

- [ ] Leí `engineering-metadata.js` antes de empezar
- [ ] Hice los cambios de código
- [ ] Testeé los cambios
- [ ] **Actualicé `engineering-metadata.js`** ⚠️ CRÍTICO
- [ ] Verifiqué que el progreso esté correcto
- [ ] Actualicé `lastUpdated`
- [ ] Si encontré bugs, los agregué a `knownIssues`

---

## 🚨 ERRORES COMUNES

### ❌ ERROR 1: No leer metadata antes de empezar
```
Result: Duplicar funcionalidad que ya existe
Fix: SIEMPRE leer engineering-metadata.js primero
```

### ❌ ERROR 2: No actualizar metadata después de cambios
```
Result: Otra sesión de Claude pierde contexto
Fix: node scripts/update-engineering-metadata.js --task X --done
```

### ❌ ERROR 3: Usar código deprecado
```
Result: Usar vendors.json en vez de aponnt_staff
Fix: Revisar metadata.deprecated antes de usar cualquier código
```

### ❌ ERROR 4: No agregar bugs a knownIssues
```
Result: El mismo bug se encuentra múltiples veces
Fix: Siempre documentar bugs en metadata.modules[X].knownIssues
```

---

## 📊 ESTADOS VÁLIDOS

### Para módulos:
- `PLANNED` - En diseño, no implementado
- `IN_PROGRESS` - Implementándose ahora
- `IN_MIGRATION` - Migrando de sistema viejo
- `COMPLETE` - Implementado 100%
- `PRODUCTION` - En producción, estable

### Para fases del roadmap:
- `PLANNED` - Planificada, no iniciada
- `IN_PROGRESS` - En desarrollo activo
- `COMPLETE` - Completada

### Para features:
```javascript
{
  done: true,        // Completado
  inProgress: true,  // En progreso
  tested: true       // Testeado
}
```

---

## 🎯 PRIORIDADES

### HIGH Priority:
- `phase1_vendorHierarchy` - Jerarquía y comisiones
- `phase2_budgetsContracts` - Presupuestos y contratos
- `phase3_invoicing` - Facturación automática
- `apkEmpleados` - App móvil empleados
- `apkVendedores` - App móvil vendedores

### MEDIUM Priority:
- `cobranzas` - Gestión de cobranzas
- `apkAsociados` - App móvil asociados

### LOW Priority:
- Optimizaciones
- Analytics avanzados

---

## 📁 ARCHIVOS CRÍTICOS

| Archivo | Propósito | ¿Tocar? |
|---------|-----------|---------|
| `backend/engineering-metadata.js` | **METADATA MASTER** | ✅ SIEMPRE actualizar |
| `CLAUDE.md` | Guía general | ✅ Leer siempre |
| `backend/server.js` | Servidor principal | ⚠️ Con cuidado |
| `backend/public/panel-administrativo.html` | Panel admin | ✅ Según tarea |
| `backend/public/panel-empresa.html` | Panel empresa | ✅ Según tarea |
| `backend/src/routes/aponntDashboard.js` | API comercial | ✅ Según tarea |

---

## 🔗 DEPENDENCIAS COMUNES

Si trabajas en:
- **Presupuestos** → Necesitas: companies, contracts, notifications
- **Contratos** → Necesitas: budgets, companies, notifications
- **Liquidaciones** → Necesitas: invoicing, vendorsCommissions, notifications
- **Vendedores** → Necesitas: companies, vendor_statistics

**SIEMPRE verifica dependencies en metadata antes de empezar.**

---

## 💡 TIPS PRO

1. **Busca en metadata antes de preguntar**: "¿Existe el módulo X?" → Busca en `metadata.modules`
2. **Usa el script de actualización**: No edites metadata manualmente si hay script
3. **Documenta TODO**: Si algo no está claro, está en `designDoc` del feature
4. **Progreso realista**: No marques 100% si falta testing
5. **Timestamps actuales**: Usa fecha actual en `lastUpdated`

---

**END OF QUICK REFERENCE** ✨

Próxima vez que abras este proyecto:
1. Lee `engineering-metadata.js`
2. Lee este archivo
3. Empieza a trabajar

**¡No olvides actualizar metadata después de cada cambio!**
