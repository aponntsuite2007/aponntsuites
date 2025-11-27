/**
 * =============================================================================
 * ANÁLISIS DE IMPACTO: Sistema de Sucursales
 * =============================================================================
 *
 * Analiza TODAS las relaciones actuales para entender qué NO debemos romper
 * antes de implementar multi-sucursal.
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
    console.log('║  🔍 ANÁLISIS DE IMPACTO: Antes de Implementar Multi-Sucursal              ║');
    console.log('╚'.padEnd(79, '═') + '╝\n');

    try {
        await sequelize.authenticate();

        // ════════════════════════════════════════════════════════════════════════
        // 1. RELACIÓN KIOSCOS → DEPARTAMENTOS (CRÍTICA - NO ROMPER)
        // ════════════════════════════════════════════════════════════════════════
        console.log('🔴 1. KIOSCOS Y DEPARTAMENTOS (CRÍTICO)');
        console.log('─'.repeat(60));

        // Verificar estructura de kiosks
        const [kioskCols] = await sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'kiosks'
            ORDER BY ordinal_position
        `);

        console.log('   Columnas de kiosks:', kioskCols.map(c => c.column_name).join(', '));

        // Ver si hay kiosks con departamentos asignados
        try {
            const [kioskDepts] = await sequelize.query(`
                SELECT k.id, k.name, k.company_id, k.authorized_departments
                FROM kiosks k
                WHERE k.company_id = 11
                LIMIT 5
            `);
            console.log('\n   Kiosks de ISI con departamentos autorizados:');
            kioskDepts.forEach(k => {
                const depts = k.authorized_departments || 'TODOS';
                console.log(`      • ${k.name}: ${JSON.stringify(depts)}`);
            });
        } catch (e) {
            console.log('   ⚠️ Error consultando kiosks:', e.message);
        }

        // ════════════════════════════════════════════════════════════════════════
        // 2. RELACIÓN USUARIOS → DEPARTAMENTOS
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n🟡 2. USUARIOS Y DEPARTAMENTOS');
        console.log('─'.repeat(60));

        const [userDepts] = await sequelize.query(`
            SELECT
                d.name as dept_name,
                COUNT(u.user_id) as user_count
            FROM departments d
            LEFT JOIN users u ON u.department_id = d.id
            WHERE d.company_id = 11
            GROUP BY d.id, d.name
            ORDER BY user_count DESC
        `);

        console.log('   Distribución de usuarios por departamento:');
        userDepts.forEach(d => {
            console.log(`      • ${d.dept_name}: ${d.user_count} usuarios`);
        });

        // ════════════════════════════════════════════════════════════════════════
        // 3. RELACIÓN TURNOS → USUARIOS
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n🟡 3. TURNOS Y ASIGNACIONES');
        console.log('─'.repeat(60));

        const [shifts] = await sequelize.query(`
            SELECT s.id, s.name, s.branch_id,
                   (SELECT COUNT(*) FROM user_shift_assignments usa WHERE usa.shift_id = s.id) as assigned_users
            FROM shifts s
            WHERE s.company_id = 11
        `);

        console.log('   Turnos de ISI:');
        shifts.forEach(s => {
            const branch = s.branch_id ? `Branch:${s.branch_id}` : 'GLOBAL';
            console.log(`      • ${s.name} (${branch}) - ${s.assigned_users} usuarios asignados`);
        });

        // ════════════════════════════════════════════════════════════════════════
        // 4. ASISTENCIAS Y SUS RELACIONES
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n🟡 4. ASISTENCIAS');
        console.log('─'.repeat(60));

        const [attCols] = await sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'attendances'
            AND column_name IN ('branch_id', 'department_id', 'kiosk_id', 'shift_id')
        `);

        console.log('   Columnas de relación en attendances:');
        attCols.forEach(c => console.log(`      • ${c.column_name}`));

        // ════════════════════════════════════════════════════════════════════════
        // 5. QUERIES ACTUALES QUE USAN DEPARTAMENTOS
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n🟠 5. PATRONES DE CONSULTA ACTUALES');
        console.log('─'.repeat(60));

        // Verificar si hay vistas que usen departamentos
        const [views] = await sequelize.query(`
            SELECT table_name
            FROM information_schema.views
            WHERE table_schema = 'public'
            AND table_name LIKE '%attendance%' OR table_name LIKE '%user%'
        `);

        console.log('   Vistas relacionadas:', views.map(v => v.table_name).join(', ') || 'Ninguna');

        // ════════════════════════════════════════════════════════════════════════
        // 6. CAMPOS branch_id EXISTENTES Y SU ESTADO
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n🟢 6. ESTADO DE branch_id EN TABLAS PRINCIPALES');
        console.log('─'.repeat(60));

        const tablesToCheck = [
            { table: 'users', idCol: 'user_id' },
            { table: 'departments', idCol: 'id' },
            { table: 'shifts', idCol: 'id' },
            { table: 'kiosks', idCol: 'id' }
        ];

        for (const t of tablesToCheck) {
            try {
                const [hasBranch] = await sequelize.query(`
                    SELECT column_name FROM information_schema.columns
                    WHERE table_name = '${t.table}' AND column_name = 'branch_id'
                `);

                if (hasBranch.length > 0) {
                    const [stats] = await sequelize.query(`
                        SELECT
                            COUNT(*) as total,
                            COUNT(branch_id) as with_branch,
                            COUNT(*) - COUNT(branch_id) as without_branch
                        FROM ${t.table}
                        WHERE company_id = 11
                    `);
                    console.log(`   • ${t.table}: ${stats[0].with_branch}/${stats[0].total} con branch_id (${stats[0].without_branch} sin asignar)`);
                } else {
                    console.log(`   • ${t.table}: NO tiene columna branch_id`);
                }
            } catch (e) {
                console.log(`   • ${t.table}: Error - ${e.message}`);
            }
        }

        // ════════════════════════════════════════════════════════════════════════
        // 7. FUNCIONES Y TRIGGERS EXISTENTES
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n🔵 7. TRIGGERS DE VALIDACIÓN EXISTENTES');
        console.log('─'.repeat(60));

        const [triggers] = await sequelize.query(`
            SELECT trigger_name, event_object_table
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            AND (trigger_name LIKE '%company%' OR trigger_name LIKE '%branch%' OR trigger_name LIKE '%department%')
        `);

        if (triggers.length === 0) {
            console.log('   No hay triggers de validación multi-tenant para branches');
        } else {
            triggers.forEach(t => console.log(`   • ${t.trigger_name} en ${t.event_object_table}`));
        }

        // ════════════════════════════════════════════════════════════════════════
        // RESUMEN Y RECOMENDACIONES
        // ════════════════════════════════════════════════════════════════════════
        console.log('\n' + '═'.repeat(70));
        console.log('📋 RESUMEN DE IMPACTO Y RECOMENDACIONES');
        console.log('═'.repeat(70));

        console.log(`
   🔴 CRÍTICO - NO TOCAR:
   ─────────────────────
   • Relación Kiosko → Departamentos autorizados
   • Relación Usuario → Departamento
   • Queries de marcado de asistencia

   🟢 SEGURO - branch_id = NULL significa "global":
   ────────────────────────────────────────────────
   • departments.branch_id (ya existe, nullable)
   • shifts.branch_id (ya existe, nullable)
   • users.branch_id (ya existe, nullable)

   💡 ESTRATEGIA RECOMENDADA:
   ─────────────────────────
   1. NO modificar queries existentes
   2. branch_id = NULL = "aplica a toda la empresa"
   3. Solo AGREGAR filtro de branch cuando branch_id IS NOT NULL
   4. Feature flag por empresa: multi_branch_enabled
   5. Si flag = false, UI ni muestra opciones de sucursal
        `);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    } finally {
        await sequelize.close();
    }
}

analyze();
