/**
 * Migración para crear tablas del Sistema de Notificaciones V2.0
 * Incluye tablas para Compliance, SLA y sistema de notificaciones mejorado
 */

const { Sequelize } = require('sequelize');

async function runMigration() {
    const sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: console.log,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    });

    try {
        console.log('🚀 Iniciando migración de tablas para Notificaciones V2.0...');

        // 1. Actualizar tabla notification_messages si existe
        await sequelize.query(`
            -- Agregar columnas faltantes a notification_messages si no existen
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name = 'notification_messages'
                              AND column_name = 'company_id') THEN
                    ALTER TABLE notification_messages
                    ADD COLUMN company_id INTEGER;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name = 'notification_messages'
                              AND column_name = 'deadline_at') THEN
                    ALTER TABLE notification_messages
                    ADD COLUMN deadline_at TIMESTAMP;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name = 'notification_messages'
                              AND column_name = 'responded_at') THEN
                    ALTER TABLE notification_messages
                    ADD COLUMN responded_at TIMESTAMP;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name = 'notification_messages'
                              AND column_name = 'requires_response') THEN
                    ALTER TABLE notification_messages
                    ADD COLUMN requires_response BOOLEAN DEFAULT FALSE;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                              WHERE table_name = 'notification_messages'
                              AND column_name = 'message_type') THEN
                    ALTER TABLE notification_messages
                    ADD COLUMN message_type VARCHAR(50);
                END IF;
            END $$;
        `);
        console.log('✅ Tabla notification_messages actualizada');

        // 2. Crear tabla compliance_rules o actualizar si existe
        // Primero verificar si la tabla existe
        const [tableExists] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'compliance_rules'
            );
        `);

        if (tableExists[0].exists) {
            // La tabla existe, agregar columnas faltantes
            await sequelize.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                  WHERE table_name = 'compliance_rules'
                                  AND column_name = 'description') THEN
                        ALTER TABLE compliance_rules ADD COLUMN description TEXT;
                    END IF;
                END $$;
            `);
            console.log('✅ Tabla compliance_rules actualizada');
        } else {
            // Crear la tabla desde cero
            await sequelize.query(`
                CREATE TABLE compliance_rules (
                    id SERIAL PRIMARY KEY,
                    rule_code VARCHAR(50) UNIQUE NOT NULL,
                    rule_type VARCHAR(50) NOT NULL,
                    legal_reference VARCHAR(255) NOT NULL,
                    description TEXT,
                    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
                    active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Tabla compliance_rules creada');
        }

        // 3. Crear tabla compliance_violations
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS compliance_violations (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL,
                rule_code VARCHAR(50) NOT NULL,
                employee_id VARCHAR(100),
                violation_date TIMESTAMP NOT NULL,
                violation_data JSONB,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
                resolved_at TIMESTAMP,
                resolution_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla compliance_violations creada');

        // 4. Crear tabla attendance_records (si no existe)
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL,
                employee_id VARCHAR(100) NOT NULL,
                date DATE NOT NULL,
                entry_time TIME,
                exit_time TIME,
                worked_hours DECIMAL(5,2),
                overtime_hours DECIMAL(5,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'present',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla attendance_records creada');

        // 5. Crear tabla vacation_balances
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS vacation_balances (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL,
                employee_id VARCHAR(100) NOT NULL,
                balance INTEGER DEFAULT 0,
                used INTEGER DEFAULT 0,
                expiry_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla vacation_balances creada');

        // 6. Crear tabla medical_leaves
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS medical_leaves (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL,
                employee_id VARCHAR(100) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE,
                days INTEGER,
                certificate_file VARCHAR(255),
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla medical_leaves creada');

        // 7. Crear tabla sla_metrics
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS sla_metrics (
                id SERIAL PRIMARY KEY,
                approver_id VARCHAR(100) NOT NULL,
                approver_role VARCHAR(50),
                company_id INTEGER NOT NULL,
                total_requests INTEGER DEFAULT 0,
                avg_response_hours DECIMAL(10,2),
                median_response_hours DECIMAL(10,2),
                min_response_hours DECIMAL(10,2),
                max_response_hours DECIMAL(10,2),
                within_sla_count INTEGER DEFAULT 0,
                outside_sla_count INTEGER DEFAULT 0,
                sla_compliance_percent DECIMAL(5,2),
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(approver_id, period_start)
            );
        `);
        console.log('✅ Tabla sla_metrics creada');

        // 8. Insertar reglas de compliance básicas
        await sequelize.query(`
            INSERT INTO compliance_rules (rule_code, rule_type, legal_reference, description, severity)
            VALUES
                ('REST_PERIOD_12H', 'rest_period', 'Art. 197 LCT', 'Período mínimo de descanso entre jornadas de 12 horas', 'critical'),
                ('OVERTIME_LIMIT_30H', 'overtime_limit', 'Art. 201 LCT', 'Límite máximo de 30 horas extra mensuales', 'warning'),
                ('VACATION_EXPIRY', 'vacation_expiry', 'Art. 153 LCT', 'Vencimiento de vacaciones no gozadas', 'warning'),
                ('MEDICAL_CERT_REQUIRED', 'documentation', 'Art. 209 LCT', 'Certificado médico requerido para licencias', 'critical'),
                ('MAX_WORKING_HOURS_9H', 'working_hours', 'Art. 196 LCT', 'Jornada máxima diaria de 9 horas', 'critical')
            ON CONFLICT (rule_code) DO NOTHING;
        `);
        console.log('✅ Reglas de compliance insertadas');

        // 9. Crear índices para mejorar performance
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_compliance_violations_company
            ON compliance_violations(company_id);

            CREATE INDEX IF NOT EXISTS idx_compliance_violations_status
            ON compliance_violations(status);

            CREATE INDEX IF NOT EXISTS idx_attendance_records_company_date
            ON attendance_records(company_id, date);

            CREATE INDEX IF NOT EXISTS idx_sla_metrics_company
            ON sla_metrics(company_id);
        `);
        console.log('✅ Índices creados');

        console.log('✅ MIGRACIÓN COMPLETADA EXITOSAMENTE');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    }
}

// Ejecutar migración
runMigration();