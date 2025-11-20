/**
 * Script robusto para agregar secciones help a workflows
 * Usa approach diferente: lee todo el archivo, modifica en memoria, reescribe completo
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '../engineering-metadata.js');

console.log('📝 Aplicando secciones help a workflows de forma robusta...\n');

// Leer archivo completo
let content = fs.readFileSync(metadataPath, 'utf8');

const patches = [
  {
    name: 'contractModification',
    search: `      lastUpdated: "2025-01-19T18:30:00Z"
    },

    monthlyInvoicing: {`,
    replace: `      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: \`1. Cliente modifica módulos desde panel-empresa → Configuración
2. Sistema genera presupuesto automáticamente
3. Cliente aprueba/rechaza (7 días)
4. Si aprueba: genera contrato → firma digital
5. Activa contrato y recalcula comisiones\`,
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

    monthlyInvoicing: {`
  },
  {
    name: 'monthlyInvoicing',
    search: `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    monthlyCommissionLiquidation: {`,
    replace: `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: \`1. Cron job día 1 de mes (00:00 hs)
2. Busca contratos activos
3. Genera factura por cada contrato
4. Envía por email + app
5. Cliente paga (15 días)
6. Cobranzas confirma → dispara liquidación\`,
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

    monthlyCommissionLiquidation: {`
  },
  {
    name: 'monthlyCommissionLiquidation',
    search: `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    walletChangeConfirmation: {`,
    replace: `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: \`1. Dispara al confirmar pago de factura
2. Obtiene jerarquía del vendedor
3. Calcula comisión directa + piramidales
4. Genera digest con trazabilidad
5. Notifica a Cobranzas
6. Ejecuta transferencias USD
7. Destinatarios confirman (5 días)\`,
        commonIssues: [
          {problem: "Vendedor no aparece", cause: "assigned_vendor_id NULL", solution: "Verificar asignación y leader_id"},
          {problem: "Comisión incorrecta", cause: "Porcentajes mal configurados", solution: "Verificar pyramid_percentages"},
          {problem: "Transferencia no ejecuta", cause: "CBU incorrecto o USD no habilitado", solution: "Verificar wallet_usd_enabled"}
        ],
        requiredRoles: ["admin", "cobranzas"],
        requiredModules: ["invoicing", "vendorsCommissions", "notifications"],
        relatedEndpoints: ["POST /api/commissions/liquidate", "POST /api/commissions/payments/:id/transfer"],
        codeFiles: ["src/services/CommissionService.js", "src/services/VendorHierarchyService.js"]
      }
    },

    walletChangeConfirmation: {`
  },
  {
    name: 'walletChangeConfirmation',
    search: `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    vendorOnboarding: {`,
    replace: `      notificationSystem: "aponnt_external_notifications (NUEVO - separado de NotificationEnterpriseService)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: \`1. Vendedor ingresa nuevo CBU/alias
2. Sistema crea solicitud (pending, 48 hs deadline)
3. Notifica por email y app
4. Vendedor confirma autenticidad
5. Si confirma: aplica cambios
6. Si no responde en 48 hs: auto-revert\`,
        commonIssues: [
          {problem: "Cambio no aplica", cause: "UPDATE falló", solution: "Aplicar manualmente"},
          {problem: "Notificación no llega", cause: "Email incorrecto", solution: "Actualizar email y reenviar"},
          {problem: "CBU inválido aceptado", cause: "Validación falló", solution: "Rechazar solicitud"}
        ],
        requiredRoles: ["vendor", "sales_leader", "admin"],
        requiredModules: ["vendorsCommissions", "notifications"],
        relatedEndpoints: ["POST /api/vendors/:id/wallet/change", "POST /api/wallet-changes/:id/confirm"],
        codeFiles: ["src/services/VendorWalletService.js"]
      }
    },

    vendorOnboarding: {`
  },
  {
    name: 'vendorOnboarding',
    search: `      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z"
    },

    companyModulesChange: {`,
    replace: `      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: \`1. Admin ingresa datos del vendedor
2. Valida billetera (CBU 22 dígitos, USD habilitado)
3. Genera credenciales (username + password temporal)
4. Envía bienvenida con manual
5. Vendedor completa perfil\`,
        commonIssues: [
          {problem: "Credenciales no llegan", cause: "Email incorrecto", solution: "Reenviar credenciales"},
          {problem: "CBU no acepta", cause: "Formato inválido", solution: "Validar 22 dígitos numéricos"},
          {problem: "No puede cambiar password", cause: "Token expiró", solution: "Generar nuevo token"}
        ],
        requiredRoles: ["admin"],
        requiredModules: ["aponnt_staff", "notifications", "vendorsCommissions"],
        relatedEndpoints: ["POST /api/vendors", "POST /api/vendors/:id/resend-credentials"],
        codeFiles: ["src/services/VendorOnboardingService.js"]
      }
    },

    companyModulesChange: {`
  },
  {
    name: 'companyModulesChange',
    search: `      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z"
    }
  },

  // ==================== BASE DE DATOS ====================`,
    replace: `      notificationSystem: "aponnt_external_notifications (NUEVO)",
      lastUpdated: "2025-01-19T18:30:00Z",

      help: {
        quickStart: \`ESCENARIO 1 - Módulos: dispara contractModification (10 pasos)
ESCENARIO 2 - Cantidad empleados:
1. Empresa actualiza cantidad
2. Recalcula pricing (precio × cantidad)
3. Registra en historial
4. Notifica a empresa y vendedor
5. Recalcula comisiones futuras\`,
        commonIssues: [
          {problem: "Precio no recalcula", cause: "Trigger falló", solution: "Calcular manual: precio × cantidad"},
          {problem: "Dispara proceso incorrecto", cause: "Lógica de detección falló", solution: "Si active_modules cambió: contractModification"},
          {problem: "Vendedor no notifica", cause: "Step 5 falló", solution: "Enviar manualmente"}
        ],
        requiredRoles: ["admin", "empresa"],
        requiredModules: ["companies", "invoicing", "vendorsCommissions", "notifications"],
        relatedEndpoints: ["PUT /api/companies/:id/employees", "POST /api/companies/:id/recalculate-pricing"],
        codeFiles: ["src/services/CompanyPricingService.js"]
      }
    }
  },

  // ==================== BASE DE DATOS ====================`
  }
];

let appliedCount = 0;

patches.forEach((patch, index) => {
  console.log(`${index + 1}. Aplicando patch para ${patch.name}...`);

  if (content.includes(patch.search)) {
    content = content.replace(patch.search, patch.replace);
    appliedCount++;
    console.log(`   ✅ ${patch.name} - patch aplicado`);
  } else {
    console.log(`   ⏭️  ${patch.name} - ya existe o patrón no encontrado`);
  }
});

// Guardar cambios
if (appliedCount > 0) {
  fs.writeFileSync(metadataPath, content, 'utf8');
  console.log(`\n✅ Completado! ${appliedCount}/6 secciones help agregadas.`);
  console.log(`📁 Archivo actualizado: ${metadataPath}`);
} else {
  console.log('\n⚠️  No se realizaron cambios (todas las secciones ya existen)');
}

console.log('\n🎯 PRÓXIMO PASO: Ejecutar comando "actualiza ingenieria"');
