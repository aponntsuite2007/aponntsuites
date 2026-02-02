# FIX: Consistencia de Status y Validación de Trial

**Fecha**: 2026-02-01
**Tipo**: Corrección de Inconsistencia + Mejora de Seguridad
**Criticidad**: Alta

---

## PROBLEMA DETECTADO

Se detectó una **inconsistencia de idioma** en los valores del campo `status`:

| Uso | Valor Anterior | Valor Correcto |
|-----|----------------|----------------|
| Modelo Company.js | `'active'` | ✅ Correcto |
| InvoiceGenerationService.js | `'activo'` ❌ | `'active'` |
| PaymentService.js | `'activo'` ❌ | `'active'` |
| ScoringCalculationService.js | `'activo'` ❌ | `'active'` |
| EmployeeLegal360Service.js | `'activo'` ❌ | `'active'` |
| legalRoutes.js | `'activo'` ❌ | `'active'` |

**Impacto**: Las empresas con `status = 'active'` **NO** se facturaban porque el cron buscaba `'activo'`.

---

## MEJORAS IMPLEMENTADAS

### 1. Corrección de Queries SQL (Inglés Consistente)

**Archivos modificados:**

- `src/services/InvoiceGenerationService.js` línea 36
- `src/services/PaymentService.js` línea 191
- `src/services/ScoringCalculationService.js` líneas 33 y 508
- `src/services/EmployeeLegal360Service.js` líneas 335, 465, 548
- `src/routes/legalRoutes.js` línea 831

### 2. Validación Explícita de Trial en Facturación

**InvoicingService.js - generate():**
```javascript
// 1.5. VALIDACIÓN TRIAL - No generar facturas para empresas en período de prueba
if (company.status === 'trial' || company.is_trial === true) {
  console.log(`⚠️ [INVOICE] Empresa ${company.name} está en período TRIAL`);
  throw new Error(`Empresa en período de prueba. No se puede facturar.`);
}
```

**InvoicingService.js - generateMonthlyInvoices():**
```javascript
// Excluir empresas en trial del cron de facturación mensual
const activeContracts = await Contract.findAll({
  where: { status: 'active' },
  include: [{
    model: Company,
    as: 'company',
    where: {
      status: 'active',    // Solo empresas activas
      is_trial: false      // Excluir empresas en trial
    },
    required: true
  }]
});
```

### 3. Doble Filtro en InvoiceGenerationService.js

```javascript
// Antes
`SELECT * FROM companies WHERE status = 'activo'`

// Después - Doble filtro: status + is_trial
`SELECT * FROM companies WHERE status = 'active' AND is_trial = false`
```

### 4. Validación de Status en Modelo Partner

```javascript
status: {
  type: DataTypes.STRING(20),
  defaultValue: 'pending',
  validate: {
    isIn: [['pending', 'active', 'suspended', 'inactive', 'rejected']]
  },
  comment: 'Partner status (SIEMPRE en inglés)'
}
```

### 5. Migración SQL para Datos Existentes

**Archivo**: `migrations/20260201_normalize_status_values.sql`

```sql
-- Normalizar companies
UPDATE companies SET status = 'active' WHERE status = 'activo';
UPDATE companies SET status = 'pending' WHERE status = 'pendiente';

-- Normalizar partners
UPDATE partners SET status = 'active' WHERE status = 'activo';

-- Normalizar user_legal_issues
UPDATE user_legal_issues SET status = 'active' WHERE status = 'activo';
```

---

## ARCHIVOS MODIFICADOS

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `InvoiceGenerationService.js` | 36 | `'activo'` → `'active' AND is_trial = false` |
| `InvoicingService.js` | 52-63, 159-175 | Validación explícita trial |
| `PaymentService.js` | 191 | `'activo'` → `'active', is_trial = false` |
| `ScoringCalculationService.js` | 33, 508 | `'activo'` → `'active'` |
| `EmployeeLegal360Service.js` | 335, 465, 548 | `'activo'` → `'active'` |
| `legalRoutes.js` | 831 | `'activo'` → `'active'` |
| `Partner.js` | 126-133 | Validación isIn agregada |

---

## MIGRACIÓN SQL PENDIENTE

**Ejecutar antes de reiniciar servidor en producción:**

```bash
cd backend
psql -U postgres -d biometrico_db -f migrations/20260201_normalize_status_values.sql
```

---

## VERIFICACIÓN

```sql
-- Verificar que no hay 'activo' en español
SELECT status, COUNT(*) FROM companies GROUP BY status;
SELECT status, COUNT(*) FROM partners GROUP BY status;
SELECT status, COUNT(*) FROM user_legal_issues GROUP BY status;
```

**Resultado esperado**: Solo valores en inglés (`active`, `pending`, `suspended`, etc.)

---

## RESUMEN DEL CIRCUITO QUOTE → EMPRESA (Verificado)

| Escenario | Factura Inicial | Facturación Mensual | Estado Empresa |
|-----------|-----------------|---------------------|----------------|
| Trial (30 días) | ❌ NO | ❌ NO | `status='trial', is_trial=true` |
| Post-Trial (acepta) | ✅ SÍ | ✅ SÍ | `status='active', is_trial=false` |
| Sin Trial (directo) | ✅ SÍ | ✅ SÍ | `status='active', is_trial=false` |

---

## NOTAS

- El sistema ahora tiene **triple protección** contra facturación de trials:
  1. Query SQL filtra `status = 'active' AND is_trial = false`
  2. Include en Sequelize filtra empresas no-trial
  3. Validación explícita en `generate()` lanza error si `is_trial = true`
