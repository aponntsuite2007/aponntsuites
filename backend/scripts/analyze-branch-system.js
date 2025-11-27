/**
 * =============================================================================
 * ANÁLISIS INTEGRAL: Sistema de Sucursales (Branches)
 * =============================================================================
 *
 * Analiza el estado actual del sistema de sucursales para tomar decisiones
 * arquitectónicas informadas.
 *
 * =============================================================================
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.POSTGRES_DB || 'attendance_system',
    process.env.POSTGRES_USER || 'postgres',
    process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT) || 5432,
        dialect: 'postgres',
        logging: false
    }
);

async function analyze() {
    console.log('\n' + '╔'.padEnd(79, '═') + '╗');
    console.log('║  🔍 ANÁLISIS INTEGRAL: Sistema de Sucursales (Branches)                    ║');
    console.log('╚'.padEnd(79, '═') + '╝\n');

    try {
        await sequelize.authenticate();

        // ════════════════════════════════════════════════════════════════════════
        // 1. ESTRUCTURA DE company_branches
        // ════════════════════════════════════════════════════════════════════════
        console.log('📦 1. ESTRUCTURA DE company_branches');
        console.log('─'.repeat(60));

        const [branchCols] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'company_branches'
            ORDER BY ordinal_position
        `);

        if (branchCols.length === 0) {
            console.log('   ⚠️ La tabla company_branches NO EXISTE');
        } else {
            branchCols.forEach(c => {
                console.log(`   • ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
            });
        }

        // ════════════════════════════════════════════════════════════════════════
        // 2. SUCURSALES EXISTENTES
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📦 2. SUCURSALES EXISTENTES');
        console.log('─'.repeat(60));

        try {
            const [branchData] = await sequelize.query(`
                SELECT cb.id, cb.name, cb.company_id, c.name as company_name,
                       cb.country_code, cb.city, cb.is_headquarters
                FROM company_branches cb
                JOIN companies c ON cb.company_id = c.company_id
                ORDER BY cb.company_id, cb.id
            `);

            if (branchData.length === 0) {
                console.log('   No hay sucursales registradas');
            } else {
                // Agrupar por empresa
                const byCompany = {};
                branchData.forEach(b => {
                    if (!byCompany[b.company_name]) byCompany[b.company_name] = [];
                    byCompany[b.company_name].push(b);
                });

                for (const [company, branches] of Object.entries(byCompany)) {
                    console.log(`\n   🏢 ${company}:`);
                    branches.forEach(b => {
                        const hq = b.is_headquarters ? ' [CASA CENTRAL]' : '';
                        const country = b.country_code || 'AR';
                        console.log(`      • ${b.name} (ID:${b.id}, País:${country})${hq}`);
                    });
                }
            }
        } catch (e) {
            console.log('   ⚠️ Error consultando sucursales:', e.message);
        }

        // ════════════════════════════════════════════════════════════════════════
        // 3. TABLAS QUE TIENEN branch_id
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📦 3. TABLAS CON COLUMNA branch_id');
        console.log('─'.repeat(60));

        const [tablesWithBranch] = await sequelize.query(`
            SELECT table_name, column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE column_name LIKE '%branch%'
            AND table_schema = 'public'
            ORDER BY table_name
        `);

        if (tablesWithBranch.length === 0) {
            console.log('   Ninguna tabla tiene columna branch_id');
        } else {
            tablesWithBranch.forEach(t => {
                const nullable = t.is_nullable === 'YES' ? '(nullable)' : '(required)';
                console.log(`   • ${t.table_name}.${t.column_name} ${nullable}`);
            });
        }

        // ════════════════════════════════════════════════════════════════════════
        // 4. USUARIOS Y SU RELACIÓN CON SUCURSALES
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📦 4. USUARIOS Y SUCURSALES (empresa ISI)');
        console.log('─'.repeat(60));

        const [userBranches] = await sequelize.query(`
            SELECT
                COUNT(*) as total,
                COUNT(branch_id) as with_branch,
                COUNT(default_branch_id) as with_default_branch
            FROM users WHERE company_id = 11
        `);

        console.log(`   Total usuarios: ${userBranches[0].total}`);
        console.log(`   Con branch_id: ${userBranches[0].with_branch}`);
        console.log(`   Con default_branch_id: ${userBranches[0].with_default_branch}`);

        // ════════════════════════════════════════════════════════════════════════
        // 5. DEPARTAMENTOS Y SUCURSALES
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📦 5. DEPARTAMENTOS Y SUCURSALES');
        console.log('─'.repeat(60));

        // Verificar si departments tiene branch_id
        const [deptHasBranch] = await sequelize.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'departments' AND column_name = 'branch_id'
        `);

        if (deptHasBranch.length === 0) {
            console.log('   ⚠️ La tabla departments NO tiene columna branch_id');
        } else {
            const [deptBranches] = await sequelize.query(`
                SELECT
                    COUNT(*) as total,
                    COUNT(branch_id) as with_branch
                FROM departments WHERE company_id = 11
            `);
            console.log(`   Departamentos ISI: ${deptBranches[0].total}`);
            console.log(`   Con branch_id: ${deptBranches[0].with_branch}`);
        }

        // ════════════════════════════════════════════════════════════════════════
        // 6. ROLES EN EL SISTEMA
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📦 6. ROLES EXISTENTES');
        console.log('─'.repeat(60));

        const [roles] = await sequelize.query(`
            SELECT DISTINCT role, COUNT(*) as count
            FROM users WHERE company_id = 11
            GROUP BY role
            ORDER BY count DESC
        `);

        roles.forEach(r => {
            console.log(`   • ${r.role}: ${r.count} usuarios`);
        });

        // ════════════════════════════════════════════════════════════════════════
        // 7. TABLAS PRINCIPALES Y SUS IDENTIFICADORES
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📦 7. CONSISTENCIA DE IDENTIFICADORES (user_id vs id)');
        console.log('─'.repeat(60));

        const tablesToCheck = ['users', 'departments', 'shifts', 'attendances', 'companies'];

        for (const table of tablesToCheck) {
            const [cols] = await sequelize.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = '${table}'
                AND (column_name = 'id' OR column_name LIKE '%_id' AND column_name NOT LIKE '%company_id%' AND column_name NOT LIKE '%department_id%')
                ORDER BY ordinal_position
                LIMIT 3
            `);
            const idCols = cols.map(c => c.column_name);
            console.log(`   • ${table}: PK = ${idCols[0] || 'N/A'}`);
        }

        // ════════════════════════════════════════════════════════════════════════
        // 8. REFERENCIAS FK A BRANCHES
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n📦 8. FOREIGN KEYS A company_branches');
        console.log('─'.repeat(60));

        const [fks] = await sequelize.query(`
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'company_branches'
        `);

        if (fks.length === 0) {
            console.log('   No hay FKs definidas hacia company_branches');
        } else {
            fks.forEach(fk => {
                console.log(`   • ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        }

        // ════════════════════════════════════════════════════════════════════════
        // RESUMEN
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(70));
        console.log('📋 RESUMEN DEL ANÁLISIS');
        console.log('═'.repeat(70));

        console.log(`
   ESTADO ACTUAL:
   ─────────────
   • Tabla company_branches: ${branchCols.length > 0 ? 'EXISTE' : 'NO EXISTE'}
   • Tablas con branch_id: ${tablesWithBranch.length}
   • Usuarios con branch asignado: ${userBranches[0].with_branch}/${userBranches[0].total}

   DECISIONES ARQUITECTÓNICAS PENDIENTES:
   ─────────────────────────────────────
   1. ¿Roles con scope de sucursal?
   2. ¿Departamentos obligatoriamente asociados a sucursal?
   3. ¿Dashboard consolidado para gerente general?
   4. ¿Filtros por sucursal en todos los módulos?
        `);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        await sequelize.close();
    }
}

analyze();
