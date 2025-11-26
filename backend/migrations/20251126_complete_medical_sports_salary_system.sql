-- =====================================================================================
-- MIGRACIÓN COMPLETA: Sistema Médico Avanzado + Deportes + Datos Salariales
-- Fecha: 2025-11-26
-- Descripción: Agrega todas las tablas necesarias para un sistema de RRHH de alto nivel
-- =====================================================================================

-- =====================================================================================
-- PARTE 1: DATOS ANTROPOMÉTRICOS Y FÍSICOS
-- =====================================================================================

-- Tabla: Historial de medidas antropométricas (peso, altura, etc.)
CREATE TABLE IF NOT EXISTS user_anthropometric_data (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight_kg DECIMAL(5,2),                    -- Peso en kg
    height_cm DECIMAL(5,2),                    -- Altura en cm
    bmi DECIMAL(4,2),                          -- IMC calculado automáticamente
    waist_circumference_cm DECIMAL(5,2),       -- Perímetro de cintura
    hip_circumference_cm DECIMAL(5,2),         -- Perímetro de cadera
    body_fat_percentage DECIMAL(4,2),          -- % grasa corporal
    muscle_mass_kg DECIMAL(5,2),               -- Masa muscular
    blood_pressure_systolic INTEGER,           -- Presión sistólica
    blood_pressure_diastolic INTEGER,          -- Presión diastólica
    heart_rate_bpm INTEGER,                    -- Frecuencia cardíaca
    blood_type VARCHAR(5),                     -- Grupo sanguíneo (A+, A-, B+, etc.)
    rh_factor VARCHAR(10),                     -- Factor RH
    measured_by VARCHAR(200),                  -- Quién tomó las medidas
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_anthropometric_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_anthropometric_user ON user_anthropometric_data(user_id);
CREATE INDEX idx_anthropometric_company ON user_anthropometric_data(company_id);
CREATE INDEX idx_anthropometric_date ON user_anthropometric_data(measurement_date);

-- =====================================================================================
-- PARTE 2: ENFERMEDADES CRÓNICAS DETALLADAS
-- =====================================================================================

-- Catálogo de enfermedades crónicas comunes
CREATE TABLE IF NOT EXISTS chronic_conditions_catalog (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,          -- Código CIE-10 o interno
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),                      -- Cardiovascular, Metabólico, etc.
    description TEXT,
    severity_default VARCHAR(20) DEFAULT 'moderate',  -- mild, moderate, severe
    requires_medication BOOLEAN DEFAULT false,
    requires_monitoring BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar enfermedades crónicas comunes
INSERT INTO chronic_conditions_catalog (code, name, category, requires_medication, requires_monitoring) VALUES
('HTA', 'Hipertensión Arterial', 'Cardiovascular', true, true),
('DM1', 'Diabetes Mellitus Tipo 1', 'Metabólico', true, true),
('DM2', 'Diabetes Mellitus Tipo 2', 'Metabólico', true, true),
('ASMA', 'Asma Bronquial', 'Respiratorio', true, true),
('EPOC', 'Enfermedad Pulmonar Obstructiva Crónica', 'Respiratorio', true, true),
('HIPOT', 'Hipotiroidismo', 'Endocrino', true, true),
('HIPERT', 'Hipertiroidismo', 'Endocrino', true, true),
('ARTRITIS', 'Artritis Reumatoide', 'Reumatológico', true, true),
('ARTROSIS', 'Artrosis/Osteoartritis', 'Reumatológico', true, false),
('EPILEPSIA', 'Epilepsia', 'Neurológico', true, true),
('MIGRANA', 'Migraña Crónica', 'Neurológico', true, false),
('FIBRO', 'Fibromialgia', 'Reumatológico', true, false),
('CELIAC', 'Enfermedad Celíaca', 'Digestivo', false, true),
('CROHN', 'Enfermedad de Crohn', 'Digestivo', true, true),
('COLITIS', 'Colitis Ulcerosa', 'Digestivo', true, true),
('IRC', 'Insuficiencia Renal Crónica', 'Renal', true, true),
('ICC', 'Insuficiencia Cardíaca Congestiva', 'Cardiovascular', true, true),
('ANEMIA', 'Anemia Crónica', 'Hematológico', true, true),
('OSTEO', 'Osteoporosis', 'Óseo', true, true),
('LUPUS', 'Lupus Eritematoso Sistémico', 'Autoinmune', true, true),
('PSORIASIS', 'Psoriasis', 'Dermatológico', true, false),
('GOTA', 'Gota', 'Metabólico', true, true),
('HEPATITIS', 'Hepatitis Crónica', 'Hepático', true, true),
('CIRROSIS', 'Cirrosis Hepática', 'Hepático', true, true),
('HIV', 'VIH/SIDA', 'Infeccioso', true, true),
('APNEA', 'Apnea del Sueño', 'Respiratorio', false, true),
('PARKINSON', 'Enfermedad de Parkinson', 'Neurológico', true, true),
('ALZHEIMER', 'Enfermedad de Alzheimer', 'Neurológico', true, true),
('ESCLEROSIS', 'Esclerosis Múltiple', 'Neurológico', true, true),
('OTRO', 'Otra Condición Crónica', 'Otros', false, false)
ON CONFLICT (code) DO NOTHING;

-- Tabla mejorada de condiciones crónicas del usuario
CREATE TABLE IF NOT EXISTS user_chronic_conditions_v2 (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    condition_catalog_id INTEGER REFERENCES chronic_conditions_catalog(id),
    condition_name VARCHAR(200),               -- Si es "Otra" u opción personalizada
    diagnosis_date DATE,
    diagnosed_by VARCHAR(200),
    severity VARCHAR(20) DEFAULT 'moderate',   -- mild, moderate, severe, controlled
    current_status VARCHAR(30) DEFAULT 'active',  -- active, controlled, remission, resolved
    treatment_status VARCHAR(30),              -- under_treatment, no_treatment, monitoring
    affects_work_capacity BOOLEAN DEFAULT false,
    work_restrictions TEXT,
    medications_required TEXT,
    monitoring_frequency VARCHAR(50),          -- daily, weekly, monthly, quarterly
    last_checkup_date DATE,
    next_checkup_date DATE,
    specialist_doctor VARCHAR(200),
    specialist_phone VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chronic_v2_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_chronic_v2_user ON user_chronic_conditions_v2(user_id);
CREATE INDEX idx_chronic_v2_company ON user_chronic_conditions_v2(company_id);

-- =====================================================================================
-- PARTE 3: HISTORIAL DE CIRUGÍAS
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_surgeries (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    surgery_type VARCHAR(200) NOT NULL,        -- Tipo de cirugía
    surgery_date DATE,
    hospital_clinic VARCHAR(200),
    surgeon_name VARCHAR(200),
    reason TEXT,                               -- Motivo de la cirugía
    complications BOOLEAN DEFAULT false,
    complications_details TEXT,
    recovery_days INTEGER,                     -- Días de recuperación
    return_to_work_date DATE,
    has_permanent_effects BOOLEAN DEFAULT false,
    permanent_effects_details TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_frequency VARCHAR(50),
    last_follow_up_date DATE,
    documents_attached TEXT[],                 -- Array de IDs de documentos
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_surgeries_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_surgeries_user ON user_surgeries(user_id);
CREATE INDEX idx_surgeries_company ON user_surgeries(company_id);

-- =====================================================================================
-- PARTE 4: TRATAMIENTOS PSIQUIÁTRICOS/PSICOLÓGICOS
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_psychiatric_treatments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    treatment_type VARCHAR(50) NOT NULL,       -- psychiatric, psychological, both
    condition_treated VARCHAR(200),            -- Ej: Depresión, Ansiedad, Trastorno bipolar
    diagnosis_date DATE,
    treatment_start_date DATE,
    treatment_end_date DATE,                   -- NULL si está vigente
    is_current BOOLEAN DEFAULT true,           -- ¿Tratamiento vigente?
    treating_professional VARCHAR(200),
    professional_type VARCHAR(50),             -- psychiatrist, psychologist, both
    professional_license VARCHAR(50),
    professional_phone VARCHAR(50),
    session_frequency VARCHAR(50),             -- weekly, biweekly, monthly
    takes_psychiatric_medication BOOLEAN DEFAULT false,
    medication_details TEXT,                   -- Detalle de medicamentos psiquiátricos
    medication_side_effects TEXT,
    affects_work_performance BOOLEAN DEFAULT false,
    work_accommodations_needed TEXT,           -- Adaptaciones laborales necesarias
    emergency_protocol TEXT,                   -- Protocolo en caso de crisis
    hospitalization_history BOOLEAN DEFAULT false,
    hospitalization_details TEXT,
    last_crisis_date DATE,
    crisis_frequency VARCHAR(50),
    confidentiality_level VARCHAR(20) DEFAULT 'restricted',  -- restricted, hr_only, supervisor_aware
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_psychiatric_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_psychiatric_user ON user_psychiatric_treatments(user_id);
CREATE INDEX idx_psychiatric_company ON user_psychiatric_treatments(company_id);
CREATE INDEX idx_psychiatric_current ON user_psychiatric_treatments(is_current);

-- =====================================================================================
-- PARTE 5: PRÁCTICAS SALUDABLES Y DEPORTIVAS
-- =====================================================================================

-- Catálogo de deportes
CREATE TABLE IF NOT EXISTS sports_catalog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),                      -- individual, team, combat, aquatic, extreme, etc.
    is_extreme BOOLEAN DEFAULT false,
    risk_level VARCHAR(20) DEFAULT 'low',      -- low, medium, high, very_high
    requires_medical_clearance BOOLEAN DEFAULT false,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Insertar deportes comunes
INSERT INTO sports_catalog (name, category, is_extreme, risk_level) VALUES
('Fútbol', 'team', false, 'medium'),
('Básquet', 'team', false, 'medium'),
('Vóley', 'team', false, 'low'),
('Tenis', 'individual', false, 'low'),
('Natación', 'aquatic', false, 'low'),
('Running/Jogging', 'individual', false, 'low'),
('Ciclismo', 'individual', false, 'medium'),
('Gimnasio/Fitness', 'individual', false, 'low'),
('CrossFit', 'individual', false, 'medium'),
('Yoga', 'individual', false, 'low'),
('Pilates', 'individual', false, 'low'),
('Artes Marciales', 'combat', false, 'medium'),
('Boxeo', 'combat', false, 'high'),
('Rugby', 'team', false, 'high'),
('Hockey', 'team', false, 'high'),
('Golf', 'individual', false, 'low'),
('Atletismo', 'individual', false, 'low'),
('Escalada', 'individual', true, 'high'),
('Paracaidismo', 'individual', true, 'very_high'),
('Parapente', 'individual', true, 'very_high'),
('Bungee Jumping', 'individual', true, 'very_high'),
('Surf', 'aquatic', false, 'medium'),
('Kitesurf', 'aquatic', true, 'high'),
('Buceo', 'aquatic', false, 'medium'),
('Esquí', 'individual', false, 'high'),
('Snowboard', 'individual', false, 'high'),
('Motociclismo', 'individual', true, 'very_high'),
('Automovilismo', 'individual', true, 'very_high'),
('Mountain Bike', 'individual', true, 'high'),
('Triatlón', 'individual', false, 'medium'),
('Maratón', 'individual', false, 'medium'),
('Caminata/Senderismo', 'individual', false, 'low'),
('Danza/Baile', 'individual', false, 'low'),
('Paddle', 'individual', false, 'low'),
('Otro', 'other', false, 'low')
ON CONFLICT DO NOTHING;

-- Prácticas deportivas del usuario
CREATE TABLE IF NOT EXISTS user_sports_activities (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,
    sport_catalog_id INTEGER REFERENCES sports_catalog(id),
    sport_name VARCHAR(100),                   -- Si es "Otro"
    practice_level VARCHAR(30) NOT NULL,       -- recreational, amateur, semi_professional, professional
    frequency VARCHAR(30),                     -- daily, 2-3_weekly, weekly, monthly, occasional
    hours_per_week DECIMAL(4,1),
    years_practicing INTEGER,

    -- Para profesionales/semi-profesionales
    is_federated BOOLEAN DEFAULT false,
    federation_name VARCHAR(200),
    license_number VARCHAR(50),
    team_club_name VARCHAR(200),

    -- Competencias
    participates_in_competitions BOOLEAN DEFAULT false,
    competition_level VARCHAR(50),             -- local, regional, national, international
    competitions_per_year INTEGER,
    last_competition_date DATE,
    achievements TEXT,                         -- Logros deportivos

    -- Información adicional
    has_coach BOOLEAN DEFAULT false,
    coach_name VARCHAR(200),
    training_location VARCHAR(200),
    medical_clearance_required BOOLEAN DEFAULT false,
    medical_clearance_date DATE,
    medical_clearance_expiry DATE,

    -- Para deportes extremos
    is_extreme_sport BOOLEAN DEFAULT false,
    insurance_required BOOLEAN DEFAULT false,
    insurance_company VARCHAR(200),
    insurance_policy VARCHAR(100),

    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sports_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_sports_user ON user_sports_activities(user_id);
CREATE INDEX idx_sports_company ON user_sports_activities(company_id);

-- Hábitos saludables generales
CREATE TABLE IF NOT EXISTS user_healthy_habits (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,

    -- Actividad física general
    does_regular_exercise BOOLEAN DEFAULT false,
    exercise_minutes_per_week INTEGER,
    sedentary_hours_per_day INTEGER,

    -- Tabaquismo
    smoking_status VARCHAR(30),                -- never, former, current, occasional
    cigarettes_per_day INTEGER,
    smoking_years INTEGER,
    quit_date DATE,

    -- Alcohol
    alcohol_consumption VARCHAR(30),           -- never, occasional, moderate, frequent, heavy
    drinks_per_week INTEGER,

    -- Alimentación
    diet_type VARCHAR(50),                     -- regular, vegetarian, vegan, keto, other
    diet_restrictions TEXT,
    meals_per_day INTEGER,
    drinks_water_liters DECIMAL(3,1),

    -- Sueño
    average_sleep_hours DECIMAL(3,1),
    sleep_quality VARCHAR(30),                 -- poor, fair, good, excellent
    has_sleep_disorders BOOLEAN DEFAULT false,
    sleep_disorder_details TEXT,

    -- Estrés
    stress_level VARCHAR(30),                  -- low, moderate, high, very_high
    stress_management_activities TEXT,

    -- Chequeos preventivos
    last_general_checkup DATE,
    last_dental_checkup DATE,
    last_vision_checkup DATE,
    last_gynecological_checkup DATE,           -- Si aplica
    last_urological_checkup DATE,              -- Si aplica

    notes TEXT,
    last_updated DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_habits_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_habits_user ON user_healthy_habits(user_id);
CREATE INDEX idx_habits_company ON user_healthy_habits(company_id);

-- =====================================================================================
-- PARTE 6: DATOS SALARIALES Y DE REMUNERACIÓN
-- =====================================================================================

-- Catálogo de convenios colectivos de trabajo
CREATE TABLE IF NOT EXISTS labor_agreements_catalog (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(300) NOT NULL,
    industry VARCHAR(100),
    union_name VARCHAR(200),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar convenios comunes de Argentina
INSERT INTO labor_agreements_catalog (code, name, industry, union_name) VALUES
('130/75', 'CCT 130/75 - Empleados de Comercio', 'Comercio', 'FAECYS'),
('60/89', 'CCT 60/89 - Construcción', 'Construcción', 'UOCRA'),
('76/75', 'CCT 76/75 - Metalúrgicos', 'Metalurgia', 'UOM'),
('40/89', 'CCT 40/89 - Alimentación', 'Alimentación', 'STIA'),
('122/75', 'CCT 122/75 - Industria de la Carne', 'Frigoríficos', 'FGPIC'),
('17/75', 'CCT 17/75 - Textiles', 'Textil', 'AOT'),
('36/75', 'CCT 36/75 - Sanidad', 'Salud', 'FATSA'),
('108/75', 'CCT 108/75 - Gastronómicos', 'Gastronomía', 'UTHGRA'),
('244/94', 'CCT 244/94 - Transporte de Carga', 'Transporte', 'FETRA'),
('460/73', 'CCT 460/73 - Bancarios', 'Financiero', 'ASOCIACIÓN BANCARIA'),
('547/08', 'CCT 547/08 - Informática (Software)', 'Tecnología', 'UTICRA'),
('223/75', 'CCT 223/75 - Seguros', 'Seguros', 'SSN'),
('18/75', 'CCT 18/75 - Encargados de Edificios', 'Servicios', 'SUTERH'),
('501/07', 'CCT 501/07 - Trabajadores de Casas Particulares', 'Servicio Doméstico', 'UPACP'),
('OTRO', 'Otro Convenio/Fuera de Convenio', 'Otro', 'N/A')
ON CONFLICT (code) DO NOTHING;

-- Categorías salariales por convenio
CREATE TABLE IF NOT EXISTS salary_categories (
    id SERIAL PRIMARY KEY,
    labor_agreement_id INTEGER REFERENCES labor_agreements_catalog(id),
    category_code VARCHAR(20) NOT NULL,
    category_name VARCHAR(200) NOT NULL,
    description TEXT,
    base_salary_reference DECIMAL(12,2),       -- Salario base de referencia
    effective_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configuración salarial detallada del empleado
CREATE TABLE IF NOT EXISTS user_salary_config_v2 (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,

    -- Convenio y categoría
    labor_agreement_id INTEGER REFERENCES labor_agreements_catalog(id),
    salary_category_id INTEGER REFERENCES salary_categories(id),
    custom_category VARCHAR(100),              -- Si está fuera de convenio

    -- Tipo de remuneración
    payment_type VARCHAR(30) NOT NULL,         -- monthly, biweekly, weekly, daily, hourly

    -- Salarios
    base_salary DECIMAL(12,2) NOT NULL,        -- Salario básico
    gross_salary DECIMAL(12,2),                -- Salario bruto
    net_salary DECIMAL(12,2),                  -- Salario neto
    currency VARCHAR(10) DEFAULT 'ARS',

    -- Adicionales
    seniority_bonus DECIMAL(12,2) DEFAULT 0,   -- Adicional por antigüedad
    presentation_bonus DECIMAL(12,2) DEFAULT 0, -- Presentismo
    food_allowance DECIMAL(12,2) DEFAULT 0,    -- Viáticos/comida
    transport_allowance DECIMAL(12,2) DEFAULT 0, -- Transporte
    other_bonuses DECIMAL(12,2) DEFAULT 0,
    other_bonuses_detail TEXT,

    -- Horas y jornada
    contracted_hours_per_week DECIMAL(4,1) DEFAULT 48,
    work_schedule_type VARCHAR(30),            -- full_time, part_time, hourly
    hourly_rate DECIMAL(10,2),                 -- Valor hora (para jornaleros)
    overtime_rate_50 DECIMAL(10,2),            -- Valor hora extra 50%
    overtime_rate_100 DECIMAL(10,2),           -- Valor hora extra 100%

    -- Historial de aumentos
    last_salary_update DATE,
    previous_base_salary DECIMAL(12,2),
    salary_increase_percentage DECIMAL(5,2),
    salary_increase_reason VARCHAR(200),
    next_review_date DATE,

    -- Banco y forma de pago
    bank_name VARCHAR(100),
    bank_account_type VARCHAR(30),             -- savings, checking
    bank_account_number VARCHAR(50),
    bank_cbu VARCHAR(30),
    bank_alias VARCHAR(50),

    -- Vigencia
    effective_from DATE NOT NULL,
    effective_to DATE,                         -- NULL si está vigente
    is_current BOOLEAN DEFAULT true,

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    CONSTRAINT fk_salary_v2_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_salary_v2_user ON user_salary_config_v2(user_id);
CREATE INDEX idx_salary_v2_company ON user_salary_config_v2(company_id);
CREATE INDEX idx_salary_v2_current ON user_salary_config_v2(is_current);

-- Historial de liquidaciones/recibos de sueldo
CREATE TABLE IF NOT EXISTS user_payroll_records (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id INTEGER NOT NULL,

    -- Período
    period_year INTEGER NOT NULL,
    period_month INTEGER NOT NULL,
    period_type VARCHAR(30),                   -- first_half, second_half, monthly, weekly
    payment_date DATE,

    -- Conceptos de haberes
    base_salary DECIMAL(12,2),
    seniority_bonus DECIMAL(12,2) DEFAULT 0,
    presentation_bonus DECIMAL(12,2) DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    overtime_50_amount DECIMAL(12,2) DEFAULT 0,
    overtime_100_amount DECIMAL(12,2) DEFAULT 0,
    vacation_days_paid INTEGER DEFAULT 0,
    vacation_amount DECIMAL(12,2) DEFAULT 0,
    sac_aguinaldo DECIMAL(12,2) DEFAULT 0,     -- SAC/Aguinaldo
    commissions DECIMAL(12,2) DEFAULT 0,
    bonuses DECIMAL(12,2) DEFAULT 0,
    other_earnings DECIMAL(12,2) DEFAULT 0,
    other_earnings_detail TEXT,
    gross_total DECIMAL(12,2),

    -- Conceptos de deducciones
    jubilacion DECIMAL(12,2) DEFAULT 0,        -- 11% jubilación
    obra_social DECIMAL(12,2) DEFAULT 0,       -- 3% obra social
    ley_19032 DECIMAL(12,2) DEFAULT 0,         -- PAMI
    sindicato DECIMAL(12,2) DEFAULT 0,         -- Cuota sindical
    ganancias DECIMAL(12,2) DEFAULT 0,         -- Impuesto a las ganancias
    other_deductions DECIMAL(12,2) DEFAULT 0,
    other_deductions_detail TEXT,
    deductions_total DECIMAL(12,2),

    -- Totales
    net_salary DECIMAL(12,2),

    -- Horas trabajadas
    regular_hours_worked DECIMAL(6,2),
    overtime_50_hours DECIMAL(6,2) DEFAULT 0,
    overtime_100_hours DECIMAL(6,2) DEFAULT 0,
    total_hours_worked DECIMAL(6,2),

    -- Días
    days_worked INTEGER,
    absent_days INTEGER DEFAULT 0,
    vacation_days_taken INTEGER DEFAULT 0,
    sick_days INTEGER DEFAULT 0,

    -- Estado y documentación
    status VARCHAR(30) DEFAULT 'draft',        -- draft, approved, paid, cancelled
    receipt_number VARCHAR(50),
    digital_receipt_url TEXT,
    signed_by_employee BOOLEAN DEFAULT false,
    signed_date DATE,

    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    approved_by UUID,
    CONSTRAINT fk_payroll_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_payroll_user ON user_payroll_records(user_id);
CREATE INDEX idx_payroll_company ON user_payroll_records(company_id);
CREATE INDEX idx_payroll_period ON user_payroll_records(period_year, period_month);
CREATE INDEX idx_payroll_status ON user_payroll_records(status);

-- =====================================================================================
-- PARTE 7: FUNCIONES Y TRIGGERS
-- =====================================================================================

-- Función para calcular IMC automáticamente
CREATE OR REPLACE FUNCTION calculate_bmi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
        NEW.bmi := ROUND((NEW.weight_kg / POWER(NEW.height_cm / 100, 2))::numeric, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular IMC
DROP TRIGGER IF EXISTS trg_calculate_bmi ON user_anthropometric_data;
CREATE TRIGGER trg_calculate_bmi
    BEFORE INSERT OR UPDATE ON user_anthropometric_data
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bmi();

-- Función para calcular totales en payroll
CREATE OR REPLACE FUNCTION calculate_payroll_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular gross total
    NEW.gross_total := COALESCE(NEW.base_salary, 0) +
                       COALESCE(NEW.seniority_bonus, 0) +
                       COALESCE(NEW.presentation_bonus, 0) +
                       COALESCE(NEW.overtime_50_amount, 0) +
                       COALESCE(NEW.overtime_100_amount, 0) +
                       COALESCE(NEW.vacation_amount, 0) +
                       COALESCE(NEW.sac_aguinaldo, 0) +
                       COALESCE(NEW.commissions, 0) +
                       COALESCE(NEW.bonuses, 0) +
                       COALESCE(NEW.other_earnings, 0);

    -- Calcular deductions total
    NEW.deductions_total := COALESCE(NEW.jubilacion, 0) +
                            COALESCE(NEW.obra_social, 0) +
                            COALESCE(NEW.ley_19032, 0) +
                            COALESCE(NEW.sindicato, 0) +
                            COALESCE(NEW.ganancias, 0) +
                            COALESCE(NEW.other_deductions, 0);

    -- Calcular net salary
    NEW.net_salary := NEW.gross_total - NEW.deductions_total;

    -- Calcular total hours
    NEW.total_hours_worked := COALESCE(NEW.regular_hours_worked, 0) +
                              COALESCE(NEW.overtime_50_hours, 0) +
                              COALESCE(NEW.overtime_100_hours, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular totales
DROP TRIGGER IF EXISTS trg_calculate_payroll ON user_payroll_records;
CREATE TRIGGER trg_calculate_payroll
    BEFORE INSERT OR UPDATE ON user_payroll_records
    FOR EACH ROW
    EXECUTE FUNCTION calculate_payroll_totals();

-- =====================================================================================
-- PARTE 8: PERMISOS Y COMENTARIOS
-- =====================================================================================

COMMENT ON TABLE user_anthropometric_data IS 'Datos antropométricos del empleado (peso, altura, IMC, etc.)';
COMMENT ON TABLE chronic_conditions_catalog IS 'Catálogo de enfermedades crónicas comunes';
COMMENT ON TABLE user_chronic_conditions_v2 IS 'Condiciones crónicas del empleado con detalle completo';
COMMENT ON TABLE user_surgeries IS 'Historial de cirugías del empleado';
COMMENT ON TABLE user_psychiatric_treatments IS 'Tratamientos psiquiátricos/psicológicos actuales e históricos';
COMMENT ON TABLE sports_catalog IS 'Catálogo de deportes disponibles';
COMMENT ON TABLE user_sports_activities IS 'Actividades deportivas del empleado';
COMMENT ON TABLE user_healthy_habits IS 'Hábitos saludables generales del empleado';
COMMENT ON TABLE labor_agreements_catalog IS 'Catálogo de convenios colectivos de trabajo';
COMMENT ON TABLE salary_categories IS 'Categorías salariales por convenio';
COMMENT ON TABLE user_salary_config_v2 IS 'Configuración salarial detallada del empleado';
COMMENT ON TABLE user_payroll_records IS 'Historial de liquidaciones y recibos de sueldo';

-- =====================================================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================================================
