# PARCHES MANUALES PARA AGREGAR SECCIONES `help` A WORKFLOWS

## ❗ PROBLEMA
El archivo `engineering-metadata.js` da error "File has been unexpectedly modified" al intentar editarlo.

## ✅ SOLUCIÓN
Aplicar manualmente los siguientes 6 parches (copiar/pegar en el archivo).

---

## 📍 PARCHE 1: contractModification

**Ubicación**: Después de `lastUpdated: "2025-01-19T18:30:00Z"` en contractModification (línea ~1314)

**BUSCAR**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    monthlyInvoicing: {
```

**REEMPLAZAR CON**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Cliente modifica módulos desde panel-empresa → Configuración
2. Sistema genera presupuesto automáticamente
3. Cliente aprueba/rechaza (7 días)
4. Si aprueba: genera contrato → firma digital
5. Activa contrato y recalcula comisiones`,
        commonIssues: [
          {problem: "Presupuesto no llega", cause: "Email desactualizado", solution: "Verificar contact_email y reenviar"},
          {problem: "Contrato pending_signature", cause: "No firmó en 7 días", solution: "Escalar a vendedor"},
          {problem: "Comisiones no recalculan", cause: "refresh_vendor_statistics() falló", solution: "Ejecutar manualmente"}
        ],
        requiredRoles: ["admin", "empresa"],
        requiredModules: ["companies", "budgets", "contracts", "notifications"],
        relatedEndpoints: ["POST /api/budgets/:id/approve", "POST /api/contracts/:id/sign"],
        codeFiles: ["src/routes/budgetRoutes.js", "src/routes/contractRoutes.js"]
      }
    },

    monthlyInvoicing: {
```

---

## 📍 PARCHE 2: monthlyInvoicing

**Ubicación**: Después de `lastUpdated: "2025-01-19T18:30:00Z"` en monthlyInvoicing (línea ~1377)

**BUSCAR**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    monthlyCommissionLiquidation: {
```

**REEMPLAZAR CON**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Cron job día 1 de mes (00:00 hs)
2. Busca contratos activos
3. Genera factura por cada contrato
4. Envía por email + app
5. Cliente paga (15 días)
6. Cobranzas confirma → dispara liquidación`,
        commonIssues: [
          {problem: "Factura con monto incorrecto", cause: "monthly_total desactualizado", solution: "Recalcular y regenerar factura"},
          {problem: "Email no llega", cause: "SMTP límite excedido", solution: "Verificar logs y reenviar"},
          {problem: "Liquidación no dispara", cause: "Trigger Step 7 falló", solution: "Disparar manualmente /api/commissions/liquidate"}
        ],
        requiredRoles: ["admin", "cobranzas"],
        requiredModules: ["contracts", "invoicing", "notifications"],
        relatedEndpoints: ["POST /api/invoices/:id/confirm-payment", "POST /api/invoices/generate"],
        codeFiles: ["src/services/InvoicingService.js", "src/cron/monthly-invoicing.js"]
      }
    },

    monthlyCommissionLiquidation: {
```

---

## 📍 PARCHE 3: monthlyCommissionLiquidation

**Ubicación**: Después de `lastUpdated: "2025-01-19T18:30:00Z"` en monthlyCommissionLiquidation (línea ~1479)

**BUSCAR**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    walletChangeConfirmation: {
```

**REEMPLAZAR CON**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Dispara al confirmar pago de factura
2. Obtiene jerarquía del vendedor
3. Calcula comisión directa + piramidales
4. Genera digest con trazabilidad
5. Notifica a Cobranzas
6. Ejecuta transferencias USD
7. Destinatarios confirman (5 días)`,
        commonIssues: [
          {problem: "Vendedor no aparece", cause: "assigned_vendor_id NULL o jerarquía rota", solution: "Verificar asignación y leader_id"},
          {problem: "Comisión incorrecta", cause: "Porcentajes piramidales mal configurados", solution: "Verificar pyramid_percentages y ejecutar función manual"},
          {problem: "Transferencia no ejecuta", cause: "CBU incorrecto o USD no habilitado", solution: "Verificar wallet_usd_enabled y solicitar cambio de billetera"}
        ],
        requiredRoles: ["admin", "cobranzas"],
        requiredModules: ["invoicing", "vendorsCommissions", "notifications"],
        relatedEndpoints: ["POST /api/commissions/liquidate", "POST /api/commissions/payments/:id/transfer"],
        codeFiles: ["src/services/CommissionService.js", "src/services/VendorHierarchyService.js"]
      }
    },

    walletChangeConfirmation: {
```

---

## 📍 PARCHE 4: walletChangeConfirmation

**Ubicación**: Después de `lastUpdated: "2025-01-19T18:30:00Z"` en walletChangeConfirmation (línea ~1540)

**BUSCAR**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    vendorOnboarding: {
```

**REEMPLAZAR CON**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Vendedor ingresa nuevo CBU/alias
2. Sistema crea solicitud (pending, 48 hs deadline)
3. Notifica por email y app
4. Vendedor confirma autenticidad
5. Si confirma: aplica cambios
6. Si no responde en 48 hs: auto-revert`,
        commonIssues: [
          {problem: "Cambio no aplica", cause: "UPDATE falló en Step 5", solution: "Aplicar manualmente y marcar como applied"},
          {problem: "Notificación no llega", cause: "Email incorrecto", solution: "Actualizar email y reenviar"},
          {problem: "CBU inválido aceptado", cause: "Validación falló", solution: "Rechazar solicitud y notificar error"}
        ],
        requiredRoles: ["vendor", "sales_leader", "admin"],
        requiredModules: ["vendorsCommissions", "notifications"],
        relatedEndpoints: ["POST /api/vendors/:id/wallet/change", "POST /api/wallet-changes/:id/confirm"],
        codeFiles: ["src/services/VendorWalletService.js", "migrations/wallet_change_requests.sql"]
      }
    },

    vendorOnboarding: {
```

---

## 📍 PARCHE 5: vendorOnboarding

**Ubicación**: Después de `lastUpdated: "2025-01-19T18:30:00Z"` en vendorOnboarding (línea ~1605)

**BUSCAR**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    companyModulesChange: {
```

**REEMPLAZAR CON**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `1. Admin ingresa datos del vendedor
2. Valida billetera (CBU 22 dígitos, USD habilitado)
3. Genera credenciales (username + password temporal)
4. Envía bienvenida con manual
5. Vendedor completa perfil
6. Modificaciones posteriores: registra en historial`,
        commonIssues: [
          {problem: "Credenciales no llegan", cause: "Email incorrecto al alta", solution: "Reenviar credenciales y/o actualizar email"},
          {problem: "CBU no acepta", cause: "No tiene 22 dígitos o no numérico", solution: "Validar formato (ej: 0170099520000001234567)"},
          {problem: "No puede cambiar password", cause: "Token expiró", solution: "Generar nuevo token reset-password"},
          {problem: "Cambio de líder no notifica", cause: "Event handler falló", solution: "Revisar staff_change_history y reenviar"}
        ],
        requiredRoles: ["admin"],
        requiredModules: ["aponnt_staff", "notifications", "vendorsCommissions"],
        relatedEndpoints: ["POST /api/vendors", "POST /api/vendors/:id/resend-credentials"],
        codeFiles: ["src/services/VendorOnboardingService.js", "migrations/staff_change_history.sql"]
      }
    },

    companyModulesChange: {
```

---

## 📍 PARCHE 6: companyModulesChange

**Ubicación**: Después de `lastUpdated: "2025-01-19T18:30:00Z"` en companyModulesChange (línea ~1675)

**BUSCAR**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z"
    }
  },

  // ==================== BASE DE DATOS ====================
```

**REEMPLAZAR CON**:
```javascript
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: `ESCENARIO 1 - Módulos: dispara contractModification (10 pasos)
ESCENARIO 2 - Cantidad empleados:
1. Empresa actualiza cantidad
2. Recalcula pricing (precio × cantidad)
3. Registra en historial
4. Notifica a empresa y vendedor
5. Recalcula comisiones futuras`,
        commonIssues: [
          {problem: "Precio no recalcula", cause: "Trigger Step 2 falló", solution: "Calcular manual: precio_unitario × cantidad"},
          {problem: "Dispara proceso incorrecto", cause: "Lógica de detección falló", solution: "Si cambió active_modules: contractModification; si solo cantidad: simplificado"},
          {problem: "Vendedor no notifica", cause: "Step 5 falló", solution: "Enviar manualmente /api/vendors/:id/notify-commission-change"},
          {problem: "Historial no registra", cause: "INSERT falló", solution: "Verificar tabla pricing_change_history existe"}
        ],
        requiredRoles: ["admin", "empresa"],
        requiredModules: ["companies", "invoicing", "vendorsCommissions", "notifications"],
        relatedEndpoints: ["PUT /api/companies/:id/employees", "POST /api/companies/:id/recalculate-pricing"],
        codeFiles: ["src/services/CompanyPricingService.js", "migrations/pricing_change_history.sql"]
      }
    }
  },

  // ==================== BASE DE DATOS ====================
```

---

## ✅ DESPUÉS DE APLICAR LOS PARCHES

1. Verificar que `engineering-metadata.js` no tenga errores de sintaxis:
   ```bash
   node -c engineering-metadata.js
   ```

2. Testear que se carga correctamente:
   ```bash
   node -e "const m = require('./engineering-metadata'); console.log('✅ OK');"
   ```

3. Verificar que los 6 workflows tienen `.help`:
   ```bash
   node -e "const m = require('./engineering-metadata'); console.log(Object.keys(m.workflows).filter(k => m.workflows[k].help));"
   ```

4. Próximo paso: ejecutar comando "actualiza ingenieria" para sincronizar con modules-registry.json

---

**NOTA**: Si prefieres, también está el archivo `workflows-help-sections.js` con las secciones completas (más detalladas) que puedes usar en vez de estos parches reducidos.
