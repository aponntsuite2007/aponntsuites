/**
 * Registrar submódulos Finance en system_modules
 * Finance Enterprise System tiene 9 módulos profesionales
 */

const db = require('../src/config/database');

const financeSubmodules = [
    {
        moduleKey: 'finance-chart-of-accounts',
        name: 'Plan de Cuentas',
        description: 'Gestión del plan de cuentas contable',
        category: 'additional',
        isActive: true,
        moduleType: 'professional',
        availableIn: 'panel-empresa',
        frontendFile: 'finance-chart-of-accounts.js',
        icon: '📊',
        dependencies: JSON.stringify(['finance-dashboard']),
        parentModule: 'finance-dashboard'
    },
    {
        moduleKey: 'finance-budget',
        name: 'Presupuestos',
        description: 'Gestión de presupuestos y control de ejecución',
        category: 'additional',
        isActive: true,
        moduleType: 'professional',
        availableIn: 'panel-empresa',
        frontendFile: 'finance-budget.js',
        icon: '📋',
        dependencies: JSON.stringify(['finance-dashboard', 'finance-chart-of-accounts']),
        parentModule: 'finance-dashboard'
    },
    {
        moduleKey: 'finance-cash-flow',
        name: 'Flujo de Caja',
        description: 'Proyecciones y análisis de flujo de caja',
        category: 'additional',
        isActive: true,
        moduleType: 'professional',
        availableIn: 'panel-empresa',
        frontendFile: 'finance-cash-flow.js',
        icon: '💰',
        dependencies: JSON.stringify(['finance-dashboard', 'finance-treasury']),
        parentModule: 'finance-dashboard'
    },
    {
        moduleKey: 'finance-cost-centers',
        name: 'Centros de Costo',
        description: 'Gestión de centros de costo y dimensiones',
        category: 'additional',
        isActive: true,
        moduleType: 'professional',
        availableIn: 'panel-empresa',
        frontendFile: 'finance-cost-centers.js',
        icon: '🏢',
        dependencies: JSON.stringify(['finance-dashboard']),
        parentModule: 'finance-dashboard'
    },
    {
        moduleKey: 'finance-journal-entries',
        name: 'Asientos Contables',
        description: 'Registro y gestión de asientos contables',
        category: 'additional',
        isActive: true,
        moduleType: 'professional',
        availableIn: 'panel-empresa',
        frontendFile: 'finance-journal-entries.js',
        icon: '📝',
        dependencies: JSON.stringify(['finance-dashboard', 'finance-chart-of-accounts']),
        parentModule: 'finance-dashboard'
    },
    {
        moduleKey: 'finance-treasury',
        name: 'Tesorería',
        description: 'Gestión de caja, bancos y pagos',
        category: 'additional',
        isActive: true,
        moduleType: 'professional',
        availableIn: 'panel-empresa',
        frontendFile: 'finance-treasury.js',
        icon: '🏦',
        dependencies: JSON.stringify(['finance-dashboard', 'finance-chart-of-accounts']),
        parentModule: 'finance-dashboard'
    },
    {
        moduleKey: 'finance-reports',
        name: 'Reportes Financieros',
        description: 'Balance, Estado de Resultados, reportes contables',
        category: 'additional',
        isActive: true,
        moduleType: 'professional',
        availableIn: 'panel-empresa',
        frontendFile: 'finance-reports.js',
        icon: '📈',
        dependencies: JSON.stringify(['finance-dashboard', 'finance-chart-of-accounts', 'finance-journal-entries']),
        parentModule: 'finance-dashboard'
    },
    {
        moduleKey: 'finance-executive-dashboard',
        name: 'Dashboard Ejecutivo Financiero',
        description: 'KPIs ejecutivos y análisis avanzado',
        category: 'additional',
        isActive: true,
        moduleType: 'professional',
        availableIn: 'panel-empresa',
        frontendFile: 'finance-executive-dashboard.js',
        icon: '📊',
        dependencies: JSON.stringify(['finance-dashboard']),
        parentModule: 'finance-dashboard'
    }
];

async function registerFinanceSubmodules() {
    try {
        await db.connect();

        console.log('🏦 Registrando submódulos Finance...\n');

        for (const module of financeSubmodules) {
            // Verificar si ya existe
            const existing = await db.SystemModule.findOne({
                where: { moduleKey: module.moduleKey }
            });

            if (existing) {
                console.log(`⏭️  ${module.moduleKey} ya existe`);
                continue;
            }

            // Crear módulo
            await db.SystemModule.create(module);
            console.log(`✅ ${module.moduleKey} - ${module.name}`);
        }

        // Activar todos los submódulos para empresa ISI (ID 11)
        console.log('\n🔧 Activando submódulos para empresa ISI...');

        const moduleKeys = financeSubmodules.map(m => m.moduleKey);

        for (const moduleKey of moduleKeys) {
            const systemModule = await db.SystemModule.findOne({
                where: { moduleKey: moduleKey }
            });

            if (!systemModule) continue;

            // Verificar si ya está activado usando SQL directo
            const existing = await db.sequelize.query(
                'SELECT id FROM company_modules WHERE company_id = 11 AND system_module_id = :moduleId',
                {
                    replacements: { moduleId: systemModule.id },
                    type: db.Sequelize.QueryTypes.SELECT
                }
            );

            if (existing.length > 0) {
                console.log(`⏭️  ${moduleKey} ya activado para ISI`);
                continue;
            }

            // Activar para ISI usando SQL directo (evita conflicto con modelo)
            await db.sequelize.query(
                `INSERT INTO company_modules (company_id, system_module_id, activo, precio_mensual)
                 VALUES (11, :moduleId, true, 0.00)`,
                {
                    replacements: { moduleId: systemModule.id }
                }
            );

            console.log(`✅ ${moduleKey} activado para ISI`);
        }

        console.log('\n✅ Todos los submódulos Finance registrados y activados');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

registerFinanceSubmodules();
