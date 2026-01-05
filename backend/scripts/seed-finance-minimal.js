/**
 * SEED MÍNIMO - Finance Enterprise
 * Inicializa datos mínimos necesarios para que Finance funcione
 *
 * CRÍTICO: Sin estos datos, Finance da error 500
 */

const db = require('../src/config/database');

async function seedFinanceMinimal() {
    console.log('🌱 Inicializando datos mínimos de Finance Enterprise...\n');

    try {
        await db.sequelize.authenticate();
        console.log('✅ Conectado a la base de datos\n');

        // Empresa de prueba (ISI - company_id: 11)
        const COMPANY_ID = 11;

        // ═══════════════════════════════════════════════════════════
        // 1. PERÍODOS FISCALES (necesario para no dar null en getCurrent)
        // ═══════════════════════════════════════════════════════════
        console.log('📅 Creando períodos fiscales 2026...');

        const existingPeriods = await db.FinanceFiscalPeriod.count({
            where: { company_id: COMPANY_ID, fiscal_year: 2026 }
        });

        if (existingPeriods === 0) {
            const periods = [];
            for (let month = 1; month <= 12; month++) {
                const startDate = new Date(2026, month - 1, 1);
                const endDate = new Date(2026, month, 0);

                periods.push({
                    company_id: COMPANY_ID,
                    fiscal_year: 2026,
                    period_number: month,
                    period_name: startDate.toLocaleString('es', { month: 'long' }),
                    start_date: startDate,
                    end_date: endDate,
                    status: 'open',
                    is_adjustment_period: false
                });
            }

            await db.FinanceFiscalPeriod.bulkCreate(periods);
            console.log('  ✅ 12 períodos fiscales creados');
        } else {
            console.log('  ⏭️  Períodos ya existen, skip');
        }

        // ═══════════════════════════════════════════════════════════
        // 2. PLAN DE CUENTAS BÁSICO (necesario para balances)
        // ═══════════════════════════════════════════════════════════
        console.log('\n📊 Creando plan de cuentas básico...');

        const existingAccounts = await db.FinanceChartOfAccounts.count({
            where: { company_id: COMPANY_ID }
        });

        if (existingAccounts === 0) {
            const accounts = [
                // ACTIVO
                { code: '1', number: 1000000, name: 'ACTIVO', type: 'asset', nature: 'debit', level: 1, parent_id: null },
                { code: '1.1', number: 1100000, name: 'Activo Corriente', type: 'asset', nature: 'debit', level: 2, parent_code: '1' },
                { code: '1.1.01', number: 1101000, name: 'Caja y Bancos', type: 'asset', nature: 'debit', level: 3, parent_code: '1.1' },
                { code: '1.1.02', number: 1102000, name: 'Créditos por Ventas', type: 'asset', nature: 'debit', level: 3, parent_code: '1.1' },
                { code: '1.1.04', number: 1104000, name: 'Bienes de Cambio', type: 'asset', nature: 'debit', level: 3, parent_code: '1.1' },
                { code: '1.2', number: 1200000, name: 'Activo No Corriente', type: 'asset', nature: 'debit', level: 2, parent_code: '1' },

                // PASIVO
                { code: '2', number: 2000000, name: 'PASIVO', type: 'liability', nature: 'credit', level: 1, parent_id: null },
                { code: '2.1', number: 2100000, name: 'Pasivo Corriente', type: 'liability', nature: 'credit', level: 2, parent_code: '2' },
                { code: '2.1.01', number: 2101000, name: 'Deudas Comerciales', type: 'liability', nature: 'credit', level: 3, parent_code: '2.1' },
                { code: '2.2', number: 2200000, name: 'Pasivo No Corriente', type: 'liability', nature: 'credit', level: 2, parent_code: '2' },

                // PATRIMONIO NETO
                { code: '3', number: 3000000, name: 'PATRIMONIO NETO', type: 'equity', nature: 'credit', level: 1, parent_id: null },
                { code: '3.1', number: 3100000, name: 'Capital', type: 'equity', nature: 'credit', level: 2, parent_code: '3' },
                { code: '3.2', number: 3200000, name: 'Resultados', type: 'equity', nature: 'credit', level: 2, parent_code: '3' },

                // INGRESOS
                { code: '4', number: 4000000, name: 'INGRESOS', type: 'revenue', nature: 'credit', level: 1, parent_id: null },
                { code: '4.1', number: 4100000, name: 'Ventas', type: 'revenue', nature: 'credit', level: 2, parent_code: '4' },
                { code: '4.2', number: 4200000, name: 'Otros Ingresos', type: 'revenue', nature: 'credit', level: 2, parent_code: '4' },

                // GASTOS
                { code: '5', number: 5000000, name: 'GASTOS', type: 'expense', nature: 'debit', level: 1, parent_id: null },
                { code: '5.1', number: 5100000, name: 'Costo de Ventas', type: 'expense', nature: 'debit', level: 2, parent_code: '5' },
                { code: '5.2', number: 5200000, name: 'Gastos de Administración', type: 'expense', nature: 'debit', level: 2, parent_code: '5' },
                { code: '5.3', number: 5300000, name: 'Gastos de Comercialización', type: 'expense', nature: 'debit', level: 2, parent_code: '5' }
            ];

            // Crear cuentas padre primero
            const createdAccounts = new Map();

            for (const acc of accounts) {
                const parent = acc.parent_code ? createdAccounts.get(acc.parent_code) : null;

                const account = await db.FinanceChartOfAccounts.create({
                    company_id: COMPANY_ID,
                    account_code: acc.code,
                    account_number: acc.number,
                    name: acc.name,
                    account_type: acc.type,
                    account_nature: acc.nature,
                    level: acc.level,
                    parent_id: parent?.id || null,
                    is_header: acc.level < 3, // Niveles 1-2 son headers
                    is_active: true
                });

                createdAccounts.set(acc.code, account);
            }

            console.log(`  ✅ ${accounts.length} cuentas contables creadas`);
        } else {
            console.log('  ⏭️  Plan de cuentas ya existe, skip');
        }

        // ═══════════════════════════════════════════════════════════
        // 3. DATOS DE EJEMPLO (OPCIONAL - para que dashboard no esté vacío)
        // ═══════════════════════════════════════════════════════════
        console.log('\n💰 Creando datos de ejemplo para dashboard...');

        // Crear algunos balances de ejemplo
        const existingBalances = await db.FinanceAccountBalance.count({
            where: { company_id: COMPANY_ID }
        });

        if (existingBalances === 0) {
            const cashAccount = await db.FinanceChartOfAccounts.findOne({
                where: { company_id: COMPANY_ID, account_code: '1.1.01' }
            });

            if (cashAccount) {
                await db.FinanceAccountBalance.create({
                    company_id: COMPANY_ID,
                    account_id: cashAccount.id,
                    fiscal_year: 2026,
                    fiscal_period: 1,
                    opening_balance: 0,
                    debit_movement: 1000000, // 1M de ingresos
                    credit_movement: 300000, // 300K de egresos
                    closing_balance: 700000  // 700K saldo
                });

                console.log('  ✅ Balances de ejemplo creados (Caja y Bancos: $700,000)');
            }
        } else {
            console.log('  ⏭️  Balances ya existen, skip');
        }

        console.log('\n✅ SEED COMPLETO - Finance Enterprise está listo');
        console.log('\n📊 Ahora puedes acceder a:');
        console.log('   http://localhost:9998/api/finance/dashboard?fiscal_year=2026');
        console.log('   (con token de empresa ID 11)\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error en seed:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Ejecutar
if (require.main === module) {
    seedFinanceMinimal();
}

module.exports = { seedFinanceMinimal };
