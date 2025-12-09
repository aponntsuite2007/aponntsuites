/**
 * Script para agregar la fase de Partner Commissions al roadmap
 * Actualiza engineering-metadata.js con la nueva fase
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '..', 'engineering-metadata.js');

// Cargar metadata actual
delete require.cache[require.resolve(metadataPath)];
const metadata = require(metadataPath);

// Nueva fase de Partner Associate Portal
const newPhase = {
  name: "Portal de Asociados y Sistema de Comisiones Aponnt",
  status: "COMPLETE",
  startDate: "2025-12-08",
  completionDate: "2025-12-08",
  progress: 100,
  priority: "HIGH",
  lastUpdated: new Date().toISOString(),
  description: "Portal completo para asociados externos (medicos, profesionales) con sistema de comisiones Aponnt-Asociado. Incluye workflow view para Aponnt sin acceso a info confidencial.",
  tasks: [
    { id: "PA-1", name: "Migracion BD: partner_commissions, partner_commission_transactions, partner_commission_summaries", done: true, completedDate: "2025-12-08" },
    { id: "PA-2", name: "Funciones SQL: calculate_partner_commission(), update_partner_commission_summary()", done: true, completedDate: "2025-12-08" },
    { id: "PA-3", name: "Trigger automatico para actualizar resumen mensual", done: true, completedDate: "2025-12-08" },
    { id: "PA-4", name: "Vista v_partner_commission_dashboard para Aponnt Admin", done: true, completedDate: "2025-12-08" },
    { id: "PA-5", name: "API REST partnerCommissionRoutes.js - 8 endpoints", done: true, completedDate: "2025-12-08" },
    { id: "PA-6", name: "API REST associateWorkflowRoutes.js - Vista workflow sin info confidencial", done: true, completedDate: "2025-12-08" },
    { id: "PA-7", name: "Frontend associate-workflow-panel.js - Dashboard asociados", done: true, completedDate: "2025-12-08" },
    { id: "PA-8", name: "Registro en server.js de rutas de comisiones", done: true, completedDate: "2025-12-08" }
  ],
  dependencies: ["partners", "absence_cases", "companies"],
  features: {
    commissionTypes: ["percentage (15% default)", "fixed_per_case", "monthly_fee", "tiered"],
    transactionStates: ["pending", "invoiced", "paid", "cancelled"],
    summaryStates: ["open", "closed", "settled"]
  },
  files: {
    migration: "migrations/20251208_create_partner_commissions.sql",
    routes: ["src/routes/partnerCommissionRoutes.js", "src/routes/associateWorkflowRoutes.js"],
    frontend: "public/js/modules/associate-workflow-panel.js"
  },
  notes: "Asociados son profesionales externos (NO empleados de empresas). Aponnt ve workflow/facturacion pero NO info confidencial entre asociado-empresa."
};

// Agregar al roadmap
metadata.roadmap.partnerAssociatePortal = newPhase;

// Actualizar lastUpdated del proyecto
metadata.project.lastUpdated = new Date().toISOString();

// Agregar tablas a database.tables si existe
if (metadata.database && metadata.database.tables) {
  // Agregar las nuevas tablas de comisiones
  metadata.database.tables.partner_commissions = {
    description: "Configuracion de comisiones por asociado",
    columns: ["id", "partner_id", "commission_type", "percentage", "fixed_amount", "tiered_config", "is_active", "effective_from", "effective_until", "notes", "created_by", "created_at", "updated_at"],
    foreignKeys: ["partner_id -> partners.id"],
    indexes: ["idx_partner_commissions_partner_id", "idx_partner_commissions_active"],
    createdDate: "2025-12-08"
  };

  metadata.database.tables.partner_commission_transactions = {
    description: "Transacciones de comision por trabajo realizado",
    columns: ["id", "partner_id", "partner_commission_id", "reference_type", "reference_id", "company_id", "billable_amount", "commission_percentage", "commission_amount", "net_amount", "status", "transaction_date", "invoiced_at", "paid_at", "invoice_number", "payment_reference", "payment_method", "description", "notes", "created_at", "updated_at"],
    foreignKeys: ["partner_id -> partners.id", "partner_commission_id -> partner_commissions.id", "company_id -> companies.company_id"],
    indexes: ["idx_pct_partner_id", "idx_pct_status", "idx_pct_date", "idx_pct_reference", "idx_pct_company"],
    createdDate: "2025-12-08"
  };

  metadata.database.tables.partner_commission_summaries = {
    description: "Resumen mensual de comisiones por asociado",
    columns: ["id", "partner_id", "year", "month", "total_cases", "total_billable", "total_commission", "total_net", "pending_amount", "invoiced_amount", "paid_amount", "status", "closed_at", "settled_at", "created_at", "updated_at"],
    foreignKeys: ["partner_id -> partners.id"],
    indexes: ["idx_pcs_partner_period", "idx_pcs_status"],
    constraints: ["UNIQUE (partner_id, year, month)"],
    createdDate: "2025-12-08"
  };
}

// Escribir el archivo actualizado
const output = `module.exports = ${JSON.stringify(metadata, null, 2)};\n`;
fs.writeFileSync(metadataPath, output, 'utf8');

console.log('✅ engineering-metadata.js actualizado correctamente');
console.log('   - Fase partnerAssociatePortal agregada al roadmap');
console.log('   - 3 tablas agregadas a database.tables');
console.log('   - lastUpdated actualizado');

// Verificar
delete require.cache[require.resolve(metadataPath)];
const updated = require(metadataPath);
console.log('\n📋 Verificacion:');
console.log('   - Roadmap phases:', Object.keys(updated.roadmap).length);
console.log('   - partnerAssociatePortal existe:', !!updated.roadmap.partnerAssociatePortal);
if (updated.roadmap.partnerAssociatePortal) {
  console.log('   - Nombre:', updated.roadmap.partnerAssociatePortal.name);
  console.log('   - Status:', updated.roadmap.partnerAssociatePortal.status);
  console.log('   - Tasks:', updated.roadmap.partnerAssociatePortal.tasks.length);
}
