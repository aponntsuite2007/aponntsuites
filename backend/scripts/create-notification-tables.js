const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Aedr15150302',
  database: 'attendance_system'
});

(async () => {
  await client.connect();
  console.log('🔌 Conectado\n');

  // Paso 1: Tablas
  console.log('📋 [1/3] Creando tablas...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS notification_workflows (
      id SERIAL PRIMARY KEY,
      process_key VARCHAR(100) NOT NULL,
      process_name VARCHAR(255) NOT NULL,
      module VARCHAR(50) NOT NULL,
      description TEXT,
      scope VARCHAR(20) NOT NULL DEFAULT 'aponnt',
      company_id INT,
      workflow_steps JSONB NOT NULL DEFAULT '{"steps": []}',
      channels JSONB DEFAULT '["email"]',
      primary_channel VARCHAR(20) DEFAULT 'email',
      requires_response BOOLEAN DEFAULT FALSE,
      response_type VARCHAR(20),
      response_options JSONB,
      response_timeout_hours INT DEFAULT 48,
      auto_action_on_timeout VARCHAR(50),
      priority VARCHAR(20) DEFAULT 'medium',
      sla_delivery_minutes INT,
      sla_response_hours INT,
      email_template_key VARCHAR(100),
      whatsapp_template_key VARCHAR(100),
      sms_template_key VARCHAR(100),
      push_template_key VARCHAR(100),
      recipient_type VARCHAR(20),
      recipient_rules JSONB,
      email_config_source VARCHAR(20) DEFAULT 'process_mapping',
      email_type VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by UUID,
      updated_by UUID,
      CONSTRAINT unique_process_per_scope UNIQUE (process_key, scope, company_id),
      CONSTRAINT valid_scope CHECK (scope IN ('aponnt', 'company')),
      CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id INT NOT NULL,
      process_key VARCHAR(100) NOT NULL,
      company_id INT,
      recipient_type VARCHAR(20) NOT NULL,
      recipient_id UUID,
      recipient_email VARCHAR(255),
      recipient_phone VARCHAR(20),
      channel VARCHAR(20) NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      delivered_at TIMESTAMP,
      read_at TIMESTAMP,
      response_at TIMESTAMP,
      response TEXT,
      response_metadata JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      error_message TEXT,
      provider VARCHAR(50),
      provider_message_id VARCHAR(255),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notification_templates (
      id SERIAL PRIMARY KEY,
      template_key VARCHAR(100) NOT NULL,
      channel VARCHAR(20) NOT NULL,
      language VARCHAR(10) DEFAULT 'es',
      scope VARCHAR(20) NOT NULL DEFAULT 'aponnt',
      company_id INT,
      subject VARCHAR(255),
      body TEXT NOT NULL,
      html_body TEXT,
      available_variables JSONB,
      response_buttons JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      version INT DEFAULT 1,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ [1/3] Tablas creadas\n');

  // Paso 2: Índices
  console.log('📋 [2/3] Creando índices...');

  const indices = [
    'idx_notification_workflows_scope ON notification_workflows(scope)',
    'idx_notification_workflows_module ON notification_workflows(module)',
    'idx_notification_workflows_process_key ON notification_workflows(process_key)',
    'idx_notification_log_workflow ON notification_log(workflow_id)',
    'idx_notification_log_status ON notification_log(status)',
    'idx_notification_log_channel ON notification_log(channel)'
  ];

  for (const idx of indices) {
    await client.query(`CREATE INDEX IF NOT EXISTS ${idx}`);
  }

  console.log('✅ [2/3] Índices creados\n');

  console.log('═══════════════════════════════════════');
  console.log('✅ MIGRACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════\n');

  await client.end();
  process.exit(0);
})().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
