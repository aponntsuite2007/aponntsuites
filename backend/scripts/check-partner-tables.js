const {Client} = require('pg');
require('dotenv').config();

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Check if partners table exists
    const partnersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'partners'
      )
    `);

    // Check if partner_status_history exists
    const historyCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'partner_status_history'
      )
    `);

    console.log('📋 Estado de tablas:');
    console.log('  - partners:', partnersCheck.rows[0].exists ? '✅ Existe' : '❌ No existe');
    console.log('  - partner_status_history:', historyCheck.rows[0].exists ? '✅ Existe' : '❌ No existe');

    // If partner_status_history doesn't exist, create it manually
    if (!historyCheck.rows[0].exists && partnersCheck.rows[0].exists) {
      console.log('\n🔧 Creando tabla partner_status_history...');

      // Update partners status constraint
      await client.query(`ALTER TABLE partners DROP CONSTRAINT IF EXISTS partners_status_check`);
      await client.query(`
        ALTER TABLE partners
        ADD CONSTRAINT partners_status_check
        CHECK (status IN ('pendiente_aprobacion', 'activo', 'suspendido', 'baja', 'renuncia'))
      `);
      await client.query(`ALTER TABLE partners ALTER COLUMN status SET DEFAULT 'pendiente_aprobacion'`);

      // Create history table
      await client.query(`
        CREATE TABLE partner_status_history (
          id BIGSERIAL PRIMARY KEY,
          partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
          old_status VARCHAR(50) NULL,
          new_status VARCHAR(50) NOT NULL CHECK (new_status IN ('pendiente_aprobacion', 'activo', 'suspendido', 'baja', 'renuncia')),
          changed_by_user_id UUID NOT NULL,
          changed_by_role VARCHAR(50) NOT NULL,
          changed_by_name VARCHAR(255) NOT NULL,
          change_reason TEXT NULL,
          change_notes TEXT NULL,
          notification_sent BOOLEAN DEFAULT FALSE,
          notification_sent_at TIMESTAMP NULL,
          email_sent_to VARCHAR(255) NULL,
          clients_notified JSONB DEFAULT '[]'::jsonb,
          active_contracts_count INTEGER DEFAULT 0,
          ip_address INET NULL,
          user_agent TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await client.query(`CREATE INDEX idx_partner_status_history_partner ON partner_status_history(partner_id, created_at DESC)`);
      await client.query(`CREATE INDEX idx_partner_status_history_changed_by ON partner_status_history(changed_by_user_id)`);
      await client.query(`CREATE INDEX idx_partner_status_history_status ON partner_status_history(new_status, created_at DESC)`);

      console.log('✅ Tabla partner_status_history creada!');
    }

    // Check notifications table columns
    const notifColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'notifications'
        AND column_name IN ('related_partner_id', 'related_service_request_id', 'sender_user_id', 'sender_type')
    `);

    console.log('\n📋 Columnas de notifications:');
    const existingColumns = notifColumns.rows.map(r => r.column_name);
    const neededColumns = ['related_partner_id', 'related_service_request_id', 'sender_user_id', 'sender_type'];

    for (const col of neededColumns) {
      if (existingColumns.includes(col)) {
        console.log(` ✅ ${col}`);
      } else {
        console.log(`  ❌ ${col} - agregando...`);

        if (col === 'related_partner_id') {
          await client.query(`ALTER TABLE notifications ADD COLUMN related_partner_id INTEGER NULL REFERENCES partners(id) ON DELETE SET NULL`);
        } else if (col === 'related_service_request_id') {
          await client.query(`ALTER TABLE notifications ADD COLUMN related_service_request_id INTEGER NULL`);
        } else if (col === 'sender_user_id') {
          await client.query(`ALTER TABLE notifications ADD COLUMN sender_user_id UUID NULL`);
        } else if (col === 'sender_type') {
          await client.query(`ALTER TABLE notifications ADD COLUMN sender_type VARCHAR(50) NULL DEFAULT 'user'`);
          await client.query(`ALTER TABLE notifications ADD CONSTRAINT notifications_sender_type_check CHECK (sender_type IN ('user', 'system', 'admin', 'partner', 'vendor'))`);
        }

        console.log(`   ✅ Agregado!`);
      }
    }

    console.log('\n✅ Todas las columnas necesarias están presentes!');

  } finally {
    await client.end();
  }
}

checkTables().catch(console.error);
