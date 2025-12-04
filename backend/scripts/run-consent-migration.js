/**
 * Script para ejecutar la migración de consent branch sync
 * Ejecuta las sentencias SQL necesarias via Sequelize
 */
const { sequelize } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  MIGRACIÓN: CONSENT BRANCH SYNC                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    try {
        // 1. Agregar columnas a biometric_consents
        console.log('1. Agregando columnas a biometric_consents...');

        const columnsToAdd = [
            { name: 'branch_id', type: 'INTEGER REFERENCES company_branches(id)' },
            { name: 'country_id', type: 'INTEGER REFERENCES payroll_countries(id)' },
            { name: 'country_code', type: 'VARCHAR(3)' },
            { name: 'invalidated_reason', type: 'VARCHAR(255)' },
            { name: 'invalidated_at', type: 'TIMESTAMP' },
            { name: 'previous_consent_id', type: 'INTEGER REFERENCES biometric_consents(id)' }
        ];

        for (const col of columnsToAdd) {
            try {
                await sequelize.query(`
                    ALTER TABLE biometric_consents
                    ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
                `);
                console.log(`   ✓ Columna ${col.name} agregada`);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log(`   ℹ Columna ${col.name} ya existe`);
                } else {
                    console.log(`   ⚠ Error en ${col.name}: ${err.message}`);
                }
            }
        }

        // 2. Crear tabla consent_change_log si no existe
        console.log('\n2. Creando tabla consent_change_log...');
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS consent_change_log (
                    id SERIAL PRIMARY KEY,
                    user_id UUID NOT NULL,
                    company_id INTEGER NOT NULL,
                    consent_id INTEGER,
                    old_branch_id INTEGER,
                    old_country_id INTEGER,
                    old_country_code VARCHAR(3),
                    old_renewal_months INTEGER,
                    old_consent_status VARCHAR(50),
                    old_expires_at TIMESTAMP,
                    new_branch_id INTEGER,
                    new_country_id INTEGER,
                    new_country_code VARCHAR(3),
                    new_renewal_months INTEGER,
                    change_type VARCHAR(50) NOT NULL,
                    action_taken VARCHAR(50) NOT NULL,
                    triggered_by VARCHAR(50) DEFAULT 'SYSTEM',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('   ✓ Tabla consent_change_log creada/verificada');
        } catch (err) {
            console.log(`   ⚠ Error: ${err.message}`);
        }

        // 3. Crear índices
        console.log('\n3. Creando índices...');
        const indexes = [
            { name: 'idx_consent_change_log_user', query: 'CREATE INDEX IF NOT EXISTS idx_consent_change_log_user ON consent_change_log(user_id)' },
            { name: 'idx_consent_change_log_company', query: 'CREATE INDEX IF NOT EXISTS idx_consent_change_log_company ON consent_change_log(company_id)' },
            { name: 'idx_consent_change_log_type', query: 'CREATE INDEX IF NOT EXISTS idx_consent_change_log_type ON consent_change_log(change_type)' },
            { name: 'idx_consents_user_company', query: 'CREATE INDEX IF NOT EXISTS idx_consents_user_company ON biometric_consents(user_id, company_id)' },
            { name: 'idx_consents_expires', query: 'CREATE INDEX IF NOT EXISTS idx_consents_expires ON biometric_consents(expires_at) WHERE consent_given = TRUE' }
        ];

        for (const idx of indexes) {
            try {
                await sequelize.query(idx.query);
                console.log(`   ✓ ${idx.name}`);
            } catch (err) {
                console.log(`   ⚠ ${idx.name}: ${err.message}`);
            }
        }

        // 4. Crear función fn_get_branch_country
        console.log('\n4. Creando función fn_get_branch_country...');
        try {
            await sequelize.query(`
                CREATE OR REPLACE FUNCTION fn_get_branch_country(p_branch_id INTEGER)
                RETURNS TABLE(country_id INTEGER, country_code VARCHAR, country_name VARCHAR, renewal_months INTEGER)
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    RETURN QUERY
                    SELECT
                        pc.id as country_id,
                        pc.country_code::VARCHAR,
                        pc.country_name::VARCHAR,
                        COALESCE(pc.consent_renewal_months, 24) as renewal_months
                    FROM company_branches cb
                    LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                    WHERE cb.id = p_branch_id
                    LIMIT 1;
                END;
                $$;
            `);
            console.log('   ✓ Función fn_get_branch_country creada');
        } catch (err) {
            console.log(`   ⚠ Error: ${err.message}`);
        }

        // 5. Crear función fn_get_user_consent_status
        console.log('\n5. Creando función fn_get_user_consent_status...');
        try {
            await sequelize.query(`
                CREATE OR REPLACE FUNCTION fn_get_user_consent_status(p_user_id UUID)
                RETURNS TABLE(
                    has_valid_consent BOOLEAN,
                    consent_id INTEGER,
                    consent_date TIMESTAMP,
                    expires_at TIMESTAMP,
                    days_until_expiry INTEGER,
                    country_code VARCHAR,
                    country_name VARCHAR,
                    renewal_months INTEGER,
                    needs_renewal BOOLEAN,
                    invalidated BOOLEAN,
                    invalidated_reason VARCHAR
                )
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    RETURN QUERY
                    SELECT
                        (bc.id IS NOT NULL AND bc.consent_given = TRUE AND
                         (bc.revoked = FALSE OR bc.revoked IS NULL) AND
                         bc.invalidated_at IS NULL AND
                         (bc.expires_at IS NULL OR bc.expires_at > NOW())) as has_valid_consent,
                        bc.id as consent_id,
                        bc.consent_date,
                        bc.expires_at,
                        EXTRACT(DAY FROM (bc.expires_at - NOW()))::INTEGER as days_until_expiry,
                        pc.country_code::VARCHAR,
                        pc.country_name::VARCHAR,
                        COALESCE(pc.consent_renewal_months, 24) as renewal_months,
                        (bc.expires_at IS NOT NULL AND bc.expires_at <= NOW() + INTERVAL '30 days') as needs_renewal,
                        (bc.invalidated_at IS NOT NULL) as invalidated,
                        bc.invalidated_reason::VARCHAR
                    FROM users u
                    LEFT JOIN biometric_consents bc ON bc.user_id = u.user_id
                        AND bc.company_id = u.company_id
                        AND bc.consent_given = TRUE
                        AND (bc.revoked = FALSE OR bc.revoked IS NULL)
                    LEFT JOIN company_branches cb ON cb.id = u.branch_id::INTEGER
                    LEFT JOIN payroll_countries pc ON pc.id = cb.country_id
                    WHERE u.user_id = p_user_id
                    ORDER BY bc.consent_date DESC NULLS LAST
                    LIMIT 1;
                END;
                $$;
            `);
            console.log('   ✓ Función fn_get_user_consent_status creada');
        } catch (err) {
            console.log(`   ⚠ Error: ${err.message}`);
        }

        // 6. Crear función y trigger para cambio de sucursal
        console.log('\n6. Creando trigger de cambio de sucursal...');
        try {
            // Primero crear la función
            await sequelize.query(`
                CREATE OR REPLACE FUNCTION fn_handle_user_branch_change()
                RETURNS TRIGGER
                LANGUAGE plpgsql
                AS $$
                DECLARE
                    v_old_country RECORD;
                    v_new_country RECORD;
                    v_consent RECORD;
                    v_requires_new_consent BOOLEAN := FALSE;
                    v_change_type VARCHAR(50);
                    v_action_taken VARCHAR(50);
                BEGIN
                    -- Solo procesar si cambió branch_id o default_branch_id
                    IF (OLD.branch_id IS DISTINCT FROM NEW.branch_id) OR
                       (OLD.default_branch_id IS DISTINCT FROM NEW.default_branch_id) THEN

                        -- Obtener país de la sucursal anterior (skip si es UUID)
                        -- NOTA: Este trigger no funcionará hasta que se normalicen los tipos de datos

                        -- Determinar tipo de cambio
                        v_change_type := 'BRANCH_CHANGE';
                        v_requires_new_consent := FALSE;
                        v_action_taken := 'SKIPPED_TYPE_MISMATCH';

                        -- Registrar en log de cambios
                        INSERT INTO consent_change_log (
                            user_id, company_id,
                            old_branch_id, new_branch_id,
                            change_type, action_taken, triggered_by, notes
                        ) VALUES (
                            NEW.user_id, NEW.company_id,
                            NULL, NULL,
                            v_change_type,
                            v_action_taken,
                            'SYSTEM',
                            'Cambio detectado pero requiere normalización de tipos branch_id'
                        );
                    END IF;

                    RETURN NEW;
                END;
                $$;
            `);
            console.log('   ✓ Función fn_handle_user_branch_change creada');

            // Luego crear el trigger
            await sequelize.query(`DROP TRIGGER IF EXISTS trg_user_branch_change_consent ON users`);
            await sequelize.query(`
                CREATE TRIGGER trg_user_branch_change_consent
                    AFTER UPDATE OF branch_id, default_branch_id ON users
                    FOR EACH ROW
                    EXECUTE FUNCTION fn_handle_user_branch_change();
            `);
            console.log('   ✓ Trigger trg_user_branch_change_consent creado');
        } catch (err) {
            console.log(`   ⚠ Error: ${err.message}`);
        }

        // 7. Crear sucursales de prueba
        console.log('\n7. Verificando/Creando sucursales de prueba...');
        const [existingBranches] = await sequelize.query(`
            SELECT COUNT(*) as count FROM company_branches WHERE company_id = 2
        `);

        if (parseInt(existingBranches[0].count) === 0) {
            // Obtener países
            const [countries] = await sequelize.query(`
                SELECT id, country_code, country_name FROM payroll_countries
                WHERE country_code IN ('ARG', 'DEU') LIMIT 2
            `);

            if (countries.length >= 2) {
                await sequelize.query(`
                    INSERT INTO company_branches (company_id, branch_name, branch_code, country_id, is_active, created_at)
                    VALUES
                        (2, 'Sucursal Buenos Aires', 'BA-001', ${countries[0].id}, true, NOW()),
                        (2, 'Sucursal Berlin', 'DE-001', ${countries[1].id}, true, NOW())
                    ON CONFLICT DO NOTHING
                `);
                console.log('   ✓ 2 sucursales de prueba creadas');
            } else {
                console.log('   ⚠ No hay suficientes países configurados');
            }
        } else {
            console.log(`   ℹ Ya existen ${existingBranches[0].count} sucursales`);
        }

        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║  MIGRACIÓN COMPLETADA                                       ║');
        console.log('╚════════════════════════════════════════════════════════════╝');

    } catch (error) {
        console.error('\n❌ Error en migración:', error.message);
    } finally {
        await sequelize.close();
    }
}

runMigration();
