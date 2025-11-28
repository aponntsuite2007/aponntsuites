const fs = require('fs');
const path = require('path');

console.log('\n🔄 CREANDO WORKFLOWS COMPLETOS DEL SISTEMA COMERCIAL\n');

// Leer engineering-metadata actual
const metaPath = path.join(__dirname, '../engineering-metadata.js');
let metaContent = fs.readFileSync(metaPath, 'utf8');

// ============================================================================
// WORKFLOW 1: ALTA DE EMPRESA (NUEVO - COMPLETO)
// ============================================================================
const altaEmpresaWorkflow = {
  name: "Alta de Empresa (Onboarding Completo)",
  status: "DESIGNED",
  implemented: false,
  trigger: "Vendedor crea nueva empresa desde panel-administrativo",
  trace_id_prefix: "ONBOARDING",
  phases: {
    phase1: {
      name: "FASE 1: ALTA CONDICIONAL - PRESUPUESTO",
      steps: [
        {
          step: 1,
          name: "Vendedor login en index.html",
          action: "POST /api/auth/login (role: vendor)",
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 2,
          name: "Panel-administrativo carga (multi-tenant)",
          action: "GET /api/companies?vendor_id={logged_vendor_id}",
          note: "Vendedor ve SOLO sus empresas",
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 3,
          name: "Click 'Nueva Empresa' → Modal de alta",
          action: "Modal con tabs: [Datos Filiatorios] [Módulos] [Sucursales] [Resumen]",
          fields: {
            datosFiliatorios: [
              "name", "legal_name", "tax_id", "email", "phone", "address",
              "city", "state", "country", "industry", "contact_person"
            ],
            modulos: "Selector visual (cards/checkboxes) con precio en tiempo real",
            sucursales: "Lista de sucursales (IMPORTANTE: precio NO por sucursal, por empleados)",
            resumen: "Calculadora de precio: Total = SUM(módulos) × empleados"
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 4,
          name: "Confirma → Genera PRESUPUESTO automático",
          action: "POST /api/budgets/create",
          generates: {
            trace_id: "ONBOARDING-{UUID}",
            budget: {
              company_id: "UUID (provisional)",
              vendor_id: "logged_vendor_id",
              modules: "JSONB array",
              total_usd: "DECIMAL(12,2)",
              status: "ENVIADO",
              expires_at: "NOW() + 30 days"
            }
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 5,
          name: "Sistema de notificaciones proactivas",
          action: "Notificationservice.sendMultiple()",
          notifications: [
            {
              to: "company.contact_email",
              type: "PRESUPUESTO_RECIBIDO",
              title: "📊 Presupuesto Aponnt - {company_name}",
              body: "Hemos recibido tu solicitud. Total: USD {total}",
              actions: ["ACEPTA", "NO_ACEPTA"],
              channels: ["email", "app"]
            },
            {
              to: "vendor.email",
              type: "PRESUPUESTO_ENVIADO",
              title: "✅ Presupuesto enviado a {company_name}",
              body: "Esperando respuesta del cliente",
              channels: ["email", "app"]
            },
            {
              to: "admin_team",
              type: "NUEVO_PRESUPUESTO",
              title: "📋 Nuevo presupuesto generado",
              body: "Vendedor: {vendor_name}, Cliente: {company_name}",
              channels: ["app"]
            }
          ],
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 6,
          name: "Registrar en repositorio de presupuestos",
          action: "INSERT INTO budgets",
          table: "budgets",
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 7,
          name: "Cliente responde",
          timeout: "30 días",
          actions: {
            acepta: {
              action: "PUT /api/budgets/{id}/accept",
              updates: "status = ACEPTADO",
              notifies: ["vendor", "admin"],
              next: "→ FASE 2"
            },
            rechaza: {
              action: "PUT /api/budgets/{id}/reject",
              updates: "status = RECHAZADO",
              notifies: ["vendor", "admin"],
              next: "→ END (guarda en repositorio)"
            },
            timeout: {
              action: "Cron job marca como OBSOLETO",
              updates: "status = OBSOLETO",
              notifies: ["vendor"],
              next: "→ END"
            }
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 8,
          name: "Actualizar estado empresa",
          action: "UPDATE companies SET onboarding_status = 'PRESUPUESTO_APROBADO'",
          status: "NOT_IMPLEMENTED"
        }
      ]
    },
    phase2: {
      name: "FASE 2: CONTRATO DIGITAL (EULA)",
      steps: [
        {
          step: 9,
          name: "Generar contrato automático",
          action: "POST /api/contracts/generate",
          logic: {
            template: "SELECT contract_template FROM contract_templates WHERE country_code = {company.country}",
            variables: {
              company_data: "name, legal_name, tax_id, address, etc.",
              modules: "Lista de módulos contratados con precios",
              payment_terms: "Condiciones de pago",
              total: "Total mensual USD"
            },
            multiCountry: {
              note: "[EN ESTUDIO] Si sucursales en varios países → Contrato individual por país",
              status: "PENDING_ANALYSIS"
            }
          },
          generates: {
            contract_id: "UUID",
            contract_text: "HTML renderizado con datos",
            status: "PENDING_SIGNATURE"
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 10,
          name: "Enviar contrato para firma (EULA)",
          action: "Notificationservice.send()",
          notification: {
            to: "company.contact_email",
            type: "CONTRATO_FIRMA",
            title: "📄 Contrato Aponnt - Firma Digital",
            body: "Por favor revisa y firma el contrato",
            actions: ["ACEPTA", "NO_ACEPTA"],
            attachment: "contract_pdf",
            channels: ["email", "app"]
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 11,
          name: "Cliente firma/rechaza",
          timeout: "7 días",
          actions: {
            acepta: {
              action: "POST /api/contracts/{id}/sign",
              captures: {
                signed_at: "NOW()",
                signed_ip: "req.ip",
                signed_user_agent: "req.headers['user-agent']",
                acceptance_checkbox: true
              },
              updates: "status = SIGNED",
              next: "→ FASE 3"
            },
            rechaza: {
              action: "POST /api/contracts/{id}/reject",
              updates: "status = REJECTED",
              companyStatus: "ALTA_RECHAZADA, CONTRATO_RECHAZADO",
              notifies: ["vendor", "admin"],
              next: "→ END (cancelación definitiva)"
            },
            timeout: {
              action: "Escalar a vendedor",
              notification: {
                to: "vendor.email",
                type: "FIRMA_PENDIENTE",
                priority: "HIGH"
              },
              next: "Extender plazo 7 días más"
            }
          },
          status: "NOT_IMPLEMENTED"
        }
      ]
    },
    phase3: {
      name: "FASE 3: FACTURACIÓN Y PAGO",
      steps: [
        {
          step: 12,
          name: "Generar factura inicial automática",
          action: "POST /api/invoices/generate",
          uses: "Plantilla fiscal según company.country (módulo ya existe)",
          generates: {
            invoice_id: "UUID",
            invoice_number: "AUTO_INCREMENT por país",
            period: "MES_ACTUAL",
            amount_usd: "contract.total",
            status: "DRAFT"
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 13,
          name: "¿Requiere supervisión administrativa?",
          condition: "company.requiere_supervision_factura == TRUE",
          ifTrue: {
            action: "INSERT INTO administrative_tasks",
            task: {
              task_type: "FACTURA_APROBACION",
              company_id: "UUID",
              vendor_id: "UUID",
              invoice_id: "UUID",
              status: "PENDING",
              priority: "HIGH"
            },
            invoiceStatus: "AWAITING_ADMIN_APPROVAL",
            notification: {
              to: "admin_team",
              type: "FACTURA_PENDIENTE_APROBACION",
              badge: "tareas_administrativas_count++"
            },
            next: "→ Espera aprobación admin"
          },
          ifFalse: {
            invoiceStatus: "PENDING",
            next: "→ Step 14"
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: "13a",
          name: "Administración revisa factura",
          condition: "Solo si requiere_supervision_factura == TRUE",
          actions: {
            aprueba: {
              action: "PUT /api/administrative-tasks/{id}/approve",
              updates: {
                task: "status = APPROVED",
                invoice: "status = PENDING"
              },
              next: "→ Step 14"
            },
            aprueba_con_cambios: {
              action: "PUT /api/administrative-tasks/{id}/approve-with-changes",
              changes: "Administración edita empresa/factura",
              notifications: [
                { to: "company", type: "DATOS_MODIFICADOS" },
                { to: "vendor", type: "FACTURA_MODIFICADA" }
              ],
              updates: "Regenera factura con cambios",
              next: "→ Step 14"
            },
            rechaza: {
              action: "PUT /api/administrative-tasks/{id}/reject",
              requires: "rejection_reason",
              notifications: [
                { to: "vendor", type: "FACTURA_RECHAZADA", reason: "..." }
              ],
              next: "→ Vendedor corrige → Step 12 de nuevo"
            }
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 14,
          name: "Enviar factura al cliente",
          action: "Notificationservice.send()",
          notification: {
            to: "company.contact_email",
            type: "FACTURA_RECIBIDA",
            title: "💰 Factura Aponnt - {company_name}",
            body: "Monto: USD {total} - Vence: {due_date}",
            attachment: "invoice_pdf",
            payment_link: "URL para subir comprobante",
            channels: ["email", "app"]
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 15,
          name: "Esperar pago (SOLO transferencia)",
          timeout: "15 días",
          action: "Cliente sube comprobante de transferencia",
          endpoint: "POST /api/invoices/{id}/upload-payment",
          notifies: "admin_team (área cobranzas)",
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 16,
          name: "Cobranzas confirma pago",
          action: "PUT /api/invoices/{id}/confirm-payment",
          updates: {
            invoice: "status = PAID, paid_at = NOW()",
            task: "INSERT INTO administrative_tasks (PAGO_CONFIRMADO)"
          },
          notifies: ["company", "vendor"],
          next: "→ FASE 4",
          status: "NOT_IMPLEMENTED"
        }
      ]
    },
    phase4: {
      name: "FASE 4: ALTA DEFINITIVA",
      steps: [
        {
          step: 17,
          name: "Alta definitiva empresa",
          action: "UPDATE companies SET status = 'ACTIVE', onboarding_status = 'ALTA_DEFINITIVA'",
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 18,
          name: "Creación entorno BD multi-tenant",
          action: "Verificar schema/tenant ya creado (PostgreSQL multi-tenant)",
          note: "En PostgreSQL se usa company_id como tenant_id, no schemas separados",
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 19,
          name: "Creación usuario CORE (INMUTABLE)",
          action: "POST /api/users/create-admin",
          user: {
            username: "administrador",
            password: "admin123",
            first_name: "Administrador",
            last_name: "{company.name}",
            email: "{company.contact_email}",
            role: "admin",
            company_id: "{company.company_id}",
            is_core_user: true, // NO SE PUEDE ELIMINAR
            force_password_change: true // Obligatorio en 1er login
          },
          validations: {
            username_immutable: "username NO se puede cambiar nunca",
            user_undeletable: "Usuario NO se puede eliminar",
            core_flag: "is_core_user = true (permanente)"
          },
          status: "NOT_IMPLEMENTED"
        }
      ]
    },
    phase5: {
      name: "FASE 5: LIQUIDACIÓN INMEDIATA DE COMISIONES",
      note: "NO espera facturación mensual - Es INMEDIATA al alta",
      steps: [
        {
          step: 20,
          name: "Obtener cadena jerárquica del vendedor",
          action: "SELECT * FROM get_vendor_hierarchy(vendor_id)",
          returns: "Array: [CEO, Regional, Supervisor, Leader, Rep]",
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 21,
          name: "Calcular comisión directa vendedor",
          action: "vendor_commission = invoice.amount * vendor.sales_commission_percentage / 100",
          stores: "commission_amount_usd",
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 22,
          name: "Calcular comisiones piramidales",
          action: "FOR EACH level IN hierarchy: commission = invoice.amount * level.pyramid_percentage / 100",
          stores: "Array de comisiones por nivel",
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 23,
          name: "Generar digest de liquidación",
          action: "INSERT INTO commission_liquidations",
          generates: {
            liquidation_id: "UUID",
            trace_id: "COMMISSION-{trace_id_from_onboarding}",
            invoice_id: "UUID",
            total_commissions: "SUM(all_commissions)",
            deadline: "NOW() + 7 days",
            status: "PENDING"
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 24,
          name: "Crear pagos individuales",
          action: "INSERT INTO commission_payments (multiple rows)",
          payment_types: ["SALES_DIRECT", "PYRAMID_LEVEL_1", "PYRAMID_LEVEL_2", "SUPPORT"],
          forEachVendor: {
            staff_id: "UUID",
            amount_usd: "DECIMAL",
            type: "ENUM",
            status: "PENDING_TRANSFER"
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 25,
          name: "¿Vendedor acepta dar soporte?",
          condition: "vendor.accepts_support_packages == TRUE",
          ifTrue: {
            action: "Calcular comisión de soporte",
            amount: "invoice.amount * vendor.support_commission_percentage / 100",
            assigns: "UPDATE companies SET support_vendor_id = vendor_id",
            payment: "INSERT INTO commission_payments (type = SUPPORT)"
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 26,
          name: "Notificar cobranzas con digest",
          action: "Notificationservice.send()",
          notification: {
            to: "cobranzas_team",
            type: "LIQUIDACION_COMISIONES",
            title: "💰 Liquidación comisiones - {company_name}",
            body: "Total: USD {total} - Deadline: {deadline}",
            actions: ["VER_DIGEST", "EJECUTAR_TRANSFERENCIAS"],
            channels: ["app", "email"]
          },
          status: "NOT_IMPLEMENTED"
        }
      ]
    },
    phase6: {
      name: "FASE 6: BIENVENIDA AL CLIENTE",
      steps: [
        {
          step: 27,
          name: "Mensaje automático de bienvenida",
          action: "Notificationservice.send()",
          notification: {
            to: "company.contact_email",
            type: "BIENVENIDA",
            title: "🎉 ¡Bienvenido a Aponnt!",
            body_includes: [
              "URL de acceso: {company_subdomain}.aponnt.com",
              "Usuario: administrador",
              "Password temporal: admin123 (DEBES cambiarla)",
              "Módulos activos: {modules_list}",
              "Link a tutoriales",
              "Contacto soporte"
            ],
            attachment: "guia_inicio.pdf",
            channels: ["email"]
          },
          status: "NOT_IMPLEMENTED"
        },
        {
          step: 28,
          name: "Introducción al sistema (PENDIENTE)",
          note: "Video tutorial, guía paso a paso, tour interactivo",
          status: "PENDING_CREATION",
          task: "Crear contenido onboarding para clientes"
        },
        {
          step: 29,
          name: "Finalizar trace completo",
          action: "UPDATE onboarding_traces SET status = 'COMPLETED', completed_at = NOW()",
          logs: "Registrar en audit_logs todo el proceso",
          status: "NOT_IMPLEMENTED"
        }
      ]
    }
  },
  trazabilidad: {
    trace_id_format: "ONBOARDING-{UUID}",
    connects: [
      "company (provisional → definitiva)",
      "budget",
      "contract",
      "invoice (primera factura)",
      "commission_liquidation",
      "commission_payments (n payments)",
      "administrative_tasks (múltiples)"
    ],
    metadata: {
      vendor_id: "UUID",
      budget_id: "UUID",
      contract_id: "UUID",
      invoice_id: "UUID",
      liquidation_id: "UUID",
      company_created_at: "TIMESTAMP",
      company_activated_at: "TIMESTAMP",
      total_duration: "activated_at - created_at"
    }
  },
  affectedModules: [
    "companies",
    "budgets",
    "contracts",
    "invoicing",
    "vendorsCommissions",
    "notifications",
    "administrative_tasks"
  ],
  estimatedEffort: "120-180 horas",
  priority: "CRITICAL",
  designStatus: "COMPLETE",
  implementationStatus: "NOT_STARTED"
};

console.log('✅ Workflow de Alta de Empresa creado\n');

// ============================================================================
// WORKFLOW 2: MÓDULOS EN PERÍODO DE PRUEBA (NUEVO)
// ============================================================================
const modulosPruebaWorkflow = {
  name: "Módulos en Período de Prueba (Trial 30 días)",
  status: "DESIGNED",
  implemented: false,
  trigger: "Cliente activa módulo en prueba desde panel-empresa",
  duration: "30 días",
  steps: [
    {
      step: 1,
      name: "Cliente activa módulo en prueba",
      action: "POST /api/companies/{id}/modules/start-trial",
      payload: {
        module_key: "medical | legal | vacation | etc.",
        activated_by: "user_id"
      },
      validations: {
        not_already_contracted: "Módulo NO debe estar ya contratado",
        not_in_trial: "Módulo NO debe estar ya en prueba",
        eligible: "Empresa debe estar activa"
      },
      status: "NOT_IMPLEMENTED"
    },
    {
      step: 2,
      name: "Actualizar empresa con módulo trial",
      action: "UPDATE companies SET modules_trial = JSONB_SET(...)",
      data: {
        module_key: {
          trial_start: "NOW()",
          trial_end: "NOW() + INTERVAL '30 days'",
          status: "ACTIVE",
          activated_by: "user_id",
          rating: null
        }
      },
      also: "Activar módulo temporalmente (funcionalidad completa)",
      status: "NOT_IMPLEMENTED"
    },
    {
      step: 3,
      name: "Notificaciones INMEDIATAS",
      action: "Notificationservice.sendMultiple()",
      notifications: [
        {
          to: "aponnt_admin",
          type: "MODULO_TRIAL_ACTIVADO",
          title: "🔔 Cliente activó prueba",
          body: "Empresa: {company_name}, Módulo: {module_name}",
          channels: ["app"]
        },
        {
          to: "vendor.email",
          type: "OPORTUNIDAD_VENTA",
          title: "💡 Tu cliente está probando {module_name}",
          body: "Contacta al cliente para reforzar la venta",
          priority: "HIGH",
          actions: ["VER_EMPRESA", "CONTACTAR_CLIENTE"],
          channels: ["email", "app", "whatsapp"]
        },
        {
          to: "company.contact_email",
          type: "TRIAL_CONFIRMACION",
          title: "✅ Módulo {module_name} activado en prueba",
          body: "Tienes 30 días para probarlo gratis",
          channels: ["email", "app"]
        }
      ],
      status: "NOT_IMPLEMENTED"
    },
    {
      step: 4,
      name: "Mostrar en ficha empresa",
      ui: {
        location: "Panel-administrativo → Empresas → Modal → Tab Módulos",
        display: {
          badge: "🧪 EN PRUEBA",
          color: "amarillo/warning",
          info: "Inicio: {trial_start} | Fin: {trial_end}",
          countdown: "Días restantes: {days_left}"
        }
      },
      status: "NOT_IMPLEMENTED"
    },
    {
      step: 5,
      name: "Cron job detecta expiración",
      trigger: "Diario a las 00:00",
      condition: "modules_trial.*.trial_end < NOW() AND status = 'ACTIVE'",
      action: "Marcar como EXPIRED",
      status: "NOT_IMPLEMENTED"
    },
    {
      step: 6,
      name: "Notificar al cliente sobre expiración",
      timing: [
        "3 días antes de expirar (recordatorio)",
        "Día de expiración"
      ],
      notification: {
        to: "company.contact_email",
        type: "TRIAL_EXPIRANDO | TRIAL_EXPIRADO",
        title: "⏰ Tu prueba de {module_name} expira en {days} días",
        body: "¿Deseas contratarlo?",
        actions: ["SI_LO_QUIERO", "NO_LO_QUIERO"],
        channels: ["email", "app"]
      },
      status: "NOT_IMPLEMENTED"
    },
    {
      step: 7,
      name: "Cliente responde",
      actions: {
        si_lo_quiero: {
          action: "POST /api/companies/{id}/modules/convert-trial",
          trigger: "→ contractModification workflow (completo)",
          note: "Presupuesto → Contrato → Factura → Alta definitiva del módulo",
          status: "CONVERTS_TO_PAID"
        },
        no_lo_quiero: {
          action: "POST /api/companies/{id}/modules/cancel-trial",
          next: "→ Step 8 (solicitar valoración)"
        }
      },
      status: "NOT_IMPLEMENTED"
    },
    {
      step: 8,
      name: "Solicitar valoración/opinión",
      modal: {
        title: "¿Por qué no te convenció {module_name}?",
        rating: "⭐⭐⭐⭐⭐ (1-5 estrellas)",
        comment: "textarea (opcional)",
        categories: [
          "Muy caro",
          "Difícil de usar",
          "No cumple expectativas",
          "No lo necesito",
          "Otro"
        ]
      },
      action: "POST /api/companies/{id}/modules/trial-feedback",
      status: "NOT_IMPLEMENTED"
    },
    {
      step: 9,
      name: "Guardar feedback y notificar",
      action: "UPDATE companies SET modules_trial.{module_key}.rating = {...}",
      notifications: [
        {
          to: "aponnt_admin",
          type: "TRIAL_FEEDBACK",
          title: "📊 Feedback de prueba - {module_name}",
          body: "Rating: {stars} - {comment}",
          channels: ["app"]
        },
        {
          to: "vendor.email",
          type: "TRIAL_NO_CONVERTIDO",
          title: "Cliente no contrató {module_name}",
          body: "Razón: {feedback}",
          channels: ["email", "app"]
        }
      ],
      status: "NOT_IMPLEMENTED"
    },
    {
      step: 10,
      name: "Desactivar módulo y limpiar ficha",
      action: "Desactivar funcionalidad del módulo",
      updates: "modules_trial.{module_key}.status = 'CANCELLED'",
      note: "Ficha vuelve a estado anterior (NO se elimina historial trial)",
      status: "NOT_IMPLEMENTED"
    }
  ],
  affectedModules: [
    "companies",
    "modules",
    "notifications",
    "contracts"
  ],
  estimatedEffort: "40-60 horas",
  priority: "HIGH",
  designStatus: "COMPLETE"
};

console.log('✅ Workflow de Módulos en Prueba creado\n');

// Guardar workflows en archivo separado para revisión
const workflowsOutput = {
  altaEmpresa: altaEmpresaWorkflow,
  modulosPrueba: modulosPruebaWorkflow,
  date: new Date().toISOString()
};

const outputPath = path.join(__dirname, '../WORKFLOWS-COMPLETOS.json');
fs.writeFileSync(outputPath, JSON.stringify(workflowsOutput, null, 2));

console.log(`\n✅ Workflows guardados en: ${outputPath}\n`);
console.log('📋 Resumen:');
console.log(`   - Alta de Empresa: ${altaEmpresaWorkflow.phases.phase1.steps.length + altaEmpresaWorkflow.phases.phase2.steps.length + altaEmpresaWorkflow.phases.phase3.steps.length + altaEmpresaWorkflow.phases.phase4.steps.length + altaEmpresaWorkflow.phases.phase5.steps.length + altaEmpresaWorkflow.phases.phase6.steps.length} pasos totales`);
console.log(`   - Módulos en Prueba: ${modulosPruebaWorkflow.steps.length} pasos`);
console.log('\n');
