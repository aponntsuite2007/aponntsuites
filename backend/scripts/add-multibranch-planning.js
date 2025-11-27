/**
 * Script para agregar la planificación Multi-Branch al engineering-metadata.js
 * Ejecutar: node scripts/add-multibranch-planning.js
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '..', 'engineering-metadata.js');

async function updateMetadata() {
    console.log('📋 Agregando planificación Multi-Branch al engineering-metadata.js...\n');

    // Leer el archivo actual
    let content = fs.readFileSync(metadataPath, 'utf8');

    // Verificar si ya está agregado
    if (content.includes('multiBranchSupport')) {
        console.log('✅ La planificación Multi-Branch ya existe en el metadata.');
        return;
    }

    // Buscar el patrón a reemplazar
    const searchPattern = `"commissionCalculation": {
          "done": false,
          "inProgress": true
        }
      },
      "pendingMigrations": [`;

    const replacement = `"commissionCalculation": {
          "done": false,
          "inProgress": true
        },
        "multiBranchSupport": {
          "done": false,
          "planned": true,
          "priority": "MEDIUM",
          "documentReference": "docs/ARCHITECTURE-MULTI-BRANCH-STRATEGY.md"
        }
      },
      "plannedFeatures": {
        "multiBranch": {
          "name": "Soporte Multi-Sucursal No-Invasivo",
          "status": "ANALYZED",
          "analysisDate": "2025-11-26",
          "priority": "MEDIUM",
          "description": "Sistema de sucursales con branch_id=NULL significa GLOBAL. Opt-in por empresa con feature flag.",
          "architectureDocument": "backend/docs/ARCHITECTURE-MULTI-BRANCH-STRATEGY.md",
          "currentState": {
            "tablesWithBranchId": ["users", "departments", "shifts"],
            "usersWithBranch": "0/125",
            "departmentsWithBranch": "0/6",
            "shiftsWithBranch": "0/7"
          },
          "criticalConstraints": [
            "NO modificar authorized_departments en kiosks",
            "NULL = GLOBAL (retrocompatibilidad total)",
            "Feature flag: multi_branch_enabled por empresa"
          ],
          "phases": [
            { "id": "MB-1", "name": "Agregar multi_branch_enabled a companies", "done": false, "risk": "ZERO" },
            { "id": "MB-2", "name": "Agregar branch_scope a users", "done": false, "risk": "LOW" },
            { "id": "MB-3", "name": "UI condicional", "done": false, "risk": "LOW" },
            { "id": "MB-4", "name": "Queries inteligentes", "done": false, "risk": "MEDIUM" },
            { "id": "MB-5", "name": "Wizard de clonación", "done": false, "risk": "LOW" },
            { "id": "MB-6", "name": "Dashboard consolidado", "done": false, "risk": "LOW" }
          ]
        }
      },
      "pendingMigrations": [
        "ADD multi_branch_enabled BOOLEAN DEFAULT false",`;

    if (!content.includes(searchPattern)) {
        console.log('⚠️ No se encontró el patrón exacto. Buscando alternativa...');

        // Buscar un patrón más simple
        const simpleSearch = '"commissionCalculation":';
        if (content.includes(simpleSearch)) {
            console.log('✅ Encontrado patrón de commissionCalculation');

            // Buscar el índice donde termina "companies" y agregar después de pendingMigrations
            const pendingMigrationsIndex = content.indexOf('"pendingMigrations": [',
                content.indexOf('"companies": {'));

            if (pendingMigrationsIndex !== -1) {
                // Insertar la migración de multi_branch_enabled
                const insertPoint = content.indexOf('[', pendingMigrationsIndex) + 1;
                const before = content.substring(0, insertPoint);
                const after = content.substring(insertPoint);

                content = before + '\n        "ADD multi_branch_enabled BOOLEAN DEFAULT false",' + after;

                fs.writeFileSync(metadataPath, content, 'utf8');
                console.log('✅ Agregada migración pendiente: multi_branch_enabled');
            }
        }
        return;
    }

    // Reemplazar
    content = content.replace(searchPattern, replacement);

    // Guardar
    fs.writeFileSync(metadataPath, content, 'utf8');

    console.log('✅ Planificación Multi-Branch agregada exitosamente');
    console.log(`
   RESUMEN:
   ────────
   • Archivo actualizado: engineering-metadata.js
   • Nueva feature: multiBranchSupport (planned)
   • Documento de arquitectura: docs/ARCHITECTURE-MULTI-BRANCH-STRATEGY.md
   • 6 fases definidas para implementación gradual
   • Migración pendiente agregada: multi_branch_enabled
    `);
}

updateMetadata().catch(console.error);
