/**
 * Script para agregar FK faltante y verificar esquema
 */
const { sequelize } = require('../src/config/database');

async function fixSchema() {
    console.log('=== VERIFICANDO Y CORRIGIENDO ESQUEMA ===\n');

    try {
        // 1. Verificar si la FK users.company_id -> companies existe
        const [fks] = await sequelize.query(`
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'users'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'company_id'
        `);

        console.log('1. FKs existentes en users.company_id:', fks.length);

        if (fks.length === 0) {
            console.log('   Agregando FK users.company_id -> companies...');
            try {
                await sequelize.query(`
                    ALTER TABLE users
                    ADD CONSTRAINT fk_users_company_id
                    FOREIGN KEY (company_id) REFERENCES companies(id)
                `);
                console.log('   ✓ FK agregada correctamente');
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log('   ℹ FK ya existe');
                } else {
                    console.log('   ⚠ Error:', e.message);
                }
            }
        } else {
            console.log('   ✓ FK ya existe:', fks[0].constraint_name);
        }

        // 2. Verificar tipos de branch_id
        const [userBranchType] = await sequelize.query(`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'branch_id'
        `);

        const [cbIdType] = await sequelize.query(`
            SELECT data_type FROM information_schema.columns
            WHERE table_name = 'company_branches' AND column_name = 'id'
        `);

        console.log('\n2. Tipos de datos (SSOT):');
        console.log('   users.branch_id:', userBranchType[0]?.data_type || 'NO EXISTE');
        console.log('   company_branches.id:', cbIdType[0]?.data_type || 'NO EXISTE');

        if (userBranchType[0]?.data_type === 'uuid' && cbIdType[0]?.data_type === 'integer') {
            console.log('\n   ⚠ INCOMPATIBILIDAD DETECTADA:');
            console.log('   users.branch_id es UUID pero company_branches.id es INTEGER');
            console.log('   SSOT: company_branches.id (INTEGER) es la fuente de verdad');
            console.log('   Para resolver: Migrar users.branch_id de UUID a INTEGER');
        }

        // 3. Verificar FKs en company_branches
        const [branchFks] = await sequelize.query(`
            SELECT kcu.column_name, ccu.table_name as references_table
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'company_branches'
              AND tc.constraint_type = 'FOREIGN KEY'
        `);

        console.log('\n3. FKs en company_branches:');
        if (branchFks.length > 0) {
            branchFks.forEach(fk => {
                console.log(`   ✓ ${fk.column_name} -> ${fk.references_table}`);
            });
        } else {
            console.log('   Ninguna FK encontrada');
        }

        console.log('\n=== CORRECCIÓN COMPLETADA ===');

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

fixSchema();
