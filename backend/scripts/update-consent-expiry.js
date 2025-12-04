/**
 * Script para actualizar expires_at en consentimientos existentes
 * AHORA usa ConsentRegionService para detección híbrida (BD + auto-región)
 */
const { sequelize } = require('../src/config/database');
const ConsentRegionService = require('../src/services/ConsentRegionService');

async function updateConsentExpiry() {
    try {
        console.log('=== VERIFICANDO CONSENTIMIENTOS ===\n');
        console.log('Usando sistema híbrido: BD > Auto-detección por región > Default\n');

        // 1. Ver consentimientos existentes
        const consents = await sequelize.query(`
            SELECT bc.id, bc.user_id, bc.company_id, bc.consent_given,
                   bc.consent_date, bc.expires_at, bc.consent_type,
                   u."firstName" || ' ' || u."lastName" as employee_name,
                   pc.country_code, pc.country_name
            FROM biometric_consents bc
            JOIN users u ON bc.user_id = u.user_id
            LEFT JOIN company_branches cb ON cb.company_id = bc.company_id AND cb.is_active = true
            LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
            ORDER BY bc.company_id, bc.id
        `, { type: sequelize.QueryTypes.SELECT });

        console.log(`Total consentimientos: ${consents.length}\n`);

        if (consents.length === 0) {
            console.log('No hay consentimientos en la base de datos.');
            console.log('Los usuarios deben otorgar su consentimiento primero.');
            process.exit(0);
        }

        // Mostrar estado actual con detección híbrida
        console.log('Estado actual:');
        for (const c of consents) {
            const renewalInfo = await ConsentRegionService.getRenewalPeriodForUser(sequelize, c.user_id);

            const status = c.consent_given ? 'ACTIVO' : 'PENDIENTE';
            const expiry = c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'NULL';
            const country = renewalInfo.countryName || renewalInfo.countryCode || 'Sin país';

            console.log(`  [${status}] ID ${c.id}: ${c.employee_name}`);
            console.log(`          País: ${country} | Región: ${renewalInfo.region}`);
            console.log(`          Período: ${renewalInfo.months} meses (${renewalInfo.source})`);
            console.log(`          Regulación: ${renewalInfo.regulation}`);
            console.log(`          Expira: ${expiry}`);
            console.log('');
        }

        // 2. Actualizar los que no tienen expires_at
        console.log('\n=== ACTUALIZANDO FECHAS DE VENCIMIENTO ===\n');

        let updated = 0;
        for (const consent of consents) {
            if (!consent.expires_at && consent.consent_given && consent.consent_date) {
                // Obtener período usando sistema híbrido
                const renewalInfo = await ConsentRegionService.getRenewalPeriodForUser(sequelize, consent.user_id);
                const months = renewalInfo.months;

                await sequelize.query(`
                    UPDATE biometric_consents
                    SET expires_at = consent_date + INTERVAL '1 month' * :months
                    WHERE id = :id
                `, {
                    replacements: { id: consent.id, months }
                });

                console.log(`  Actualizado ID ${consent.id}: ${consent.employee_name}`);
                console.log(`    -> +${months} meses (${renewalInfo.region} | ${renewalInfo.source})`);
                updated++;
            }
        }

        if (updated === 0) {
            console.log('  No hay consentimientos para actualizar.');
        } else {
            console.log(`\nSe actualizaron ${updated} consentimientos.`);
        }

        // 3. Verificar resultado
        console.log('\n=== RESULTADO FINAL ===\n');
        const final = await sequelize.query(`
            SELECT bc.id, bc.user_id, bc.consent_given,
                   bc.consent_date, bc.expires_at,
                   u."firstName" || ' ' || u."lastName" as employee_name
            FROM biometric_consents bc
            JOIN users u ON bc.user_id = u.user_id
            ORDER BY bc.id
        `, { type: sequelize.QueryTypes.SELECT });

        final.forEach(c => {
            const status = c.consent_given ? 'Activo' : 'No dado';
            const consentDate = c.consent_date ? new Date(c.consent_date).toLocaleDateString() : 'N/A';
            const expiry = c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Sin fecha';
            console.log(`  [${status}] ${c.employee_name} | Otorgado: ${consentDate} | Vence: ${expiry}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }

    process.exit(0);
}

updateConsentExpiry();
