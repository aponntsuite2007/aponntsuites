/**
 * Script para ejecutar migración de consent_renewal_months
 */
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('=== EJECUTANDO MIGRACIÓN consent_renewal_months ===\n');

        // 1. Agregar columna
        console.log('1. Agregando columna consent_renewal_months...');
        await sequelize.query(`
            ALTER TABLE payroll_countries
            ADD COLUMN IF NOT EXISTS consent_renewal_months INTEGER DEFAULT 24
        `);
        console.log('   ✅ Columna agregada');

        // 2. Agregar comentario
        await sequelize.query(`
            COMMENT ON COLUMN payroll_countries.consent_renewal_months IS
            'Período de renovación del consentimiento biométrico en meses. Varía según regulaciones de privacidad del país.'
        `);

        // 3. Actualizar países con períodos conocidos
        console.log('\n2. Actualizando períodos por país...');

        const updates = [
            // LATAM
            { code: 'ARG', months: 24, law: 'Ley 25.326' },
            { code: 'MEX', months: 24, law: 'LFPDPPP' },
            { code: 'BRA', months: 12, law: 'LGPD' },
            { code: 'COL', months: 24, law: 'Ley 1581' },
            { code: 'CHL', months: 24, law: 'Ley 19.628' },
            { code: 'PER', months: 24, law: 'Ley 29733' },
            { code: 'URY', months: 12, law: 'Ley 18.331 (GDPR equiv)' },
            { code: 'ECU', months: 12, law: 'LOPDP' },
            { code: 'PAN', months: 24, law: 'Ley 81' },
            { code: 'CRI', months: 24, law: 'Ley 8968' },
            { code: 'VEN', months: 24, law: 'LOPD' },
            { code: 'BOL', months: 24, law: 'Default' },
            { code: 'PRY', months: 24, law: 'Ley 1682' },
            { code: 'GTM', months: 24, law: 'Default' },
            { code: 'HND', months: 24, law: 'Default' },
            { code: 'SLV', months: 24, law: 'Default' },
            { code: 'NIC', months: 24, law: 'Ley 787' },
            { code: 'DOM', months: 24, law: 'Default' },
            { code: 'CUB', months: 24, law: 'Default' },
            { code: 'PRI', months: 36, law: 'USA Territory' },

            // Europa (GDPR - 12 meses estricto)
            { code: 'ESP', months: 12, law: 'LOPDGDD + GDPR' },
            { code: 'DEU', months: 12, law: 'BDSG + GDPR' },
            { code: 'FRA', months: 12, law: 'Loi Informatique + GDPR' },
            { code: 'ITA', months: 12, law: 'Codice Privacy + GDPR' },
            { code: 'GBR', months: 12, law: 'UK GDPR' },
            { code: 'NLD', months: 12, law: 'GDPR' },
            { code: 'BEL', months: 12, law: 'GDPR' },
            { code: 'AUT', months: 12, law: 'DSG + GDPR' },
            { code: 'PRT', months: 12, law: 'GDPR' },
            { code: 'CHE', months: 12, law: 'DSG (Swiss)' },
            { code: 'POL', months: 12, law: 'GDPR' },
            { code: 'CZE', months: 12, law: 'GDPR' },
            { code: 'HUN', months: 12, law: 'GDPR' },
            { code: 'ROU', months: 12, law: 'GDPR' },
            { code: 'GRC', months: 12, law: 'GDPR' },
            { code: 'SWE', months: 12, law: 'GDPR' },
            { code: 'DNK', months: 12, law: 'GDPR' },
            { code: 'FIN', months: 12, law: 'GDPR' },
            { code: 'NOR', months: 12, law: 'GDPR (EEA)' },
            { code: 'IRL', months: 12, law: 'GDPR' },

            // Norteamérica
            { code: 'USA', months: 36, law: 'CCPA/BIPA' },
            { code: 'CAN', months: 24, law: 'PIPEDA' },

            // Asia-Pacífico
            { code: 'JPN', months: 24, law: 'APPI' },
            { code: 'KOR', months: 12, law: 'PIPA' },
            { code: 'AUS', months: 24, law: 'Privacy Act' },
            { code: 'NZL', months: 24, law: 'Privacy Act 2020' },
            { code: 'SGP', months: 24, law: 'PDPA' },
            { code: 'HKG', months: 24, law: 'PDPO' },
            { code: 'TWN', months: 24, law: 'PDPA' },
            { code: 'THA', months: 24, law: 'PDPA' },
            { code: 'MYS', months: 24, law: 'PDPA' },
            { code: 'PHL', months: 24, law: 'DPA' },
            { code: 'IDN', months: 24, law: 'PDP Law' },
            { code: 'VNM', months: 24, law: 'Cybersecurity Law' },
            { code: 'IND', months: 24, law: 'DPDP Act' },

            // Medio Oriente y África
            { code: 'ARE', months: 24, law: 'DIFC/ADGM' },
            { code: 'SAU', months: 24, law: 'PDPL' },
            { code: 'ISR', months: 24, law: 'Privacy Protection Law' },
            { code: 'ZAF', months: 24, law: 'POPIA' },
            { code: 'EGY', months: 24, law: 'PDPL' },
            { code: 'KEN', months: 24, law: 'DPA' },
            { code: 'NGA', months: 24, law: 'NDPR' },
        ];

        let updatedCount = 0;
        for (const { code, months, law } of updates) {
            const result = await sequelize.query(`
                UPDATE payroll_countries
                SET consent_renewal_months = :months
                WHERE country_code = :code
                RETURNING country_name
            `, { replacements: { code, months } });

            if (result[0] && result[0].length > 0) {
                console.log(`   ✅ ${code}: ${months} meses (${law})`);
                updatedCount++;
            }
        }

        console.log(`\n   Total países actualizados: ${updatedCount}`);

        // 4. Verificar resultado
        console.log('\n3. Verificación final...');
        const countries = await sequelize.query(`
            SELECT country_code, country_name, consent_renewal_months
            FROM payroll_countries
            WHERE is_active = true
            ORDER BY country_name
        `, { type: sequelize.QueryTypes.SELECT });

        console.log('\n=== PAÍSES ACTIVOS CON PERÍODO DE RENOVACIÓN ===\n');
        countries.forEach(c => {
            console.log(`   ${c.country_code}: ${c.country_name} → ${c.consent_renewal_months || 24} meses`);
        });

        console.log('\n✅ Migración completada exitosamente');
        console.log('\n📌 Ahora el período de renovación se lee de la BD, no de constantes.');
        console.log('   Para agregar un nuevo país, solo necesitas configurar consent_renewal_months en payroll_countries.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }

    process.exit(0);
}

runMigration();
