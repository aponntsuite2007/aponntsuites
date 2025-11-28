const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302',
    logging: false
});

// Campos críticos para cadena de liquidación
const CRITICAL_PAYROLL_FIELDS = {
    country_id: 'INTEGER - ID del país para legislación laboral',
    country: 'VARCHAR/TEXT - Nombre del país (alternativa a country_id)',
    has_branches: 'BOOLEAN - Indica si tiene sucursales múltiples',
    multi_branch_enabled: 'BOOLEAN - Alternativa a has_branches',
    default_calendar_id: 'INTEGER - FK a tabla de calendarios de feriados',
    default_payroll_template_id: 'INTEGER - FK a payroll_templates',
    modules_data: 'JSONB - Datos de módulos contratados',
    active_modules: 'JSONB/VARCHAR[] - Módulos activos'
};

async function auditCompaniesTable() {
    try {
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  AUDITORÍA COMPLETA: Tabla COMPANIES (Cadena de Liquidación) ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');

        // 1. Obtener TODAS las columnas con tipo de datos
        const [columns] = await sequelize.query(`
            SELECT
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'companies'
            ORDER BY ordinal_position
        `);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 ESTRUCTURA COMPLETA DE LA TABLA COMPANIES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        columns.forEach((col, idx) => {
            const typeInfo = col.character_maximum_length
                ? `${col.data_type}(${col.character_maximum_length})`
                : col.data_type;

            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';

            console.log(`${(idx + 1).toString().padStart(2)}. ${col.column_name.padEnd(35)} | ${typeInfo.padEnd(25)} | ${nullable.padEnd(8)} ${defaultVal}`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 ANÁLISIS DE CAMPOS CRÍTICOS PARA LIQUIDACIÓN DE NÓMINA');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const existingFields = [];
        const missingFields = [];

        for (const [fieldName, description] of Object.entries(CRITICAL_PAYROLL_FIELDS)) {
            const exists = columns.some(col => col.column_name === fieldName);

            if (exists) {
                const col = columns.find(c => c.column_name === fieldName);
                const typeInfo = col.character_maximum_length
                    ? `${col.data_type}(${col.character_maximum_length})`
                    : col.data_type;

                existingFields.push({ fieldName, typeInfo, description });
                console.log(`✅ ${fieldName.padEnd(35)} | ${typeInfo.padEnd(25)} | EXISTE`);
            } else {
                missingFields.push({ fieldName, description });
                console.log(`❌ ${fieldName.padEnd(35)} | ${description.padEnd(25)} | FALTA`);
            }
        }

        // 2. Verificar campos relacionados a liquidación que SÍ existen
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🏢 CAMPOS RELACIONADOS A LIQUIDACIÓN (EXISTENTES)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const payrollRelatedFields = [
            'modules_data',
            'modules_pricing',
            'active_modules',
            'pricing',
            'modules',
            'company_id',
            'name',
            'slug',
            'address',
            'city',
            'province',
            'country',
            'support_sla_plan_id'
        ];

        payrollRelatedFields.forEach(fieldName => {
            const col = columns.find(c => c.column_name === fieldName);
            if (col) {
                const typeInfo = col.character_maximum_length
                    ? `${col.data_type}(${col.character_maximum_length})`
                    : col.data_type;

                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                console.log(`✔ ${fieldName.padEnd(35)} | ${typeInfo.padEnd(25)} | ${nullable}`);
            }
        });

        // 3. Verificar foreign keys relacionadas
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔗 FOREIGN KEYS EN TABLA COMPANIES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const [foreignKeys] = await sequelize.query(`
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = 'companies'
            ORDER BY kcu.column_name
        `);

        if (foreignKeys.length === 0) {
            console.log('ℹ️  No se encontraron Foreign Keys en la tabla companies');
        } else {
            foreignKeys.forEach(fk => {
                console.log(`📎 ${fk.column_name.padEnd(35)} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
                console.log(`   Constraint: ${fk.constraint_name}\n`);
            });
        }

        // 4. Verificar índices
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📇 ÍNDICES EN TABLA COMPANIES');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const [indexes] = await sequelize.query(`
            SELECT
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'companies'
            ORDER BY indexname
        `);

        indexes.forEach(idx => {
            console.log(`🗂️  ${idx.indexname}`);
            console.log(`   ${idx.indexdef}\n`);
        });

        // 5. RESUMEN FINAL
        console.log('\n╔═══════════════════════════════════════════════════════════════╗');
        console.log('║                    RESUMEN DE AUDITORÍA                        ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝\n');

        console.log(`📊 Total de columnas en companies: ${columns.length}`);
        console.log(`✅ Campos críticos EXISTENTES: ${existingFields.length}/${Object.keys(CRITICAL_PAYROLL_FIELDS).length}`);
        console.log(`❌ Campos críticos FALTANTES: ${missingFields.length}/${Object.keys(CRITICAL_PAYROLL_FIELDS).length}`);
        console.log(`🔗 Foreign Keys encontradas: ${foreignKeys.length}`);
        console.log(`📇 Índices encontrados: ${indexes.length}`);

        if (missingFields.length > 0) {
            console.log('\n⚠️  CAMPOS CRÍTICOS FALTANTES PARA CADENA DE LIQUIDACIÓN:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            missingFields.forEach(field => {
                console.log(`  ❌ ${field.fieldName}`);
                console.log(`     → ${field.description}\n`);
            });

            console.log('\n💡 RECOMENDACIÓN:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log('Para completar la cadena de liquidación necesitas agregar estos campos:');
            console.log('\n1. country_id (INTEGER) - Para saber qué legislación laboral aplicar');
            console.log('   FK → payroll_countries.id\n');
            console.log('2. has_branches (BOOLEAN) - Para saber si tiene sucursales múltiples');
            console.log('   Default: false\n');
            console.log('3. default_calendar_id (INTEGER) - Para calendario de feriados');
            console.log('   FK → holidays.id (o crear tabla calendars)\n');
            console.log('4. default_payroll_template_id (INTEGER) - Para plantilla de liquidación default');
            console.log('   FK → payroll_templates.id\n');
        } else {
            console.log('\n🎉 ¡Todos los campos críticos están presentes!');
        }

        // 6. Verificar si modules_data/active_modules contienen info útil
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 MUESTRA DE DATOS EN CAMPOS EXISTENTES (Primera empresa)');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const [sampleData] = await sequelize.query(`
            SELECT
                company_id,
                name,
                modules_data,
                active_modules,
                modules_pricing,
                pricing,
                modules,
                country,
                city,
                province,
                multi_branch_enabled,
                max_branches
            FROM companies
            WHERE is_active = true
            ORDER BY company_id ASC
            LIMIT 1
        `);

        if (sampleData.length > 0) {
            const sample = sampleData[0];
            console.log(`🏢 Empresa: ${sample.name} (ID: ${sample.company_id})`);
            console.log(`📍 Ubicación: ${sample.city || 'N/A'}, ${sample.province || 'N/A'}, ${sample.country || 'N/A'}`);
            console.log(`🏢 Multi-sucursal: ${sample.multi_branch_enabled ? 'SÍ' : 'NO'} (Max branches: ${sample.max_branches || 'N/A'})`);
            console.log(`\n📦 modules_data:`);
            console.log(JSON.stringify(sample.modules_data, null, 2) || 'NULL');
            console.log(`\n📦 active_modules:`);
            console.log(sample.active_modules || 'NULL');
            console.log(`\n📦 modules_pricing:`);
            console.log(JSON.stringify(sample.modules_pricing, null, 2) || 'NULL');
            console.log(`\n📦 pricing:`);
            console.log(JSON.stringify(sample.pricing, null, 2) || 'NULL');
            console.log(`\n📦 modules:`);
            console.log(JSON.stringify(sample.modules, null, 2) || 'NULL');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (err) {
        console.error('❌ Error durante auditoría:', err.message);
        console.error('Stack trace:', err.stack);
    } finally {
        await sequelize.close();
    }
}

auditCompaniesTable();
