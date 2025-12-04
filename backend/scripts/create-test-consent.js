/**
 * Script para crear consentimiento de prueba y verificar la funcionalidad
 */
const { sequelize } = require('../src/config/database');

async function createTestConsent() {
    try {
        console.log('=== ESTRUCTURA DE biometric_consents ===\n');

        const columns = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'biometric_consents'
            ORDER BY ordinal_position
        `, { type: sequelize.QueryTypes.SELECT });

        columns.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Ver usuarios disponibles
        console.log('\n=== USUARIOS DISPONIBLES ===\n');
        const users = await sequelize.query(`
            SELECT u.user_id, u."firstName", u."lastName", u.company_id
            FROM users u
            WHERE u.company_id IS NOT NULL
            LIMIT 5
        `, { type: sequelize.QueryTypes.SELECT });

        users.forEach(u => console.log(`  ${u.firstName} ${u.lastName} (user_id: ${u.user_id}, company: ${u.company_id})`));

        if (users.length > 0) {
            const testUser = users[0];

            console.log('\n=== CREANDO CONSENTIMIENTO DE PRUEBA ===');
            console.log(`Usuario: ${testUser.firstName} ${testUser.lastName}`);

            // Verificar si ya existe
            const existing = await sequelize.query(`
                SELECT id FROM biometric_consents WHERE user_id = :userId LIMIT 1
            `, { replacements: { userId: testUser.user_id }, type: sequelize.QueryTypes.SELECT });

            let result;
            if (existing.length > 0) {
                // Update existente
                result = await sequelize.query(`
                    UPDATE biometric_consents
                    SET consent_given = true,
                        consent_date = CURRENT_TIMESTAMP,
                        expires_at = CURRENT_TIMESTAMP + INTERVAL '24 months'
                    WHERE user_id = :userId
                    RETURNING id, user_id, consent_given, consent_date, expires_at
                `, { replacements: { userId: testUser.user_id } });
            } else {
                // Crear nuevo (Argentina = 24 meses)
                const consentText = 'Autorizo el análisis emocional biométrico para evaluar mi bienestar en el entorno laboral. ' +
                    'Entiendo que mis datos serán procesados de forma segura y confidencial.';

                result = await sequelize.query(`
                    INSERT INTO biometric_consents (
                        user_id, company_id, consent_type, consent_given, consent_date,
                        consent_text, acceptance_method, consent_version, ip_address,
                        expires_at
                    )
                    VALUES (
                        :userId, :companyId, 'emotional_analysis', true, CURRENT_TIMESTAMP,
                        :consentText, 'facial', '1.0', '192.168.1.1',
                        CURRENT_TIMESTAMP + INTERVAL '24 months'
                    )
                    RETURNING id, user_id, consent_given, consent_date, expires_at
                `, { replacements: { userId: testUser.user_id, companyId: testUser.company_id, consentText } });
            }

            console.log('\nConsentimiento creado:');
            const consent = result[0][0];
            console.log(`  ID: ${consent.id}`);
            console.log(`  User ID: ${consent.user_id}`);
            console.log(`  Consent Given: ${consent.consent_given}`);
            console.log(`  Consent Date: ${new Date(consent.consent_date).toLocaleDateString('es-AR')}`);
            console.log(`  Expires At: ${new Date(consent.expires_at).toLocaleDateString('es-AR')}`);

            // Verificar resultado final
            console.log('\n=== VERIFICACIÓN FINAL ===\n');
            const check = await sequelize.query(`
                SELECT bc.id, bc.user_id, bc.consent_given,
                       TO_CHAR(bc.consent_date, 'DD/MM/YYYY') as consent_date,
                       TO_CHAR(bc.expires_at, 'DD/MM/YYYY') as expires_at,
                       u."firstName" || ' ' || u."lastName" as employee_name
                FROM biometric_consents bc
                JOIN users u ON bc.user_id = u.user_id
            `, { type: sequelize.QueryTypes.SELECT });

            check.forEach(c => {
                console.log(`✅ ${c.employee_name}`);
                console.log(`   Otorgado: ${c.consent_date}`);
                console.log(`   Expira: ${c.expires_at}`);
            });

            console.log('\n🎯 Ahora puedes ver el consentimiento en el modal de usuarios');
            console.log(`   Usuario: ${testUser.firstName} ${testUser.lastName}`);
            console.log('   Panel Empresa → Usuarios → Click en usuario → Tab Consentimientos');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('user_id')) {
            console.log('\nℹ️  Puede que la tabla biometric_consents use user_id como constraint único');
        }
    }

    process.exit(0);
}

createTestConsent();
