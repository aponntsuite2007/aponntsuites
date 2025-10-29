/**
 * MIGRACIÓN: Partners System (Raw SQL con AutoCommit)
 *
 * Ejecuta SQL puro statement por statement para evitar problemas
 * de Foreign Keys en transacciones implícitas de PostgreSQL
 *
 * Uso:
 *   node migrations-sequelize/20251024-partners-raw-sql.js
 */

const { Client } = require('pg');
require('dotenv').config();

const SQL_STATEMENTS = [
  // DROP TABLES
  'DROP TABLE IF EXISTS partner_commissions_log CASCADE',
  'DROP TABLE IF EXISTS partner_legal_consents CASCADE',
  'DROP TABLE IF EXISTS partner_mediation_cases CASCADE',
  'DROP TABLE IF EXISTS partner_service_conversations CASCADE',
  'DROP TABLE IF EXISTS partner_reviews CASCADE',
  'DROP TABLE IF EXISTS partner_availability CASCADE',
  'DROP TABLE IF EXISTS partner_service_requests CASCADE',
  'DROP TABLE IF EXISTS partner_notifications CASCADE',
  'DROP TABLE IF EXISTS partner_documents CASCADE',
  'DROP TABLE IF EXISTS partners CASCADE',
  'DROP TABLE IF EXISTS partner_roles CASCADE',

  // TABLE 1: partner_roles
  `CREATE TABLE partner_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('legal', 'medical', 'safety', 'coaching', 'audit', 'emergency', 'health', 'transport')),
    description TEXT,
    requires_license BOOLEAN DEFAULT false,
    requires_insurance BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // TABLE 2: partners
  `CREATE TABLE partners (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    partner_role_id INTEGER NOT NULL REFERENCES partner_roles(id) ON DELETE RESTRICT,

    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    profile_photo_url TEXT,
    bio TEXT,
    languages VARCHAR[],

    professional_licenses JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    experience_years INTEGER,
    specialties VARCHAR[],

    contract_type VARCHAR(50) NOT NULL DEFAULT 'per_service' CHECK (contract_type IN ('per_service', 'eventual', 'part_time', 'full_time')),
    commission_calculation VARCHAR(50) NOT NULL DEFAULT 'per_module_user',
    commission_percentage DECIMAL(5, 2),
    fixed_monthly_rate DECIMAL(10, 2),
    fixed_per_employee_rate DECIMAL(10, 2),

    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(2) DEFAULT 'AR',
    service_area VARCHAR[],

    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    total_services INTEGER DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'suspended', 'inactive')),
    approved_at TIMESTAMP,
    approved_by INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // TABLE 3: partner_documents
  `CREATE TABLE partner_documents (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('license', 'insurance', 'certification', 'id_document', 'tax_document', 'cv', 'portfolio', 'other')),
    document_name VARCHAR(255) NOT NULL,
    document_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),

    is_verified BOOLEAN DEFAULT false,
    verified_by INTEGER,
    verified_at TIMESTAMP,
    verification_notes TEXT,

    expiry_date DATE,
    is_expired BOOLEAN DEFAULT false,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // TABLE 4: partner_notifications
  `CREATE TABLE partner_notifications (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('new_service_request', 'service_confirmed', 'service_completed', 'payment_received', 'document_expiring', 'review_received', 'status_change', 'message_received', 'system')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    related_service_request_id INTEGER,

    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // TABLE 5: partner_availability
  `CREATE TABLE partner_availability (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,

    availability_status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'vacation', 'unavailable')),
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (end_date >= start_date),
    CHECK (end_time > start_time OR start_time IS NULL)
  )`,

  // TABLE 6: partner_service_requests
  `CREATE TABLE partner_service_requests (
    id SERIAL PRIMARY KEY,

    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,

    service_type VARCHAR(100) NOT NULL,
    service_description TEXT NOT NULL,

    requested_date DATE,
    requested_time TIME,
    is_urgent BOOLEAN DEFAULT false,
    is_emergency BOOLEAN DEFAULT false,

    service_location VARCHAR(20) DEFAULT 'on_site' CHECK (service_location IN ('on_site', 'partner_location', 'remote')),
    service_address TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled')),

    partner_response TEXT,
    partner_response_at TIMESTAMP,
    declined_reason TEXT,
    cancellation_reason TEXT,
    cancelled_by VARCHAR(20),

    completed_at TIMESTAMP,
    completion_notes TEXT,

    quoted_price DECIMAL(10, 2),
    final_price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'ARS',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // TABLE 7: partner_reviews
  `CREATE TABLE partner_reviews (
    id SERIAL PRIMARY KEY,

    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_request_id INTEGER REFERENCES partner_service_requests(id) ON DELETE SET NULL,

    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
    punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),

    comment TEXT,
    pros TEXT[],
    cons TEXT[],

    partner_response TEXT,
    partner_response_at TIMESTAMP,

    is_public BOOLEAN DEFAULT true,
    is_verified_service BOOLEAN DEFAULT false,
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    moderated_by INTEGER REFERENCES users(id),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(partner_id, reviewer_id, service_request_id)
  )`,

  // TABLE 8: partner_service_conversations
  `CREATE TABLE partner_service_conversations (
    id SERIAL PRIMARY KEY,

    service_request_id INTEGER NOT NULL REFERENCES partner_service_requests(id) ON DELETE CASCADE,

    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'partner', 'admin', 'mediator')),
    sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    partner_sender_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,

    message TEXT NOT NULL,
    attachments JSONB,

    parent_message_id INTEGER REFERENCES partner_service_conversations(id),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_deadline TIMESTAMP,
    is_urgent BOOLEAN DEFAULT false,

    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,

    CHECK (
      (sender_type = 'partner' AND partner_sender_id IS NOT NULL AND sender_id IS NULL) OR
      (sender_type != 'partner' AND sender_id IS NOT NULL AND partner_sender_id IS NULL)
    )
  )`,

  // FK a partner_notifications
  `ALTER TABLE partner_notifications
   ADD CONSTRAINT fk_partner_notifications_service_request
   FOREIGN KEY (related_service_request_id)
   REFERENCES partner_service_requests(id)
   ON DELETE SET NULL`,

  // TABLE 9: partner_mediation_cases
  `CREATE TABLE partner_mediation_cases (
    id SERIAL PRIMARY KEY,

    service_request_id INTEGER NOT NULL REFERENCES partner_service_requests(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    case_type VARCHAR(50) NOT NULL CHECK (case_type IN ('payment_dispute', 'service_quality', 'cancellation_dispute', 'contract_breach', 'other')),
    filed_by VARCHAR(20) NOT NULL CHECK (filed_by IN ('client', 'partner')),
    description TEXT NOT NULL,
    evidence_urls TEXT[],

    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),

    resolution TEXT,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    outcome VARCHAR(50),

    refund_amount DECIMAL(10, 2),
    compensation_amount DECIMAL(10, 2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // TABLE 10: partner_legal_consents
  `CREATE TABLE partner_legal_consents (
    id SERIAL PRIMARY KEY,

    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('terms_of_service', 'privacy_policy', 'commission_agreement', 'liability_waiver', 'data_processing')),
    consent_version VARCHAR(20) NOT NULL,

    digital_signature TEXT NOT NULL,
    signature_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    signature_ip VARCHAR(50) NOT NULL,
    user_agent TEXT,

    consent_text TEXT NOT NULL,
    consent_text_hash VARCHAR(64) NOT NULL,

    commission_rate DECIMAL(5, 2),
    commission_calculation VARCHAR(50),

    is_valid BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP,
    revoked_reason TEXT
  )`,

  // TABLE 11: partner_commissions_log
  `CREATE TABLE partner_commissions_log (
    id SERIAL PRIMARY KEY,

    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
    service_request_id INTEGER REFERENCES partner_service_requests(id) ON DELETE SET NULL,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,

    calculation_method VARCHAR(50) NOT NULL CHECK (calculation_method IN ('per_module_user', 'per_employee', 'per_company', 'per_service')),
    base_amount DECIMAL(10, 2) NOT NULL,
    commission_percentage DECIMAL(5, 2),
    fixed_amount DECIMAL(10, 2),
    commission_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'ARS',

    period_start DATE,
    period_end DATE,

    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'cancelled')),
    paid_at TIMESTAMP,
    payment_reference VARCHAR(255),
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  // INDEXES
  'CREATE INDEX idx_partner_documents_partner ON partner_documents(partner_id)',
  'CREATE INDEX idx_partner_documents_type ON partner_documents(document_type)',
  'CREATE INDEX idx_partner_notifications_partner ON partner_notifications(partner_id)',
  'CREATE INDEX idx_partner_availability_partner ON partner_availability(partner_id)',
  'CREATE INDEX idx_partner_service_requests_partner ON partner_service_requests(partner_id)',
  'CREATE INDEX idx_partner_service_requests_company ON partner_service_requests(company_id)',
  'CREATE INDEX idx_partner_service_requests_status ON partner_service_requests(status)',
  'CREATE INDEX idx_partner_reviews_partner ON partner_reviews(partner_id)',
  'CREATE INDEX idx_partner_reviews_reviewer ON partner_reviews(reviewer_id)',
  'CREATE INDEX idx_partner_reviews_public ON partner_reviews(is_public) WHERE is_public = true',
  'CREATE INDEX idx_partner_conversations_service ON partner_service_conversations(service_request_id)',
  'CREATE INDEX idx_partner_mediation_partner ON partner_mediation_cases(partner_id)',
  'CREATE INDEX idx_partner_mediation_company ON partner_mediation_cases(company_id)',
  'CREATE INDEX idx_partner_consents_partner ON partner_legal_consents(partner_id)',
  'CREATE INDEX idx_partner_commissions_partner ON partner_commissions_log(partner_id)',
  'CREATE INDEX idx_partner_commissions_company ON partner_commissions_log(company_id)',

  // INSERT INITIAL DATA
  `INSERT INTO partner_roles (role_name, category, description, requires_license, requires_insurance) VALUES
   ('Abogado Laboralista', 'legal', 'Especialista en derecho laboral y relaciones laborales', true, true),
   ('Médico Laboral', 'medical', 'Médico especializado en salud ocupacional', true, true),
   ('Responsable de Seguridad e Higiene', 'safety', 'Profesional certificado en seguridad e higiene laboral', true, true),
   ('Coach Empresarial', 'coaching', 'Coach certificado para desarrollo de equipos', false, false),
   ('Auditor Externo', 'audit', 'Auditor independiente para procesos empresariales', true, true),
   ('Servicio de Emergencias', 'emergency', 'Servicios de emergencia médica empresarial', true, true),
   ('Enfermero Ocupacional', 'health', 'Enfermero especializado en salud laboral', true, false),
   ('Nutricionista Empresarial', 'health', 'Nutricionista para programas de bienestar', true, false),
   ('Psicólogo Laboral', 'health', 'Psicólogo especializado en salud mental laboral', true, false),
   ('Transporte Corporativo', 'transport', 'Servicios de transporte para empresas', false, true)`,

  // TRIGGERS
  `CREATE OR REPLACE FUNCTION update_partner_rating()
   RETURNS TRIGGER AS $$
   BEGIN
       UPDATE partners
       SET
           rating = (
               SELECT ROUND(AVG(rating)::numeric, 2)
               FROM partner_reviews
               WHERE partner_id = NEW.partner_id AND is_public = true
           ),
           total_reviews = (
               SELECT COUNT(*)
               FROM partner_reviews
               WHERE partner_id = NEW.partner_id AND is_public = true
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = NEW.partner_id;

       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  `CREATE TRIGGER trigger_update_partner_rating
   AFTER INSERT OR UPDATE ON partner_reviews
   FOR EACH ROW
   EXECUTE FUNCTION update_partner_rating()`,

  `CREATE OR REPLACE FUNCTION increment_partner_services()
   RETURNS TRIGGER AS $$
   BEGIN
       IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
           UPDATE partners
           SET
               total_services = total_services + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = NEW.partner_id;
       END IF;

       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  `CREATE TRIGGER trigger_increment_partner_services
   AFTER UPDATE ON partner_service_requests
   FOR EACH ROW
   EXECUTE FUNCTION increment_partner_services()`,

  `CREATE OR REPLACE FUNCTION create_initial_conversation()
   RETURNS TRIGGER AS $$
   BEGIN
       INSERT INTO partner_service_conversations (
           service_request_id,
           sender_type,
           sender_id,
           message,
           sent_at
       ) VALUES (
           NEW.id,
           'client',
           NEW.user_id,
           'Solicitud de servicio creada: ' || NEW.service_description,
           NEW.created_at
       );

       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  `CREATE TRIGGER trigger_create_initial_conversation
   AFTER INSERT ON partner_service_requests
   FOR EACH ROW
   EXECUTE FUNCTION create_initial_conversation()`,

  `CREATE OR REPLACE FUNCTION notify_partner_new_request()
   RETURNS TRIGGER AS $$
   BEGIN
       INSERT INTO partner_notifications (
           partner_id,
           notification_type,
           title,
           message,
           related_service_request_id,
           created_at
       ) VALUES (
           NEW.partner_id,
           'new_service_request',
           'Nueva solicitud de servicio',
           'Tienes una nueva solicitud de servicio de ' ||
           (SELECT name FROM companies WHERE id = NEW.company_id),
           NEW.id,
           NEW.created_at
       );

       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  `CREATE TRIGGER trigger_notify_partner_new_request
   AFTER INSERT ON partner_service_requests
   FOR EACH ROW
   EXECUTE FUNCTION notify_partner_new_request()`,

  `CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
       NEW.updated_at = CURRENT_TIMESTAMP;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,

  `CREATE TRIGGER trigger_partners_updated_at
   BEFORE UPDATE ON partners
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column()`,

  `CREATE TRIGGER trigger_partner_reviews_updated_at
   BEFORE UPDATE ON partner_reviews
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column()`,

  `CREATE TRIGGER trigger_partner_service_requests_updated_at
   BEFORE UPDATE ON partner_service_requests
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column()`,

  `CREATE TRIGGER trigger_partner_mediation_updated_at
   BEFORE UPDATE ON partner_mediation_cases
   FOR EACH ROW
   EXECUTE FUNCTION update_updated_at_column()`
];

async function runMigration() {
  console.log('🚀 [PARTNERS MIGRATION] Iniciando migración Raw SQL...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    let currentStep = 0;
    const totalSteps = SQL_STATEMENTS.length;

    for (const sql of SQL_STATEMENTS) {
      currentStep++;

      // Progress indicator
      const description = sql.substring(0, 60).trim() + (sql.length > 60 ? '...' : '');
      console.log(`[${currentStep}/${totalSteps}] ${description}`);

      try {
        await client.query(sql);
      } catch (error) {
        console.error(`\n❌ ERROR en statement ${currentStep}:`);
        console.error(`   SQL: ${sql.substring(0, 100)}...`);
        console.error(`   Mensaje: ${error.message}\n`);
        throw error;
      }
    }

    console.log('\n✅ TODAS LAS STATEMENTS EJECUTADAS!\n');

    // Verificación
    console.log('🔍 Verificando instalación...\n');

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'partner%'
      ORDER BY table_name
    `);

    console.log('📊 Tablas creadas:');
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    const rolesResult = await client.query('SELECT COUNT(*) as count FROM partner_roles');
    console.log(`\n✅ Roles insertados: ${rolesResult.rows[0].count}`);

    const triggersResult = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name LIKE '%partner%'
      ORDER BY trigger_name
    `);

    console.log('\n🔧 Triggers instalados:');
    triggersResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.trigger_name} → ${row.event_object_table}`);
    });

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Crear modelos Sequelize (Partner, PartnerRole, etc.)');
    console.log('   2. Crear API REST (/api/partners)');
    console.log('   3. Crear formulario de registro público');
    console.log('   4. Implementar sistema de firma digital');
    console.log('   5. Crear sección admin en panel-administrativo.html');
    console.log('   6. Crear marketplace en panel-empresa.html\n');

  } catch (error) {
    console.error('\n❌ ERROR EJECUTANDO MIGRACIÓN:');
    console.error(`   Mensaje: ${error.message}`);
    console.error(`\n   Stack completo:`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

// Ejecutar
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { runMigration };
