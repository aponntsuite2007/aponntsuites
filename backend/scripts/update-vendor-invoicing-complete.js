/**
 * Script para actualizar el Sistema de Facturación de Vendedores a 100%
 * Actualiza las fases: presupuestos, contratos, facturacion a COMPLETE
 *
 * Ejecutado: 2025-12-08
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '..', 'engineering-metadata.js');

// Cargar metadata actual
delete require.cache[require.resolve(metadataPath)];
const metadata = require(metadataPath);

const today = new Date().toISOString().split('T')[0];
const now = new Date().toISOString();

// ============================================
// ACTUALIZAR FASES DE CIRCUITO COMERCIAL
// ============================================

// Buscar y actualizar las fases de presupuestos, contratos, facturacion
if (metadata.roadmap) {
  // Actualizar presupuestos
  if (metadata.roadmap.presupuestos) {
    metadata.roadmap.presupuestos.status = "COMPLETE";
    metadata.roadmap.presupuestos.progress = 100;
    metadata.roadmap.presupuestos.completionDate = today;
    metadata.roadmap.presupuestos.lastUpdated = now;
    console.log('✅ Fase presupuestos actualizada a COMPLETE');
  }

  // Actualizar contratos
  if (metadata.roadmap.contratos) {
    metadata.roadmap.contratos.status = "COMPLETE";
    metadata.roadmap.contratos.progress = 100;
    metadata.roadmap.contratos.completionDate = today;
    metadata.roadmap.contratos.lastUpdated = now;
    console.log('✅ Fase contratos actualizada a COMPLETE');
  }

  // Actualizar facturacion
  if (metadata.roadmap.facturacion) {
    metadata.roadmap.facturacion.status = "COMPLETE";
    metadata.roadmap.facturacion.progress = 100;
    metadata.roadmap.facturacion.completionDate = today;
    metadata.roadmap.facturacion.lastUpdated = now;
    console.log('✅ Fase facturacion actualizada a COMPLETE');
  }

  // Agregar nueva fase vendorInvoicingSystem si no existe
  if (!metadata.roadmap.vendorInvoicingSystem) {
    metadata.roadmap.vendorInvoicingSystem = {
      name: "Sistema de Facturación de Vendedores (Circuito Comercial Completo)",
      status: "COMPLETE",
      startDate: "2025-12-08",
      completionDate: today,
      progress: 100,
      priority: "HIGH",
      lastUpdated: now,
      description: "Circuito completo: Presupuesto → Contrato → Factura → Comisiones de Vendedores. Frontend en vendor-invoicing-system.js conectado a backend vendorCommissionsRoutes.js",
      tasks: [
        { id: "VIS-1", name: "Frontend vendor-invoicing-system.js con 5 tabs (Inicio, Presupuestos, Contratos, Facturas, Comisiones)", done: true, completedDate: today },
        { id: "VIS-2", name: "Backend vendorCommissionsRoutes.js - 12+ endpoints REST", done: true, completedDate: today },
        { id: "VIS-3", name: "GET /api/vendors/stats - Estadísticas globales de vendedores", done: true, completedDate: today },
        { id: "VIS-4", name: "GET /api/vendors/partners - Lista de vendedores/partners (con JOIN aponnt_staff_roles)", done: true, completedDate: today },
        { id: "VIS-5", name: "GET /api/vendors/contracts - Lista de contratos (con JOIN budgets para vendor)", done: true, completedDate: today },
        { id: "VIS-6", name: "GET /api/vendors/invoices - Lista de facturas con filtros", done: true, completedDate: today },
        { id: "VIS-7", name: "GET /api/vendors/payments - Historial de pagos", done: true, completedDate: today },
        { id: "VIS-8", name: "GET /api/vendors/commissions - Comisiones de vendedores", done: true, completedDate: today },
        { id: "VIS-9", name: "GET /api/vendors/quotes - Presupuestos/cotizaciones", done: true, completedDate: today },
        { id: "VIS-10", name: "Corrección schema SQL: aponnt_staff.role_id → JOIN aponnt_staff_roles", done: true, completedDate: today },
        { id: "VIS-11", name: "Corrección schema SQL: contracts.vendor_id → JOIN budgets.vendor_id", done: true, completedDate: today },
        { id: "VIS-12", name: "Corrección schema SQL: invoices.amount_usd → invoices.total_amount", done: true, completedDate: today }
      ],
      dependencies: ["budgets", "contracts", "invoices", "vendor_commissions", "aponnt_staff"],
      features: {
        tabs: ["Inicio (Dashboard)", "Presupuestos", "Contratos", "Facturas", "Comisiones"],
        endpoints: ["/api/vendors/stats", "/api/vendors/partners", "/api/vendors/contracts", "/api/vendors/invoices", "/api/vendors/payments", "/api/vendors/commissions", "/api/vendors/quotes"],
        schemaFixes: ["role_id JOIN", "budget_id JOIN for vendor", "column name corrections"]
      },
      files: {
        frontend: "public/js/modules/vendor-invoicing-system.js",
        routes: "src/routes/vendorCommissionsRoutes.js",
        billing: "src/routes/billingRoutes.js"
      },
      notes: "Circuito comercial 100% operativo. Frontend tabs conectados a backend con schema SQL corregido para multi-tenant Aponnt."
    };
    console.log('✅ Nueva fase vendorInvoicingSystem agregada al roadmap');
  }
}

// Actualizar lastUpdated del proyecto
metadata.project.lastUpdated = now;

// Escribir el archivo actualizado
const output = `module.exports = ${JSON.stringify(metadata, null, 2)};\n`;
fs.writeFileSync(metadataPath, output, 'utf8');

console.log('\n✅ engineering-metadata.js actualizado correctamente');
console.log('   - Fases presupuestos/contratos/facturacion → COMPLETE 100%');
console.log('   - Nueva fase vendorInvoicingSystem agregada');
console.log('   - lastUpdated actualizado');

// Verificar
delete require.cache[require.resolve(metadataPath)];
const updated = require(metadataPath);
console.log('\n📋 Verificacion:');
console.log('   - Roadmap phases:', Object.keys(updated.roadmap).length);
console.log('   - vendorInvoicingSystem existe:', !!updated.roadmap.vendorInvoicingSystem);
if (updated.roadmap.presupuestos) {
  console.log('   - presupuestos status:', updated.roadmap.presupuestos.status);
  console.log('   - presupuestos progress:', updated.roadmap.presupuestos.progress);
}
if (updated.roadmap.contratos) {
  console.log('   - contratos status:', updated.roadmap.contratos.status);
  console.log('   - contratos progress:', updated.roadmap.contratos.progress);
}
if (updated.roadmap.facturacion) {
  console.log('   - facturacion status:', updated.roadmap.facturacion.status);
  console.log('   - facturacion progress:', updated.roadmap.facturacion.progress);
}
if (updated.roadmap.vendorInvoicingSystem) {
  console.log('   - vendorInvoicingSystem status:', updated.roadmap.vendorInvoicingSystem.status);
  console.log('   - vendorInvoicingSystem tasks:', updated.roadmap.vendorInvoicingSystem.tasks.length);
}
