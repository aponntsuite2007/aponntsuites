const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('attendance_system', 'postgres', 'Aedr15150302', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: console.log
});

async function createTables() {
  try {
    console.log('🔄 Creando tablas faltantes...\n');

    // ===== TABLA: visitors (sin FK constraints) =====
    console.log('📋 Creando tabla visitors...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        dni VARCHAR(20) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        visit_reason TEXT NOT NULL,
        visiting_department_id INTEGER,
        responsible_employee_id UUID,
        authorization_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (authorization_status IN ('pending', 'authorized', 'rejected', 'completed')),
        authorized_by UUID,
        authorized_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,
        gps_tracking_enabled BOOLEAN NOT NULL DEFAULT false,
        keyring_id VARCHAR(50) UNIQUE,
        facial_template TEXT,
        photo_url TEXT,
        check_in TIMESTAMP WITH TIME ZONE,
        check_out TIMESTAMP WITH TIME ZONE,
        kiosk_id INTEGER,
        scheduled_visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
        expected_duration_minutes INTEGER DEFAULT 60,
        is_active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        company_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✅ Tabla visitors creada (sin FK constraints)');

    // Crear índices para visitors
    console.log('📋 Creando índices para visitors...');
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitors_dni_company_id ON visitors(dni, company_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitors_authorization_status ON visitors(authorization_status);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitors_scheduled_visit_date ON visitors(scheduled_visit_date);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitors_responsible_employee_id ON visitors(responsible_employee_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitors_visiting_department_id ON visitors(visiting_department_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitors_company_id ON visitors(company_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitors_check_in ON visitors(check_in);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitors_check_out ON visitors(check_out);`);
    console.log('✅ Índices de visitors creados');

    // ===== TABLA: visitor_gps_tracking (sin FK constraints) =====
    console.log('\n📋 Creando tabla visitor_gps_tracking...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS visitor_gps_tracking (
        id SERIAL PRIMARY KEY,
        visitor_id INTEGER NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        accuracy DECIMAL(6, 2),
        recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_inside_facility BOOLEAN NOT NULL DEFAULT true,
        distance_from_center_meters DECIMAL(10, 2),
        battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
        signal_strength INTEGER,
        company_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla visitor_gps_tracking creada');

    // Crear índices para visitor_gps_tracking
    console.log('📋 Creando índices para visitor_gps_tracking...');
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitor_gps_tracking_visitor_id ON visitor_gps_tracking(visitor_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitor_gps_tracking_recorded_at ON visitor_gps_tracking(recorded_at);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitor_gps_tracking_company_id ON visitor_gps_tracking(company_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS visitor_gps_tracking_is_inside_facility ON visitor_gps_tracking(is_inside_facility);`);
    console.log('✅ Índices de visitor_gps_tracking creados');

    // ===== TABLA: access_notifications (sin FK constraints) =====
    console.log('\n📋 Creando tabla access_notifications...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS access_notifications (
        id SERIAL PRIMARY KEY,
        notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
          'visitor_arrival', 'visitor_checkout', 'visitor_authorization',
          'visitor_outside_facility', 'visitor_overstay',
          'employee_late_arrival', 'employee_early_departure', 'employee_break_exceeded',
          'unauthorized_access', 'kiosk_offline', 'gps_low_battery', 'gps_signal_lost', 'system_alert'
        )),
        priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        recipient_user_id UUID,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_visitor_id INTEGER,
        related_user_id UUID,
        related_kiosk_id INTEGER,
        related_attendance_id UUID,
        is_read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        action_taken BOOLEAN NOT NULL DEFAULT false,
        action_type VARCHAR(100),
        action_notes TEXT,
        action_taken_by UUID,
        action_taken_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}',
        expires_at TIMESTAMP WITH TIME ZONE,
        company_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla access_notifications creada (sin FK constraints)');

    // Crear índices para access_notifications
    console.log('📋 Creando índices para access_notifications...');
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_company_id ON access_notifications(company_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_recipient_user_id ON access_notifications(recipient_user_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_notification_type ON access_notifications(notification_type);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_priority ON access_notifications(priority);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_is_read ON access_notifications(is_read);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_created_at ON access_notifications(created_at);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_expires_at ON access_notifications(expires_at);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_compound1 ON access_notifications(company_id, recipient_user_id, is_read);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_compound2 ON access_notifications(company_id, notification_type, created_at);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_related_visitor_id ON access_notifications(related_visitor_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_related_user_id ON access_notifications(related_user_id);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS access_notifications_related_kiosk_id ON access_notifications(related_kiosk_id);`);
    console.log('✅ Índices de access_notifications creados');

    console.log('\n✅ ¡Todas las tablas creadas exitosamente!');
    await sequelize.close();

  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTables();
