/**
 * Script SIMPLIFICADO para agregar columnas de jerarquía a organizational_positions
 * Solo agrega las columnas necesarias para el funcionamiento básico
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system'
});

async function addHierarchyColumns() {
    const client = await pool.connect();

    try {
        console.log('🚀 Agregando columnas de jerarquía a organizational_positions...\n');

        // Lista de columnas a agregar con sus definiciones
        const columnsToAdd = [
            {
                name: 'hierarchy_level',
                definition: 'INTEGER NOT NULL DEFAULT 99',
                comment: 'Nivel jerárquico (0=CEO, 1=Gerente, 2=Jefe, 3=Supervisor, 4=Operativo)'
            },
            {
                name: 'branch_code',
                definition: 'VARCHAR(50)',
                comment: 'Código de rama (ej: ADM, PROD, COM)'
            },
            {
                name: 'branch_order',
                definition: 'INTEGER DEFAULT 0',
                comment: 'Orden dentro de la rama'
            },
            {
                name: 'full_path',
                definition: 'TEXT',
                comment: 'Ruta completa de IDs (ej: 1.5.12)'
            },
            {
                name: 'is_escalation_point',
                definition: 'BOOLEAN DEFAULT false',
                comment: 'Punto de escalamiento para notificaciones'
            },
            {
                name: 'can_approve_permissions',
                definition: 'BOOLEAN DEFAULT false',
                comment: 'Puede aprobar permisos'
            },
            {
                name: 'max_approval_days',
                definition: 'INTEGER DEFAULT 0',
                comment: 'Máximo días que puede aprobar'
            },
            {
                name: 'color_hex',
                definition: "VARCHAR(7) DEFAULT '#3B82F6'",
                comment: 'Color para visualización en organigrama'
            }
        ];

        for (const col of columnsToAdd) {
            // Verificar si la columna existe
            const { rows } = await client.query(`
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'organizational_positions'
                AND column_name = $1
            `, [col.name]);

            if (rows.length === 0) {
                // Agregar columna
                await client.query(`
                    ALTER TABLE organizational_positions
                    ADD COLUMN ${col.name} ${col.definition}
                `);
                console.log(`✅ Columna agregada: ${col.name}`);

                // Agregar comentario
                await client.query(`
                    COMMENT ON COLUMN organizational_positions.${col.name} IS '${col.comment}'
                `);
            } else {
                console.log(`⏭️  Columna ya existe: ${col.name}`);
            }
        }

        // Crear índice para hierarchy_level
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_org_positions_hierarchy_level
            ON organizational_positions(company_id, hierarchy_level)
        `);
        console.log('\n✅ Índice idx_org_positions_hierarchy_level creado');

        // Verificar resultado final
        const { rows: columns } = await client.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'organizational_positions'
            AND column_name IN ('hierarchy_level', 'branch_code', 'branch_order', 'full_path',
                               'is_escalation_point', 'can_approve_permissions', 'max_approval_days', 'color_hex')
            ORDER BY column_name;
        `);

        console.log('\n📋 Columnas verificadas en organizational_positions:');
        columns.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'})`);
        });

        console.log('\n🎉 Migración completada exitosamente!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addHierarchyColumns()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
