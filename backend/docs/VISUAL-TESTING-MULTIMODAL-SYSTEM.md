# 🔬 Sistema de Testing Visual Multimodal con Claude Code

**Fecha de creación**: 2026-02-01
**Autor**: Claude Code (sesión de documentación)
**Estado**: ACTIVO - Sistema operativo

---

## 📋 Resumen Ejecutivo

Este documento describe el sistema de testing visual que utiliza las **capacidades multimodales de Claude Code** para testear el panel-empresa de forma inteligente y autónoma.

**Diferencia clave con tests tradicionales:**
- Tests tradicionales: Scripts predefinidos con selectores hardcodeados
- **Este sistema**: Claude Code VE screenshots, DESCUBRE elementos, VERIFICA SSOT, REPARA errores

---

## 🎯 Filosofía del Sistema

```
"Claude Code actúa como un QA humano que VE la pantalla,
descubre elementos, interactúa, y verifica que todo funcione
según el SSOT (Single Source of Truth) del sistema"
```

---

## 🔄 Ciclo de Testing Visual (7 Fases)

### FASE 1: ANÁLISIS PROFUNDO DEL MÓDULO

Antes de testear visualmente, Claude Code debe:

1. **Leer el código fuente del módulo** (frontend + backend)
2. **Entender qué debe hacer el módulo**:
   - ¿Qué CRUD operations soporta?
   - ¿Qué tabs/secciones tiene?
   - ¿Qué campos tiene cada formulario?
   - ¿Qué validaciones aplica?
3. **Identificar el SSOT de cada elemento**:
   - Un campo de "subir licencia de conducir" → SSOT = módulo DMS
   - Un campo de "seleccionar departamento" → SSOT = módulo organizational-structure
   - Un campo de "fecha de vencimiento examen" → SSOT = módulo medical

**Ejemplo de análisis:**
```
Módulo: users
├── Tab: Datos Personales
│   ├── Campo: nombre → SSOT: users table
│   ├── Campo: email → SSOT: users table
│   └── Campo: foto → SSOT: DMS (gestión documental)
├── Tab: Documentos
│   ├── Campo: DNI scan → SSOT: DMS
│   ├── Campo: Licencia conducir → SSOT: DMS
│   └── Campo: Pasaporte → SSOT: DMS
└── Tab: Médico
    ├── Campo: Examen preocupacional → SSOT: medical module
    └── Campo: Grupo sanguíneo → SSOT: users.medical_info
```

---

### FASE 2: NAVEGACIÓN Y SCREENSHOT INICIAL

1. **Navegar al módulo** en panel-empresa
2. **Tomar screenshot** de la vista inicial
3. **Claude VE el screenshot** (capacidad multimodal)
4. **Identificar elementos visibles**:
   - Botones (Crear, Editar, Ver, Eliminar)
   - Tablas de datos
   - Filtros
   - Tarjetas/Cards
   - Tabs

**Comando Playwright:**
```javascript
await page.screenshot({ path: `test-results/${module}-inicial.png`, fullPage: true });
```

**Claude analiza:**
```
Veo en el screenshot:
- Botón "Agregar Usuario" (esquina superior derecha)
- Tabla con columnas: Nombre, Email, Rol, Estado
- 5 usuarios listados
- Botón "Ver" en cada fila
- Filtro de búsqueda arriba
```

---

### FASE 3: DESCUBRIMIENTO DE ELEMENTOS (como usuario real)

Claude Code navega **tarjeta por tarjeta**, **tab por tab**, descubriendo:

1. **Click en primer elemento interactivo**
2. **Screenshot del resultado**
3. **Analizar qué apareció** (modal, nueva vista, etc.)
4. **Documentar el elemento y su SSOT**
5. **Repetir para cada elemento**

**Ejemplo de descubrimiento:**
```
1. Click en "Ver" del primer usuario
   → Screenshot: modal-usuario-abierto.png
   → Veo: Modal con 10 tabs

2. Click en Tab "Documentos"
   → Screenshot: tab-documentos.png
   → Veo: 4 campos para subir archivos
   → SSOT verificado: Todos apuntan a DMS

3. Click en "Subir Licencia"
   → Screenshot: upload-licencia.png
   → Veo: Input file + botón subir
   → SSOT: Debe guardar en DMS con tipo "licencia_conducir"
```

---

### FASE 4: MATCHEO CONTRA EXPECTATIVAS (SSOT)

Para CADA elemento descubierto, verificar:

| Elemento | SSOT Esperado | SSOT Real | Match |
|----------|---------------|-----------|-------|
| Campo email | users.email | users.email | ✅ |
| Subir DNI | DMS.documents | DMS.documents | ✅ |
| Examen médico | medical.exams | ❌ No guarda | ❌ |

**Si hay mismatch → Documentar para reparar**

---

### FASE 5: GENERACIÓN DE DATOS DE PRUEBA

Si el módulo necesita datos para testear:

1. **Identificar qué datos faltan** (tabla vacía, sin registros, etc.)
2. **Generar datos simulados** usando Faker o datos inventados
3. **Insertar en BD** directamente o via API
4. **Tomar screenshot** para verificar que aparecen

**Ejemplo:**
```javascript
// Si tabla de usuarios está vacía, crear usuarios de prueba
const testUsers = [
  { name: 'Usuario Test 1', email: 'test1@isi.com', role: 'employee' },
  { name: 'Usuario Test 2', email: 'test2@isi.com', role: 'admin' },
];

for (const user of testUsers) {
  await db.query(`INSERT INTO users (name, email, role, company_id) VALUES ($1, $2, $3, 11)`,
    [user.name, user.email, user.role]);
}
```

**Documentos de prueba:**
- Generar PDF fake para licencia de conducir
- Generar imagen fake para foto de perfil
- Generar PDF fake para examen médico

---

### FASE 6: TESTING CRUD COMPLETO

Para cada entidad del módulo:

#### CREATE
1. Click en botón "Crear/Agregar"
2. Screenshot del modal vacío
3. Llenar campos con datos de prueba
4. Screenshot del formulario lleno
5. Click en "Guardar"
6. Screenshot del resultado
7. **Verificar en BD** que se creó el registro
8. **Verificar SSOT** de cada campo guardado

#### READ
1. Verificar que el registro aparece en la lista
2. Click en "Ver"
3. Screenshot del detalle
4. Verificar que los datos mostrados coinciden con BD

#### UPDATE
1. Click en "Editar"
2. Cambiar algunos campos
3. Screenshot
4. Guardar
5. **Verificar en BD** que se actualizó
6. **Refresh (F5)** y verificar persistencia

#### DELETE
1. Click en "Eliminar"
2. Screenshot del diálogo de confirmación
3. Confirmar
4. Screenshot de la lista actualizada
5. **Verificar en BD** que se eliminó (o soft-delete)

---

### FASE 7: LIMPIEZA Y REPORTE

Al finalizar un módulo:

1. **Eliminar screenshots** para no llenar disco:
```javascript
const fs = require('fs');
const path = require('path');
const screenshotDir = 'test-results';
const moduleScreenshots = fs.readdirSync(screenshotDir)
  .filter(f => f.startsWith(`${moduleKey}-`));
moduleScreenshots.forEach(f => fs.unlinkSync(path.join(screenshotDir, f)));
```

2. **Documentar resultados** en el log:
```
✅ Módulo: users
   - Tabs testeados: 10/10
   - CRUD verificado: ✅
   - SSOT validado: ✅
   - Errores encontrados: 0
   - Errores reparados: 0
```

3. **Si hubo errores:**
   - Documentar el error
   - Reparar el código
   - Volver a FASE 2 para re-testear

---

## 🔧 Credenciales de Testing

**Empresa de prueba:** ISI (company_id: 11)

**Login:**
```
URL: http://localhost:9998/panel-empresa.html
Empresa: isi
Usuario: admin
Contraseña: admin123
```

**Base de datos:**
```
Host: localhost (o Render en producción)
Database: sistema_asistencia
Schema: public
```

---

## 📊 Módulos a Testear (45 total)

### Batch 1 - RRHH Core (✅ Analizados por sesión anterior)
1. ✅ sanctions-management
2. ✅ vacation-management
3. ✅ training-management
4. ✅ medical-dashboard
5. ✅ art-management
6. ✅ hse-management

### Batch 2 - Acceso y Visitantes (✅ Analizados)
7. ✅ kiosks
8. ✅ visitors
9. ✅ job-postings
10. ✅ payroll-liquidation
11. ✅ organizational-structure
12. ✅ benefits-management

### Batch 3 - Core + Legal (✅ Analizados)
13. ✅ attendance
14. ✅ quotes-management
15. ✅ legal-dashboard
16. ✅ notifications-enterprise
17. ✅ biometric-dashboard
18. ✅ procedures-manual

### Batch 4 - Pendientes (⏳ A testear)
19. ⏳ users
20. ⏳ hour-bank
21. ⏳ facturacion
22. ⏳ plantillas-fiscales
23. ⏳ company-email-smtp-config
24. ⏳ company-email-process

### Batch 5 - Pendientes
25. ⏳ inbox
26. ⏳ logistics-dashboard
27. ⏳ employee-map
28. ⏳ associate-marketplace
29. ⏳ audit-reports
30. ⏳ compliance-dashboard

### Batch 6 - Pendientes
31. ⏳ sla-tracking
32. ⏳ auditor-dashboard
33. ⏳ settings
34. ⏳ roles-permissions
35. ⏳ clientes
36. ⏳ my-procedures

### Batch 7 - Pendientes
37. ⏳ payslip-template-editor
38. ⏳ contextual-help
39. ⏳ terms-conditions
40. ⏳ dashboard
41. ⏳ predictive-workforce
42. ⏳ emotional-analysis

### Batch 8 - Pendientes
43. ⏳ psychological-assessment
44. ⏳ training (módulo diferente a training-management)
45. ⏳ biometric-simple

---

## 🤖 Instrucciones para Otras Sesiones de Claude Code

### Si continúas el testing:

1. **Lee este documento completo primero**
2. **Verifica qué módulos ya fueron testeados** (marcados con ✅)
3. **Comienza por el siguiente módulo pendiente** (⏳)
4. **Sigue el ciclo de 7 fases** para cada módulo
5. **Actualiza este documento** marcando módulos completados
6. **No elimines screenshots hasta completar el módulo**

### Si encuentras errores:

1. **Documenta el error** en el log de la sesión
2. **Identifica el archivo a reparar** (frontend o backend)
3. **Repara el código**
4. **Re-testea el elemento reparado**
5. **Toma screenshot de verificación**
6. **Continúa con el siguiente elemento**

### Si necesitas datos de prueba:

1. **Usa la empresa ISI (company_id: 11)**
2. **Genera datos con Faker o inventados**
3. **Inserta via SQL o API**
4. **Marca los datos como "test" para limpieza posterior**

---

## 📝 Log de Sesiones

### Sesión 1 (fecha anterior) - Análisis inicial
- Analizó 18 módulos en profundidad (batches 1-3)
- Context limit reached
- No completó testing visual

### Sesión 2 (2026-02-01) - Continuación
- Documentó este sistema
- **Completado**: Módulo USERS - 10 tabs analizados visualmente
- **Completado**: SSOT mapping documentado (USERS-MODULE-SSOT-MAPPING.md)
- **Completado**: Batch test 20 módulos - 20/20 cargados OK
- **Screenshots tomados**: 30+ módulos documentados

### Sesión 3 (2026-02-01 08:52 UTC) - Test Comprehensivo 46 Módulos

**RESULTADO FINAL: 40/46 módulos cargados (87%)**

#### Módulos con CRUD (15 total):
| # | Módulo | Botón Crear | Categoría |
|---|--------|-------------|-----------|
| 1 | sanctions-management | ➕ Nueva Solicitud | RRHH |
| 2 | vacation-management | Nueva Solicitud | RRHH |
| 3 | training-management | ➕ Nueva Capacitación | RRHH |
| 4 | art-management | ➕ Nueva ART | RRHH |
| 5 | hse-management | ➕ Nueva Entrega EPP | RRHH |
| 6 | kiosks | Nuevo Kiosco | Access |
| 7 | visitors | ➕ Nueva Visita | Access |
| 8 | job-postings | ➕ Nueva Oferta Laboral | Recruitment |
| 9 | organizational-structure | + Nuevo Departamento | Admin |
| 10 | attendance | Nuevo Registro | Core |
| 11 | legal-dashboard | Nueva | Legal |
| 12 | procedures-manual | Nuevo | Admin |
| 13 | users | Agregar Usuario | Core |
| 14 | facturacion | 📝 Nueva Factura Manual | Finance |
| 15 | clientes | 👤 Nuevo Cliente | Sales |

#### Módulos Dashboard/Read-Only (25 total):
- medical-dashboard, payroll-liquidation, benefits-management, hour-bank
- plantillas-fiscales, company-email-smtp-config, company-email-process
- biometric-dashboard, inbox, employee-map, audit-reports
- compliance-dashboard, sla-tracking, settings, roles-permissions
- my-procedures, payslip-template-editor, contextual-help, terms-conditions
- predictive-workforce, emotional-analysis, psychological-assessment
- training, biometric-simple, biometric-consent

#### Módulos con Error de Carga (6 total):
| Módulo | Estado | Posible Causa |
|--------|--------|---------------|
| quotes-management | ❌ No cargó | Requiere permisos especiales |
| notifications-enterprise | ❌ No cargó | Módulo en desarrollo |
| logistics-dashboard | ❌ No cargó | Módulo en desarrollo |
| associate-marketplace | ❌ No cargó | Módulo en desarrollo |
| auditor-dashboard | ❌ No cargó | Requiere rol admin específico |
| dashboard | ❌ No cargó | Conflicto de ID |

#### Resumen por Categoría:
| Categoría | Cargados | Total | Con CRUD |
|-----------|----------|-------|----------|
| RRHH | 10 | 10 | 5 |
| Access | 2 | 2 | 2 |
| Recruitment | 1 | 1 | 1 |
| Finance | 4 | 4 | 1 |
| Admin | 3 | 3 | 2 |
| Core | 2 | 3 | 2 |
| Sales | 1 | 2 | 1 |
| Legal | 2 | 2 | 1 |
| System | 4 | 6 | 0 |
| Biometric | 3 | 3 | 0 |
| Compliance | 2 | 2 | 0 |
| Analytics | 2 | 2 | 0 |
| Other | 4 | 6 | 0 |

**Resultado**: 40/46 módulos cargados exitosamente (87%)

### Verificación API Backend

| Endpoint | Registros |
|----------|-----------|
| /api/v1/users | 10 |
| /api/v1/departments | 16 |
| /api/v1/shifts | 5 |
| /api/v1/vacation/requests | 20 |
| /api/v1/attendance | 10 |
| /api/v1/branches | 93 |
| /api/kiosks | 39 |

**Resultado**: 7/11 endpoints verificados (BD conectada y con datos)

---

## 🎯 Checklist por Módulo

```
[ ] FASE 1: Análisis del código fuente
[ ] FASE 2: Screenshot inicial + navegación
[ ] FASE 3: Descubrimiento de elementos
[ ] FASE 4: Verificación SSOT
[ ] FASE 5: Generación de datos (si necesario)
[ ] FASE 6: Testing CRUD completo
[ ] FASE 7: Limpieza y reporte
[ ] Actualizar este documento con resultado
```

---

---

## 📁 Scripts de Testing Disponibles

### Ubicación: `backend/scripts/`

| Script | Descripción | Uso |
|--------|-------------|-----|
| `visual-test-all-modules.js` | Test comprehensivo de 46 módulos | `node scripts/visual-test-all-modules.js` |
| `visual-test-crud-smart.js` | CRUD con verificación API | `node scripts/visual-test-crud-smart.js` |
| `visual-test-api-v2.js` | Verificación de endpoints API | `node scripts/visual-test-api-v2.js` |
| `visual-test-batch-modules.js` | Test batch de 20 módulos | `node scripts/visual-test-batch-modules.js` |
| `visual-test-10tabs.js` | Test de 10 tabs del expediente Users | `node scripts/visual-test-10tabs.js` |
| `cleanup-screenshots.js` | Limpieza de screenshots duplicados | `node scripts/cleanup-screenshots.js` |

### Comando Rápido para Test Completo

```bash
cd backend
node scripts/visual-test-all-modules.js && node scripts/cleanup-screenshots.js
```

---

## 📊 Últimos Resultados (2026-02-01)

```
╔════════════════════════════════════════════════════════════╗
║   📦 Total módulos:     46                                  ║
║   ✅ Cargados OK:       40 (87%)                            ║
║   ❌ Errores:            6                                  ║
║   🔘 Con botón crear:   15                                  ║
║   💾 Screenshots:      114 (después de cleanup)             ║
╚════════════════════════════════════════════════════════════╝
```

---

**FIN DEL DOCUMENTO**
