/**
 * Script para agregar TODAS las columnas faltantes a users en Render
 * Ejecutar: DATABASE_URL="..." node scripts/add-all-columns-render.js
 */

const { Sequelize } = require('sequelize');

const ALL_USER_COLUMNS = [
    { col: 'user_id', type: 'UUID DEFAULT gen_random_uuid()' },
    { col: '"employeeId"', type: 'VARCHAR(255)' },
    { col: '"firstName"', type: 'VARCHAR(255)' },
    { col: '"lastName"', type: 'VARCHAR(255)' },
    { col: 'dni', type: 'VARCHAR(255)' },
    { col: 'phone', type: 'VARCHAR(255)' },
    { col: 'position', type: 'VARCHAR(255)' },
    { col: 'salary', type: 'DECIMAL(12,2)' },
    { col: '"hireDate"', type: 'DATE' },
    { col: '"birthDate"', type: 'DATE' },
    { col: 'address', type: 'TEXT' },
    { col: '"emergencyContact"', type: 'VARCHAR(255)' },
    { col: '"emergencyPhone"', type: 'VARCHAR(255)' },
    { col: '"allowOutsideRadius"', type: 'BOOLEAN DEFAULT false' },
    { col: '"convenioColectivo"', type: 'VARCHAR(255)' },
    { col: '"createdAt"', type: 'TIMESTAMPTZ DEFAULT NOW()' },
    { col: '"updatedAt"', type: 'TIMESTAMPTZ DEFAULT NOW()' },
    { col: 'is_active', type: 'BOOLEAN DEFAULT true' },
    { col: 'whatsapp_number', type: 'VARCHAR(255)' },
    { col: 'accepts_support_packages', type: 'BOOLEAN DEFAULT true' },
    { col: 'accepts_auctions', type: 'BOOLEAN DEFAULT true' },
    { col: 'accepts_email_notifications', type: 'BOOLEAN DEFAULT true' },
    { col: 'accepts_whatsapp_notifications', type: 'BOOLEAN DEFAULT true' },
    { col: 'accepts_sms_notifications', type: 'BOOLEAN DEFAULT true' },
    { col: 'communication_consent_date', type: 'TIMESTAMPTZ' },
    { col: 'global_rating', type: 'DECIMAL(5,2)' },
    { col: 'cbu', type: 'VARCHAR(30)' },
    { col: 'bank_name', type: 'VARCHAR(100)' },
    { col: 'notes', type: 'TEXT' },
    { col: 'usuario', type: 'VARCHAR(100)' },
    { col: 'department_id', type: 'BIGINT' },
    { col: 'default_branch_id', type: 'UUID' },
    { col: 'birth_date', type: 'DATE' },
    { col: 'cuil', type: 'VARCHAR(20)' },
    { col: 'emergency_contact', type: "JSONB DEFAULT '{}'::jsonb" },
    { col: 'work_schedule', type: "JSONB DEFAULT '{}'::jsonb" },
    { col: 'last_login', type: 'TIMESTAMPTZ' },
    { col: 'failed_login_attempts', type: 'INTEGER DEFAULT 0' },
    { col: 'locked_until', type: 'TIMESTAMPTZ' },
    { col: 'password_reset_token', type: 'VARCHAR(255)' },
    { col: 'password_reset_expires', type: 'TIMESTAMPTZ' },
    { col: 'two_factor_enabled', type: 'BOOLEAN DEFAULT false' },
    { col: 'two_factor_secret', type: 'VARCHAR(255)' },
    { col: 'permissions', type: "JSONB DEFAULT '{}'::jsonb" },
    { col: 'settings', type: "JSONB DEFAULT '{}'::jsonb" },
    { col: 'has_fingerprint', type: 'BOOLEAN DEFAULT false' },
    { col: 'has_facial_data', type: 'BOOLEAN DEFAULT false' },
    { col: 'biometric_last_updated', type: 'TIMESTAMPTZ' },
    { col: 'gps_enabled', type: 'BOOLEAN DEFAULT false' },
    { col: 'allowed_locations', type: "JSONB DEFAULT '[]'::jsonb" },
    { col: 'concurrent_sessions', type: 'INTEGER DEFAULT 1' },
    { col: 'last_activity', type: 'TIMESTAMPTZ' },
    { col: 'display_name', type: 'VARCHAR(200)' },
    { col: 'vendor_code', type: 'VARCHAR(50)' },
    { col: 'version', type: 'INTEGER DEFAULT 1' },
    { col: 'biometric_enrolled', type: 'BOOLEAN DEFAULT false' },
    { col: 'biometric_templates_count', type: 'INTEGER DEFAULT 0' },
    { col: 'last_biometric_scan', type: 'TIMESTAMP' },
    { col: 'biometric_quality_avg', type: 'DECIMAL(5,2)' },
    { col: 'ai_analysis_enabled', type: 'BOOLEAN DEFAULT true' },
    { col: 'fatigue_monitoring', type: 'BOOLEAN DEFAULT false' },
    { col: 'emotion_monitoring', type: 'BOOLEAN DEFAULT false' },
    { col: 'biometric_notes', type: 'TEXT' },
    { col: 'can_authorize_late_arrivals', type: 'BOOLEAN DEFAULT false' },
    { col: 'authorized_departments', type: "JSONB DEFAULT '[]'::jsonb" },
    { col: 'notification_preference_late_arrivals', type: "VARCHAR(50) DEFAULT 'email'" },
    { col: 'can_use_mobile_app', type: 'BOOLEAN DEFAULT true' },
    { col: 'can_use_kiosk', type: 'BOOLEAN DEFAULT true' },
    { col: 'can_use_all_kiosks', type: 'BOOLEAN DEFAULT false' },
    { col: 'authorized_kiosks', type: "JSONB DEFAULT '[]'::jsonb" },
    { col: 'has_flexible_schedule', type: 'BOOLEAN DEFAULT false' },
    { col: 'flexible_schedule_notes', type: 'TEXT' },
    { col: 'legajo', type: 'VARCHAR(50)' },
    { col: '"isActive"', type: 'BOOLEAN DEFAULT true' },
    { col: 'biometric_photo_url', type: 'TEXT' },
    { col: 'biometric_photo_date', type: 'TIMESTAMP' },
    { col: 'biometric_photo_expiration', type: 'TIMESTAMP' },
    { col: 'email_verified', type: 'BOOLEAN DEFAULT true' },
    { col: 'email_verified_at', type: 'TIMESTAMP' },
    { col: 'pending_consents', type: 'TEXT[]' },
    { col: 'verification_pending', type: 'BOOLEAN DEFAULT false' },
    { col: 'account_status', type: "VARCHAR(50) DEFAULT 'active'" },
    { col: 'secondary_phone', type: 'VARCHAR(50)' },
    { col: 'home_phone', type: 'VARCHAR(50)' },
    { col: 'city', type: 'VARCHAR(100)' },
    { col: 'province', type: 'VARCHAR(100)' },
    { col: 'postal_code', type: 'VARCHAR(20)' },
    { col: 'neighborhood', type: 'VARCHAR(100)' },
    { col: 'street', type: 'VARCHAR(200)' },
    { col: 'street_number', type: 'VARCHAR(20)' },
    { col: 'floor_apt', type: 'VARCHAR(50)' },
    { col: 'health_insurance_provider', type: 'VARCHAR(100)' },
    { col: 'health_insurance_plan', type: 'VARCHAR(100)' },
    { col: 'health_insurance_number', type: 'VARCHAR(50)' },
    { col: 'health_insurance_expiry', type: 'DATE' },
    { col: 'branch_id', type: 'UUID' },
    { col: 'additional_roles', type: "JSONB DEFAULT '[]'::jsonb" },
    { col: 'branch_scope', type: "JSONB DEFAULT '[]'::jsonb" },
    { col: 'is_core_user', type: 'BOOLEAN DEFAULT false' },
    { col: 'force_password_change', type: 'BOOLEAN DEFAULT false' },
    { col: 'password_changed_at', type: 'TIMESTAMP' },
    { col: 'core_user_created_at', type: 'TIMESTAMP' },
    { col: 'onboarding_trace_id', type: 'VARCHAR(100)' },
    { col: 'sector_id', type: 'INTEGER' },
    { col: 'salary_category_id', type: 'INTEGER' },
    { col: 'organizational_position_id', type: 'INTEGER' },
    { col: 'deleted_at', type: 'TIMESTAMP' }
];

const connectionString = process.env.DATABASE_URL ||
    'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com:5432/attendance_system_866u?sslmode=require';

async function main() {
    const sequelize = new Sequelize(connectionString, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: { rejectUnauthorized: false }
        },
        logging: false
    });

    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la BD');

        let added = 0;
        let skipped = 0;
        let errors = 0;

        for (const { col, type } of ALL_USER_COLUMNS) {
            try {
                await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
                added++;
            } catch (e) {
                if (e.message.includes('already exists')) {
                    skipped++;
                } else {
                    errors++;
                    console.log(`❌ ${col}: ${e.message.substring(0, 60)}`);
                }
            }
        }

        // Sincronizar datos
        await sequelize.query(`
            UPDATE users SET
                email_verified = COALESCE(email_verified, true),
                account_status = COALESCE(account_status, 'active'),
                "isActive" = COALESCE("isActive", is_active, true)
            WHERE email_verified IS NULL OR account_status IS NULL
        `);

        console.log(`\n✅ Completado:`);
        console.log(`   Agregadas: ${added}`);
        console.log(`   Saltadas: ${skipped}`);
        console.log(`   Errores: ${errors}`);

        // Contar columnas finales
        const [cols] = await sequelize.query(`
            SELECT COUNT(*) as cnt FROM information_schema.columns
            WHERE table_name = 'users' AND table_schema = 'public'
        `);
        console.log(`   Total columnas ahora: ${cols[0].cnt}`);

    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

main();
