const fs = require('fs');
const path = require('path');

console.log('\n📝 COMPLETANDO WORKFLOWS CON METADATA COMPLETA\n');

const metaPath = path.join(__dirname, '../engineering-metadata.js');
let content = fs.readFileSync(metaPath, 'utf8');

// ============================================================================
// BUSCAR Y COMPLETAR altaEmpresa
// ============================================================================

// Buscar el final de altaEmpresa (antes de designStatus)
const altaEmpresaMatch = content.match(/(    "altaEmpresa": \{[\s\S]*?"designStatus": "COMPLETE")/);

if (!altaEmpresaMatch) {
  console.log('❌ No se encontró altaEmpresa con designStatus');
  process.exit(1);
}

const altaEmpresaSection = altaEmpresaMatch[0];
const altaEmpresaEnd = content.indexOf(altaEmpresaSection) + altaEmpresaSection.length;

// Agregar metadata faltante para altaEmpresa
const altaEmpresaAdditions = `,
      "createdDate": "2025-11-27",
      "lastUpdated": "2025-11-27T00:00:00Z",
      "designDoc": "WORKFLOWS-COMPLETOS.json",
      "help": {
        "quickStart": "1. Vendedor hace login en panel-administrativo\\n2. Click 'Nueva Empresa' → Modal con tabs\\n3. Completa Datos Filiatorios + Módulos + Sucursales\\n4. Sistema genera presupuesto automático con trace_id ONBOARDING-{UUID}\\n5. Cliente recibe email con presupuesto (30 días para responder)\\n6. Si acepta → Genera contrato digital EULA\\n7. Cliente firma contrato (7 días)\\n8. Sistema genera factura inicial\\n9. Si requiere_supervision_factura=TRUE → Admin aprueba\\n10. Cliente recibe factura y sube comprobante de pago\\n11. Cobranzas confirma pago → Alta definitiva\\n12. Sistema crea usuario CORE 'administrador' (password: admin123)\\n13. Liquidación INMEDIATA de comisiones (vendedor + cadena piramidal)\\n14. Cliente recibe email de bienvenida con credenciales",
        "commonIssues": [
          {
            "problem": "Presupuesto no se genera automáticamente",
            "cause": "Módulos o empleados no seleccionados",
            "solution": "1. Verificar que se hayan seleccionado al menos 1 módulo CORE\\n2. Verificar que contractedEmployees > 0\\n3. Revisar logs: SELECT * FROM audit_logs WHERE trace_id LIKE 'ONBOARDING-%'\\n4. Si falla: ejecutar manualmente POST /api/budgets/create con payload completo"
          },
          {
            "problem": "Cliente no recibe email de presupuesto",
            "cause": "Email incorrecto o servicio de notificaciones caído",
            "solution": "1. Verificar email: SELECT contact_email FROM companies WHERE id = X\\n2. Verificar notificaciones: SELECT * FROM aponnt_external_notifications WHERE type = 'PRESUPUESTO_RECIBIDO'\\n3. Reenviar: POST /api/budgets/:id/resend\\n4. Revisar logs del NotificationService"
          },
          {
            "problem": "Factura queda bloqueada en supervisión administrativa",
            "cause": "Admin no aprobó la factura",
            "solution": "1. Verificar tarea: SELECT * FROM administrative_tasks WHERE invoice_id = X\\n2. Admin debe aprobar en panel-administrativo → Tareas Administrativas\\n3. Si tarea no existe: INSERT INTO administrative_tasks manualmente\\n4. Si admin aprobó pero no avanzó: verificar logs de workflow"
          },
          {
            "problem": "Usuario CORE 'administrador' no se crea",
            "cause": "Alta definitiva no completó",
            "solution": "1. Verificar status: SELECT status, onboarding_status FROM companies WHERE id = X\\n2. Si status != 'ACTIVE': revisar paso anterior (pago confirmado?)\\n3. Crear manualmente: POST /api/users/create-admin con is_core_user=true\\n4. Verificar: SELECT * FROM users WHERE company_id = X AND is_core_user = true"
          },
          {
            "problem": "Comisiones no se liquidan automáticamente",
            "cause": "Función get_vendor_hierarchy() falló o cadena jerárquica rota",
            "solution": "1. Verificar jerarquía: SELECT * FROM get_vendor_hierarchy(vendor_id)\\n2. Si retorna vacío: verificar reports_to_staff_id en aponnt_staff\\n3. Ejecutar liquidación manual: POST /api/commissions/liquidate con invoice_id\\n4. Verificar: SELECT * FROM commission_liquidations WHERE trace_id LIKE 'COMMISSION-%'"
          }
        ],
        "requiredRoles": ["admin", "vendor"],
        "requiredModules": [
          "companies",
          "budgets",
          "contracts",
          "invoicing",
          "vendorsCommissions",
          "notifications",
          "administrative-tasks"
        ],
        "relatedEndpoints": [
          "POST /api/auth/login",
          "GET /api/companies",
          "POST /api/budgets/create",
          "PUT /api/budgets/:id/accept",
          "POST /api/contracts/generate",
          "POST /api/contracts/:id/sign",
          "POST /api/invoices/generate",
          "POST /api/administrative-tasks",
          "PUT /api/invoices/:id/confirm-payment",
          "POST /api/users/create-admin",
          "POST /api/commissions/liquidate"
        ]
      }`;

// Insertar después de designStatus
const beforeAltaEnd = content.substring(0, altaEmpresaEnd);
const afterAltaEnd = content.substring(altaEmpresaEnd);
content = beforeAltaEnd + altaEmpresaAdditions + afterAltaEnd;

console.log('✅ altaEmpresa completado con help, createdDate, lastUpdated, designDoc');

// ============================================================================
// BUSCAR Y COMPLETAR modulosPrueba
// ============================================================================

const modulosPruebaMatch = content.match(/(    "modulosPrueba": \{[\s\S]*?"designStatus": "COMPLETE")/);

if (!modulosPruebaMatch) {
  console.log('❌ No se encontró modulosPrueba con designStatus');
  process.exit(1);
}

const modulosPruebaSection = modulosPruebaMatch[0];
const modulosPruebaEnd = content.indexOf(modulosPruebaSection) + modulosPruebaSection.length;

// Agregar metadata faltante para modulosPrueba
const modulosPruebaAdditions = `,
      "createdDate": "2025-11-27",
      "lastUpdated": "2025-11-27T00:00:00Z",
      "designDoc": "WORKFLOWS-COMPLETOS.json",
      "help": {
        "quickStart": "1. Cliente hace login en panel-empresa\\n2. Ve módulos disponibles (no contratados)\\n3. Click 'Probar Gratis 30 días' en módulo deseado\\n4. Sistema activa módulo temporalmente (funcionalidad completa)\\n5. Agrega a modules_trial JSONB con trial_start, trial_end, status=ACTIVE\\n6. Notificaciones INMEDIATAS: Aponnt admin + Vendedor (oportunidad venta) + Cliente (confirmación)\\n7. Countdown visible en panel-empresa y panel-administrativo\\n8. 3 días antes de expirar: notificación recordatorio\\n9. Día de expiración: Cliente decide SI_LO_QUIERO o NO_LO_QUIERO\\n10. Si SÍ: → contractModification workflow (presupuesto, contrato, pago)\\n11. Si NO: modal de feedback (rating 1-5 estrellas + categorías + comentario)\\n12. Sistema guarda en trial_analytics para métricas de conversión",
        "commonIssues": [
          {
            "problem": "Cliente no puede activar prueba de módulo",
            "cause": "Módulo ya está contratado o en prueba activa",
            "solution": "1. Verificar activeModules: SELECT active_modules FROM companies WHERE id = X\\n2. Verificar modules_trial: SELECT modules_trial FROM companies WHERE id = X\\n3. Si ya está: mostrar mensaje 'Ya tienes este módulo contratado/en prueba'\\n4. Si no está pero falla: revisar validaciones en POST /api/companies/:id/modules/start-trial"
          },
          {
            "problem": "Vendedor no recibe notificación de prueba activada",
            "cause": "NotificationService no envió WhatsApp o email falló",
            "solution": "1. Verificar notificación: SELECT * FROM aponnt_external_notifications WHERE type = 'OPORTUNIDAD_VENTA'\\n2. Si no existe: reenviar POST /api/companies/:id/modules/:moduleKey/notify-vendor\\n3. Verificar WhatsApp habilitado para vendedor\\n4. Revisar logs del NotificationService"
          },
          {
            "problem": "Módulo en prueba no se desactiva al expirar",
            "cause": "Cron job no ejecutó o no marcó como EXPIRED",
            "solution": "1. Ejecutar manualmente: node scripts/cron/check-trial-expirations.js\\n2. Verificar cron: */5 * * * * (cada 5 min) o diario a 00:00\\n3. Marcar manualmente: UPDATE companies SET modules_trial = jsonb_set(..., 'status', 'EXPIRED')\\n4. Desactivar funcionalidad del módulo"
          },
          {
            "problem": "Cliente convierte a pago pero módulo sigue en trial",
            "cause": "contractModification workflow no actualizó modules_trial",
            "solution": "1. Verificar status: SELECT modules_trial->'{module_key}'->>'status' FROM companies WHERE id = X\\n2. Debería ser 'CONVERTED', no 'ACTIVE'\\n3. Actualizar: UPDATE companies SET modules_trial = jsonb_set(..., 'status', 'CONVERTED')\\n4. Mover a activeModules: UPDATE companies SET active_modules = array_append(active_modules, '{module_key}')"
          },
          {
            "problem": "Feedback de trial cancelado no se guarda",
            "cause": "Tabla trial_analytics no existe o INSERT falló",
            "solution": "1. Crear tabla: CREATE TABLE trial_analytics (trial_id UUID, company_id UUID, module_key VARCHAR, rating INTEGER, feedback JSONB, created_at TIMESTAMP)\\n2. Verificar INSERT: POST /api/companies/:id/modules/trial-feedback\\n3. Revisar logs de error\\n4. Guardar manualmente si es crítico para métricas"
          }
        ],
        "requiredRoles": ["admin"],
        "requiredModules": [
          "companies",
          "modules",
          "notifications",
          "contracts"
        ],
        "relatedEndpoints": [
          "POST /api/companies/:id/modules/start-trial",
          "POST /api/companies/:id/modules/convert-trial",
          "POST /api/companies/:id/modules/cancel-trial",
          "POST /api/companies/:id/modules/trial-feedback",
          "GET /api/companies/:id/modules/available",
          "GET /api/trial-analytics"
        ]
      }`;

// Insertar después de designStatus de modulosPrueba
const beforeModulosEnd = content.substring(0, modulosPruebaEnd);
const afterModulosEnd = content.substring(modulosPruebaEnd);
content = beforeModulosEnd + modulosPruebaAdditions + afterModulosEnd;

console.log('✅ modulosPrueba completado con help, createdDate, lastUpdated, designDoc');

// ============================================================================
// GUARDAR
// ============================================================================
fs.writeFileSync(metaPath, content, 'utf8');

console.log('\n✅ WORKFLOWS COMPLETADOS EXITOSAMENTE');
console.log('   - altaEmpresa: help con 5 commonIssues + quickStart + endpoints');
console.log('   - modulosPrueba: help con 5 commonIssues + quickStart + endpoints');
console.log('\n📝 Ambos workflows ahora siguen el MISMO patrón que los demás\n');
