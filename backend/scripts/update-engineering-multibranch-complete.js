/**
 * Script COMPLETO para documentar Multi-Branch en engineering-metadata.js
 * Respeta coherencia entre todos los tabs del módulo de ingeniería
 *
 * Ejecutar: node scripts/update-engineering-multibranch-complete.js
 */

const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, '..', 'engineering-metadata.js');

function updateMetadata() {
    console.log('='.repeat(70));
    console.log('ACTUALIZANDO ENGINEERING-METADATA.JS - MULTI-BRANCH COMPLETO');
    console.log('='.repeat(70) + '\n');

    let content = fs.readFileSync(metadataPath, 'utf8');

    // ════════════════════════════════════════════════════════════════════════════
    // 1. VERIFICAR Y ACTUALIZAR MÓDULO "branches" SI EXISTE
    // ════════════════════════════════════════════════════════════════════════════
    console.log('1. Verificando módulo branches...');

    // Buscar si existe un módulo "branches" en modules
    const branchModuleExists = content.includes('"branches":') && content.includes('"name": "Gestión de Sucursales"');

    if (!branchModuleExists) {
        console.log('   Módulo branches no encontrado como módulo completo');
        console.log('   La información está en companies.plannedFeatures.multiBranch');
    } else {
        console.log('   Módulo branches existe');
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 2. ACTUALIZAR LA SECCIÓN plannedFeatures.multiBranch CON DETALLE COMPLETO
    // ════════════════════════════════════════════════════════════════════════════
    console.log('\n2. Actualizando plannedFeatures.multiBranch con detalle completo...');

    // Patrón para buscar la sección multiBranch existente
    const multiBranchPattern = /"multiBranch":\s*\{[^}]*"name":\s*"Soporte Multi-Sucursal[^}]*\}/;

    const comprehensiveMultiBranch = `"multiBranch": {
          "name": "Sistema Multi-Sucursal No-Invasivo",
          "status": "IN_PROGRESS",
          "startDate": "2025-11-26",
          "priority": "MEDIUM",
          "description": "Sistema de sucursales con branch_id=NULL significa GLOBAL. Feature flag por empresa. Retrocompatibilidad 100%.",
          "architectureDocument": "backend/docs/ARCHITECTURE-MULTI-BRANCH-STRATEGY.md",
          "implementationGuide": "backend/docs/MULTI-BRANCH-IMPLEMENTATION-GUIDE.md",
          "principioFundamental": "NULL = GLOBAL (branch_id IS NULL aplica a toda la empresa)",
          "currentState": {
            "tablesWithBranchId": ["users", "departments", "shifts", "company_branches"],
            "tablesWithoutBranchId": ["kiosks", "attendances"],
            "usersWithBranch": "0/141",
            "departmentsWithBranch": "0/6",
            "shiftsWithBranch": "0/7",
            "companiesWithMultiBranchEnabled": "0/9"
          },
          "criticalConstraints": [
            "NO modificar authorized_departments en kiosks (es más flexible que branch_id)",
            "NO cambiar queries de marcado de asistencia",
            "NULL = GLOBAL (retrocompatibilidad total)",
            "Feature flag: multi_branch_enabled por empresa",
            "Triggers multi-tenant ya protegen la integridad"
          ],
          "databaseChanges": {
            "companies": {
              "newColumn": "multi_branch_enabled",
              "type": "BOOLEAN",
              "default": "false",
              "migrationFile": "migrations/20251126_add_multi_branch_enabled.sql",
              "status": "COMPLETED"
            },
            "users": {
              "newColumn": "branch_scope",
              "type": "JSONB",
              "default": "NULL",
              "indexGIN": "idx_users_branch_scope",
              "migrationFile": "migrations/20251126_add_branch_scope_to_users.sql",
              "status": "COMPLETED"
            }
          },
          "modelChanges": {
            "Company.js": {
              "field": "multiBranchEnabled",
              "status": "COMPLETED"
            },
            "User-postgresql.js": {
              "field": "branchScope",
              "status": "COMPLETED"
            }
          },
          "phases": [
            {
              "id": "MB-1",
              "name": "Agregar multi_branch_enabled a companies",
              "done": true,
              "completedDate": "2025-11-26",
              "risk": "ZERO",
              "description": "Feature flag booleano en tabla companies. Default: false. Controla visibilidad de opciones de sucursal en UI.",
              "files": ["src/models/Company.js", "migrations/20251126_add_multi_branch_enabled.sql"],
              "verification": "SELECT column_name FROM information_schema.columns WHERE table_name='companies' AND column_name='multi_branch_enabled'"
            },
            {
              "id": "MB-2",
              "name": "Agregar branch_scope a users",
              "done": true,
              "completedDate": "2025-11-26",
              "risk": "LOW",
              "description": "Campo JSONB para definir acceso a sucursales específicas. NULL = acceso global (gerente general).",
              "files": ["src/models/User-postgresql.js", "migrations/20251126_add_branch_scope_to_users.sql"],
              "verification": "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='branch_scope'"
            },
            {
              "id": "MB-3",
              "name": "UI condicional",
              "done": false,
              "risk": "LOW",
              "description": "Mostrar/ocultar selector de sucursales según multi_branch_enabled de la empresa.",
              "files": ["public/panel-empresa.html", "public/js/components/branch-selector.js"],
              "implementation": "Si company.multi_branch_enabled = false, ocultar todo lo relacionado con sucursales"
            },
            {
              "id": "MB-4",
              "name": "Queries inteligentes",
              "done": false,
              "risk": "MEDIUM",
              "description": "Modificar queries para filtrar por branch: AND (branch_id IS NULL OR branch_id = :currentBranch)",
              "files": ["src/utils/branchFilter.js", "src/routes/departmentRoutes.js", "src/routes/shiftRoutes.js"],
              "implementation": "Crear helper getBranchFilter() que genera condición SQL"
            },
            {
              "id": "MB-5",
              "name": "Wizard de clonación",
              "done": false,
              "risk": "LOW",
              "description": "Al crear sucursal, ofrecer clonar departamentos/turnos de otra sucursal o de globales.",
              "files": ["src/routes/branchRoutes.js"],
              "implementation": "POST /api/v1/branches/:id/clone con opciones de clonado"
            },
            {
              "id": "MB-6",
              "name": "Dashboard consolidado",
              "done": false,
              "risk": "LOW",
              "description": "Vista agregada para gerentes que ven todas las sucursales con stats consolidadas.",
              "files": ["src/routes/dashboardRoutes.js"],
              "implementation": "GET /api/v1/dashboard/consolidated con filtro por branch_scope del usuario"
            }
          ],
          "supportedCompanyTypes": [
            {
              "type": "A",
              "name": "Multi-sucursal Homogénea",
              "description": "Misma ciudad/rubro. Departamentos clonados por sucursal.",
              "example": "ISI Argentina con sucursales Córdoba, Mendoza, Rosario"
            },
            {
              "type": "B",
              "name": "Multi-país/Multi-rubro",
              "description": "Departamentos totalmente independientes por sucursal.",
              "example": "Holding con ISI Argentina (tech), ISI Chile (tech), ACME México (retail)"
            },
            {
              "type": "C",
              "name": "Híbrida",
              "description": "Departamentos globales (branch_id=NULL) + específicos por sucursal.",
              "example": "RRHH Corporativo (global) + Producción Norte (branch 1) + Producción Sur (branch 2)"
            }
          ],
          "scripts": [
            { "name": "analyze-branch-system.js", "purpose": "Analizar estado actual del sistema de branches" },
            { "name": "analyze-impact-branches.js", "purpose": "Analizar impacto antes de cambios" },
            { "name": "run-multibranch-migration.js", "purpose": "Ejecutar migraciones MB-1 y MB-2" },
            { "name": "add-multibranch-to-company-model.js", "purpose": "Agregar campo a modelo Company" },
            { "name": "add-branchscope-to-user-model.js", "purpose": "Agregar campo a modelo User" }
          ],
          "nextStepsForClaude": [
            "1. Leer docs/MULTI-BRANCH-IMPLEMENTATION-GUIDE.md para contexto completo",
            "2. Verificar estado de fases en engineering-metadata.js → plannedFeatures.multiBranch.phases",
            "3. Continuar con fase MB-3 (UI condicional) cuando usuario lo solicite",
            "4. NUNCA modificar authorized_departments en kiosks",
            "5. Siempre usar principio NULL=GLOBAL en queries",
            "6. Actualizar engineering-metadata.js al completar cada fase"
          ]
        }`;

    // Buscar y reemplazar la sección multiBranch
    if (content.includes('"multiBranch": {')) {
        // Encontrar el inicio y fin de la sección multiBranch
        const startIndex = content.indexOf('"multiBranch": {');
        if (startIndex !== -1) {
            // Contar llaves para encontrar el final
            let braceCount = 0;
            let endIndex = startIndex;
            let foundStart = false;

            for (let i = startIndex; i < content.length; i++) {
                if (content[i] === '{') {
                    braceCount++;
                    foundStart = true;
                } else if (content[i] === '}') {
                    braceCount--;
                    if (foundStart && braceCount === 0) {
                        endIndex = i + 1;
                        break;
                    }
                }
            }

            // Reemplazar
            content = content.substring(0, startIndex) + comprehensiveMultiBranch + content.substring(endIndex);
            console.log('   Sección multiBranch actualizada con detalle completo');
        }
    } else {
        console.log('   ADVERTENCIA: No se encontró sección multiBranch para actualizar');
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 3. AGREGAR A knownIssues DEL MÓDULO companies
    // ════════════════════════════════════════════════════════════════════════════
    console.log('\n3. Verificando knownIssues de companies...');

    // Buscar knownIssues de companies y agregar nota sobre multi-branch
    const companiesKnownIssuesPattern = /"companies":[^]*?"knownIssues":\s*\[/;
    if (!content.includes('Multi-Branch: Fases MB-1 y MB-2 completadas')) {
        content = content.replace(
            /("companies":[^]*?"knownIssues":\s*\[)/,
            '$1\n        "Multi-Branch: Fases MB-1 y MB-2 completadas. Ver plannedFeatures.multiBranch para continuar.",'
        );
        console.log('   Nota de Multi-Branch agregada a knownIssues de companies');
    } else {
        console.log('   Nota ya existe en knownIssues');
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 4. ACTUALIZAR lastUpdated Y latestChanges DEL PROYECTO
    // ════════════════════════════════════════════════════════════════════════════
    console.log('\n4. Actualizando timestamps...');

    const today = new Date().toISOString();
    content = content.replace(
        /"lastUpdated": "[\d\-T:.Z]+"/,
        '"lastUpdated": "' + today + '"'
    );
    console.log('   lastUpdated actualizado a', today);

    // ════════════════════════════════════════════════════════════════════════════
    // 5. GUARDAR
    // ════════════════════════════════════════════════════════════════════════════
    fs.writeFileSync(metadataPath, content, 'utf8');

    console.log('\n' + '='.repeat(70));
    console.log('ENGINEERING-METADATA.JS ACTUALIZADO EXITOSAMENTE');
    console.log('='.repeat(70));
    console.log('\nRESUMEN DE CAMBIOS:');
    console.log('-------------------');
    console.log('1. plannedFeatures.multiBranch: Detalle completo con:');
    console.log('   - 6 fases definidas (MB-1 a MB-6)');
    console.log('   - MB-1 y MB-2 marcadas como COMPLETADAS');
    console.log('   - databaseChanges documentados');
    console.log('   - modelChanges documentados');
    console.log('   - criticalConstraints listados');
    console.log('   - supportedCompanyTypes definidos');
    console.log('   - scripts útiles listados');
    console.log('   - nextStepsForClaude para sesiones futuras');
    console.log('');
    console.log('2. knownIssues de companies: Nota sobre Multi-Branch agregada');
    console.log('');
    console.log('3. lastUpdated: Actualizado a fecha actual');
    console.log('');
    console.log('COHERENCIA ENTRE TABS:');
    console.log('----------------------');
    console.log('- Tab Módulos: companies tiene plannedFeatures.multiBranch');
    console.log('- Tab Roadmap: phases con done=true/false');
    console.log('- Tab Database: databaseChanges documenta columnas nuevas');
    console.log('- Tab Archivos: scripts[] lista scripts útiles');
    console.log('');
}

updateMetadata();
