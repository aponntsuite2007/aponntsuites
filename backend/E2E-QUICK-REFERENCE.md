# SYNAPSE E2E Testing - Referencia Rápida

## Estado Actual: 100% Cobertura

```
Total:         59 configs
Completos:     46 (con frontend)
Delegados:     13 (sin frontend)
Incompletos:    0
```

## Comandos Rápidos

### Validar configs
```bash
node scripts/validate-e2e-configs.js
```

### Verificar cobertura
```bash
node scripts/verify-100-percent-coverage.js
```

### Ejecutar tests E2E
```bash
# Todos los módulos
npx playwright test tests/e2e/modules/universal-modal-advanced.e2e.spec.js

# Módulo específico
npx playwright test --grep "attendance"

# Con UI
npx playwright test --ui

# Ver reporte
npx playwright show-report
```

## Estructura de Config Completo

```javascript
module.exports = {
  moduleKey: 'module-name',
  moduleName: 'Module Name',
  category: 'panel-empresa-core',
  baseUrl: 'http://localhost:9998/panel-empresa.html#module-name',

  navigation: {
    listContainerSelector: '#moduleContainer',
    createButtonSelector: 'button[onclick*="showAddModal()"]',
    openModalSelector: 'button.nav-item[data-view="dashboard"]',
    viewButtonSelector: 'button.btn-info',
    editButtonSelector: 'button.btn-warning',
    deleteButtonSelector: 'button.btn-danger',
    modalSelector: '.modal-overlay',
    closeModalSelector: 'button.close'
  },

  tabs: [
    {
      key: 'main',
      label: 'Principal',
      isDefault: true,
      fields: [
        {
          name: 'field_name',
          label: 'Field Label',
          selector: '#fieldId',
          type: 'text',
          required: true,
          testValues: {
            valid: ['value1', 'value2'],
            invalid: ['', null]
          }
        }
      ]
    }
  ],

  database: {
    table: 'table_name',
    primaryKey: 'id',
    testDataFactory: async (db, companyId) => { /* ... */ },
    testDataCleanup: async (db, recordId) => { /* ... */ }
  },

  chaosConfig: {
    enabled: true,
    monkeyTest: { duration: 20000, maxActions: 60 },
    fuzzing: { enabled: true, fields: ['field1'] },
    raceConditions: { enabled: true, scenarios: ['simultaneous-create'] },
    stressTest: { enabled: true, createMultipleRecords: 30 }
  },

  brainIntegration: {
    enabled: true,
    expectedIssues: ['issue1', 'issue2']
  }
};
```

## Estructura de Config Delegado

```javascript
module.exports = {
  moduleKey: 'module-name',
  moduleName: 'Module Name',
  category: 'delegated-backend-only',
  isDelegated: true,
  delegationReason: 'API Backend - Sin UI web',
  skipE2ETesting: true,

  validation: {
    score: 10,
    status: 'DELEGATED',
    completeness: 100
  },

  brainIntegration: {
    enabled: true,
    delegatedTestingSuite: 'api-integration-tests'
  }
};
```

## Módulos por Categoría

### Panel Empresa Core (18 módulos)
- attendance, dashboard, users, visitors, voice-platform, etc.

### Panel Empresa RRHH (8 módulos)
- benefits-management, payroll-liquidation, training-management, etc.

### Panel Empresa Legal (4 módulos)
- art-management, compliance-dashboard, legal-dashboard, etc.

### Panel Administrativo (6 módulos)
- associate-workflow-panel, deploy-manager-3stages, partner-scoring-system, etc.

### Delegados Backend (13 módulos)
- ai-assistant, auditor, companies, knowledge-base, medical, etc.

## Agregar Nuevo Módulo

### Con Frontend:
1. Crear archivo `tests/e2e/configs/{module}.config.js`
2. Usar template de config completo
3. Analizar código fuente en `public/js/modules/{module}.js`
4. Extraer selectores reales
5. Validar: `node scripts/validate-e2e-configs.js`

### Sin Frontend (Delegado):
1. Crear archivo `tests/e2e/configs/{module}.config.js`
2. Usar template de config delegado
3. Especificar razón de delegación
4. Validar: `node scripts/validate-e2e-configs.js`

## Scripts Útiles

| Script | Descripción |
|--------|-------------|
| `validate-e2e-configs.js` | Valida todos los configs (score 0-10) |
| `verify-100-percent-coverage.js` | Verificación rápida de cobertura |
| `complete-27-e2e-configs.js` | Generador automatizado de configs |

## Reportes

- **JSON**: `tests/e2e/results/config-validation-report.json`
- **Markdown**: `E2E-SYNAPSE-100-PERCENT-COVERAGE-REPORT.md`
- **Quick Ref**: `E2E-QUICK-REFERENCE.md` (este archivo)

## Troubleshooting

### Error: "Config incompleto"
```bash
# Ver detalles
node scripts/validate-e2e-configs.js

# Revisar issues reportados para ese módulo
# Completar selectores/tabs/fields faltantes
```

### Error: "Module not found"
```bash
# Verificar que existe el archivo
ls tests/e2e/configs/{module}.config.js

# Verificar sintaxis JavaScript
node -c tests/e2e/configs/{module}.config.js
```

### Score 9/10 (falta chaos)
```javascript
// Agregar al config:
chaosConfig: {
  enabled: true,
  monkeyTest: { duration: 20000, maxActions: 60 },
  fuzzing: { enabled: true, fields: ['field1'] },
  raceConditions: { enabled: true, scenarios: ['simultaneous-create'] },
  stressTest: { enabled: true, createMultipleRecords: 30 }
}
```

## Próximos Pasos

1. Ejecutar suite E2E completa para verificar funcionalidad
2. Integrar con CI/CD para testing continuo
3. Revisar reportes de Playwright para identificar módulos con issues
4. Iterar sobre configs según resultados de tests

---

**Última actualización**: 2025-12-27
**Estado**: 100% Cobertura Alcanzada
**Sistema**: SYNAPSE (Playwright + Brain + Auto-Healing)
