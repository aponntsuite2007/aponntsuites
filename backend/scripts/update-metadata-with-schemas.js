/**
 * Script para actualizar engineering-metadata.js con los esquemas actuales de BD
 * y agregar el módulo de Payroll completo
 */
const fs = require('fs');
const path = require('path');

// Cargar análisis de esquemas
const schemaAnalysisPath = path.join(__dirname, '..', 'temp_schema_analysis.json');
const schemaAnalysis = JSON.parse(fs.readFileSync(schemaAnalysisPath, 'utf8'));

// Cargar metadata actual
const metadataPath = path.join(__dirname, '..', 'engineering-metadata.js');
let metadataContent = fs.readFileSync(metadataPath, 'utf8');

// Evaluar el módulo para obtener el objeto
const metadata = require(metadataPath);

// Definir los campos actualizados por módulo (extraídos del análisis)
const tableColumns = {
    users: schemaAnalysis.tables.users?.columns.map(c => c.name) || [],
    departments: schemaAnalysis.tables.departments?.columns.map(c => c.name) || [],
    shifts: schemaAnalysis.tables.shifts?.columns.map(c => c.name) || [],
    attendance: schemaAnalysis.tables.attendance?.columns.map(c => c.name) || [],
    kiosks: schemaAnalysis.tables.kiosks?.columns.map(c => c.name) || [],
    companies: schemaAnalysis.tables.companies?.columns.map(c => c.name) || [],
    company_branches: schemaAnalysis.tables.company_branches?.columns.map(c => c.name) || [],
    payroll_templates: schemaAnalysis.tables.payroll_templates?.columns.map(c => c.name) || [],
    payroll_runs: schemaAnalysis.tables.payroll_runs?.columns.map(c => c.name) || [],
    payroll_run_details: schemaAnalysis.tables.payroll_run_details?.columns.map(c => c.name) || [],
    user_salary_config_v2: schemaAnalysis.tables.user_salary_config_v2?.columns.map(c => c.name) || [],
    labor_agreements_catalog: schemaAnalysis.tables.labor_agreements_catalog?.columns.map(c => c.name) || [],
    labor_agreements_v2: schemaAnalysis.tables.labor_agreements_v2?.columns.map(c => c.name) || [],
    salary_categories: schemaAnalysis.tables.salary_categories?.columns.map(c => c.name) || [],
    salary_categories_v2: schemaAnalysis.tables.salary_categories_v2?.columns.map(c => c.name) || [],
    payroll_countries: schemaAnalysis.tables.payroll_countries?.columns.map(c => c.name) || [],
    payroll_template_concepts: schemaAnalysis.tables.payroll_template_concepts?.columns.map(c => c.name) || [],
    payroll_concept_types: schemaAnalysis.tables.payroll_concept_types?.columns.map(c => c.name) || [],
    sanctions: schemaAnalysis.tables.sanctions?.columns.map(c => c.name) || []
};

// Nuevo módulo payroll-liquidation a agregar
const payrollModule = {
    key: 'payroll-liquidation',
    name: 'Liquidación de Sueldos',
    progress: 85,
    status: 'IN_PROGRESS',
    description: 'Sistema completo de liquidación de sueldos con plantillas parametrizables, convenios colectivos, categorías salariales y propagación automática de cambios',
    icon: '💰',
    category: 'payroll',
    databaseTables: [
        'payroll_templates',
        'payroll_template_concepts',
        'payroll_concept_types',
        'payroll_countries',
        'payroll_runs',
        'payroll_run_details',
        'labor_agreements_v2',
        'labor_agreements_catalog',
        'salary_categories',
        'salary_categories_v2',
        'user_salary_config_v2',
        'user_salary_config'
    ],
    databaseViews: ['vw_user_salary_complete'],
    databaseFunctions: [
        'fn_propagate_salary_category_changes',
        'fn_propagate_salary_category_v2_changes',
        'fn_propagate_agreement_multipliers',
        'fn_flag_payroll_recalculation',
        'fn_clone_payroll_template_for_branch',
        'fn_auto_create_user_salary_config',
        'fn_get_user_payroll_template'
    ],
    databaseTriggers: [
        'trg_propagate_salary_category',
        'trg_propagate_salary_category_v2',
        'trg_propagate_agreement_multipliers',
        'trg_flag_payroll_recalculation',
        'trg_auto_create_user_salary_config'
    ],
    features: [
        'Plantillas de liquidación parametrizables por país',
        'Convenios colectivos de trabajo (CCT) integrados',
        'Categorías salariales con propagación automática',
        'Clonación de plantillas para sucursales',
        'Cálculo automático de horas extra (50% y 100%)',
        'Soporte multi-moneda',
        'Integración con sistema de sucursales',
        'Triggers para propagación automática de cambios',
        'Vista completa User→Convenio→Categoría→Salario'
    ],
    apiEndpoints: [
        'GET /api/payroll/templates',
        'POST /api/payroll/templates',
        'GET /api/payroll/templates/:id',
        'PUT /api/payroll/templates/:id',
        'DELETE /api/payroll/templates/:id',
        'POST /api/payroll/templates/:id/clone',
        'GET /api/payroll/concepts',
        'GET /api/payroll/countries',
        'GET /api/payroll/runs',
        'POST /api/payroll/runs',
        'GET /api/payroll/user-config/:userId'
    ],
    dependencies: ['users', 'departments', 'companies', 'company_branches'],
    phase4Collector: 'PayrollModuleCollector',
    lastUpdated: new Date().toISOString()
};

// Información de esquema de BD para agregar al metadata
const databaseSchemaInfo = {
    lastAnalyzed: schemaAnalysis.analyzedAt,
    tables: Object.entries(tableColumns).reduce((acc, [table, columns]) => {
        if (columns.length > 0) {
            acc[table] = {
                columnCount: columns.length,
                columns: columns,
                phase4Fields: columns.slice(0, 20) // Campos principales para Phase4
            };
        }
        return acc;
    }, {})
};

console.log('═══════════════════════════════════════════════════════════════════════');
console.log('   ACTUALIZACIÓN DE ENGINEERING-METADATA.JS');
console.log('═══════════════════════════════════════════════════════════════════════\n');

console.log('📊 TABLAS ANALIZADAS:');
Object.entries(tableColumns).forEach(([table, cols]) => {
    if (cols.length > 0) {
        console.log(`   • ${table}: ${cols.length} columnas`);
    }
});

// Crear nuevo latestChanges entry
const newChange = `💰 PAYROLL LIQUIDATION: Sistema de propagación automática con 7 funciones PostgreSQL y 5 triggers (${new Date().toISOString().split('T')[0]})`;

// Actualizar el archivo metadata
const updatedProject = {
    ...metadata.project,
    lastUpdated: new Date().toISOString(),
    latestChanges: [
        newChange,
        `📊 SCHEMA UPDATE: users(${tableColumns.users.length}), departments(${tableColumns.departments.length}), shifts(${tableColumns.shifts.length}), payroll_templates(${tableColumns.payroll_templates.length}) columnas`,
        ...metadata.project.latestChanges.slice(0, 98) // Mantener últimos 98 cambios
    ]
};

// Crear objeto de módulos actualizado
const updatedDatabaseSchema = {
    ...metadata.databaseSchema,
    ...databaseSchemaInfo,
    phase4CollectorFields: {
        users: tableColumns.users,
        departments: tableColumns.departments,
        shifts: tableColumns.shifts,
        kiosks: tableColumns.kiosks,
        attendance: tableColumns.attendance || [],
        payrollTemplates: tableColumns.payroll_templates,
        payrollRuns: tableColumns.payroll_runs,
        userSalaryConfig: tableColumns.user_salary_config_v2,
        laborAgreements: tableColumns.labor_agreements_v2,
        salaryCategories: tableColumns.salary_categories
    }
};

// Guardar
console.log('\n📝 Guardando actualizaciones...');

// Como el archivo es muy grande, usamos regex para hacer updates específicos
let updatedContent = metadataContent;

// Update lastUpdated
updatedContent = updatedContent.replace(
    /"lastUpdated":\s*"[^"]+"/,
    `"lastUpdated": "${new Date().toISOString()}"`
);

// Agregar nuevo entry a latestChanges (después del array opening)
const latestChangesMatch = updatedContent.match(/"latestChanges":\s*\[\s*\n/);
if (latestChangesMatch) {
    const insertPoint = latestChangesMatch.index + latestChangesMatch[0].length;
    const newEntries = `      "${newChange}",\n      "📊 SCHEMA UPDATE: users(${tableColumns.users.length}), departments(${tableColumns.departments.length}), shifts(${tableColumns.shifts.length}), payroll_templates(${tableColumns.payroll_templates.length}) columnas",\n`;
    updatedContent = updatedContent.slice(0, insertPoint) + newEntries + updatedContent.slice(insertPoint);
}

fs.writeFileSync(metadataPath, updatedContent, 'utf8');

console.log('✅ engineering-metadata.js actualizado');

// Crear archivo JSON separado con información detallada de Phase4
const phase4FieldsPath = path.join(__dirname, '..', 'src', 'auditor', 'config', 'phase4-fields.json');
const phase4Fields = {
    generatedAt: new Date().toISOString(),
    collectors: {
        UsersModuleCollector: {
            table: 'users',
            fields: tableColumns.users,
            requiredFields: ['user_id', 'firstName', 'lastName', 'email', 'dni', 'company_id'],
            optionalFields: tableColumns.users.filter(f => !['user_id', 'firstName', 'lastName', 'email', 'dni', 'company_id'].includes(f))
        },
        DepartmentsModuleCollector: {
            table: 'departments',
            fields: tableColumns.departments,
            requiredFields: ['id', 'name', 'company_id'],
            optionalFields: tableColumns.departments.filter(f => !['id', 'name', 'company_id'].includes(f))
        },
        ShiftsModuleCollector: {
            table: 'shifts',
            fields: tableColumns.shifts,
            requiredFields: ['id', 'name', 'startTime', 'endTime', 'company_id'],
            optionalFields: tableColumns.shifts.filter(f => !['id', 'name', 'startTime', 'endTime', 'company_id'].includes(f))
        },
        KiosksModuleCollector: {
            table: 'kiosks',
            fields: tableColumns.kiosks,
            requiredFields: ['id', 'name', 'company_id'],
            optionalFields: tableColumns.kiosks.filter(f => !['id', 'name', 'company_id'].includes(f))
        },
        PayrollModuleCollector: {
            tables: {
                payroll_templates: tableColumns.payroll_templates,
                payroll_runs: tableColumns.payroll_runs,
                payroll_run_details: tableColumns.payroll_run_details,
                user_salary_config_v2: tableColumns.user_salary_config_v2,
                labor_agreements_catalog: tableColumns.labor_agreements_catalog,
                salary_categories: tableColumns.salary_categories
            },
            requiredFields: {
                payroll_templates: ['id', 'company_id', 'template_code', 'template_name'],
                user_salary_config_v2: ['id', 'user_id', 'company_id', 'base_salary'],
                salary_categories: ['id', 'category_code', 'category_name', 'base_salary_reference']
            }
        }
    },
    databaseFunctions: [
        'fn_propagate_salary_category_changes',
        'fn_propagate_salary_category_v2_changes',
        'fn_propagate_agreement_multipliers',
        'fn_flag_payroll_recalculation',
        'fn_clone_payroll_template_for_branch',
        'fn_auto_create_user_salary_config',
        'fn_get_user_payroll_template'
    ],
    databaseTriggers: [
        'trg_propagate_salary_category',
        'trg_propagate_salary_category_v2',
        'trg_propagate_agreement_multipliers',
        'trg_flag_payroll_recalculation',
        'trg_auto_create_user_salary_config'
    ],
    databaseViews: ['vw_user_salary_complete']
};

// Asegurar que existe el directorio
const configDir = path.dirname(phase4FieldsPath);
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}

fs.writeFileSync(phase4FieldsPath, JSON.stringify(phase4Fields, null, 2), 'utf8');
console.log(`✅ Phase4 fields guardados en: ${phase4FieldsPath}`);

console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log('                            RESUMEN');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log(`   📊 Tablas analizadas: ${Object.keys(tableColumns).filter(k => tableColumns[k].length > 0).length}`);
console.log(`   👥 Users: ${tableColumns.users.length} columnas`);
console.log(`   🏢 Departments: ${tableColumns.departments.length} columnas`);
console.log(`   🕐 Shifts: ${tableColumns.shifts.length} columnas`);
console.log(`   💰 Payroll Templates: ${tableColumns.payroll_templates.length} columnas`);
console.log(`   💵 User Salary Config: ${tableColumns.user_salary_config_v2.length} columnas`);
console.log(`   ✅ engineering-metadata.js actualizado`);
console.log(`   ✅ phase4-fields.json creado`);
console.log('═══════════════════════════════════════════════════════════════════════\n');
