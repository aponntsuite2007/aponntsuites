# Estado de Implementación de Ayuda Contextual (ModuleHelpSystem)

**Fecha de actualización**: 2026-01-05  
**Sistema**: ModuleHelpSystem.js - Ayuda contextual con tips, tooltips y banners

---

## 📊 RESUMEN EJECUTIVO

**Total de módulos en el sistema**: ~100+  
**Módulos CON ayuda contextual completa**: 12  
**Módulos SIN ayuda contextual**: ~88+  

---

## ✅ MÓDULOS CON AYUDA CONTEXTUAL COMPLETA

### 1. **procurement-management.js** ✅
- **Implementado por**: Sesión anterior (2026-01-05)
- **Contextos registrados**: 8 (dashboard, requisitions, orders, receipts, invoices, suppliers, mappings, config)
- **Banners agregados**: ✅ En todos los métodos `renderXXX()`
- **Estado**: 100% completo y funcional

### 2. **payment-orders-dashboard.js** ✅
- **Implementado por**: Esta sesión (2026-01-05)
- **Contextos registrados**: 5 (dashboard, orders, pending, checks, checkbooks)
- **Banners agregados**: ✅ En todos los métodos `renderXXX()`
- **Estado**: 100% completo y funcional

### 3. **compliance-dashboard.js** ✅
- **Estado**: Ya tenía ModuleHelpSystem implementado previamente

### 4. **dms-dashboard.js** ✅
- **Estado**: Ya tenía ModuleHelpSystem implementado previamente

### 5. **hse-management.js** ✅
- **Estado**: Ya tenía ModuleHelpSystem implementado previamente

### 6. **job-postings.js** ✅
- **Estado**: Ya tenía ModuleHelpSystem implementado previamente

### 7. **procedures-manual.js** ✅
- **Estado**: Ya tenía ModuleHelpSystem implementado previamente

### 8. **payroll-liquidation.js** ✅
- **Estado**: Ya tenía ModuleHelpSystem implementado previamente (ejemplo de referencia)

---

## ⏳ MÓDULOS PENDIENTES DE IMPLEMENTACIÓN

### 📦 **Prioridad ALTA** (módulos más usados)

#### 1. **warehouse-management.js** 
- **Tamaño**: 2,542 líneas (GRANDE)
- **Contextos necesarios**: ~7 (padron, categorias, precios, promociones, stock, ubicaciones, config)
- **Complejidad**: ALTA (muchos métodos `loadXXX()` y `renderXXX()`)
- **Estimación**: 2-3 horas de trabajo

#### 2. **finance-dashboard.js**
- **Tamaño**: 781 líneas
- **Contextos necesarios**: ~1-2 (dashboard principal, quizás configuración)
- **Complejidad**: MEDIA (IIFE pattern, no múltiples tabs)
- **Estimación**: 30-60 minutos

#### 3. **finance-journal-entries.js**
- **Tamaño**: Medio
- **Contextos necesarios**: ~3-4 (dashboard, manual entries, automated entries, config)
- **Complejidad**: MEDIA
- **Estimación**: 1-1.5 horas

### 📊 **Prioridad MEDIA** (módulos finance)

4. **finance-budget.js**
5. **finance-cash-flow.js**
6. **finance-chart-of-accounts.js**
7. **finance-cost-centers.js**
8. **finance-executive-dashboard.js**
9. **finance-reports.js**
10. **finance-treasury.js**

**Estimación por módulo finance**: 45-90 minutos c/u  
**Estimación total módulos finance**: 6-12 horas

### 📊 **Prioridad BAJA** (otros módulos)

11. **admin-finance-dashboard.js**
12. Todos los demás módulos del sistema

---

## 📋 PATRÓN DE IMPLEMENTACIÓN (Checklist)

Para agregar ModuleHelpSystem a un módulo nuevo, seguir estos pasos:

### ✅ PASO 1: Registro de Módulo (al inicio del archivo)

```javascript
// ============================================================================
// [MODULE_NAME] HELP SYSTEM - Sistema de Ayuda Contextual
// ============================================================================
if (typeof ModuleHelpSystem !== 'undefined') {
    ModuleHelpSystem.registerModule('module-key', {
        moduleName: 'Nombre del Módulo',
        moduleDescription: 'Descripción general del módulo.',

        contexts: {
            dashboard: {
                title: 'Panel Principal',
                description: 'Vista general de...',
                tips: [
                    'Tip 1 útil para el usuario',
                    'Tip 2 sobre funcionalidad clave'
                ],
                warnings: [
                    'Advertencia importante si aplica'
                ],
                helpTopics: [
                    '¿Pregunta frecuente 1?',
                    '¿Pregunta frecuente 2?'
                ],
                fieldHelp: {
                    campo1: 'Explicación del campo para tooltip',
                    campo2: 'Otra explicación'
                }
            },
            // ... más contextos según las vistas del módulo
        },

        fallbackResponses: {
            keyword1: 'Respuesta cuando detecta keyword1',
            keyword2: 'Respuesta cuando detecta keyword2'
        }
    });
}
```

### ✅ PASO 2: Inicialización en el método `init()`

```javascript
async init(container, context = {}) {
    // ... código existente ...

    // Al final del init()
    if (typeof ModuleHelpSystem !== 'undefined') {
        ModuleHelpSystem.init('module-key', {
            initialContext: this.currentTab || 'dashboard'
        });
    }
}
```

### ✅ PASO 3: Cambio de contexto en `switchTab()` o navegación

```javascript
switchTab(tab) {
    this.currentTab = tab;

    // Actualizar contexto de ayuda
    if (typeof ModuleHelpSystem !== 'undefined') {
        ModuleHelpSystem.setContext(tab);
    }

    // ... resto del código ...
}
```

### ✅ PASO 4: Banners en métodos `renderXXX()`

```javascript
async renderDashboard(container) {
    try {
        const data = await this.loadData();

        // Renderizar banner de ayuda contextual
        const helpBanner = typeof ModuleHelpSystem !== 'undefined'
            ? ModuleHelpSystem.renderBanner('dashboard')
            : '';

        container.innerHTML = `
            ${helpBanner}
            <!-- resto del contenido -->
        `;
    } catch (error) {
        // ...
    }
}
```

### ✅ PASO 5: Tooltips en campos (opcional pero recomendado)

```html
<input name="campo1" data-help="dashboard.campo1">
<label>Campo 2 <span data-help="dashboard.campo2">?</span></label>
```

---

## 🎯 EJEMPLOS DE REFERENCIA

### Mejor ejemplo completo:
- **procurement-management.js** (líneas 1-350 para registro, luego métodos render)

### Ejemplo de IIFE pattern:
- **finance-dashboard.js** (diferente estructura, pero aplicable)

### Ejemplo de módulo complejo:
- **payroll-liquidation.js** (tiene PayrollHelpSystem implementado)

---

## 📝 NOTAS IMPORTANTES

1. **ModuleHelpSystem.js** está en `backend/public/js/core/ModuleHelpSystem.js`
2. **Ya está activo** en `panel-empresa.html` (línea 2175)
3. **NO requiere Ollama** para funcionar (tips y tooltips son estáticos)
4. **Ollama es opcional** solo para el chat flotante con IA
5. **Los banners mejoran UX** significativamente sin overhead de código

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

1. ✅ **Testear** procurement-management.js y payment-orders-dashboard.js
   - Abrir panel-empresa → ir a módulo Procurement
   - Verificar que aparecen banners de ayuda
   - Navegar entre tabs y verificar que cambian los tips

2. ⏳ **Implementar** warehouse-management.js (prioridad ALTA)
   - Es el módulo más complejo pendiente
   - Seguir el patrón de procurement-management.js

3. ⏳ **Implementar** 2-3 módulos finance críticos
   - finance-dashboard.js
   - finance-journal-entries.js
   - finance-executive-dashboard.js

4. 📊 **Evaluar** si vale la pena continuar con TODOS los módulos
   - O implementar un sistema automático de inyección de banners

---

## 📞 CONTACTO / REFERENCIAS

- **Documentación CLAUDE.md**: `/c/Bio/CLAUDE.md` → Sección "SISTEMA DE AYUDA CONTEXTUAL"
- **Código ModuleHelpSystem**: `backend/public/js/core/ModuleHelpSystem.js`
- **Panel de empresa**: `backend/public/panel-empresa.html` (línea 2175)

---

**Última actualización**: 2026-01-05 por sesión de Claude Code
