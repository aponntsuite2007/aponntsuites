-- ============================================================================
-- SISTEMA MÉDICO COMPLETO - BD
-- ============================================================================
-- Versión: 2.0 - Sistema profesional de comunicación médico-empleado
-- Fecha: 2025-01-29
-- ============================================================================

-- ============================================================================
-- 1. TABLA: medical_staff (Médicos del sistema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

    -- Usuario del sistema (si tiene acceso web/APK)
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE SET NULL,

    -- Datos profesionales
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),

    -- Datos médicos
    license_number VARCHAR(50) NOT NULL, -- Matrícula profesional
    specialty VARCHAR(100), -- Medicina Laboral, Traumatología, etc.
    sub_specialty VARCHAR(100),

    -- Credenciales
    password_hash TEXT, -- Para login web/APK
    is_active BOOLEAN DEFAULT true,
    can_access_web BOOLEAN DEFAULT true,
    can_access_app BOOLEAN DEFAULT true,

    -- Configuración
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "push": true,
        "sms": false
    }'::jsonb,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(user_id),

    -- Constraints
    CONSTRAINT unique_license_per_company UNIQUE (company_id, license_number),
    CONSTRAINT check_access CHECK (can_access_web = true OR can_access_app = true)
);

CREATE INDEX idx_medical_staff_company ON medical_staff(company_id);
CREATE INDEX idx_medical_staff_user ON medical_staff(user_id);
CREATE INDEX idx_medical_staff_active ON medical_staff(is_active);

COMMENT ON TABLE medical_staff IS 'Médicos asignados a empresas con acceso al sistema';
COMMENT ON COLUMN medical_staff.license_number IS 'Matrícula profesional del médico';
COMMENT ON COLUMN medical_staff.user_id IS 'ID de usuario si tiene acceso al sistema (opcional)';

-- ============================================================================
-- 2. TABLA: medical_communications (Comunicación bidireccional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS medical_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    absence_case_id UUID NOT NULL, -- FK se agrega después

    -- Participantes
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('employee', 'doctor', 'hr', 'system')),
    sender_id UUID, -- user_id o medical_staff_id según sender_type
    receiver_type VARCHAR(20) NOT NULL CHECK (receiver_type IN ('employee', 'doctor', 'hr')),
    receiver_id UUID,

    -- Mensaje
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN (
        'initial_notification', -- Sistema → Médico (nueva inasistencia)
        'request_info', -- Médico → Empleado (solicitar más info)
        'employee_response', -- Empleado → Médico (respuesta)
        'request_document', -- Médico → Empleado (solicitar certificado/foto)
        'document_upload', -- Empleado → Médico (adjuntar documento)
        'diagnosis', -- Médico → Sistema (diagnóstico)
        'justification', -- Médico → RRHH (justificar/rechazar)
        'case_closed', -- Sistema → Todos (expediente cerrado)
        'follow_up' -- Médico → Empleado (seguimiento)
    )),

    subject VARCHAR(255),
    message TEXT NOT NULL,

    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb, -- [{filename, url, type, size}]

    -- Estado
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    requires_response BOOLEAN DEFAULT false,
    response_deadline TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_sender CHECK (
        (sender_type = 'employee' AND sender_id IS NOT NULL) OR
        (sender_type = 'doctor' AND sender_id IS NOT NULL) OR
        (sender_type = 'hr' AND sender_id IS NOT NULL) OR
        (sender_type = 'system')
    )
);

CREATE INDEX idx_medical_comm_case ON medical_communications(absence_case_id);
CREATE INDEX idx_medical_comm_sender ON medical_communications(sender_type, sender_id);
CREATE INDEX idx_medical_comm_receiver ON medical_communications(receiver_type, receiver_id);
CREATE INDEX idx_medical_comm_unread ON medical_communications(is_read) WHERE is_read = false;
CREATE INDEX idx_medical_comm_company ON medical_communications(company_id);

COMMENT ON TABLE medical_communications IS 'Sistema de mensajería bidireccional médico-empleado';
COMMENT ON COLUMN medical_communications.message_type IS 'Tipo de mensaje en el flujo de comunicación';
COMMENT ON COLUMN medical_communications.requires_response IS 'Si requiere respuesta obligatoria del receptor';

-- ============================================================================
-- 3. TABLA: absence_cases (Expedientes de inasistencia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS absence_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Tipo de ausencia
    absence_type VARCHAR(50) NOT NULL CHECK (absence_type IN (
        'medical_illness', -- Enfermedad común
        'work_accident', -- Accidente laboral
        'non_work_accident', -- Accidente no laboral
        'occupational_disease', -- Enfermedad profesional
        'maternity', -- Maternidad
        'family_care', -- Cuidado familiar
        'authorized_leave', -- Licencia autorizada
        'unauthorized' -- Inasistencia injustificada
    )),

    -- Fechas
    start_date DATE NOT NULL,
    end_date DATE,
    requested_days INTEGER NOT NULL,
    approved_days INTEGER,

    -- Asignación médica
    assigned_doctor_id UUID REFERENCES medical_staff(id),
    assignment_date TIMESTAMP,

    -- Estado del caso
    case_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (case_status IN (
        'pending', -- Pendiente de revisión médica
        'under_review', -- En revisión por médico
        'awaiting_docs', -- Esperando documentación
        'needs_follow_up', -- Requiere seguimiento
        'justified', -- Justificada
        'not_justified', -- No justificada
        'closed' -- Expediente cerrado
    )),

    -- Certificado médico asociado (si aplica)
    certificate_id INTEGER REFERENCES medical_certificates(id),

    -- Descripción inicial
    employee_description TEXT,
    employee_attachments JSONB DEFAULT '[]'::jsonb,

    -- Conclusión médica
    medical_conclusion TEXT,
    final_diagnosis TEXT,
    is_justified BOOLEAN,
    justification_reason TEXT,

    -- Fechas de gestión
    doctor_response_date TIMESTAMP,
    case_closed_date TIMESTAMP,
    closed_by UUID REFERENCES users(user_id),

    -- ART notification
    notify_art BOOLEAN DEFAULT false,
    art_notified BOOLEAN DEFAULT false,
    art_notification_date TIMESTAMP,
    art_case_number VARCHAR(100),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(user_id),
    last_modified_by UUID REFERENCES users(user_id)
);

CREATE INDEX idx_absence_cases_employee ON absence_cases(employee_id);
CREATE INDEX idx_absence_cases_company ON absence_cases(company_id);
CREATE INDEX idx_absence_cases_doctor ON absence_cases(assigned_doctor_id);
CREATE INDEX idx_absence_cases_status ON absence_cases(case_status);
CREATE INDEX idx_absence_cases_dates ON absence_cases(start_date, end_date);
CREATE INDEX idx_absence_cases_type ON absence_cases(absence_type);

COMMENT ON TABLE absence_cases IS 'Expedientes de inasistencias/ausencias con seguimiento médico';
COMMENT ON COLUMN absence_cases.absence_type IS 'Tipo de ausencia (médica, accidente laboral, etc.)';
COMMENT ON COLUMN absence_cases.case_status IS 'Estado del expediente médico';

-- Agregar FK de medical_communications DESPUÉS de crear absence_cases
ALTER TABLE medical_communications
ADD CONSTRAINT fk_medical_comm_absence_case
FOREIGN KEY (absence_case_id) REFERENCES absence_cases(id) ON DELETE CASCADE;

-- ============================================================================
-- 4. FUNCIÓN: Asignar médico automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_doctor_to_case()
RETURNS TRIGGER AS $$
DECLARE
    v_doctor_id UUID;
    v_employee_name TEXT;
    v_employee_legajo TEXT;
    v_employee_dni TEXT;
    v_department TEXT;
    v_shift TEXT;
BEGIN
    -- Solo asignar si es tipo médico y no tiene médico asignado
    IF NEW.absence_type IN ('medical_illness', 'work_accident', 'non_work_accident', 'occupational_disease', 'maternity')
       AND NEW.assigned_doctor_id IS NULL THEN

        -- Buscar médico activo de la empresa (round-robin básico)
        SELECT ms.id INTO v_doctor_id
        FROM medical_staff ms
        WHERE ms.company_id = NEW.company_id
          AND ms.is_active = true
        ORDER BY (
            SELECT COUNT(*)
            FROM absence_cases ac
            WHERE ac.assigned_doctor_id = ms.id
              AND ac.case_status NOT IN ('closed', 'justified', 'not_justified')
        ) ASC
        LIMIT 1;

        IF v_doctor_id IS NOT NULL THEN
            NEW.assigned_doctor_id := v_doctor_id;
            NEW.assignment_date := CURRENT_TIMESTAMP;
            NEW.case_status := 'under_review';

            -- Obtener datos del empleado para la notificación
            SELECT
                u."firstName" || ' ' || u."lastName",
                u."employeeId",
                u.dni,
                d.name,
                s.name
            INTO v_employee_name, v_employee_legajo, v_employee_dni, v_department, v_shift
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN shifts s ON u.shift_id = s.id
            WHERE u.user_id = NEW.employee_id;

            -- Crear notificación inicial al médico
            INSERT INTO medical_communications (
                company_id,
                absence_case_id,
                sender_type,
                sender_id,
                receiver_type,
                receiver_id,
                message_type,
                subject,
                message,
                requires_response,
                response_deadline
            ) VALUES (
                NEW.company_id,
                NEW.id,
                'system',
                NULL,
                'doctor',
                v_doctor_id,
                'initial_notification',
                'Nueva inasistencia médica asignada',
                format(
                    E'Nueva inasistencia por revisar:\n\n' ||
                    'Empleado: %s\n' ||
                    'Legajo: %s\n' ||
                    'DNI: %s\n' ||
                    'Departamento: %s\n' ||
                    'Turno: %s\n\n' ||
                    'Tipo: %s\n' ||
                    'Fecha inicio: %s\n' ||
                    'Días solicitados: %s\n\n' ||
                    'Descripción del empleado:\n%s',
                    v_employee_name,
                    COALESCE(v_employee_legajo, 'N/A'),
                    COALESCE(v_employee_dni, 'N/A'),
                    COALESCE(v_department, 'N/A'),
                    COALESCE(v_shift, 'N/A'),
                    NEW.absence_type,
                    NEW.start_date,
                    NEW.requested_days,
                    COALESCE(NEW.employee_description, 'Sin descripción')
                ),
                true,
                CURRENT_TIMESTAMP + INTERVAL '48 hours'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_doctor ON absence_cases;
CREATE TRIGGER trigger_assign_doctor
    BEFORE INSERT ON absence_cases
    FOR EACH ROW
    EXECUTE FUNCTION assign_doctor_to_case();

COMMENT ON FUNCTION assign_doctor_to_case IS 'Asigna automáticamente un médico al crear caso de ausencia médica';

-- ============================================================================
-- 5. FUNCIÓN: Actualizar timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_medical_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_medical_staff_timestamp ON medical_staff;
CREATE TRIGGER trigger_update_medical_staff_timestamp
    BEFORE UPDATE ON medical_staff
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_timestamp();

DROP TRIGGER IF EXISTS trigger_update_absence_cases_timestamp ON absence_cases;
CREATE TRIGGER trigger_update_absence_cases_timestamp
    BEFORE UPDATE ON absence_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_timestamp();

-- ============================================================================
-- 6. VISTAS: Útiles para queries
-- ============================================================================

-- Vista: Casos pendientes por médico
CREATE OR REPLACE VIEW medical_pending_cases AS
SELECT
    ac.id as case_id,
    ac.company_id,
    ac.employee_id,
    u."firstName" || ' ' || u."lastName" as employee_name,
    u."employeeId" as legajo,
    u.dni,
    ac.absence_type,
    ac.start_date,
    ac.requested_days,
    ac.case_status,
    ac.assigned_doctor_id,
    ms.first_name || ' ' || ms.last_name as doctor_name,
    ac.created_at,
    ac.assignment_date,
    (SELECT COUNT(*) FROM medical_communications mc
     WHERE mc.absence_case_id = ac.id AND mc.is_read = false AND mc.receiver_type = 'doctor') as unread_messages
FROM absence_cases ac
JOIN users u ON ac.employee_id = u.user_id
LEFT JOIN medical_staff ms ON ac.assigned_doctor_id = ms.id
WHERE ac.case_status NOT IN ('closed', 'justified', 'not_justified');

COMMENT ON VIEW medical_pending_cases IS 'Vista rápida de casos médicos pendientes con mensajes no leídos';

-- Vista: Estadísticas por médico
CREATE OR REPLACE VIEW medical_doctor_stats AS
SELECT
    ms.id as doctor_id,
    ms.first_name || ' ' || ms.last_name as doctor_name,
    ms.specialty,
    ms.company_id,
    COUNT(DISTINCT ac.id) FILTER (WHERE ac.case_status IN ('pending', 'under_review', 'awaiting_docs')) as active_cases,
    COUNT(DISTINCT ac.id) FILTER (WHERE ac.case_status = 'closed' AND ac.created_at >= CURRENT_DATE - INTERVAL '30 days') as closed_last_month,
    COUNT(DISTINCT mc.id) FILTER (WHERE mc.is_read = false AND mc.receiver_type = 'doctor') as unread_messages,
    AVG(EXTRACT(EPOCH FROM (ac.doctor_response_date - ac.created_at))/3600) FILTER (WHERE ac.doctor_response_date IS NOT NULL) as avg_response_hours
FROM medical_staff ms
LEFT JOIN absence_cases ac ON ms.id = ac.assigned_doctor_id
LEFT JOIN medical_communications mc ON ac.id = mc.absence_case_id AND mc.receiver_id = ms.id
WHERE ms.is_active = true
GROUP BY ms.id, ms.first_name, ms.last_name, ms.specialty, ms.company_id;

COMMENT ON VIEW medical_doctor_stats IS 'Estadísticas de performance por médico';

-- ============================================================================
-- 7. DATOS DEMO (opcional - solo para testing)
-- ============================================================================

-- Insertar médico demo para empresa ISI (company_id = 11)
INSERT INTO medical_staff (
    company_id, first_name, last_name, email, phone,
    license_number, specialty, can_access_web, can_access_app,
    created_by
) VALUES (
    11,
    'Dr. Juan',
    'Ramírez',
    'dr.ramirez@isi-medico.com',
    '+54 9 11 5555-1234',
    'MP-12345',
    'Medicina Laboral',
    true,
    true,
    (SELECT user_id FROM users WHERE company_id = 11 AND role = 'admin' LIMIT 1)
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
