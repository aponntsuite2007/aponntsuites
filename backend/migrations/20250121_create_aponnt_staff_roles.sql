/**
 * ============================================================================
 * MIGRACIÓN: SISTEMA DE ROLES STAFF APONNT - Multi-País
 * ============================================================================
 *
 * Descripción:
 * - Tabla de roles para staff de Aponnt (no confundir con roles de usuarios de empresas clientes)
 * - Soporta multi-país: roles como Gerente Regional se replican por país
 * - Estructura jerárquica de 5 niveles (0: CEO, 1: Gerentes, 2: Jefes, 3: Coordinadores, 4: Operativos)
 * - i18n: Nombres de roles en 6 idiomas (es, en, pt, fr, de, it)
 *
 * Autor: Claude Code
 * Fecha: 2025-01-21
 */

-- ==================== TABLA: aponnt_staff_roles ====================

CREATE TABLE IF NOT EXISTS aponnt_staff_roles (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación del rol
  role_code VARCHAR(10) UNIQUE NOT NULL,      -- 'GG', 'GR', 'GA', 'GD', 'SV', 'LV', 'VEND', etc.
  role_name VARCHAR(100) NOT NULL,            -- 'Gerente General', 'Gerente Regional'

  -- Internacionalización (JSON con 6 idiomas)
  role_name_i18n JSONB DEFAULT '{}'::jsonb,   -- {'es': 'Gerente General', 'en': 'General Manager', 'pt': 'Gerente Geral', ...}

  -- Categorización
  role_area VARCHAR(50),                      -- 'ventas', 'admin', 'desarrollo', 'externo'
  level INTEGER NOT NULL,                     -- 0 (CEO), 1 (Gerentes), 2 (Jefes), 3 (Coordinadores), 4 (Operativos)

  -- Configuraciones
  is_sales_role BOOLEAN DEFAULT false,        -- Si participa en sistema de comisiones
  is_country_specific BOOLEAN DEFAULT false,  -- Si se replica por país (Gerentes Regionales, Supervisores, etc.)

  -- Jerarquía (a nivel de rol)
  reports_to_role_code VARCHAR(10),           -- 'GR' reporta a 'GG', 'SV' reporta a 'GR'

  -- Metadata
  description TEXT,                           -- Descripción del rol
  responsibilities JSONB DEFAULT '[]'::jsonb, -- Array de responsabilidades

  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_staff_roles_area ON aponnt_staff_roles(role_area);
CREATE INDEX IF NOT EXISTS idx_staff_roles_level ON aponnt_staff_roles(level);
CREATE INDEX IF NOT EXISTS idx_staff_roles_country_specific ON aponnt_staff_roles(is_country_specific);
CREATE INDEX IF NOT EXISTS idx_staff_roles_reports_to ON aponnt_staff_roles(reports_to_role_code);

-- ==================== SEEDEAR ROLES BASE ====================

-- NIVEL 0: GERENTE GENERAL (único, global)
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'GG',
  'Gerente General',
  '{
    "es": "Gerente General",
    "en": "General Manager",
    "pt": "Gerente Geral",
    "fr": "Directeur Général",
    "de": "Geschäftsführer",
    "it": "Direttore Generale"
  }'::jsonb,
  'direccion',
  0,
  false,
  false,
  NULL,
  'CEO y máxima autoridad ejecutiva de Aponnt',
  '["Dirección estratégica de la empresa", "Supervisión de todos los gerentes", "Decisiones de alto nivel", "Relaciones con inversores"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- NIVEL 1: GERENTES DE ÁREA

-- Gerente Regional (SE REPLICA POR PAÍS)
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'GR',
  'Gerente Regional',
  '{
    "es": "Gerente Regional",
    "en": "Regional Manager",
    "pt": "Gerente Regional",
    "fr": "Directeur Régional",
    "de": "Regionalleiter",
    "it": "Direttore Regionale"
  }'::jsonb,
  'ventas',
  1,
  true,
  true,  -- ← SE REPLICA POR PAÍS
  'GG',
  'Gerente de ventas de un país específico',
  '["Gestión de equipos de ventas regionales", "Cumplimiento de objetivos comerciales", "Supervisión de vendedores y supervisores", "Estrategia comercial regional"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Gerente Administrativo (único, global)
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'GA',
  'Gerente Administrativo',
  '{
    "es": "Gerente Administrativo",
    "en": "Administrative Manager",
    "pt": "Gerente Administrativo",
    "fr": "Directeur Administratif",
    "de": "Verwaltungsleiter",
    "it": "Direttore Amministrativo"
  }'::jsonb,
  'admin',
  1,
  false,
  false,
  'GG',
  'Gestión administrativa integral de Aponnt',
  '["Gestión administrativa integral", "Supervisión de facturación y cobranzas", "Control contable e impositivo", "Gestión legal y compliance"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Gerente de Desarrollo (único, global)
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'GD',
  'Gerente de Desarrollo',
  '{
    "es": "Gerente de Desarrollo",
    "en": "Development Manager",
    "pt": "Gerente de Desenvolvimento",
    "fr": "Directeur du Développement",
    "de": "Entwicklungsleiter",
    "it": "Direttore dello Sviluppo"
  }'::jsonb,
  'desarrollo',
  1,
  false,
  false,
  'GG',
  'Gestión de tecnología y desarrollo de software',
  '["Dirección técnica de la empresa", "Supervisión de ingenieros y analistas", "Gestión de proyectos IT", "Arquitectura de software"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- NIVEL 2: JEFATURAS

-- Supervisor de Ventas (SE REPLICA POR PAÍS)
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'SV',
  'Supervisor de Ventas',
  '{
    "es": "Supervisor de Ventas",
    "en": "Sales Supervisor",
    "pt": "Supervisor de Vendas",
    "fr": "Superviseur des Ventes",
    "de": "Verkaufsleiter",
    "it": "Supervisore Vendite"
  }'::jsonb,
  'ventas',
  2,
  true,
  true,  -- ← SE REPLICA POR PAÍS
  'GR',
  'Supervisión de equipos de ventas en región',
  '["Supervisión de equipos de ventas", "Coaching y capacitación de vendedores", "Seguimiento de objetivos", "Reportes a Gerente Regional"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Jefe de Facturación y Cobranzas
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'JFC',
  'Jefe de Facturación y Cobranzas',
  '{
    "es": "Jefe de Facturación y Cobranzas",
    "en": "Billing and Collections Manager",
    "pt": "Chefe de Faturamento e Cobranças",
    "fr": "Chef de Facturation et Recouvrement",
    "de": "Rechnungs- und Inkassoleiter",
    "it": "Responsabile Fatturazione e Riscossioni"
  }'::jsonb,
  'admin',
  2,
  false,
  false,
  'GA',
  'Gestión de facturación y cobranzas de clientes',
  '["Emisión de facturas", "Gestión de cobranzas", "Control de cuentas por cobrar", "Reportes financieros"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Jefe de Contabilidad e Impuestos
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'JCI',
  'Jefe de Contabilidad e Impuestos',
  '{
    "es": "Jefe de Contabilidad e Impuestos",
    "en": "Accounting and Tax Manager",
    "pt": "Chefe de Contabilidade e Impostos",
    "fr": "Chef de Comptabilité et Fiscalité",
    "de": "Buchhaltungs- und Steuerleiter",
    "it": "Responsabile Contabilità e Tasse"
  }'::jsonb,
  'admin',
  2,
  false,
  false,
  'GA',
  'Gestión contable e impositiva de Aponnt',
  '["Contabilidad general", "Liquidación de impuestos", "Balance y estados contables", "Cumplimiento normativo"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Jefe de Legal
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'JL',
  'Jefe Legal',
  '{
    "es": "Jefe Legal",
    "en": "Legal Manager",
    "pt": "Chefe Legal",
    "fr": "Chef Juridique",
    "de": "Rechtsleiter",
    "it": "Responsabile Legale"
  }'::jsonb,
  'admin',
  2,
  false,
  false,
  'GA',
  'Gestión legal y compliance de Aponnt',
  '["Contratos y acuerdos", "Cumplimiento normativo", "Litigios y reclamos", "Asesoría jurídica"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Jefe de Ingeniería
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'JI',
  'Jefe de Ingeniería',
  '{
    "es": "Jefe de Ingeniería",
    "en": "Engineering Manager",
    "pt": "Chefe de Engenharia",
    "fr": "Chef de l''Ingénierie",
    "de": "Ingenieurleiter",
    "it": "Responsabile Ingegneria"
  }'::jsonb,
  'desarrollo',
  2,
  false,
  false,
  'GD',
  'Gestión de equipos de desarrollo de software',
  '["Supervisión de ingenieros", "Arquitectura de software", "Code review", "Sprint planning"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Jefe de Análisis de Sistemas
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'JAS',
  'Jefe de Análisis de Sistemas',
  '{
    "es": "Jefe de Análisis de Sistemas",
    "en": "Systems Analysis Manager",
    "pt": "Chefe de Análise de Sistemas",
    "fr": "Chef d''Analyse des Systèmes",
    "de": "Systemanalyseleiter",
    "it": "Responsabile Analisi Sistemi"
  }'::jsonb,
  'desarrollo',
  2,
  false,
  false,
  'GD',
  'Análisis de requerimientos y especificaciones técnicas',
  '["Análisis de requerimientos", "Diseño de soluciones", "Documentación técnica", "Coordinación con clientes"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Jefe de Base de Datos (DBA Senior)
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'DBA-SR',
  'Jefe de Base de Datos',
  '{
    "es": "Jefe de Base de Datos",
    "en": "Database Manager",
    "pt": "Chefe de Banco de Dados",
    "fr": "Chef de Base de Données",
    "de": "Datenbankleiter",
    "it": "Responsabile Database"
  }'::jsonb,
  'desarrollo',
  2,
  false,
  false,
  'GD',
  'Administración de bases de datos y performance',
  '["Diseño de schemas", "Optimización de queries", "Backups y recuperación", "Monitoreo de performance"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- NIVEL 3: COORDINADORES / LÍDERES

-- Líder de Equipo (SE REPLICA POR PAÍS)
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'LV',
  'Líder de Equipo',
  '{
    "es": "Líder de Equipo",
    "en": "Team Leader",
    "pt": "Líder de Equipe",
    "fr": "Chef d''Équipe",
    "de": "Teamleiter",
    "it": "Team Leader"
  }'::jsonb,
  'ventas',
  3,
  true,
  true,  -- ← SE REPLICA POR PAÍS
  'SV',
  'Liderazgo de equipo de vendedores',
  '["Mentoría de vendedores", "Seguimiento diario de ventas", "Motivación del equipo", "Resolución de problemas en campo"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Ingeniero Senior
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'ING-SR',
  'Ingeniero Senior',
  '{
    "es": "Ingeniero Senior",
    "en": "Senior Engineer",
    "pt": "Engenheiro Sênior",
    "fr": "Ingénieur Senior",
    "de": "Senior-Ingenieur",
    "it": "Ingegnere Senior"
  }'::jsonb,
  'desarrollo',
  3,
  false,
  false,
  'JI',
  'Desarrollo de software con liderazgo técnico',
  '["Desarrollo de features complejos", "Mentoría de developers junior", "Code review", "Arquitectura técnica"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- NIVEL 4: OPERATIVOS

-- Vendedor (SE REPLICA POR PAÍS)
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'VEND',
  'Vendedor',
  '{
    "es": "Vendedor",
    "en": "Sales Representative",
    "pt": "Vendedor",
    "fr": "Vendeur",
    "de": "Verkäufer",
    "it": "Venditore"
  }'::jsonb,
  'ventas',
  4,
  true,
  true,  -- ← SE REPLICA POR PAÍS
  'LV',
  'Venta directa de productos y servicios Aponnt',
  '["Prospección de clientes", "Presentación de demos", "Cierre de ventas", "Seguimiento post-venta"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Desarrollador Frontend
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'DEV-FE',
  'Desarrollador Frontend',
  '{
    "es": "Desarrollador Frontend",
    "en": "Frontend Developer",
    "pt": "Desenvolvedor Frontend",
    "fr": "Développeur Frontend",
    "de": "Frontend-Entwickler",
    "it": "Sviluppatore Frontend"
  }'::jsonb,
  'desarrollo',
  4,
  false,
  false,
  'ING-SR',
  'Desarrollo de interfaces de usuario',
  '["HTML, CSS, JavaScript", "Frameworks modernos", "UX/UI implementation", "Responsive design"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Desarrollador Backend
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'DEV-BE',
  'Desarrollador Backend',
  '{
    "es": "Desarrollador Backend",
    "en": "Backend Developer",
    "pt": "Desenvolvedor Backend",
    "fr": "Développeur Backend",
    "de": "Backend-Entwickler",
    "it": "Sviluppatore Backend"
  }'::jsonb,
  'desarrollo',
  4,
  false,
  false,
  'ING-SR',
  'Desarrollo de lógica de negocio y APIs',
  '["Node.js, Express", "APIs RESTful", "PostgreSQL", "Microservicios"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- DBA Junior
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'DBA-JR',
  'DBA Junior',
  '{
    "es": "DBA Junior",
    "en": "Junior DBA",
    "pt": "DBA Júnior",
    "fr": "DBA Junior",
    "de": "Junior-DBA",
    "it": "DBA Junior"
  }'::jsonb,
  'desarrollo',
  4,
  false,
  false,
  'DBA-SR',
  'Administración de bases de datos bajo supervisión',
  '["Backups diarios", "Monitoreo de performance", "Ejecución de scripts", "Soporte a developers"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Analista de Sistemas
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'AS',
  'Analista de Sistemas',
  '{
    "es": "Analista de Sistemas",
    "en": "Systems Analyst",
    "pt": "Analista de Sistemas",
    "fr": "Analyste de Systèmes",
    "de": "Systemanalytiker",
    "it": "Analista di Sistemi"
  }'::jsonb,
  'desarrollo',
  4,
  false,
  false,
  'JAS',
  'Análisis de requerimientos y diseño de soluciones',
  '["Relevamiento de requerimientos", "Diseño de casos de uso", "Documentación funcional", "Testing funcional"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Facturador
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'FACT',
  'Facturador',
  '{
    "es": "Facturador",
    "en": "Billing Clerk",
    "pt": "Faturador",
    "fr": "Facturier",
    "de": "Rechnungssteller",
    "it": "Fatturatore"
  }'::jsonb,
  'admin',
  4,
  false,
  false,
  'JFC',
  'Emisión y gestión de facturas',
  '["Emisión de facturas", "Registro en sistema", "Envío a clientes", "Archivo de comprobantes"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Cobrador
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'COB',
  'Cobrador',
  '{
    "es": "Cobrador",
    "en": "Collections Clerk",
    "pt": "Cobrador",
    "fr": "Agent de Recouvrement",
    "de": "Inkassobeauftragter",
    "it": "Esattore"
  }'::jsonb,
  'admin',
  4,
  false,
  false,
  'JFC',
  'Gestión de cobranzas de clientes',
  '["Seguimiento de pagos", "Contacto con clientes", "Registro de cobros", "Reportes de morosidad"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Contador
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'CONT',
  'Contador',
  '{
    "es": "Contador",
    "en": "Accountant",
    "pt": "Contador",
    "fr": "Comptable",
    "de": "Buchhalter",
    "it": "Contabile"
  }'::jsonb,
  'admin',
  4,
  false,
  false,
  'JCI',
  'Registración contable y balances',
  '["Asientos contables", "Conciliaciones bancarias", "Estados contables", "Control de libros"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Liquidador de Impuestos
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'LIQ-IMP',
  'Liquidador de Impuestos',
  '{
    "es": "Liquidador de Impuestos",
    "en": "Tax Specialist",
    "pt": "Liquidador de Impostos",
    "fr": "Spécialiste Fiscal",
    "de": "Steuerspezialist",
    "it": "Specialista Fiscale"
  }'::jsonb,
  'admin',
  4,
  false,
  false,
  'JCI',
  'Liquidación de impuestos y obligaciones fiscales',
  '["Liquidación de IVA", "Declaraciones juradas", "Retenciones y percepciones", "Cumplimiento AFIP/SUNAT/etc"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Abogado
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'ABG',
  'Abogado',
  '{
    "es": "Abogado",
    "en": "Lawyer",
    "pt": "Advogado",
    "fr": "Avocat",
    "de": "Rechtsanwalt",
    "it": "Avvocato"
  }'::jsonb,
  'admin',
  4,
  false,
  false,
  'JL',
  'Asesoría legal y gestión de contratos',
  '["Redacción de contratos", "Asesoría jurídica", "Litigios", "Cumplimiento normativo"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- STAFF EXTERNO (Nivel 1, reportan directo a GG)

-- Agencia de Marketing
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'MKT',
  'Agencia de Marketing',
  '{
    "es": "Agencia de Marketing",
    "en": "Marketing Agency",
    "pt": "Agência de Marketing",
    "fr": "Agence Marketing",
    "de": "Marketingagentur",
    "it": "Agenzia Marketing"
  }'::jsonb,
  'externo',
  1,
  false,
  false,
  'GG',
  'Servicios de marketing digital y estrategia',
  '["Estrategia de marketing", "Campañas digitales", "Social media", "Branding"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Agencia de Publicidad
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'PUB',
  'Agencia de Publicidad',
  '{
    "es": "Agencia de Publicidad",
    "en": "Advertising Agency",
    "pt": "Agência de Publicidade",
    "fr": "Agence de Publicité",
    "de": "Werbeagentur",
    "it": "Agenzia Pubblicitaria"
  }'::jsonb,
  'externo',
  1,
  false,
  false,
  'GG',
  'Servicios de publicidad y creatividad',
  '["Creatividad publicitaria", "Diseño gráfico", "Video marketing", "Campañas offline"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- Asesores Externos
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'AE',
  'Asesor Externo',
  '{
    "es": "Asesor Externo",
    "en": "External Consultant",
    "pt": "Consultor Externo",
    "fr": "Consultant Externe",
    "de": "Externer Berater",
    "it": "Consulente Esterno"
  }'::jsonb,
  'externo',
  1,
  false,
  false,
  'GG',
  'Consultoría especializada externa',
  '["Consultoría estratégica", "Asesoría técnica", "Capacitaciones", "Proyectos específicos"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- ==================== COMENTARIOS ====================
--
-- ROLES QUE SE REPLICAN POR PAÍS (is_country_specific = true):
-- - GR  (Gerente Regional)
-- - SV  (Supervisor de Ventas)
-- - LV  (Líder de Equipo)
-- - VEND (Vendedor)
--
-- ROLES GLOBALES (is_country_specific = false):
-- - Todos los demás (GG, GA, GD, admin, desarrollo, externo)
--
-- i18n SOPORTADOS:
-- - es: Español
-- - en: Inglés
-- - pt: Portugués
-- - fr: Francés
-- - de: Alemán
-- - it: Italiano
--
-- ==================== FIN MIGRACIÓN ====================
