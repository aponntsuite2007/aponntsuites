#!/usr/bin/env node
/**
 * SCRIPT DE MIGRACIÓN DE DOCUMENTOS AL DMS
 *
 * Este script migra documentos existentes de módulos legacy al DMS
 * como fuente única de verdad.
 *
 * USO:
 *   node scripts/migrate-documents-to-dms.js --module=vacations --dry-run
 *   node scripts/migrate-documents-to-dms.js --module=all
 *   node scripts/migrate-documents-to-dms.js --module=sanctions --company-id=11
 *
 * OPCIONES:
 *   --module=<name>     Módulo a migrar (vacations, sanctions, medical, etc.) o "all"
 *   --company-id=<id>   Migrar solo documentos de una empresa específica
 *   --dry-run           Mostrar qué se migraría sin ejecutar
 *   --verbose           Mostrar detalles de cada documento
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Argumentos
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

const MODULE = args.module || 'all';
const COMPANY_ID = args['company-id'] ? parseInt(args['company-id']) : null;
const DRY_RUN = args['dry-run'] === true;
const VERBOSE = args['verbose'] === true;

// Configuración de base de datos
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: {
    ssl: process.env.DATABASE_URL?.includes('render.com') ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Configuración de migraciones por módulo
const MIGRATION_CONFIG = {
  vacations: {
    sourceTable: 'vacation_requests',
    documentFields: ['approval_document_path', 'rejection_document_path'],
    entityType: 'vacation_request',
    module: 'vacations',
    documentTypeMap: {
      'approval_document_path': 'VACATION_APPROVAL',
      'rejection_document_path': 'VACATION_REJECTION'
    }
  },
  sanctions: {
    sourceTable: 'sanctions',
    documentFields: ['notification_document_path', 'descargo_document_path', 'resolution_document_path'],
    entityType: 'sanction',
    module: 'sanctions',
    documentTypeMap: {
      'notification_document_path': 'SANCTION_NOTIFICATION',
      'descargo_document_path': 'SANCTION_DESCARGO',
      'resolution_document_path': 'SANCTION_RESOLUTION'
    }
  },
  medical: {
    sourceTable: 'medical_certificates',
    documentFields: ['certificate_path', 'attachment_path'],
    entityType: 'medical_certificate',
    module: 'medical',
    documentTypeMap: {
      'certificate_path': 'MEDICAL_CERTIFICATE',
      'attachment_path': 'MEDICAL_CERTIFICATE'
    }
  },
  training: {
    sourceTable: 'training_enrollments',
    documentFields: ['certificate_path'],
    entityType: 'training_enrollment',
    module: 'training',
    documentTypeMap: {
      'certificate_path': 'TRAINING_CERTIFICATE'
    }
  },
  contracts: {
    sourceTable: 'employee_contracts',
    documentFields: ['contract_document_path', 'signed_document_path'],
    entityType: 'employment_contract',
    module: 'contracts',
    documentTypeMap: {
      'contract_document_path': 'CONTRACT_INITIAL',
      'signed_document_path': 'CONTRACT_INITIAL'
    }
  },
  payroll: {
    sourceTable: 'payroll_records',
    documentFields: ['payslip_path'],
    entityType: 'payroll_record',
    module: 'payroll',
    documentTypeMap: {
      'payslip_path': 'PAYROLL_PAYSLIP'
    }
  },
  legal: {
    sourceTable: 'legal_communications',
    documentFields: ['document_path', 'acknowledgment_path'],
    entityType: 'legal_communication',
    module: 'legal-communications',
    documentTypeMap: {
      'document_path': 'LEGAL_NOTIFICATION',
      'acknowledgment_path': 'LEGAL_ACKNOWLEDGMENT'
    }
  }
};

// Función principal
async function migrate() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  MIGRACIÓN DE DOCUMENTOS AL DMS');
  console.log('  Fuente Única de Verdad Documental');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Módulo: ${MODULE}`);
  console.log(`  Empresa: ${COMPANY_ID || 'TODAS'}`);
  console.log(`  Modo: ${DRY_RUN ? 'DRY RUN (sin cambios)' : 'EJECUCIÓN REAL'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos establecida\n');

    // Determinar qué módulos migrar
    const modulesToMigrate = MODULE === 'all'
      ? Object.keys(MIGRATION_CONFIG)
      : [MODULE];

    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const moduleName of modulesToMigrate) {
      const config = MIGRATION_CONFIG[moduleName];
      if (!config) {
        console.log(`⚠️  Módulo ${moduleName} no tiene configuración de migración\n`);
        continue;
      }

      console.log(`\n📦 Migrando módulo: ${moduleName.toUpperCase()}`);
      console.log(`   Tabla origen: ${config.sourceTable}`);
      console.log(`   Campos: ${config.documentFields.join(', ')}`);

      const result = await migrateModule(config, moduleName);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  RESUMEN DE MIGRACIÓN');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ✅ Migrados: ${totalMigrated}`);
    console.log(`  ⏭️  Omitidos: ${totalSkipped}`);
    console.log(`  ❌ Errores: ${totalErrors}`);
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function migrateModule(config, moduleName) {
  const result = { migrated: 0, skipped: 0, errors: 0 };

  try {
    // Verificar si tabla existe
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${config.sourceTable}'
    `);

    if (tables.length === 0) {
      console.log(`   ⚠️  Tabla ${config.sourceTable} no existe - omitiendo`);
      return result;
    }

    // Verificar qué campos existen
    const [columns] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = '${config.sourceTable}'
      AND column_name = ANY(ARRAY['${config.documentFields.join("','")}'])
    `);

    const existingFields = columns.map(c => c.column_name);
    if (existingFields.length === 0) {
      console.log(`   ⚠️  No hay campos de documento en ${config.sourceTable}`);
      return result;
    }

    console.log(`   Campos encontrados: ${existingFields.join(', ')}`);

    // Obtener registros con documentos
    let whereClause = existingFields.map(f => `${f} IS NOT NULL AND ${f} != ''`).join(' OR ');
    if (COMPANY_ID) {
      whereClause = `(${whereClause}) AND company_id = ${COMPANY_ID}`;
    }

    const [records] = await sequelize.query(`
      SELECT id, company_id, ${existingFields.join(', ')}
      ${config.sourceTable.includes('employee') || config.sourceTable.includes('user') ? ', user_id' : ', employee_id'}
      FROM ${config.sourceTable}
      WHERE ${whereClause}
    `);

    console.log(`   Registros con documentos: ${records.length}`);

    for (const record of records) {
      for (const field of existingFields) {
        const filePath = record[field];
        if (!filePath) continue;

        const documentType = config.documentTypeMap[field];
        const employeeId = record.employee_id || record.user_id;

        if (VERBOSE) {
          console.log(`   → ${field}: ${filePath} (tipo: ${documentType})`);
        }

        // Verificar si ya existe en DMS
        const [existing] = await sequelize.query(`
          SELECT id FROM dms_documents
          WHERE source_entity_type = '${config.entityType}'
          AND source_entity_id = '${record.id}'
          AND type_code = '${documentType}'
          LIMIT 1
        `);

        if (existing.length > 0) {
          if (VERBOSE) {
            console.log(`     ⏭️  Ya existe en DMS (id: ${existing[0].id})`);
          }
          result.skipped++;
          continue;
        }

        if (DRY_RUN) {
          console.log(`   [DRY RUN] Se migraría: ${filePath} → ${documentType}`);
          result.migrated++;
          continue;
        }

        // Insertar en DMS
        try {
          await sequelize.query(`
            INSERT INTO dms_documents (
              company_id, category_code, type_code, title, file_path,
              file_name, status, owner_id, created_by,
              source_module, source_entity_type, source_entity_id,
              metadata, created_at, updated_at
            ) VALUES (
              ${record.company_id},
              '${getCategoryForModule(moduleName)}',
              '${documentType}',
              '${getDocumentTitle(moduleName, field, record.id)}',
              '${filePath}',
              '${path.basename(filePath)}',
              'active',
              ${employeeId || 'NULL'},
              ${employeeId || 'NULL'},
              '${config.module}',
              '${config.entityType}',
              '${record.id}',
              '{"migrated": true, "migratedAt": "${new Date().toISOString()}", "sourceField": "${field}"}',
              NOW(),
              NOW()
            )
          `);

          result.migrated++;
          if (VERBOSE) {
            console.log(`     ✅ Migrado a DMS`);
          }
        } catch (insertError) {
          console.log(`     ❌ Error: ${insertError.message}`);
          result.errors++;
        }
      }
    }

    console.log(`   Resultado: ${result.migrated} migrados, ${result.skipped} omitidos, ${result.errors} errores`);

  } catch (error) {
    console.log(`   ❌ Error en módulo ${moduleName}: ${error.message}`);
    result.errors++;
  }

  return result;
}

function getCategoryForModule(module) {
  const map = {
    'vacations': 'RRHH',
    'sanctions': 'LEGAL',
    'medical': 'MEDICAL',
    'training': 'TRAINING',
    'contracts': 'LEGAL',
    'payroll': 'RRHH',
    'legal': 'LEGAL'
  };
  return map[module] || 'GENERAL';
}

function getDocumentTitle(module, field, entityId) {
  const titles = {
    'approval_document_path': `Aprobación de Vacaciones #${entityId}`,
    'rejection_document_path': `Rechazo de Vacaciones #${entityId}`,
    'notification_document_path': `Notificación de Sanción #${entityId}`,
    'descargo_document_path': `Descargo - Sanción #${entityId}`,
    'resolution_document_path': `Resolución de Sanción #${entityId}`,
    'certificate_path': `Certificado #${entityId}`,
    'attachment_path': `Anexo #${entityId}`,
    'contract_document_path': `Contrato #${entityId}`,
    'signed_document_path': `Contrato Firmado #${entityId}`,
    'payslip_path': `Recibo de Sueldo #${entityId}`,
    'document_path': `Comunicación Legal #${entityId}`,
    'acknowledgment_path': `Acuse de Recibo #${entityId}`
  };
  return titles[field] || `Documento ${module} #${entityId}`;
}

// Ejecutar
migrate().catch(console.error);
