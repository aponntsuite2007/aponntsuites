/**
 * seed-company-dependencies.js
 * Script para crear dependencias de ejemplo en la empresa demo
 * Evita problemas de UTF-8 al usar Node.js en vez de psql directo
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'attendance_system',
    password: process.env.DB_PASSWORD || 'Aedr15150302',
    port: process.env.DB_PORT || 5432
});

async function seedDependencies() {
    const client = await pool.connect();

    try {
        console.log('🌱 Iniciando seed de dependencias...\n');

        // 1. Verificar que la empresa demo existe
        const companyResult = await client.query(
            `SELECT company_id, name, slug FROM companies WHERE slug = 'aponnt-empresa-demo' LIMIT 1`
        );

        if (companyResult.rows.length === 0) {
            throw new Error('Empresa demo no encontrada (slug: aponnt-empresa-demo)');
        }

        const companyId = companyResult.rows[0].company_id;
        console.log(`✅ Empresa encontrada: ${companyResult.rows[0].name} (ID: ${companyId})\n`);

        // 2. Verificar que existen los tipos de dependencia
        const typesResult = await client.query(`SELECT id, type_code, type_name FROM dependency_types`);
        console.log(`📋 Tipos de dependencia disponibles: ${typesResult.rows.length}`);
        typesResult.rows.forEach(t => console.log(`   - ${t.type_code}: ${t.type_name}`));
        console.log('');

        // Mapear tipos por code
        const typesByCode = {};
        typesResult.rows.forEach(t => typesByCode[t.type_code] = t.id);

        // 3. Definir dependencias a crear (UNIVERSALES - No especificas de Argentina)
        const dependencies = [
            // Tipo DOCUMENT_VALID - Certificados/Documentos
            {
                dependency_code: 'CERT_ESCOLAR',
                dependency_name: 'Certificado de Escolaridad',
                dependency_type_id: typesByCode['DOCUMENT_VALID'],
                description: 'Certificado de alumno regular de institucion educativa',
                config: {
                    requires_file: true,
                    allowed_file_types: ['pdf', 'jpg', 'png'],
                    max_file_size_mb: 5,
                    requires_expiration: true,
                    expiration_warning_days: 30,
                    applies_to: ['CHILD', 'SELF']
                },
                icon: 'school',
                color_hex: '#4CAF50'
            },
            {
                dependency_code: 'CERT_DISCAPACIDAD',
                dependency_name: 'Certificado de Discapacidad',
                dependency_type_id: typesByCode['DOCUMENT_VALID'],
                description: 'Certificado oficial de discapacidad emitido por autoridad competente',
                config: {
                    requires_file: true,
                    allowed_file_types: ['pdf'],
                    max_file_size_mb: 10,
                    requires_expiration: true,
                    expiration_warning_days: 60,
                    applies_to: ['CHILD', 'SPOUSE', 'SELF', 'PARENT']
                },
                icon: 'accessible',
                color_hex: '#2196F3'
            },
            {
                dependency_code: 'RECIBO_GUARDERIA',
                dependency_name: 'Recibo de Guarderia/Jardin',
                dependency_type_id: typesByCode['DOCUMENT_VALID'],
                description: 'Comprobante de pago de servicio de guarderia o jardin de infantes',
                config: {
                    requires_file: true,
                    allowed_file_types: ['pdf', 'jpg', 'png'],
                    max_file_size_mb: 5,
                    requires_expiration: true,
                    expiration_warning_days: 15,
                    monthly_document: true,
                    applies_to: ['CHILD']
                },
                icon: 'child_care',
                color_hex: '#FF9800'
            },
            {
                dependency_code: 'CERT_MATRIMONIO',
                dependency_name: 'Certificado de Matrimonio/Union',
                dependency_type_id: typesByCode['DOCUMENT_VALID'],
                description: 'Acta o certificado de matrimonio civil o union legal',
                config: {
                    requires_file: true,
                    allowed_file_types: ['pdf'],
                    max_file_size_mb: 5,
                    requires_expiration: false,
                    one_time_document: true,
                    applies_to: ['SPOUSE']
                },
                icon: 'favorite',
                color_hex: '#E91E63'
            },
            {
                dependency_code: 'CERT_NACIMIENTO',
                dependency_name: 'Certificado de Nacimiento',
                dependency_type_id: typesByCode['DOCUMENT_VALID'],
                description: 'Acta o certificado de nacimiento del familiar',
                config: {
                    requires_file: true,
                    allowed_file_types: ['pdf'],
                    max_file_size_mb: 5,
                    requires_expiration: false,
                    one_time_document: true,
                    applies_to: ['CHILD']
                },
                icon: 'cake',
                color_hex: '#9C27B0'
            },
            {
                dependency_code: 'CERT_CONVIVENCIA',
                dependency_name: 'Certificado de Convivencia',
                dependency_type_id: typesByCode['DOCUMENT_VALID'],
                description: 'Certificado de convivencia para union de hecho',
                config: {
                    requires_file: true,
                    allowed_file_types: ['pdf'],
                    max_file_size_mb: 5,
                    requires_expiration: true,
                    expiration_warning_days: 60,
                    applies_to: ['PARTNER']
                },
                icon: 'home',
                color_hex: '#795548'
            },

            // Tipo FAMILY_CONDITION - Condiciones familiares
            {
                dependency_code: 'COND_HIJO_MENOR',
                dependency_name: 'Hijo menor de edad',
                dependency_type_id: typesByCode['FAMILY_CONDITION'],
                description: 'Condicion automatica: hijo menor de 18 anos',
                config: {
                    auto_evaluate: true,
                    condition_type: 'AGE_LESS_THAN',
                    condition_value: 18,
                    applies_to: ['CHILD']
                },
                icon: 'child_friendly',
                color_hex: '#00BCD4'
            },
            {
                dependency_code: 'COND_HIJO_ESTUDIANTE',
                dependency_name: 'Hijo estudiante (18-25 anos)',
                dependency_type_id: typesByCode['FAMILY_CONDITION'],
                description: 'Hijo mayor de 18 y menor de 25 que estudia',
                config: {
                    auto_evaluate: false,
                    requires_documents: ['CERT_ESCOLAR'],
                    condition_type: 'AGE_BETWEEN',
                    condition_min: 18,
                    condition_max: 25,
                    applies_to: ['CHILD']
                },
                icon: 'school',
                color_hex: '#3F51B5'
            },
            {
                dependency_code: 'COND_FAMILIAR_DISCAPACIDAD',
                dependency_name: 'Familiar con discapacidad',
                dependency_type_id: typesByCode['FAMILY_CONDITION'],
                description: 'Familiar con certificado de discapacidad vigente',
                config: {
                    auto_evaluate: false,
                    requires_documents: ['CERT_DISCAPACIDAD'],
                    applies_to: ['CHILD', 'SPOUSE', 'PARENT']
                },
                icon: 'accessible',
                color_hex: '#009688'
            },

            // Tipo ATTENDANCE_RULE - Reglas de asistencia
            {
                dependency_code: 'RULE_PRESENTISMO',
                dependency_name: 'Regla de Presentismo',
                dependency_type_id: typesByCode['ATTENDANCE_RULE'],
                description: 'Verifica asistencia perfecta en el periodo',
                config: {
                    rule_type: 'PERFECT_ATTENDANCE',
                    period: 'MONTH',
                    max_absences: 0,
                    max_late_arrivals: 0
                },
                icon: 'event_available',
                color_hex: '#4CAF50'
            },
            {
                dependency_code: 'RULE_PUNTUALIDAD',
                dependency_name: 'Regla de Puntualidad',
                dependency_type_id: typesByCode['ATTENDANCE_RULE'],
                description: 'Maximo 2 llegadas tarde por mes',
                config: {
                    rule_type: 'MAX_LATE_ARRIVALS',
                    period: 'MONTH',
                    max_late_arrivals: 2,
                    late_threshold_minutes: 10
                },
                icon: 'schedule',
                color_hex: '#FFC107'
            },

            // Tipo CUSTOM_FORMULA - Formulas personalizadas
            {
                dependency_code: 'FORMULA_ANTIGUEDAD',
                dependency_name: 'Antiguedad minima',
                dependency_type_id: typesByCode['CUSTOM_FORMULA'],
                description: 'Requiere minimo 6 meses de antiguedad',
                config: {
                    formula_type: 'MIN_SENIORITY',
                    min_months: 6
                },
                icon: 'history',
                color_hex: '#607D8B'
            }
        ];

        console.log(`📝 Insertando ${dependencies.length} dependencias...\n`);

        let inserted = 0;
        let skipped = 0;

        for (const dep of dependencies) {
            // Verificar si ya existe
            const existing = await client.query(
                `SELECT id FROM company_dependencies
                 WHERE company_id = $1 AND dependency_code = $2`,
                [companyId, dep.dependency_code]
            );

            if (existing.rows.length > 0) {
                console.log(`   ⏭️  ${dep.dependency_code} - ya existe`);
                skipped++;
                continue;
            }

            // Insertar (sin created_by ya que requiere UUID de usuario válido)
            await client.query(`
                INSERT INTO company_dependencies (
                    company_id, dependency_type_id, dependency_code, dependency_name,
                    description, config, icon, color_hex, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
            `, [
                companyId,
                dep.dependency_type_id,
                dep.dependency_code,
                dep.dependency_name,
                dep.description,
                JSON.stringify(dep.config),
                dep.icon,
                dep.color_hex
            ]);

            console.log(`   ✅ ${dep.dependency_code} - ${dep.dependency_name}`);
            inserted++;
        }

        console.log(`\n📊 Resumen:`);
        console.log(`   - Insertadas: ${inserted}`);
        console.log(`   - Omitidas (ya existian): ${skipped}`);
        console.log(`   - Total: ${dependencies.length}`);

        // 4. Mostrar resultado final
        const finalResult = await client.query(`
            SELECT cd.*, dt.type_code, dt.type_name
            FROM company_dependencies cd
            JOIN dependency_types dt ON cd.dependency_type_id = dt.id
            WHERE cd.company_id = $1
            ORDER BY dt.type_code, cd.dependency_code
        `, [companyId]);

        console.log(`\n✅ Dependencias activas en empresa demo: ${finalResult.rows.length}\n`);

        // Agrupar por tipo
        const byType = {};
        finalResult.rows.forEach(row => {
            if (!byType[row.type_name]) byType[row.type_name] = [];
            byType[row.type_name].push(row);
        });

        Object.entries(byType).forEach(([typeName, deps]) => {
            console.log(`📁 ${typeName}:`);
            deps.forEach(d => console.log(`   - ${d.dependency_code}: ${d.dependency_name}`));
        });

        console.log('\n🎉 Seed completado exitosamente!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

seedDependencies().catch(console.error);
