const fs = require('fs');
const path = require('path');

console.log('\n🔄 INTEGRANDO WORKFLOWS EN ENGINEERING-METADATA.JS\n');

// Leer workflows completos
const workflowsPath = path.join(__dirname, '../WORKFLOWS-COMPLETOS.json');
const workflows = JSON.parse(fs.readFileSync(workflowsPath, 'utf8'));

// Leer metadata actual
const metaPath = path.join(__dirname, '../engineering-metadata.js');
let metaContent = fs.readFileSync(metaPath, 'utf8');

// Verificar si ya existe la sección workflows (buscar altaEmpresa que es único)
if (metaContent.includes('altaEmpresa')) {
  console.log('⚠️ Los workflows YA ESTÁN INTEGRADOS en engineering-metadata.js');
  console.log('   (Se encontró "altaEmpresa" en el archivo)');
  console.log('   No se modificará el archivo para evitar duplicados.');
  process.exit(0);
}

// Crear la sección completa a agregar
const newSections = `
  // ============================================================================
  // ECOSISTEMA COMERCIAL COMPLETO - APONNT B2B
  // Fecha de creación: ${new Date().toISOString().split('T')[0]}
  // ============================================================================
  "commercialEcosystem": {
    "lastUpdated": "${new Date().toISOString().split('T')[0]}",
    "version": "1.0.0",
    "description": "Sistema completo de comercialización B2B multi-tenant con módulos plug & play",

    // REGLAS DE NEGOCIO CRÍTICAS
    "businessRules": {
      "pricing": {
        "formula": "Total Mensual = SUM(módulos activos) × empleados contratados",
        "important": "El precio NO se calcula por sucursal, solo por cantidad de empleados",
        "modules": {
          "core": "Incluidos en precio base (obligatorios)",
          "enterprise": "Precio adicional por módulo (opcionales premium)",
          "commercial": "Módulos del sistema comercial (internos Aponnt)"
        }
      },
      "payment": {
        "method": "SOLO transferencia bancaria",
        "proofRequired": "Cliente sube comprobante de transferencia",
        "confirmation": "Área cobranzas confirma manualmente el pago"
      },
      "multiTenant": {
        "vendorIsolation": "Cada vendedor ve SOLO sus empresas (filtro por assigned_vendor_id)",
        "adminAccess": "Rol admin ve TODAS las empresas"
      },
      "coreUser": {
        "username": "administrador",
        "immutable": "El username NO se puede cambiar NUNCA",
        "password": "admin123 (temporal, debe cambiar en 1er login)",
        "undeletable": "Usuario con is_core_user = true NO se puede eliminar"
      },
      "supervision": {
        "field": "requiere_supervision_factura (BOOLEAN, default TRUE)",
        "onlyAdmin": "Solo rol admin puede cambiar este campo",
        "purpose": "Control de calidad antes de enviar facturas a clientes"
      }
    },

    // JERARQUÍA DE VENDEDORES (5 NIVELES)
    "vendorHierarchy": {
      "levels": {
        "0": "CEO / Dirección",
        "1": "Gerentes Regionales",
        "2": "Jefes de Venta / Supervisores",
        "3": "Coordinadores / Team Leaders",
        "4": "Vendedores Operativos"
      },
      "table": "aponnt_staff",
      "hierarchyField": "reports_to_staff_id",
      "levelField": "level"
    },

    // SISTEMA DE COMISIONES
    "commissionSystem": {
      "types": {
        "sales": "PERMANENTE (mientras empresa esté activa)",
        "support": "TEMPORAL (paquete de soporte limitado)",
        "pyramid": "PERMANENTE (herencia automática hacia superiores)"
      },
      "liquidation": {
        "immediate": "Alta de empresa → liquidación inmediata (NO espera ciclo mensual)",
        "monthly": "Día 1 de cada mes → genera digest de todas las empresas activas",
        "deadline": "7 días para transferir después de liquidación"
      }
    }
  },

  // ============================================================================
  // WORKFLOWS COMERCIALES COMPLETOS
  // Fecha de creación: ${new Date().toISOString().split('T')[0]}
  // ============================================================================
  "workflows": ${JSON.stringify(workflows, null, 2)}`;

// Encontrar el cierre del archivo y agregar antes
const closingPattern = /(\s*"potentialOrphans":\s*\{[\s\S]*?\}\s*\}\s*\};)/;
const match = metaContent.match(closingPattern);

if (!match) {
  console.log('❌ No se pudo encontrar el patrón de cierre del archivo');
  console.log('   Buscar manualmente la sección "potentialOrphans" y agregar después.');
  process.exit(1);
}

// Reemplazar agregando las nuevas secciones ANTES del cierre
const beforeClosing = metaContent.substring(0, match.index);
const closing = match[1];

const newContent = beforeClosing + ',' + newSections.replace(/\n/g, '\n  ') + '\n  }' + '\n};';

// Guardar
fs.writeFileSync(metaPath, newContent, 'utf8');

console.log('✅ Workflows integrados exitosamente en engineering-metadata.js');
console.log(`   Fecha de creación: ${new Date().toISOString().split('T')[0]}`);
console.log('\n📊 Secciones agregadas:');
console.log('   - commercialEcosystem (reglas de negocio, jerarquía, comisiones)');
console.log('   - workflows.altaEmpresa (29 pasos, 6 fases)');
console.log('   - workflows.modulosPrueba (10 pasos, trial 30 días)');
console.log('\n✅ COMPLETO - El archivo persiste en Git y en Render\n');
