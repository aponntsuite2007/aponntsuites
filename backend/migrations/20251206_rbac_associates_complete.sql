-- =====================================================
-- RBAC + ASSOCIATES SYSTEM - MIGRACIÓN COMPLETA
-- Sistema de Control de Accesos + Pool de Asociados APONNT
-- Fecha: 2025-12-06
-- =====================================================

-- =====================================================
-- PARTE 1: CATÁLOGO DE MÓDULOS DEL SISTEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS module_definitions (
    id SERIAL PRIMARY KEY,
    module_key VARCHAR(100) UNIQUE NOT NULL,
    module_name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'core', 'hr', 'medical', 'legal', 'payroll', 'compliance', 'admin'
    icon VARCHAR(50),

    -- Acciones disponibles para este módulo
    available_actions TEXT[] DEFAULT ARRAY['read', 'create', 'update', 'delete'],

    -- Scopes disponibles
    available_scopes TEXT[] DEFAULT ARRAY['all', 'own_branch', 'own_department', 'own', 'assigned_only'],

    -- Dependencias (qué módulos necesita para funcionar)
    required_dependencies TEXT[] DEFAULT '{}',

    -- Textos de ayuda contextual
    help_title VARCHAR(200),
    help_description TEXT,
    help_getting_started TEXT,
    help_common_tasks JSONB DEFAULT '[]',
    -- Ejemplo: [{"title": "Agregar empleado", "steps": ["Click en +", "Completar datos", "Guardar"]}]

    -- Para auditoría de dependencias
    prerequisite_data JSONB DEFAULT '{}',
    -- Ejemplo: {"required_tables": ["departments", "branches"], "min_records": {"departments": 1}}

    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed módulos del sistema
INSERT INTO module_definitions (module_key, module_name, description, category, icon, available_actions, help_title, help_description, help_getting_started, prerequisite_data) VALUES
-- Core
('dashboard', 'Dashboard', 'Panel principal con resumen de actividad', 'core', 'fa-home', ARRAY['read'], 'Tu Centro de Control', 'Aquí verás un resumen de toda la actividad de tu empresa: asistencias, alertas, tareas pendientes y métricas clave.', 'El dashboard se actualiza automáticamente. Haz clic en cualquier tarjeta para ver más detalles.', '{}'),

-- RRHH
('users', 'Gestión de Usuarios', 'Administración de empleados y sus datos', 'hr', 'fa-users', ARRAY['read', 'create', 'update', 'delete'], 'Gestión de tu Equipo', 'Administra todos los empleados de tu empresa: datos personales, laborales, documentación y accesos.', 'Antes de agregar empleados, asegúrate de tener configurados: Departamentos, Turnos y Sucursales.', '{"required_tables": ["departments", "branches", "shifts"], "min_records": {"departments": 1, "branches": 1}}'),

('attendance', 'Control de Asistencia', 'Registro y gestión de asistencias', 'hr', 'fa-clock', ARRAY['read', 'create', 'update', 'delete'], 'Control de Asistencia', 'Visualiza y gestiona los registros de entrada/salida de tu equipo. Detecta patrones, ausencias y llegadas tarde.', 'Los registros se generan automáticamente desde los kioscos. Aquí puedes corregir o agregar registros manuales.', '{"required_tables": ["users"], "min_records": {"users": 1}}'),

('vacation-management', 'Gestión de Vacaciones', 'Solicitudes y aprobación de vacaciones', 'hr', 'fa-umbrella-beach', ARRAY['read', 'create', 'update', 'delete'], 'Vacaciones y Licencias', 'Gestiona solicitudes de vacaciones, licencias especiales y días libres. Aprueba o rechaza con un clic.', 'Configura primero los días de vacaciones por antigüedad en Configuración > Vacaciones.', '{"required_tables": ["users", "vacation_configurations"], "min_records": {"users": 1}}'),

-- Estructura Organizacional
('organizational', 'Estructura Organizacional', 'Departamentos, sectores, convenios y categorías', 'hr', 'fa-sitemap', ARRAY['read', 'create', 'update', 'delete'], 'Tu Estructura Organizacional', 'Define la estructura de tu empresa: departamentos, sectores, convenios laborales, categorías salariales y roles.', 'Comienza creando las sucursales, luego departamentos, y finalmente asigna empleados.', '{}'),

('roles-permissions', 'Roles y Permisos', 'Gestión de roles y control de acceso', 'hr', 'fa-shield-alt', ARRAY['read', 'create', 'update', 'delete'], 'Control de Acceso', 'Define quién puede ver y hacer qué en el sistema. Crea roles personalizados y asigna permisos granulares por módulo.', 'Los roles predefinidos (Admin, Supervisor, Empleado) no se pueden modificar. Crea roles personalizados para necesidades específicas.', '{"required_tables": ["users"], "min_records": {"users": 1}}'),

-- Nómina
('payroll', 'Liquidación de Sueldos', 'Cálculo y gestión de nómina', 'payroll', 'fa-money-bill-wave', ARRAY['read', 'create', 'update', 'delete'], 'Liquidación de Sueldos', 'Calcula y gestiona la nómina de tu empresa. Configura conceptos, genera recibos y exporta para bancos.', 'Configura primero: Categorías salariales, Convenios, y Conceptos de nómina.', '{"required_tables": ["users", "salary_categories_v2", "payroll_concept_types"], "min_records": {"users": 1, "salary_categories_v2": 1}}'),

-- Médico
('medical-dashboard', 'Dashboard Médico', 'Panel para profesionales de salud ocupacional', 'medical', 'fa-stethoscope', ARRAY['read', 'create', 'update', 'delete'], 'Salud Ocupacional', 'Panel exclusivo para médicos laborales. Gestiona exámenes, certificados de aptitud y seguimiento de salud.', 'Solo visible para usuarios con rol Médico o asociados médicos vinculados a la empresa.', '{"required_tables": ["users"], "min_records": {"users": 1}}'),

('occupational-health', 'Salud Ocupacional Enterprise', 'Sistema completo de salud ocupacional', 'medical', 'fa-hospital', ARRAY['read', 'create', 'update', 'delete'], 'Salud Ocupacional Avanzado', 'Gestión integral de salud laboral: pre-ocupacionales, periódicos, accidentes, certificaciones y estadísticas.', 'Requiere un médico laboral asignado a la empresa (permanente o eventual).', '{"required_tables": ["users", "company_associate_contracts"], "associate_category": "medical"}'),

-- Legal
('sanctions-management', 'Gestión de Sanciones', 'Workflow de sanciones disciplinarias', 'legal', 'fa-gavel', ARRAY['read', 'create', 'update', 'delete'], 'Sanciones Disciplinarias', 'Gestiona sanciones con workflow de aprobación: solicitud → revisión legal → confirmación RRHH → aplicación.', 'Para sanciones que requieren revisión legal, la empresa debe tener un abogado asociado.', '{"required_tables": ["users", "sanction_types"], "min_records": {"users": 1, "sanction_types": 1}}'),

('legal-cases', 'Casos Legales', 'Gestión de expedientes legales', 'legal', 'fa-balance-scale', ARRAY['read', 'create', 'update', 'delete'], 'Gestión Legal', 'Administra casos legales: demandas, reclamos, mediaciones. Seguimiento de etapas y vencimientos.', 'Requiere un abogado asociado para gestionar casos. Los empleados solo ven sus propios casos.', '{"required_tables": ["users"], "associate_category": "legal"}'),

-- Compliance
('compliance-dashboard', 'Risk Intelligence', 'Análisis de riesgos laborales', 'compliance', 'fa-chart-line', ARRAY['read', 'create', 'update'], 'Inteligencia de Riesgos', 'Análisis predictivo de riesgos: fatiga, accidentabilidad, rotación. Detecta problemas antes de que ocurran.', 'El sistema analiza automáticamente los datos de asistencia, sanciones y salud para calcular índices de riesgo.', '{"required_tables": ["users", "attendances"], "min_records": {"users": 5, "attendances": 100}}'),

-- Asociados
('associate-marketplace', 'Servicios Profesionales', 'Contratación de asociados APONNT', 'admin', 'fa-handshake', ARRAY['read', 'create', 'update', 'delete'], 'Profesionales a tu Servicio', 'Contrata médicos laborales, abogados, asesores de seguridad industrial y otros profesionales verificados por APONNT.', 'Busca por categoría, revisa perfiles y ratings, y contrata de forma permanente o eventual.', '{}'),

-- Notificaciones
('inbox', 'Centro de Notificaciones', 'Bandeja de notificaciones y mensajes', 'core', 'fa-bell', ARRAY['read', 'create', 'update'], 'Tu Bandeja de Entrada', 'Recibe y responde notificaciones del sistema: aprobaciones pendientes, alertas, mensajes y recordatorios.', 'Las notificaciones urgentes aparecen en rojo. Responde antes de la fecha límite para evitar escalamientos.', '{}'),

-- Portal Empleado
('my-portal', 'Mi Portal', 'Portal personal del empleado', 'core', 'fa-user-circle', ARRAY['read', 'create'], 'Tu Espacio Personal', 'Accede a tu información personal, recibos de sueldo, certificados, solicita vacaciones y más.', 'Aquí puedes actualizar tus datos de contacto, descargar recibos y enviar documentación.', '{}')

ON CONFLICT (module_key) DO UPDATE SET
    module_name = EXCLUDED.module_name,
    description = EXCLUDED.description,
    help_title = EXCLUDED.help_title,
    help_description = EXCLUDED.help_description,
    help_getting_started = EXCLUDED.help_getting_started,
    prerequisite_data = EXCLUDED.prerequisite_data,
    updated_at = NOW();

-- =====================================================
-- PARTE 2: DEFINICIÓN DE ROLES
-- =====================================================

CREATE TABLE IF NOT EXISTS role_definitions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
    -- NULL = rol global del sistema (predefinido por APONNT)

    role_key VARCHAR(50) NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Categoría para agrupar en UI
    category VARCHAR(50) DEFAULT 'internal',
    -- 'system' = roles predefinidos no editables
    -- 'internal' = roles de empleados internos
    -- 'associate' = roles para asociados externos
    -- 'custom' = roles personalizados por empresa

    -- Permisos por módulo (JSONB)
    module_permissions JSONB NOT NULL DEFAULT '{}',
    /*
    Estructura:
    {
        "users": {
            "actions": ["read", "create", "update", "delete"],
            "scope": "all"  // all, own_branch, own_department, own, assigned_only
        },
        "attendance": {
            "actions": ["read"],
            "scope": "own_department"
        }
    }
    */

    -- Permisos especiales (features específicos)
    special_permissions JSONB DEFAULT '{}',
    /*
    {
        "can_export_data": true,
        "can_approve_vacations": true,
        "can_view_salaries": false,
        "can_manage_kiosks": false,
        "can_access_reports": true,
        "can_bulk_operations": false
    }
    */

    -- Configuración
    is_system_role BOOLEAN DEFAULT false,
    is_default_for_new_users BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 0, -- Para resolver conflictos de permisos (mayor = más importante)

    -- Metadatos
    color VARCHAR(20) DEFAULT '#6c757d',
    icon VARCHAR(50) DEFAULT 'fa-user',

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID,

    UNIQUE(company_id, role_key)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_role_definitions_company ON role_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_role_definitions_category ON role_definitions(category);

-- Seed roles del sistema (globales, company_id = NULL)
INSERT INTO role_definitions (company_id, role_key, role_name, description, category, module_permissions, special_permissions, is_system_role, priority, color, icon) VALUES

-- Super Admin (APONNT)
(NULL, 'super_admin', 'Super Administrador', 'Acceso total al sistema APONNT (solo staff interno)', 'system',
'{"*": {"actions": ["read", "create", "update", "delete"], "scope": "all"}}',
'{"can_export_data": true, "can_approve_vacations": true, "can_view_salaries": true, "can_manage_kiosks": true, "can_access_reports": true, "can_bulk_operations": true, "can_manage_companies": true}',
true, 1000, '#dc3545', 'fa-crown'),

-- Admin de Empresa
(NULL, 'admin', 'Administrador', 'Acceso total a su empresa', 'system',
'{"*": {"actions": ["read", "create", "update", "delete"], "scope": "all"}}',
'{"can_export_data": true, "can_approve_vacations": true, "can_view_salaries": true, "can_manage_kiosks": true, "can_access_reports": true, "can_bulk_operations": true}',
true, 900, '#007bff', 'fa-user-shield'),

-- Manager
(NULL, 'manager', 'Gerente', 'Gestión de equipos y reportes', 'system',
'{
    "dashboard": {"actions": ["read"], "scope": "all"},
    "users": {"actions": ["read", "update"], "scope": "own_branch"},
    "attendance": {"actions": ["read", "create", "update"], "scope": "own_branch"},
    "vacation-management": {"actions": ["read", "create", "update"], "scope": "own_branch"},
    "compliance-dashboard": {"actions": ["read"], "scope": "own_branch"},
    "inbox": {"actions": ["read", "create", "update"], "scope": "own"}
}',
'{"can_export_data": true, "can_approve_vacations": true, "can_view_salaries": false, "can_access_reports": true}',
true, 700, '#28a745', 'fa-user-tie'),

-- Supervisor
(NULL, 'supervisor', 'Supervisor', 'Supervisión de su departamento', 'system',
'{
    "dashboard": {"actions": ["read"], "scope": "own_department"},
    "users": {"actions": ["read"], "scope": "own_department"},
    "attendance": {"actions": ["read", "create", "update"], "scope": "own_department"},
    "vacation-management": {"actions": ["read", "update"], "scope": "own_department"},
    "inbox": {"actions": ["read", "create", "update"], "scope": "own"}
}',
'{"can_approve_vacations": true, "can_view_salaries": false}',
true, 500, '#17a2b8', 'fa-user-check'),

-- Empleado
(NULL, 'employee', 'Empleado', 'Acceso solo a su portal personal', 'system',
'{
    "my-portal": {"actions": ["read", "create"], "scope": "own"},
    "inbox": {"actions": ["read", "create", "update"], "scope": "own"}
}',
'{}',
true, 100, '#6c757d', 'fa-user'),

-- RRHH
(NULL, 'rrhh', 'Recursos Humanos', 'Gestión integral de personal', 'system',
'{
    "dashboard": {"actions": ["read"], "scope": "all"},
    "users": {"actions": ["read", "create", "update", "delete"], "scope": "all"},
    "attendance": {"actions": ["read", "create", "update", "delete"], "scope": "all"},
    "vacation-management": {"actions": ["read", "create", "update", "delete"], "scope": "all"},
    "payroll": {"actions": ["read", "create", "update"], "scope": "all"},
    "sanctions-management": {"actions": ["read", "create", "update"], "scope": "all"},
    "organizational": {"actions": ["read", "create", "update"], "scope": "all"},
    "roles-permissions": {"actions": ["read"], "scope": "all"},
    "inbox": {"actions": ["read", "create", "update"], "scope": "own"}
}',
'{"can_export_data": true, "can_approve_vacations": true, "can_view_salaries": true, "can_access_reports": true}',
true, 800, '#e83e8c', 'fa-users-cog'),

-- Asociado Médico
(NULL, 'associate_medical', 'Médico Laboral', 'Profesional médico asociado a APONNT', 'associate',
'{
    "medical-dashboard": {"actions": ["read", "create", "update"], "scope": "assigned_only"},
    "occupational-health": {"actions": ["read", "create", "update"], "scope": "assigned_only"},
    "users": {"actions": ["read"], "scope": "assigned_only"},
    "inbox": {"actions": ["read", "create", "update"], "scope": "own"}
}',
'{"can_export_data": true, "can_access_reports": true}',
true, 600, '#20c997', 'fa-stethoscope'),

-- Asociado Legal
(NULL, 'associate_legal', 'Abogado Laboral', 'Profesional legal asociado a APONNT', 'associate',
'{
    "legal-cases": {"actions": ["read", "create", "update"], "scope": "assigned_only"},
    "sanctions-management": {"actions": ["read", "update"], "scope": "assigned_only"},
    "users": {"actions": ["read"], "scope": "assigned_only"},
    "inbox": {"actions": ["read", "create", "update"], "scope": "own"}
}',
'{"can_export_data": true, "can_access_reports": true}',
true, 600, '#fd7e14', 'fa-balance-scale'),

-- Asociado Seguridad Industrial
(NULL, 'associate_safety', 'Asesor de Seguridad', 'Profesional de seguridad industrial asociado', 'associate',
'{
    "compliance-dashboard": {"actions": ["read", "create", "update"], "scope": "assigned_only"},
    "occupational-health": {"actions": ["read"], "scope": "assigned_only"},
    "users": {"actions": ["read"], "scope": "assigned_only"},
    "inbox": {"actions": ["read", "create", "update"], "scope": "own"}
}',
'{"can_export_data": true, "can_access_reports": true}',
true, 600, '#ffc107', 'fa-hard-hat')

ON CONFLICT (company_id, role_key) DO NOTHING;

-- =====================================================
-- PARTE 3: POOL DE ASOCIADOS APONNT
-- =====================================================

-- Categorías de asociados
CREATE TYPE associate_category AS ENUM (
    'medical',      -- Médicos laborales
    'legal',        -- Abogados
    'safety',       -- Seguridad industrial
    'audit',        -- Auditores
    'training',     -- Capacitadores
    'psychologist', -- Psicólogos laborales
    'other'
);

CREATE TABLE IF NOT EXISTS aponnt_associates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Datos personales
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    secondary_phone VARCHAR(50),
    dni VARCHAR(20),

    -- Foto y perfil
    photo_url TEXT,
    bio TEXT,
    linkedin_url VARCHAR(255),

    -- Categoría profesional
    category associate_category NOT NULL,
    specialty VARCHAR(200), -- "Medicina laboral", "Derecho laboral", etc.
    sub_specialties TEXT[], -- ["Ergonomía", "Toxicología"]

    -- Credenciales
    license_number VARCHAR(100), -- Matrícula profesional
    license_issuer VARCHAR(100), -- "Colegio de Médicos de Bs As"
    license_expiry DATE,
    certifications JSONB DEFAULT '[]',
    -- [{"name": "ISO 45001", "issuer": "IRAM", "date": "2024-01-15", "expires": "2027-01-15"}]

    -- Acceso al sistema
    user_id UUID REFERENCES users(user_id),

    -- Disponibilidad
    availability JSONB DEFAULT '{}',
    -- {"monday": {"start": "09:00", "end": "18:00"}, "tuesday": {...}}
    service_regions TEXT[] DEFAULT '{}', -- ["Buenos Aires", "Córdoba", "Chile"]
    remote_available BOOLEAN DEFAULT false,

    -- Pricing
    hourly_rate DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'ARS',
    payment_terms TEXT,

    -- Ratings y estadísticas
    rating_average DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    contracts_completed INTEGER DEFAULT 0,
    active_contracts INTEGER DEFAULT 0,

    -- Verificación APONNT
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    verified_by UUID,
    verification_notes TEXT,

    -- Estado
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false, -- Destacado en búsquedas

    -- Metadata
    tags TEXT[] DEFAULT '{}', -- ["bilingüe", "disponibilidad-inmediata"]
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_associates_category ON aponnt_associates(category);
CREATE INDEX IF NOT EXISTS idx_associates_regions ON aponnt_associates USING GIN(service_regions);
CREATE INDEX IF NOT EXISTS idx_associates_active ON aponnt_associates(is_active, is_verified);
CREATE INDEX IF NOT EXISTS idx_associates_rating ON aponnt_associates(rating_average DESC);

-- =====================================================
-- PARTE 4: CONTRATOS EMPRESA-ASOCIADO
-- =====================================================

CREATE TYPE contract_type AS ENUM ('permanent', 'eventual');
CREATE TYPE contract_scope AS ENUM ('all_company', 'branches', 'departments', 'employees');
CREATE TYPE contract_status AS ENUM ('pending', 'active', 'paused', 'terminated', 'expired');

CREATE TABLE IF NOT EXISTS company_associate_contracts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    associate_id UUID NOT NULL REFERENCES aponnt_associates(id) ON DELETE CASCADE,

    -- Tipo de contratación
    contract_type contract_type NOT NULL,

    -- Alcance del acceso
    scope_type contract_scope NOT NULL DEFAULT 'all_company',

    -- Sucursales asignadas (si scope_type = 'branches')
    assigned_branches UUID[] DEFAULT '{}',

    -- Departamentos asignados (si scope_type = 'departments')
    assigned_departments INTEGER[] DEFAULT '{}',

    -- Rol asignado (determina permisos)
    role_id INTEGER REFERENCES role_definitions(id),

    -- Permisos personalizados (override del rol)
    custom_permissions JSONB DEFAULT NULL,

    -- Fechas
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE, -- NULL = indefinido

    -- Estado
    status contract_status DEFAULT 'pending',

    -- Términos del contrato
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP,
    hourly_rate_agreed DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'ARS',
    notes TEXT,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,
    terminated_by UUID REFERENCES users(user_id),
    terminated_at TIMESTAMP,
    termination_reason TEXT,

    -- Restricción: un asociado solo puede tener un contrato activo por empresa
    UNIQUE(company_id, associate_id, status) -- Parcial, ver trigger
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contracts_company ON company_associate_contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_associate ON company_associate_contracts(associate_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON company_associate_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_active ON company_associate_contracts(company_id, status) WHERE status = 'active';

-- =====================================================
-- PARTE 5: ASIGNACIÓN DE EMPLEADOS A ASOCIADOS (eventuales)
-- =====================================================

CREATE TABLE IF NOT EXISTS associate_employee_assignments (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES company_associate_contracts(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

    -- Razón de asignación
    assignment_reason TEXT,
    assignment_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'auto_branch', 'auto_department'

    -- Fechas
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(user_id),
    expires_at TIMESTAMP, -- NULL = sin vencimiento

    -- Estado
    is_active BOOLEAN DEFAULT true,
    deactivated_at TIMESTAMP,
    deactivated_by UUID REFERENCES users(user_id),
    deactivation_reason TEXT,

    -- Un empleado solo puede estar asignado una vez por contrato
    UNIQUE(contract_id, employee_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_assignments_contract ON associate_employee_assignments(contract_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee ON associate_employee_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON associate_employee_assignments(contract_id, is_active) WHERE is_active = true;

-- =====================================================
-- PARTE 6: ASIGNACIÓN DE ROLES A USUARIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_role_assignments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES role_definitions(id) ON DELETE CASCADE,

    -- Alcance específico (puede sobreescribir el del rol)
    scope_override JSONB DEFAULT NULL,
    -- {"branches": ["uuid-1", "uuid-2"], "departments": [1, 5]}

    -- Vigencia
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE, -- NULL = indefinido

    -- Estado
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false, -- Rol principal del usuario

    -- Auditoría
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(user_id),
    deactivated_at TIMESTAMP,
    deactivated_by UUID REFERENCES users(user_id),
    deactivation_reason TEXT,

    -- Un usuario puede tener múltiples roles, pero solo uno primario
    UNIQUE(user_id, role_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_role_assignments(user_id, is_active) WHERE is_active = true;

-- =====================================================
-- PARTE 7: LOG DE ACCESOS (AUDITORÍA)
-- =====================================================

CREATE TABLE IF NOT EXISTS access_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    company_id INTEGER REFERENCES companies(company_id),

    -- Acción
    action VARCHAR(50) NOT NULL, -- 'access_granted', 'access_denied', 'permission_check'
    module_key VARCHAR(100),
    requested_action VARCHAR(20), -- 'read', 'create', 'update', 'delete'

    -- Resultado
    was_allowed BOOLEAN NOT NULL,
    denial_reason TEXT,

    -- Contexto
    resource_type VARCHAR(50), -- 'user', 'attendance', etc.
    resource_id VARCHAR(100),

    -- Request info
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para consultas por usuario/fecha
CREATE INDEX IF NOT EXISTS idx_access_log_user_date ON access_audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_company_date ON access_audit_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_denied ON access_audit_log(was_allowed, created_at DESC) WHERE was_allowed = false;

-- =====================================================
-- PARTE 8: TEXTOS DE AYUDA CONTEXTUAL
-- =====================================================

CREATE TABLE IF NOT EXISTS contextual_help (
    id SERIAL PRIMARY KEY,

    -- Ubicación
    module_key VARCHAR(100) NOT NULL,
    screen_key VARCHAR(100), -- Pantalla específica dentro del módulo
    element_key VARCHAR(100), -- Elemento específico (botón, campo, etc.)

    -- Contenido
    help_type VARCHAR(20) DEFAULT 'tooltip', -- 'tooltip', 'bubble', 'walkthrough', 'video'
    title VARCHAR(200),
    content TEXT NOT NULL,
    content_html TEXT, -- Versión HTML si aplica

    -- Para walkthroughs (tutoriales paso a paso)
    step_order INTEGER,

    -- Condiciones de visualización
    show_condition JSONB DEFAULT '{}',
    -- {"first_visit": true, "role": ["admin", "supervisor"], "after_action": "create_user"}

    -- Media
    image_url TEXT,
    video_url TEXT,

    -- Estilo
    position VARCHAR(20) DEFAULT 'auto', -- 'top', 'bottom', 'left', 'right', 'auto'
    style JSONB DEFAULT '{}', -- {"width": "300px", "theme": "dark"}

    -- Estado
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,

    -- Estadísticas
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(module_key, screen_key, element_key)
);

-- Seed ayuda contextual inicial
INSERT INTO contextual_help (module_key, screen_key, element_key, help_type, title, content, position) VALUES
-- Roles y Permisos
('roles-permissions', 'main', 'header', 'bubble', '¿Qué son los Roles?', 'Los roles definen qué puede hacer cada usuario en el sistema. Un administrador tiene acceso total, mientras que un empleado solo ve su portal personal. Puedes crear roles personalizados para necesidades específicas.', 'bottom'),
('roles-permissions', 'main', 'btn-create-role', 'tooltip', 'Crear Rol Personalizado', 'Crea un nuevo rol definiendo qué módulos puede ver y qué acciones puede realizar (leer, crear, editar, eliminar).', 'left'),
('roles-permissions', 'main', 'permissions-matrix', 'bubble', 'Matriz de Permisos', 'Esta matriz muestra todos los módulos del sistema y los permisos de cada rol. Verde = permitido, Rojo = denegado. Haz clic en una celda para cambiar el permiso.', 'top'),

-- Asociados
('associate-marketplace', 'main', 'header', 'bubble', 'Profesionales Verificados', 'Aquí encontrarás médicos laborales, abogados, asesores de seguridad y otros profesionales verificados por APONNT. Puedes contratarlos de forma permanente o eventual.', 'bottom'),
('associate-marketplace', 'main', 'filter-category', 'tooltip', 'Filtrar por Especialidad', 'Selecciona la categoría de profesional que necesitas. Puedes ver su perfil, calificaciones y tarifas antes de contratar.', 'right'),
('associate-marketplace', 'contract-modal', 'contract-type', 'bubble', 'Permanente vs Eventual', '<b>Permanente:</b> El profesional tiene acceso a TODOS los empleados de tu empresa.<br><br><b>Eventual:</b> Solo tendrá acceso a los empleados que le asignes específicamente.', 'right'),
('associate-marketplace', 'contract-modal', 'scope-branches', 'tooltip', 'Segmentar por Sucursal', 'Si tu empresa tiene múltiples sucursales, puedes asignar un profesional diferente a cada una. Selecciona las sucursales a las que tendrá acceso.', 'left'),

-- Estructura Organizacional
('organizational', 'main', 'header', 'bubble', 'Tu Estructura Organizacional', 'Define la estructura de tu empresa antes de agregar empleados. El orden recomendado es: 1) Sucursales, 2) Departamentos, 3) Sectores, 4) Turnos.', 'bottom'),
('organizational', 'departments', 'btn-create', 'tooltip', 'Nuevo Departamento', 'Crea departamentos para organizar a tus empleados. Cada departamento puede tener su propio supervisor.', 'left'),

-- Usuarios
('users', 'main', 'btn-create-user', 'tooltip', 'Nuevo Empleado', 'Antes de agregar empleados, asegúrate de tener configurados: departamentos, turnos y sucursales.', 'left'),
('users', 'detail', 'tab-permissions', 'bubble', 'Permisos del Usuario', 'Aquí puedes asignar roles adicionales a este usuario o personalizar sus permisos. Los cambios se aplican inmediatamente.', 'top')

ON CONFLICT (module_key, screen_key, element_key) DO UPDATE SET
    content = EXCLUDED.content,
    title = EXCLUDED.title,
    updated_at = NOW();

-- =====================================================
-- PARTE 9: FUNCIONES HELPER
-- =====================================================

-- Función para obtener permisos efectivos de un usuario
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id UUID, p_company_id INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_permissions JSONB := '{}';
    v_role RECORD;
    v_contract RECORD;
BEGIN
    -- 1. Obtener permisos de roles asignados
    FOR v_role IN (
        SELECT rd.module_permissions, rd.special_permissions, rd.priority
        FROM user_role_assignments ura
        JOIN role_definitions rd ON rd.id = ura.role_id
        WHERE ura.user_id = p_user_id
          AND ura.is_active = true
          AND (ura.valid_from IS NULL OR ura.valid_from <= CURRENT_DATE)
          AND (ura.valid_until IS NULL OR ura.valid_until >= CURRENT_DATE)
        ORDER BY rd.priority DESC
    )
    LOOP
        -- Merge permisos (prioridad mayor gana)
        v_permissions := v_permissions || v_role.module_permissions;
    END LOOP;

    -- 2. Si es asociado, agregar permisos del contrato
    FOR v_contract IN (
        SELECT cac.custom_permissions, rd.module_permissions
        FROM company_associate_contracts cac
        LEFT JOIN role_definitions rd ON rd.id = cac.role_id
        JOIN aponnt_associates aa ON aa.id = cac.associate_id
        WHERE aa.user_id = p_user_id
          AND cac.company_id = p_company_id
          AND cac.status = 'active'
    )
    LOOP
        IF v_contract.custom_permissions IS NOT NULL THEN
            v_permissions := v_permissions || v_contract.custom_permissions;
        ELSIF v_contract.module_permissions IS NOT NULL THEN
            v_permissions := v_permissions || v_contract.module_permissions;
        END IF;
    END LOOP;

    RETURN v_permissions;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si usuario puede acceder a módulo/acción
CREATE OR REPLACE FUNCTION check_user_access(
    p_user_id UUID,
    p_company_id INTEGER,
    p_module_key VARCHAR,
    p_action VARCHAR DEFAULT 'read'
)
RETURNS TABLE(
    allowed BOOLEAN,
    scope VARCHAR,
    reason TEXT
) AS $$
DECLARE
    v_permissions JSONB;
    v_module_perms JSONB;
    v_user_role VARCHAR;
BEGIN
    -- Obtener rol del usuario de la tabla users
    SELECT role INTO v_user_role FROM users WHERE user_id = p_user_id;

    -- Super admin siempre tiene acceso
    IF v_user_role = 'super_admin' THEN
        RETURN QUERY SELECT true, 'all'::VARCHAR, 'super_admin_access'::TEXT;
        RETURN;
    END IF;

    -- Obtener permisos efectivos
    v_permissions := get_user_effective_permissions(p_user_id, p_company_id);

    -- Verificar permiso wildcard
    IF v_permissions ? '*' THEN
        v_module_perms := v_permissions->'*';
        IF v_module_perms->'actions' ? p_action OR v_module_perms->'actions' ? '*' THEN
            RETURN QUERY SELECT true, (v_module_perms->>'scope')::VARCHAR, 'wildcard_permission'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Verificar permiso específico del módulo
    IF v_permissions ? p_module_key THEN
        v_module_perms := v_permissions->p_module_key;
        IF v_module_perms->'actions' ? p_action THEN
            RETURN QUERY SELECT true, (v_module_perms->>'scope')::VARCHAR, 'module_permission'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Sin permiso
    RETURN QUERY SELECT false, NULL::VARCHAR, 'no_permission'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener empleados visibles por un asociado
CREATE OR REPLACE FUNCTION get_associate_visible_employees(
    p_associate_user_id UUID,
    p_company_id INTEGER
)
RETURNS TABLE(employee_id UUID) AS $$
DECLARE
    v_contract RECORD;
BEGIN
    -- Buscar contrato activo del asociado en esta empresa
    SELECT cac.* INTO v_contract
    FROM company_associate_contracts cac
    JOIN aponnt_associates aa ON aa.id = cac.associate_id
    WHERE aa.user_id = p_associate_user_id
      AND cac.company_id = p_company_id
      AND cac.status = 'active'
    LIMIT 1;

    IF v_contract IS NULL THEN
        RETURN; -- Sin contrato, sin acceso
    END IF;

    -- Según el tipo de contrato y alcance
    IF v_contract.contract_type = 'permanent' AND v_contract.scope_type = 'all_company' THEN
        -- Permanente con acceso total: todos los empleados
        RETURN QUERY
            SELECT u.user_id FROM users u
            WHERE u.company_id = p_company_id AND u.is_active = true;

    ELSIF v_contract.scope_type = 'branches' THEN
        -- Filtrar por sucursales asignadas
        RETURN QUERY
            SELECT u.user_id FROM users u
            WHERE u.company_id = p_company_id
              AND u.is_active = true
              AND u.branch_id = ANY(v_contract.assigned_branches);

    ELSIF v_contract.scope_type = 'departments' THEN
        -- Filtrar por departamentos asignados
        RETURN QUERY
            SELECT u.user_id FROM users u
            WHERE u.company_id = p_company_id
              AND u.is_active = true
              AND u.department_id = ANY(v_contract.assigned_departments);

    ELSIF v_contract.scope_type = 'employees' OR v_contract.contract_type = 'eventual' THEN
        -- Solo empleados específicamente asignados
        RETURN QUERY
            SELECT aea.employee_id
            FROM associate_employee_assignments aea
            WHERE aea.contract_id = v_contract.id
              AND aea.is_active = true
              AND (aea.expires_at IS NULL OR aea.expires_at > NOW());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar dependencias antes de CRUD
CREATE OR REPLACE FUNCTION check_module_dependencies(p_module_key VARCHAR, p_company_id INTEGER)
RETURNS TABLE(
    is_ready BOOLEAN,
    missing_dependencies JSONB,
    warnings JSONB
) AS $$
DECLARE
    v_module RECORD;
    v_prereqs JSONB;
    v_missing JSONB := '[]';
    v_warnings JSONB := '[]';
    v_table_name TEXT;
    v_min_records INTEGER;
    v_actual_count INTEGER;
BEGIN
    -- Obtener definición del módulo
    SELECT * INTO v_module FROM module_definitions WHERE module_key = p_module_key;

    IF v_module IS NULL THEN
        RETURN QUERY SELECT false, '["Módulo no encontrado"]'::JSONB, '[]'::JSONB;
        RETURN;
    END IF;

    v_prereqs := v_module.prerequisite_data;

    -- Verificar tablas requeridas con registros mínimos
    IF v_prereqs ? 'required_tables' AND v_prereqs ? 'min_records' THEN
        FOR v_table_name IN SELECT jsonb_array_elements_text(v_prereqs->'required_tables')
        LOOP
            v_min_records := COALESCE((v_prereqs->'min_records'->>v_table_name)::INTEGER, 1);

            -- Contar registros de la tabla
            EXECUTE format('SELECT COUNT(*) FROM %I WHERE company_id = $1', v_table_name)
            INTO v_actual_count
            USING p_company_id;

            IF v_actual_count < v_min_records THEN
                v_missing := v_missing || jsonb_build_object(
                    'table', v_table_name,
                    'required', v_min_records,
                    'actual', v_actual_count,
                    'message', format('Necesitas al menos %s registro(s) en %s', v_min_records, v_table_name)
                );
            END IF;
        END LOOP;
    END IF;

    -- Verificar si requiere asociado de cierta categoría
    IF v_prereqs ? 'associate_category' THEN
        SELECT COUNT(*) INTO v_actual_count
        FROM company_associate_contracts cac
        JOIN aponnt_associates aa ON aa.id = cac.associate_id
        WHERE cac.company_id = p_company_id
          AND cac.status = 'active'
          AND aa.category::TEXT = v_prereqs->>'associate_category';

        IF v_actual_count = 0 THEN
            v_warnings := v_warnings || jsonb_build_object(
                'type', 'associate_required',
                'category', v_prereqs->>'associate_category',
                'message', format('Para funcionalidad completa, contrata un %s desde Servicios Profesionales', v_prereqs->>'associate_category')
            );
        END IF;
    END IF;

    RETURN QUERY SELECT
        jsonb_array_length(v_missing) = 0,
        v_missing,
        v_warnings;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 10: TRIGGERS
-- =====================================================

-- Trigger para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['role_definitions', 'aponnt_associates', 'company_associate_contracts', 'contextual_help', 'module_definitions']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
            CREATE TRIGGER trg_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-- =====================================================
-- GRANTS
-- =====================================================
-- (Agregar según necesidades de seguridad)

COMMIT;
