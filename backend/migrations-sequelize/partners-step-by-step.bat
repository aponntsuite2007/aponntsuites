@echo off
REM ============================================
REM PARTNERS MIGRATION - Step by Step
REM Ejecuta cada tabla en un proceso separado
REM ============================================

echo.
echo ========================================
echo PARTNERS SYSTEM MIGRATION
echo Step-by-Step (proceso separado por tabla)
echo ========================================
echo.

cd /d C:\Bio\sistema_asistencia_biometrico\backend

echo [1/17] Eliminando tablas existentes...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query('DROP TABLE IF EXISTS partner_commissions_log CASCADE');await c.query('DROP TABLE IF EXISTS partner_legal_consents CASCADE');await c.query('DROP TABLE IF EXISTS partner_mediation_cases CASCADE');await c.query('DROP TABLE IF EXISTS partner_service_conversations CASCADE');await c.query('DROP TABLE IF EXISTS partner_reviews CASCADE');await c.query('DROP TABLE IF EXISTS partner_availability CASCADE');await c.query('DROP TABLE IF EXISTS partner_service_requests CASCADE');await c.query('DROP TABLE IF EXISTS partner_notifications CASCADE');await c.query('DROP TABLE IF EXISTS partner_documents CASCADE');await c.query('DROP TABLE IF EXISTS partners CASCADE');await c.query('DROP TABLE IF EXISTS partner_roles CASCADE');await c.end();console.log('OK: Tablas eliminadas')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO al eliminar tablas
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [2/17] Creando partner_roles...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query(`CREATE TABLE partner_roles (id SERIAL PRIMARY KEY,role_name VARCHAR(100) NOT NULL UNIQUE,category VARCHAR(50) NOT NULL,description TEXT,requires_license BOOLEAN DEFAULT false,requires_insurance BOOLEAN DEFAULT false,is_active BOOLEAN DEFAULT true,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,CONSTRAINT valid_partner_role_category CHECK (category IN ('legal','medical','safety','coaching','audit','emergency','health','transport')))`);await c.end();console.log('OK: partner_roles')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en partner_roles
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [3/17] Creando partners...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query(`CREATE TABLE partners (id SERIAL PRIMARY KEY,email VARCHAR(255) NOT NULL UNIQUE,password_hash VARCHAR(255) NOT NULL,partner_role_id INTEGER NOT NULL,first_name VARCHAR(100),last_name VARCHAR(100),phone VARCHAR(20),mobile VARCHAR(20),profile_photo_url TEXT,bio TEXT,languages VARCHAR[],professional_licenses JSONB DEFAULT '[]'::jsonb,education JSONB DEFAULT '[]'::jsonb,certifications JSONB DEFAULT '[]'::jsonb,experience_years INTEGER,specialties VARCHAR[],contract_type VARCHAR(50) NOT NULL DEFAULT 'per_service',commission_calculation VARCHAR(50) NOT NULL DEFAULT 'per_module_user',commission_percentage DECIMAL(5,2),fixed_monthly_rate DECIMAL(10,2),fixed_per_employee_rate DECIMAL(10,2),city VARCHAR(100),province VARCHAR(100),country VARCHAR(2) DEFAULT 'AR',service_area VARCHAR[],rating DECIMAL(3,2) DEFAULT 0.00,total_reviews INTEGER DEFAULT 0,total_services INTEGER DEFAULT 0,status VARCHAR(20) NOT NULL DEFAULT 'pending',approved_at TIMESTAMP,approved_by INTEGER,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,CONSTRAINT valid_contract_type CHECK (contract_type IN ('per_service','eventual','part_time','full_time')),CONSTRAINT valid_partner_status CHECK (status IN ('pending','approved','active','suspended','inactive')),CONSTRAINT valid_partner_rating CHECK (rating >= 0 AND rating <= 5))`);await c.end();console.log('OK: partners')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en partners
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [4/17] Agregando FK: partners -^> partner_roles...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query('ALTER TABLE partners ADD CONSTRAINT fk_partners_role FOREIGN KEY (partner_role_id) REFERENCES partner_roles(id) ON DELETE RESTRICT');await c.end();console.log('OK: FK partners->partner_roles')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en FK
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [5/17] Creando partner_documents...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query(`CREATE TABLE partner_documents (id SERIAL PRIMARY KEY,partner_id INTEGER NOT NULL,document_type VARCHAR(50) NOT NULL,document_name VARCHAR(255) NOT NULL,document_url TEXT NOT NULL,file_size INTEGER,mime_type VARCHAR(100),is_verified BOOLEAN DEFAULT false,verified_by INTEGER,verified_at TIMESTAMP,verification_notes TEXT,expiry_date DATE,is_expired BOOLEAN DEFAULT false,uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,CONSTRAINT valid_document_type CHECK (document_type IN ('license','insurance','certification','id_document','tax_document','cv','portfolio','other')))`);await c.end();console.log('OK: partner_documents')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en partner_documents
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [6/17] Agregando FK: partner_documents -^> partners...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query('ALTER TABLE partner_documents ADD CONSTRAINT fk_partner_documents_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE');await c.end();console.log('OK: FK partner_documents->partners')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en FK
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [7/17] Creando partner_notifications...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query(`CREATE TABLE partner_notifications (id SERIAL PRIMARY KEY,partner_id INTEGER NOT NULL,notification_type VARCHAR(50) NOT NULL,title VARCHAR(255) NOT NULL,message TEXT NOT NULL,related_service_request_id INTEGER,is_read BOOLEAN DEFAULT false,read_at TIMESTAMP,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,CONSTRAINT valid_notification_type CHECK (notification_type IN ('new_service_request','service_confirmed','service_completed','payment_received','document_expiring','review_received','status_change','message_received','system')))`);await c.end();console.log('OK: partner_notifications')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en partner_notifications
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [8/17] Agregando FK: partner_notifications -^> partners...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query('ALTER TABLE partner_notifications ADD CONSTRAINT fk_partner_notifications_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE');await c.end();console.log('OK: FK partner_notifications->partners')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en FK
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [9/17] Creando partner_availability...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query(`CREATE TABLE partner_availability (id SERIAL PRIMARY KEY,partner_id INTEGER NOT NULL,start_date DATE NOT NULL,end_date DATE NOT NULL,start_time TIME,end_time TIME,availability_status VARCHAR(20) NOT NULL DEFAULT 'available',notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,CONSTRAINT valid_date_range CHECK (end_date >= start_date),CONSTRAINT valid_time_range CHECK (end_time > start_time OR start_time IS NULL),CONSTRAINT valid_availability_status CHECK (availability_status IN ('available','busy','vacation','unavailable')))`);await c.end();console.log('OK: partner_availability')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en partner_availability
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [10/17] Agregando FK: partner_availability -^> partners...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query('ALTER TABLE partner_availability ADD CONSTRAINT fk_partner_availability_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE');await c.end();console.log('OK: FK partner_availability->partners')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en FK
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [11/17] Creando partner_service_requests...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query(`CREATE TABLE partner_service_requests (id SERIAL PRIMARY KEY,partner_id INTEGER NOT NULL,company_id INTEGER NOT NULL,user_id INTEGER NOT NULL,service_type VARCHAR(100) NOT NULL,service_description TEXT NOT NULL,requested_date DATE,requested_time TIME,is_urgent BOOLEAN DEFAULT false,is_emergency BOOLEAN DEFAULT false,service_location VARCHAR(20) DEFAULT 'on_site',service_address TEXT,status VARCHAR(20) NOT NULL DEFAULT 'pending',partner_response TEXT,partner_response_at TIMESTAMP,declined_reason TEXT,cancellation_reason TEXT,cancelled_by VARCHAR(20),completed_at TIMESTAMP,completion_notes TEXT,quoted_price DECIMAL(10,2),final_price DECIMAL(10,2),currency VARCHAR(3) DEFAULT 'ARS',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,CONSTRAINT valid_service_location CHECK (service_location IN ('on_site','partner_location','remote')),CONSTRAINT valid_service_status CHECK (status IN ('pending','accepted','declined','in_progress','completed','cancelled')))`);await c.end();console.log('OK: partner_service_requests')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en partner_service_requests
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [12/17] Agregando FKs a partner_service_requests...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query('ALTER TABLE partner_service_requests ADD CONSTRAINT fk_partner_service_requests_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE RESTRICT');await c.query('ALTER TABLE partner_service_requests ADD CONSTRAINT fk_partner_service_requests_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE');await c.query('ALTER TABLE partner_service_requests ADD CONSTRAINT fk_partner_service_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');await c.end();console.log('OK: FKs partner_service_requests')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en FKs
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [13/17] Insertando roles iniciales...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query(`INSERT INTO partner_roles (role_name,category,description,requires_license,requires_insurance) VALUES ('Abogado Laboralista','legal','Especialista en derecho laboral y relaciones laborales',true,true),('Médico Laboral','medical','Médico especializado en salud ocupacional',true,true),('Responsable de Seguridad e Higiene','safety','Profesional certificado en seguridad e higiene laboral',true,true),('Coach Empresarial','coaching','Coach certificado para desarrollo de equipos',false,false),('Auditor Externo','audit','Auditor independiente para procesos empresariales',true,true),('Servicio de Emergencias','emergency','Servicios de emergencia médica empresarial',true,true),('Enfermero Ocupacional','health','Enfermero especializado en salud laboral',true,false),('Nutricionista Empresarial','health','Nutricionista para programas de bienestar',true,false),('Psicólogo Laboral','health','Psicólogo especializado en salud mental laboral',true,false),('Transporte Corporativo','transport','Servicios de transporte para empresas',false,true)`);await c.end();console.log('OK: 10 roles insertados')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en insertar roles
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [14/17] Creando indices...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query('CREATE INDEX idx_partner_documents_partner ON partner_documents(partner_id)');await c.query('CREATE INDEX idx_partner_documents_type ON partner_documents(document_type)');await c.query('CREATE INDEX idx_partner_notifications_partner ON partner_notifications(partner_id)');await c.query('CREATE INDEX idx_partner_availability_partner ON partner_availability(partner_id)');await c.query('CREATE INDEX idx_partner_service_requests_partner ON partner_service_requests(partner_id)');await c.query('CREATE INDEX idx_partner_service_requests_company ON partner_service_requests(company_id)');await c.query('CREATE INDEX idx_partner_service_requests_status ON partner_service_requests(status)');await c.end();console.log('OK: Indices creados')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en indices
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [15/17] Creando funcion update_updated_at...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query(`CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql`);await c.end();console.log('OK: Funcion update_updated_at')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en funcion
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [16/17] Creando trigger para partners...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();await c.query('CREATE TRIGGER trigger_partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');await c.query('CREATE TRIGGER trigger_partner_service_requests_updated_at BEFORE UPDATE ON partner_service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()');await c.end();console.log('OK: Triggers created')})().catch(e=>console.error('ERROR:',e.message))"
if errorlevel 1 (
    echo FALLO en trigger
    exit /b 1
)

timeout /t 2 /nobreak >nul

echo [17/17] Verificando instalacion...
node -e "const{Client}=require('pg');require('dotenv').config();(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL.includes('localhost')?false:{rejectUnauthorized:false}});await c.connect();const r=await c.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'partner%%' ORDER BY table_name`);console.log('Tablas creadas:');r.rows.forEach((x,i)=>console.log(`  ${i+1}. ${x.table_name}`));const r2=await c.query('SELECT COUNT(*) as count FROM partner_roles');console.log(`Roles insertados: ${r2.rows[0].count}`);await c.end()})().catch(e=>console.error('ERROR:',e.message))"

echo.
echo ========================================
echo MIGRACION COMPLETADA EXITOSAMENTE!
echo ========================================
echo.
echo Proximos pasos:
echo   1. Crear modelos Sequelize
echo   2. Crear API REST
echo   3. Frontend Admin + Empresa
echo.

pause
