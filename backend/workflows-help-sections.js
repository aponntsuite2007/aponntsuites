/**
 * SECCIONES DE AYUDA PARA WORKFLOWS
 *
 * Este archivo contiene las secciones `help` que se agregarán a cada workflow
 * en engineering-metadata.js para habilitar tutoriales contextuales del AI Assistant.
 *
 * Una vez que engineering-metadata.js esté estable, copiar estas secciones
 * a cada workflow correspondiente.
 */

module.exports = {
  // ==================== WORKFLOW 1: CONTRACT MODIFICATION ====================
  contractModification: {
    help: {
      quickStart: `1. Cliente modifica módulos desde panel-empresa → Configuración → Módulos Activos
2. Sistema da de baja contrato vigente y genera presupuesto automáticamente
3. Cliente recibe notificación por email y app con presupuesto detallado
4. Cliente tiene 7 días para aprobar o rechazar el presupuesto
5. Si aprueba: sistema genera nuevo contrato y envía para firma digital
6. Cliente firma digitalmente (checkbox + timestamp + IP)
7. Sistema activa nuevo contrato y actualiza módulos de la empresa
8. Recalcula comisiones de toda la jerarquía de vendedores
9. Si no es día 1 del mes: genera factura pro-rata
10. Configura notificación mensual recurrente (día 1 de cada mes)`,

      commonIssues: [
        {
          problem: "Presupuesto no llega al email del cliente",
          cause: "Email de contacto de la empresa desactualizado o servidor SMTP caído",
          solution: `1. Verificar email: SELECT contact_email FROM companies WHERE id = X
2. Verificar estado SMTP: GET /api/health/smtp
3. Reenviar presupuesto: POST /api/budgets/:id/resend
4. Verificar logs: SELECT * FROM email_logs WHERE budget_id = X ORDER BY created_at DESC`
        },
        {
          problem: "Contrato queda en 'pending_signature' sin avanzar",
          cause: "Cliente no firmó dentro del plazo de 7 días",
          solution: `1. Verificar deadline: SELECT signed_deadline FROM contracts WHERE id = X
2. Escalar a vendedor: POST /api/contracts/:id/escalate
3. Extender deadline (admin): PUT /api/contracts/:id/extend-deadline {"days": 7}
4. Si no responde: sistema revierte a contrato anterior automáticamente`
        },
        {
          problem: "Comisiones no se recalculan después de modificar contrato",
          cause: "Función refresh_vendor_statistics() no se ejecutó en Step 10",
          solution: `1. Ejecutar manualmente: SELECT refresh_vendor_statistics(vendor_id) FROM companies WHERE id = X
2. Verificar logs: SELECT * FROM audit_logs WHERE module_name = 'vendorsCommissions'
3. Ejecutar auditoría: POST /api/audit/run/vendorsCommissions`
        },
        {
          problem: "Módulos no se activaron después de firmar contrato",
          cause: "Step 9 falló - companies.active_modules no se actualizó",
          solution: `1. Verificar contrato: SELECT status, signed_at FROM contracts WHERE id = X
2. Verificar módulos: SELECT active_modules FROM companies WHERE id = X
3. Actualizar manualmente (admin): UPDATE companies SET active_modules = [nuevos] WHERE id = X
4. Registrar en audit_logs para trazabilidad`
        }
      ],

      requiredRoles: ["admin", "empresa"],
      requiredModules: ["companies", "budgets", "contracts", "notifications"],
      relatedEndpoints: [
        "GET /api/budgets/:id",
        "POST /api/budgets/:id/approve",
        "POST /api/budgets/:id/reject",
        "POST /api/budgets/:id/resend",
        "GET /api/contracts/:id",
        "POST /api/contracts/:id/sign",
        "POST /api/contracts/:id/escalate",
        "PUT /api/contracts/:id/extend-deadline"
      ],
      codeFiles: [
        "src/routes/budgetRoutes.js",
        "src/routes/contractRoutes.js",
        "src/services/ContractService.js",
        "src/services/BudgetService.js",
        "public/js/modules/company-settings.js"
      ]
    }
  },

  // ==================== WORKFLOW 2: MONTHLY INVOICING ====================
  monthlyInvoicing: {
    help: {
      quickStart: `1. Cron job se ejecuta automáticamente el día 1 de cada mes a las 00:00 hs
2. Busca todos los contratos activos en la base de datos
3. Genera una factura por cada contrato activo
4. Envía factura por email + notificación app a cada cliente
5. Cliente tiene 15 días para cargar comprobante de pago
6. Área de Cobranzas confirma pago (deadline: día 7 del mes)
7. Al confirmar pago: dispara workflow de liquidación de comisiones`,

      commonIssues: [
        {
          problem: "Factura generada con monto incorrecto",
          cause: "Contrato modificado pero companies.monthly_total no actualizado",
          solution: `1. Verificar: SELECT monthly_total FROM companies WHERE id = X
2. Calcular correcto: SELECT SUM(price) FROM active_modules WHERE company_id = X
3. Si difiere: UPDATE companies SET monthly_total = [correcto] WHERE id = X
4. Regenerar factura: POST /api/invoices/:id/regenerate`
        },
        {
          problem: "Cliente no recibe email de factura",
          cause: "Email incorrecto o límite de envíos SMTP excedido",
          solution: `1. Verificar email: SELECT contact_email FROM companies WHERE id = X
2. Verificar logs SMTP: SELECT * FROM email_logs WHERE invoice_id = X
3. Reenviar manualmente: POST /api/invoices/:id/resend
4. Si persiste: verificar estado del servidor SMTP`
        },
        {
          problem: "Factura no se generó para un contrato activo",
          cause: "Contrato activado después del día 1 o cron job falló",
          solution: `1. Verificar estado del cron: SELECT * FROM cron_logs WHERE job_name = 'monthly_invoicing'
2. Generar factura manual: POST /api/invoices/generate {"contract_id": "X"}
3. Verificar contratos activos: SELECT * FROM contracts WHERE is_active = true AND company_id = X`
        },
        {
          problem: "Liquidación de comisiones no se disparó después de confirmar pago",
          cause: "Trigger del Step 7 falló",
          solution: `1. Verificar status de factura: SELECT status FROM invoices WHERE id = X
2. Disparar manualmente: POST /api/commissions/liquidate {"invoice_id": "X"}
3. Verificar logs: SELECT * FROM audit_logs WHERE module_name = 'invoicing'`
        }
      ],

      requiredRoles: ["admin", "cobranzas"],
      requiredModules: ["contracts", "invoicing", "notifications"],
      relatedEndpoints: [
        "GET /api/invoices",
        "GET /api/invoices/:id",
        "POST /api/invoices/:id/upload-payment",
        "POST /api/invoices/:id/confirm-payment",
        "POST /api/invoices/:id/resend",
        "POST /api/invoices/generate"
      ],
      codeFiles: [
        "src/services/InvoicingService.js",
        "src/routes/invoiceRoutes.js",
        "src/cron/monthly-invoicing.js"
      ]
    }
  },

  // ==================== WORKFLOW 3: MONTHLY COMMISSION LIQUIDATION ====================
  monthlyCommissionLiquidation: {
    help: {
      quickStart: `1. Se dispara automáticamente al confirmarse pago de factura
2. Obtiene cadena jerárquica del vendedor (CEO → Regional → Supervisor → Leader → Rep)
3. Calcula comisión directa del vendedor (% del total de factura)
4. Calcula comisiones piramidales de todos los niveles superiores
5. Genera digest de liquidación con trazabilidad completa
6. Crea pagos individuales para cada miembro de la jerarquía
7. Notifica a Cobranzas con digest y deadline (día 10 del mes)
8. Cobranzas ejecuta transferencias bancarias en USD
9. Envía comprobantes a cada destinatario
10. Destinatarios confirman recepción (deadline: 5 días)`,

      commonIssues: [
        {
          problem: "Vendedor no aparece en liquidación de comisiones",
          cause: "Vendedor no está asignado a la empresa o jerarquía rota",
          solution: `1. Verificar asignación: SELECT assigned_vendor_id FROM companies WHERE id = X
2. Verificar jerarquía: SELECT * FROM aponnt_staff WHERE id = vendor_id
3. Verificar leader_id: debe apuntar a un Sales Leader válido
4. Si es NULL: asignar leader con UPDATE aponnt_staff SET leader_id = Y WHERE id = X`
        },
        {
          problem: "Comisión calculada incorrectamente",
          cause: "Porcentajes piramidales mal configurados o función SQL con bug",
          solution: `1. Verificar %: SELECT sales_commission_percentage, pyramid_percentages FROM aponnt_staff WHERE id = X
2. Ejecutar función manual: SELECT calculate_pyramid_commission(invoice_id, vendor_id)
3. Comparar resultado con liquidación generada
4. Si difiere: reportar a ingeniería con datos del caso`
        },
        {
          problem: "Transferencia no se ejecutó",
          cause: "Datos de billetera incorrectos o no en USD",
          solution: `1. Verificar CBU: SELECT wallet_cbu, wallet_usd_enabled FROM aponnt_staff WHERE id = X
2. Verificar validación: wallet_usd_enabled DEBE ser true
3. Si CBU incorrecto: solicitar cambio de billetera (workflow walletChangeConfirmation)
4. Si USD no habilitado: contactar al vendedor para habilitar USD en su billetera`
        },
        {
          problem: "Vendedor no confirma recepción de pago",
          cause: "No recibió notificación o no usó la app",
          solution: `1. Reenviar notificación: POST /api/commissions/payments/:id/resend-confirmation
2. Verificar email/SMS: SELECT * FROM email_logs WHERE payment_id = X
3. Si no responde en 5 días: auto-confirmar y escalar a líder
4. Registrar en audit_logs para auditoría`
        }
      ],

      requiredRoles: ["admin", "cobranzas"],
      requiredModules: ["invoicing", "vendorsCommissions", "notifications"],
      relatedEndpoints: [
        "GET /api/commissions/liquidations",
        "GET /api/commissions/liquidations/:id",
        "POST /api/commissions/liquidate",
        "POST /api/commissions/payments/:id/transfer",
        "POST /api/commissions/payments/:id/confirm",
        "GET /api/vendors/:id/hierarchy"
      ],
      codeFiles: [
        "src/services/CommissionService.js",
        "src/services/VendorHierarchyService.js",
        "src/routes/vendorCommissionsRoutes.js",
        "migrations/20250119_create_pyramid_commission_functions.sql"
      ]
    }
  },

  // ==================== WORKFLOW 4: WALLET CHANGE CONFIRMATION ====================
  walletChangeConfirmation: {
    help: {
      quickStart: `1. Vendedor ingresa nuevos datos de billetera (CBU, alias, banco)
2. Sistema crea solicitud con estado 'pending' y deadline de 48 horas
3. Envía notificación de confirmación por email y app
4. Vendedor debe confirmar que los datos son correctos y de su autoría
5. Si confirma: se aplican los cambios
6. Si rechaza o no responde en 48 hs: cambios se revierten automáticamente`,

      commonIssues: [
        {
          problem: "Cambio de billetera no se aplicó después de confirmar",
          cause: "Step 5 falló - UPDATE en aponnt_staff no se ejecutó",
          solution: `1. Verificar solicitud: SELECT * FROM wallet_change_requests WHERE staff_id = X AND status = 'confirmed'
2. Verificar CBU actual: SELECT wallet_cbu FROM aponnt_staff WHERE id = X
3. Aplicar manualmente: UPDATE aponnt_staff SET wallet_cbu = [nuevo] WHERE id = X
4. Marcar solicitud como aplicada: UPDATE wallet_change_requests SET status = 'applied'`
        },
        {
          problem: "Vendedor no recibe notificación de confirmación",
          cause: "Email incorrecto en perfil del vendedor",
          solution: `1. Verificar email: SELECT email FROM aponnt_staff WHERE id = X
2. Reenviar notificación: POST /api/wallet-changes/:id/resend
3. Si email incorrecto: actualizar con UPDATE aponnt_staff SET email = [correcto]
4. Extender deadline si es necesario: UPDATE wallet_change_requests SET deadline = NOW() + INTERVAL '48 hours'`
        },
        {
          problem: "Sistema acepta CBU inválido",
          cause: "Validación de formato CBU no funcionó",
          solution: `1. CBU argentino debe tener exactamente 22 dígitos numéricos
2. Verificar regex de validación en código
3. Rechazar solicitud: UPDATE wallet_change_requests SET status = 'rejected'
4. Notificar al vendedor del error y solicitar CBU correcto`
        }
      ],

      requiredRoles: ["vendor", "sales_leader", "admin"],
      requiredModules: ["vendorsCommissions", "notifications"],
      relatedEndpoints: [
        "POST /api/vendors/:id/wallet/change",
        "POST /api/wallet-changes/:id/confirm",
        "POST /api/wallet-changes/:id/reject",
        "POST /api/wallet-changes/:id/resend",
        "GET /api/vendors/:id/wallet-history"
      ],
      codeFiles: [
        "src/services/VendorWalletService.js",
        "src/routes/vendorRoutes.js",
        "migrations/wallet_change_requests.sql"
      ]
    }
  },

  // ==================== WORKFLOW 5: VENDOR ONBOARDING ====================
  vendorOnboarding: {
    help: {
      quickStart: `1. Admin ingresa datos del vendedor en panel-administrativo
2. Sistema valida datos de billetera (CBU 22 dígitos, USD habilitado)
3. Genera credenciales de acceso (username + password temporal)
4. Envía notificación de bienvenida con credenciales y manual
5. Vendedor completa perfil (cambio de password, foto, datos biométricos)
6. Si hay modificaciones posteriores: registra en historial y notifica`,

      commonIssues: [
        {
          problem: "Vendedor no recibe credenciales de acceso",
          cause: "Email incorrecto al momento del alta",
          solution: `1. Verificar email: SELECT email FROM aponnt_staff WHERE id = X
2. Reenviar credenciales: POST /api/vendors/:id/resend-credentials
3. Si email incorrecto: UPDATE aponnt_staff SET email = [correcto] WHERE id = X
4. Regenerar password temporal: POST /api/vendors/:id/reset-password`
        },
        {
          problem: "Sistema no acepta CBU del vendedor",
          cause: "CBU no tiene 22 dígitos o contiene caracteres no numéricos",
          solution: `1. Validar formato: CBU debe tener exactamente 22 dígitos
2. Ejemplo válido: 0170099520000001234567
3. Verificar que USD esté habilitado en la billetera
4. Si banco no soporta USD: solicitar CBU de otro banco`
        },
        {
          problem: "Vendedor no puede cambiar password temporal",
          cause: "Token de reseteo expiró o ruta de cambio de password rota",
          solution: `1. Generar nuevo token: POST /api/vendors/:id/reset-password
2. Verificar ruta: GET /api/vendors/reset-password/:token
3. Si ruta falla: revisar logs del servidor
4. Alternativamente: admin puede establecer password directamente`
        },
        {
          problem: "Modificación de líder no notifica al vendedor",
          cause: "Event handler de 'Cambio de líder' falló",
          solution: `1. Verificar historial: SELECT * FROM staff_change_history WHERE staff_id = X
2. Verificar notifications: SELECT * FROM aponnt_external_notifications WHERE recipient_id = X
3. Reenviar notificación: POST /api/staff-changes/:id/notify
4. Revisar logs del servicio de notificaciones`
        }
      ],

      requiredRoles: ["admin"],
      requiredModules: ["aponnt_staff", "notifications", "vendorsCommissions"],
      relatedEndpoints: [
        "POST /api/vendors",
        "PUT /api/vendors/:id",
        "POST /api/vendors/:id/resend-credentials",
        "POST /api/vendors/:id/reset-password",
        "GET /api/vendors/:id/change-history",
        "POST /api/vendors/:id/change-leader"
      ],
      codeFiles: [
        "src/routes/vendorRoutes.js",
        "src/services/VendorOnboardingService.js",
        "src/models/AponntStaff.js",
        "migrations/staff_change_history.sql"
      ]
    }
  },

  // ==================== WORKFLOW 6: COMPANY MODULES CHANGE ====================
  companyModulesChange: {
    help: {
      quickStart: `ESCENARIO 1 - Agregar/Quitar Módulos:
→ Dispara workflow completo de Modificación de Contrato (10 pasos)

ESCENARIO 2 - Cambio de Cantidad (empleados/licencias):
1. Empresa actualiza cantidad de empleados desde panel
2. Sistema recalcula pricing automáticamente (precio × cantidad)
3. Registra cambio en historial de pricing
4. Notifica a empresa: "Tu factura mensual cambió de $X a $Y"
5. Notifica a vendedor: "Comisión mensual aumentó/disminuyó"
6. Recalcula comisiones futuras en estimaciones`,

      commonIssues: [
        {
          problem: "Precio no se recalculó después de cambiar cantidad de empleados",
          cause: "Trigger de recalcular pricing falló en Step 2",
          solution: `1. Calcular manual: precio_total = precio_unitario × cantidad_empleados
2. Actualizar: UPDATE companies SET monthly_total = [nuevo] WHERE id = X
3. Verificar módulos activos: SELECT * FROM active_modules WHERE company_id = X
4. Regenerar próxima factura si es necesario`
        },
        {
          problem: "Empresa cambió módulos pero dispara proceso simplificado en vez de contractModification",
          cause: "Lógica de detección de escenario falló",
          solution: `1. Verificar qué cambió: active_modules vs contracted_employees
2. Si cambió active_modules: DEBE disparar contractModification workflow
3. Si solo cambió contracted_employees: proceso simplificado OK
4. Si ambos cambiaron: priorizar contractModification (más crítico)`
        },
        {
          problem: "Vendedor no recibió notificación de aumento de comisión",
          cause: "Step 5 falló - notificación a vendedor no se envió",
          solution: `1. Verificar vendor asignado: SELECT assigned_vendor_id FROM companies WHERE id = X
2. Verificar historial: SELECT * FROM pricing_change_history WHERE company_id = X
3. Calcular impacto: nueva_comision - comision_anterior
4. Enviar notificación manual: POST /api/vendors/:id/notify-commission-change`
        },
        {
          problem: "Historial de pricing no registra el cambio",
          cause: "INSERT en pricing_change_history falló",
          solution: `1. Verificar tabla existe: SELECT * FROM pricing_change_history LIMIT 1
2. Insertar manual: INSERT INTO pricing_change_history (company_id, field, old_value, new_value, monthly_impact)
3. Verificar permisos de escritura en la tabla
4. Revisar logs del servidor para error específico`
        }
      ],

      requiredRoles: ["admin", "empresa"],
      requiredModules: ["companies", "invoicing", "vendorsCommissions", "notifications"],
      relatedEndpoints: [
        "PUT /api/companies/:id/employees",
        "PUT /api/companies/:id/modules",
        "GET /api/companies/:id/pricing-history",
        "POST /api/companies/:id/recalculate-pricing"
      ],
      codeFiles: [
        "src/routes/companyRoutes.js",
        "src/services/CompanyPricingService.js",
        "migrations/pricing_change_history.sql",
        "public/js/modules/company-settings.js"
      ]
    }
  }
};
