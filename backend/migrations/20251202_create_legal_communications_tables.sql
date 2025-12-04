-- ============================================================================
-- MIGRACIÓN: Tablas para Sistema de Comunicaciones Legales Fehacientes
-- Fecha: 2025-12-02
-- Descripción: Crea tablas para comunicaciones legales basadas en LCT Argentina
-- ============================================================================

-- ============================================================================
-- TABLA 1: TIPOS DE COMUNICACIONES LEGALES
-- Basado en Ley de Contrato de Trabajo (LCT) Argentina
-- ============================================================================

CREATE TABLE IF NOT EXISTS legal_communication_types (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('disciplinaria', 'informativa', 'contractual', 'administrativa', 'despido')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- Base legal según LCT
    legal_basis TEXT, -- Artículos de la LCT que aplican
    legal_requirements TEXT, -- Requisitos legales específicos

    -- Configuración del tipo
    requires_response BOOLEAN DEFAULT FALSE,
    response_days INTEGER DEFAULT 5, -- Días hábiles para responder
    requires_witness BOOLEAN DEFAULT FALSE,
    requires_signature BOOLEAN DEFAULT TRUE,
    requires_notification_receipt BOOLEAN DEFAULT TRUE,

    -- Template para el contenido
    template_content TEXT, -- Template markdown/HTML

    -- Configuración de seguimiento
    creates_antecedent BOOLEAN DEFAULT TRUE, -- Si crea antecedente laboral
    max_before_escalation INTEGER, -- Cantidad máxima antes de escalamiento
    escalation_type_id VARCHAR(50), -- A qué tipo escala

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_legal_comm_types_category ON legal_communication_types(category);
CREATE INDEX idx_legal_comm_types_severity ON legal_communication_types(severity);
CREATE INDEX idx_legal_comm_types_active ON legal_communication_types(is_active);

-- Comentarios
COMMENT ON TABLE legal_communication_types IS 'Tipos de comunicaciones legales según LCT Argentina';
COMMENT ON COLUMN legal_communication_types.category IS 'Categoría: disciplinaria, informativa, contractual, administrativa, despido';
COMMENT ON COLUMN legal_communication_types.severity IS 'Severidad: low (información), medium (advertencia), high (sanción), critical (despido)';
COMMENT ON COLUMN legal_communication_types.legal_basis IS 'Artículos de la LCT que fundamentan este tipo de comunicación';
COMMENT ON COLUMN legal_communication_types.creates_antecedent IS 'Si esta comunicación crea un antecedente laboral permanente';

-- ============================================================================
-- TABLA 2: COMUNICACIONES LEGALES
-- ============================================================================

CREATE TABLE IF NOT EXISTS legal_communications (
    id VARCHAR(100) PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type_id VARCHAR(50) NOT NULL REFERENCES legal_communication_types(id),

    -- Identificación
    reference_number VARCHAR(100) NOT NULL UNIQUE, -- Número de documento único

    -- Contenido
    subject VARCHAR(500) NOT NULL,
    description TEXT,
    facts_description TEXT, -- Descripción de los hechos
    legal_articles TEXT, -- Artículos específicos citados

    -- Estado y fechas
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent', 'delivered', 'responded', 'closed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scheduled_date DATE, -- Fecha programada para envío
    sent_date TIMESTAMP, -- Fecha/hora de envío efectivo
    delivery_date TIMESTAMP, -- Fecha/hora de entrega/recepción
    response_deadline DATE, -- Fecha límite de respuesta
    response_date TIMESTAMP, -- Fecha de respuesta del empleado
    closed_date TIMESTAMP,

    -- Respuesta del empleado
    employee_response TEXT,
    employee_accepted BOOLEAN, -- Si el empleado aceptó/firmó

    -- Testigos (si aplica)
    witness_1_name VARCHAR(255),
    witness_1_id VARCHAR(50),
    witness_1_signature BOOLEAN DEFAULT FALSE,
    witness_2_name VARCHAR(255),
    witness_2_id VARCHAR(50),
    witness_2_signature BOOLEAN DEFAULT FALSE,

    -- Documentos
    pdf_path TEXT, -- Ruta al PDF generado
    signed_pdf_path TEXT, -- Ruta al PDF firmado
    attachments JSONB DEFAULT '[]'::jsonb, -- Adjuntos adicionales

    -- Metadata
    created_by UUID NOT NULL REFERENCES users(user_id),
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_legal_comm_company ON legal_communications(company_id);
CREATE INDEX idx_legal_comm_employee ON legal_communications(employee_id);
CREATE INDEX idx_legal_comm_type ON legal_communications(type_id);
CREATE INDEX idx_legal_comm_status ON legal_communications(status);
CREATE INDEX idx_legal_comm_reference ON legal_communications(reference_number);
CREATE INDEX idx_legal_comm_created ON legal_communications(created_at);
CREATE INDEX idx_legal_comm_deadline ON legal_communications(response_deadline);

-- Comentarios
COMMENT ON TABLE legal_communications IS 'Comunicaciones legales fehacientes enviadas a empleados';
COMMENT ON COLUMN legal_communications.reference_number IS 'Número único de documento (ej: DOC-APERC-1701234567890)';
COMMENT ON COLUMN legal_communications.status IS 'draft: borrador, generated: generado, sent: enviado, delivered: entregado, responded: respondido, closed: cerrado, expired: vencido';
COMMENT ON COLUMN legal_communications.facts_description IS 'Descripción detallada de los hechos que motivan la comunicación';
COMMENT ON COLUMN legal_communications.employee_accepted IS 'Si el empleado firmó/aceptó recepción de la comunicación';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_legal_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_legal_communications_updated_at
BEFORE UPDATE ON legal_communications
FOR EACH ROW
EXECUTE FUNCTION update_legal_communications_updated_at();

-- Trigger para updated_at en types
CREATE TRIGGER trigger_legal_comm_types_updated_at
BEFORE UPDATE ON legal_communication_types
FOR EACH ROW
EXECUTE FUNCTION update_legal_communications_updated_at();

-- ============================================================================
-- DATOS INICIALES: TIPOS DE COMUNICACIONES SEGÚN LCT
-- ============================================================================

-- 1. APERCIBIMIENTO (Art. 67 LCT)
INSERT INTO legal_communication_types (
    id, name, description, category, severity,
    legal_basis, legal_requirements,
    requires_response, response_days, requires_witness, requires_signature,
    creates_antecedent, max_before_escalation, escalation_type_id,
    template_content, display_order
) VALUES (
    'apercibimiento',
    'Apercibimiento',
    'Llamado de atención formal por incumplimiento leve. Primera instancia disciplinaria.',
    'disciplinaria', 'low',
    'Art. 67 LCT - Facultades disciplinarias. Art. 68 LCT - Modalidades de ejercicio.',
    'Debe ser por escrito, especificar claramente la falta cometida y la fecha de los hechos.',
    false, 0, false, true,
    true, 3, 'suspension',
    '## APERCIBIMIENTO

Por medio de la presente, se le hace saber que:

**HECHOS:**
{{facts_description}}

**FUNDAMENTO LEGAL:**
Conforme lo establecido en el Art. 67 de la Ley de Contrato de Trabajo, que faculta al empleador a aplicar sanciones disciplinarias proporcionales a las faltas cometidas.

**DISPOSICIÓN:**
Se le apercibe formalmente por los hechos descriptos, debiendo abstenerse de reincidir en las conductas señaladas.

Este apercibimiento quedará registrado en su legajo personal.',
    1
);

-- 2. SUSPENSIÓN (Art. 218-220 LCT)
INSERT INTO legal_communication_types (
    id, name, description, category, severity,
    legal_basis, legal_requirements,
    requires_response, response_days, requires_witness, requires_signature,
    creates_antecedent, max_before_escalation, escalation_type_id,
    template_content, display_order
) VALUES (
    'suspension',
    'Suspensión Disciplinaria',
    'Suspensión sin goce de haberes por falta grave o reiteración de faltas leves.',
    'disciplinaria', 'high',
    'Art. 218-220 LCT - Suspensiones disciplinarias. Art. 67 LCT - Facultades disciplinarias.',
    'Debe ser por escrito, notificada de manera fehaciente, especificar días de suspensión (máx 30 días/año), indicar fecha de inicio y fin.',
    true, 5, true, true,
    true, 2, 'despido_causa',
    '## SUSPENSIÓN DISCIPLINARIA

Por medio de la presente, se le notifica que:

**HECHOS:**
{{facts_description}}

**ANTECEDENTES:**
{{antecedentes}}

**FUNDAMENTO LEGAL:**
Conforme lo establecido en los Arts. 218 a 220 de la Ley de Contrato de Trabajo, que regulan las suspensiones por causas disciplinarias.

**DISPOSICIÓN:**
Se dispone suspenderlo por el término de **{{dias_suspension}} días** sin goce de haberes, comenzando a regir desde el día {{fecha_inicio}} hasta el día {{fecha_fin}} inclusive.

**PLAZO PARA IMPUGNAR:**
Conforme Art. 67 LCT, cuenta con **30 días corridos** para impugnar esta sanción.

Firma de conformidad de recepción:',
    2
);

-- 3. DESPIDO CON CAUSA (Art. 242-243 LCT)
INSERT INTO legal_communication_types (
    id, name, description, category, severity,
    legal_basis, legal_requirements,
    requires_response, response_days, requires_witness, requires_signature,
    creates_antecedent, max_before_escalation, escalation_type_id,
    template_content, display_order
) VALUES (
    'despido_causa',
    'Despido con Justa Causa',
    'Extinción del contrato de trabajo por injuria laboral grave que impide continuar la relación.',
    'despido', 'critical',
    'Art. 242 LCT - Justa causa. Art. 243 LCT - Comunicación del despido.',
    'Debe comunicarse por escrito de manera fehaciente (telegrama o carta documento), expresar claramente la causa invocada.',
    false, 0, true, true,
    true, null, null,
    '## COMUNICACIÓN DE DESPIDO CON JUSTA CAUSA

Por medio de la presente, se le comunica que:

**HECHOS:**
{{facts_description}}

**FUNDAMENTO LEGAL:**
Conforme lo establecido en el Art. 242 de la Ley de Contrato de Trabajo, que establece que una de las partes podrá hacer denuncia del contrato de trabajo en caso de inobservancia por parte de la otra de las obligaciones resultantes del mismo que configuren injuria y que, por su gravedad, no consienta la prosecución de la relación.

**DISPOSICIÓN:**
Por los hechos descriptos, que configuran injuria laboral de tal gravedad que impide la prosecución del vínculo, se procede a su despido con justa causa, con efecto a partir del día de la fecha.

**LIQUIDACIÓN FINAL:**
Se pondrá a su disposición la liquidación final correspondiente, incluyendo los rubros que por ley correspondan.',
    3
);

-- 4. DESPIDO SIN CAUSA (Art. 231-232, 245 LCT)
INSERT INTO legal_communication_types (
    id, name, description, category, severity,
    legal_basis, legal_requirements,
    requires_response, response_days, requires_witness, requires_signature,
    creates_antecedent, max_before_escalation, escalation_type_id,
    template_content, display_order
) VALUES (
    'despido_sin_causa',
    'Despido Sin Causa',
    'Extinción del contrato de trabajo sin expresión de causa, con pago de indemnización.',
    'despido', 'critical',
    'Art. 231-232 LCT - Preaviso. Art. 245 LCT - Indemnización por antigüedad.',
    'Debe comunicarse por escrito. Corresponde preaviso o indemnización sustitutiva, más indemnización por antigüedad.',
    false, 0, false, true,
    true, null, null,
    '## COMUNICACIÓN DE DESPIDO

Por medio de la presente, se le comunica que:

Esta empresa ha decidido prescindir de sus servicios, quedando usted despedido a partir del día de la fecha.

**FUNDAMENTO LEGAL:**
Conforme lo establecido en los Arts. 231, 232 y 245 de la Ley de Contrato de Trabajo.

**LIQUIDACIÓN FINAL:**
Se pondrá a su disposición la liquidación final correspondiente, incluyendo:
- Indemnización sustitutiva de preaviso
- Indemnización por antigüedad (Art. 245 LCT)
- SAC proporcional
- Vacaciones proporcionales
- Días trabajados del mes',
    4
);

-- 5. INTIMACIÓN POR ABANDONO (Art. 244 LCT)
INSERT INTO legal_communication_types (
    id, name, description, category, severity,
    legal_basis, legal_requirements,
    requires_response, response_days, requires_witness, requires_signature,
    creates_antecedent, max_before_escalation, escalation_type_id,
    template_content, display_order
) VALUES (
    'intimacion_abandono',
    'Intimación por Abandono de Trabajo',
    'Intimación al trabajador que no se presenta a trabajar sin justificación.',
    'disciplinaria', 'high',
    'Art. 244 LCT - Abandono del trabajo.',
    'Debe otorgarse plazo razonable (24-48hs) para que el trabajador se reintegre o justifique. Enviarse por telegrama o carta documento.',
    true, 2, false, true,
    true, 1, 'despido_causa',
    '## INTIMACIÓN POR ABANDONO DE TRABAJO

Por medio de la presente, se le intima a que:

**HECHOS:**
Se ha constatado que Ud. no se presenta a prestar tareas desde el día {{fecha_ausencia}}, sin haber comunicado causa alguna que justifique su inasistencia.

**FUNDAMENTO LEGAL:**
Conforme lo establecido en el Art. 244 de la Ley de Contrato de Trabajo, el abandono del trabajo como acto de incumplimiento del trabajador solo se configurará previa constitución en mora mediante intimación hecha en forma fehaciente a que se reintegre al trabajo.

**DISPOSICIÓN:**
Se lo intima por el presente a que en el plazo de **48 horas** de recibida la presente se reintegre a sus tareas habituales o justifique debidamente su inasistencia.

**APERCIBIMIENTO:**
De no hacerlo, se considerará que ha hecho abandono de trabajo y se procederá conforme a derecho.',
    5
);

-- 6. CAMBIO DE CONDICIONES LABORALES (Art. 66 LCT - Ius Variandi)
INSERT INTO legal_communication_types (
    id, name, description, category, severity,
    legal_basis, legal_requirements,
    requires_response, response_days, requires_witness, requires_signature,
    creates_antecedent, max_before_escalation, escalation_type_id,
    template_content, display_order
) VALUES (
    'cambio_condiciones',
    'Notificación de Cambio de Condiciones',
    'Comunicación de modificación de condiciones laborales dentro del ius variandi.',
    'contractual', 'medium',
    'Art. 66 LCT - Facultad de modificar las formas y modalidades del trabajo.',
    'Los cambios deben ser razonables, no afectar condiciones esenciales del contrato ni causar perjuicio moral/material.',
    true, 5, false, true,
    false, null, null,
    '## NOTIFICACIÓN DE CAMBIO DE CONDICIONES LABORALES

Por medio de la presente, se le comunica que:

**CAMBIOS:**
{{descripcion_cambios}}

**FECHA DE VIGENCIA:**
Los cambios comunicados entrarán en vigencia a partir del día {{fecha_vigencia}}.

**FUNDAMENTO LEGAL:**
Conforme lo establecido en el Art. 66 de la Ley de Contrato de Trabajo, que faculta al empleador a modificar las formas y modalidades del trabajo, siempre que ello no importe un ejercicio irrazonable de esa facultad, ni altere modalidades esenciales del contrato, ni cause perjuicio material ni moral al trabajador.

**DERECHO A IMPUGNAR:**
Si considera que este cambio modifica condiciones esenciales o le causa perjuicio, puede ejercer las acciones que estime corresponder.',
    6
);

-- 7. NOTIFICACIÓN DE VACACIONES (Art. 154 LCT)
INSERT INTO legal_communication_types (
    id, name, description, category, severity,
    legal_basis, legal_requirements,
    requires_response, response_days, requires_witness, requires_signature,
    creates_antecedent, max_before_escalation, escalation_type_id,
    template_content, display_order
) VALUES (
    'notificacion_vacaciones',
    'Notificación de Vacaciones',
    'Comunicación del período de vacaciones asignado al trabajador.',
    'informativa', 'low',
    'Art. 154 LCT - Comunicación del período vacacional.',
    'Debe notificarse con 45 días de anticipación. Las vacaciones deben otorgarse entre el 1/10 y el 30/4.',
    false, 0, false, true,
    false, null, null,
    '## NOTIFICACIÓN DE PERÍODO VACACIONAL

Por medio de la presente, se le comunica que:

**PERÍODO DE VACACIONES:**
Se le ha asignado el siguiente período de vacaciones correspondiente al año {{anio}}:

- **Fecha de inicio:** {{fecha_inicio}}
- **Fecha de finalización:** {{fecha_fin}}
- **Días corridos:** {{dias_vacaciones}}

**FUNDAMENTO LEGAL:**
Conforme lo establecido en el Art. 154 de la Ley de Contrato de Trabajo.

**REINTEGRO:**
Deberá reintegrarse a sus tareas habituales el día {{fecha_reintegro}}.',
    7
);

-- 8. LICENCIA POR ENFERMEDAD (Art. 208-213 LCT)
INSERT INTO legal_communication_types (
    id, name, description, category, severity,
    legal_basis, legal_requirements,
    requires_response, response_days, requires_witness, requires_signature,
    creates_antecedent, max_before_escalation, escalation_type_id,
    template_content, display_order
) VALUES (
    'licencia_enfermedad',
    'Comunicación de Licencia por Enfermedad',
    'Notificación relacionada con licencia médica del trabajador.',
    'informativa', 'low',
    'Art. 208-213 LCT - Enfermedades y accidentes inculpables.',
    'El empleador puede ejercer control médico. El trabajador tiene obligación de someterse a controles.',
    false, 0, false, false,
    false, null, null,
    '## COMUNICACIÓN SOBRE LICENCIA MÉDICA

Por medio de la presente, se le comunica que:

{{contenido_comunicacion}}

**FUNDAMENTO LEGAL:**
Conforme lo establecido en los Arts. 208 a 213 de la Ley de Contrato de Trabajo, que regulan las enfermedades y accidentes inculpables.

**IMPORTANTE:**
Recuerde que conforme Art. 210 LCT, el trabajador está obligado a someterse al control que se efectúe por el facultativo designado por el empleador.',
    8
);

-- ============================================================================
-- VALIDACIÓN
-- ============================================================================

-- Verificar tablas creadas
SELECT 'legal_communication_types' as tabla, COUNT(*) as registros FROM legal_communication_types
UNION ALL
SELECT 'legal_communications' as tabla, COUNT(*) as registros FROM legal_communications;

-- Verificar tipos insertados
SELECT id, name, category, severity, display_order
FROM legal_communication_types
ORDER BY display_order;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
