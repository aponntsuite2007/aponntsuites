-- =====================================================================
-- MIGRACIÓN: Extensión de PayrollCountry con Regulaciones de Privacidad
-- Sistema de Consentimientos Multi-País Enterprise Grade
-- =====================================================================
-- Basado en best practices de:
-- - SAP SuccessFactors (Purpose-based consent, GDPR compliance)
-- - Workday (ISO 27001/27018/27701, global privacy framework)
-- - Oracle HCM (Multi-jurisdiction consent management)
--
-- Referencias:
-- - GDPR Art. 9 (EU) - Biometric data as special category
-- - LGPD (Brazil) - Lei Geral de Proteção de Dados
-- - CCPA/CPRA (California) - Consumer Privacy Act
-- - BIPA (Illinois) - Biometric Information Privacy Act
-- - Ley 25.326 (Argentina) - Protección de Datos Personales
-- =====================================================================

-- 1. AGREGAR CAMPOS DE PRIVACIDAD A payroll_countries
-- Siguiendo el patrón de PayrollTemplate (country_id FK)
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS privacy_law_name VARCHAR(100);
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS privacy_law_full_name VARCHAR(255);
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS privacy_law_url VARCHAR(500);
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS privacy_authority_name VARCHAR(255);
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS privacy_authority_url VARCHAR(500);
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS privacy_authority_email VARCHAR(255);

-- Configuración legal de privacidad
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS requires_explicit_consent BOOLEAN DEFAULT true;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS biometric_data_retention_days INTEGER DEFAULT 90;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS emotional_data_retention_days INTEGER DEFAULT 30;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS audit_log_retention_years INTEGER DEFAULT 5;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS allows_automated_decisions BOOLEAN DEFAULT false;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS requires_dpo BOOLEAN DEFAULT false;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS min_age_consent INTEGER DEFAULT 18;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS allows_employer_monitoring BOOLEAN DEFAULT true;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS requires_works_council_approval BOOLEAN DEFAULT false;

-- Derechos del titular (Data Subject Rights - DSR)
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS data_subject_rights JSONB DEFAULT '[]'::jsonb;
-- Ejemplo: ["access", "rectification", "erasure", "portability", "restriction", "objection"]

-- Bases legales permitidas
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS legal_bases_allowed JSONB DEFAULT '[]'::jsonb;
-- Ejemplo: ["consent", "contract", "legal_obligation", "vital_interest", "public_task", "legitimate_interest"]

-- Textos legales (i18n - internacionalización)
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS consent_intro_text TEXT;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS consent_biometric_text TEXT;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS consent_emotional_text TEXT;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS consent_rights_text TEXT;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS consent_revocation_text TEXT;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS consent_footer_text TEXT;

-- Configuración de notificaciones
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS breach_notification_hours INTEGER DEFAULT 72;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS consent_expiry_warning_days INTEGER DEFAULT 30;

-- DPIA (Data Protection Impact Assessment)
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS requires_dpia_biometric BOOLEAN DEFAULT true;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS dpia_template_url VARCHAR(500);

-- Sanciones (informativo)
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS max_penalty_description VARCHAR(500);
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS penalty_currency VARCHAR(10);
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS max_penalty_amount DECIMAL(15,2);
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS penalty_percentage_revenue DECIMAL(5,2);

-- Metadata
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS privacy_config_version VARCHAR(20) DEFAULT '1.0';
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS privacy_config_updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS is_gdpr_equivalent BOOLEAN DEFAULT false;
ALTER TABLE payroll_countries ADD COLUMN IF NOT EXISTS gdpr_adequacy_decision BOOLEAN DEFAULT false;

-- 2. CREAR ÍNDICES PARA BÚSQUEDA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_payroll_countries_privacy_law ON payroll_countries(privacy_law_name);
CREATE INDEX IF NOT EXISTS idx_payroll_countries_gdpr ON payroll_countries(is_gdpr_equivalent);

-- 3. INSERTAR/ACTUALIZAR DATOS DE PAÍSES CON REGULACIONES DE PRIVACIDAD
-- =====================================================================

-- ARGENTINA - Ley 25.326
INSERT INTO payroll_countries (
    country_code, country_name, currency_code, currency_symbol,
    decimal_places, thousand_separator, decimal_separator,
    labor_law_name, default_pay_frequency, fiscal_year_start_month,
    aguinaldo_enabled, aguinaldo_frequency, tax_id_name, tax_id_format,
    privacy_law_name, privacy_law_full_name, privacy_law_url,
    privacy_authority_name, privacy_authority_url, privacy_authority_email,
    requires_explicit_consent, biometric_data_retention_days, emotional_data_retention_days,
    audit_log_retention_years, allows_automated_decisions, requires_dpo, min_age_consent,
    allows_employer_monitoring, requires_works_council_approval,
    data_subject_rights, legal_bases_allowed,
    consent_intro_text, consent_biometric_text, consent_emotional_text,
    consent_rights_text, consent_revocation_text, consent_footer_text,
    breach_notification_hours, consent_expiry_warning_days,
    requires_dpia_biometric, max_penalty_description, penalty_currency,
    is_gdpr_equivalent, gdpr_adequacy_decision, is_active
) VALUES (
    'ARG', 'Argentina', 'ARS', '$',
    2, '.', ',',
    'Ley de Contrato de Trabajo 20.744', 'monthly', 1,
    true, 'semi_annual', 'CUIT', 'XX-XXXXXXXX-X',
    'Ley 25.326', 'Ley de Protección de los Datos Personales', 'https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto',
    'Agencia de Acceso a la Información Pública (AAIP)', 'https://www.argentina.gob.ar/aaip', 'datospersonales@aaip.gob.ar',
    true, 90, 30,
    5, false, false, 18,
    true, false,
    '["acceso", "rectificación", "supresión", "oposición", "información"]'::jsonb,
    '["consentimiento", "obligación_legal", "interés_vital", "interés_legítimo"]'::jsonb,
    'En cumplimiento de la Ley 25.326 de Protección de los Datos Personales de la República Argentina, se solicita su consentimiento expreso, libre e informado para el tratamiento de sus datos biométricos.',
    'Los datos biométricos (vectores matemáticos de 128 dimensiones derivados del análisis facial) serán utilizados exclusivamente para control de asistencia laboral e identificación de empleados. NO se almacenan fotografías de su rostro.',
    'El análisis emocional mediante Azure Face API detecta indicadores de bienestar laboral (fatiga, estrés) para programas de salud ocupacional. Los resultados NO se utilizan para evaluaciones de desempeño ni decisiones laborales.',
    'Según Art. 14-16 de la Ley 25.326, usted tiene derecho a: ACCEDER a sus datos personales, RECTIFICAR información inexacta, SUPRIMIR sus datos (derecho al olvido), OPONERSE al tratamiento, y solicitar INFORMACIÓN sobre el uso de sus datos.',
    'Puede REVOCAR este consentimiento en cualquier momento sin que esto afecte su situación laboral, remuneración o beneficios. La revocación será procesada en un plazo máximo de 10 días hábiles.',
    'Responsable: Área de Protección de Datos de la empresa. Autoridad de control: AAIP (www.argentina.gob.ar/aaip). Email: datospersonales@aaip.gob.ar',
    72, 30,
    true, 'Multa de $1.000 a $100.000 según gravedad (Ley 25.326 Art. 31)', 'ARS',
    true, true, true
) ON CONFLICT (country_code) DO UPDATE SET
    privacy_law_name = EXCLUDED.privacy_law_name,
    privacy_law_full_name = EXCLUDED.privacy_law_full_name,
    privacy_law_url = EXCLUDED.privacy_law_url,
    privacy_authority_name = EXCLUDED.privacy_authority_name,
    privacy_authority_url = EXCLUDED.privacy_authority_url,
    privacy_authority_email = EXCLUDED.privacy_authority_email,
    requires_explicit_consent = EXCLUDED.requires_explicit_consent,
    biometric_data_retention_days = EXCLUDED.biometric_data_retention_days,
    emotional_data_retention_days = EXCLUDED.emotional_data_retention_days,
    audit_log_retention_years = EXCLUDED.audit_log_retention_years,
    data_subject_rights = EXCLUDED.data_subject_rights,
    legal_bases_allowed = EXCLUDED.legal_bases_allowed,
    consent_intro_text = EXCLUDED.consent_intro_text,
    consent_biometric_text = EXCLUDED.consent_biometric_text,
    consent_emotional_text = EXCLUDED.consent_emotional_text,
    consent_rights_text = EXCLUDED.consent_rights_text,
    consent_revocation_text = EXCLUDED.consent_revocation_text,
    consent_footer_text = EXCLUDED.consent_footer_text,
    breach_notification_hours = EXCLUDED.breach_notification_hours,
    requires_dpia_biometric = EXCLUDED.requires_dpia_biometric,
    max_penalty_description = EXCLUDED.max_penalty_description,
    is_gdpr_equivalent = EXCLUDED.is_gdpr_equivalent,
    gdpr_adequacy_decision = EXCLUDED.gdpr_adequacy_decision,
    privacy_config_updated_at = NOW();

-- ESPAÑA - GDPR + LOPDGDD
INSERT INTO payroll_countries (
    country_code, country_name, currency_code, currency_symbol,
    decimal_places, thousand_separator, decimal_separator,
    labor_law_name, default_pay_frequency, fiscal_year_start_month,
    aguinaldo_enabled, tax_id_name, tax_id_format,
    privacy_law_name, privacy_law_full_name, privacy_law_url,
    privacy_authority_name, privacy_authority_url, privacy_authority_email,
    requires_explicit_consent, biometric_data_retention_days, emotional_data_retention_days,
    audit_log_retention_years, allows_automated_decisions, requires_dpo, min_age_consent,
    allows_employer_monitoring, requires_works_council_approval,
    data_subject_rights, legal_bases_allowed,
    consent_intro_text, consent_biometric_text, consent_emotional_text,
    consent_rights_text, consent_revocation_text, consent_footer_text,
    breach_notification_hours, consent_expiry_warning_days,
    requires_dpia_biometric, max_penalty_description, penalty_currency,
    max_penalty_amount, penalty_percentage_revenue,
    is_gdpr_equivalent, gdpr_adequacy_decision, is_active
) VALUES (
    'ESP', 'España', 'EUR', '€',
    2, '.', ',',
    'Estatuto de los Trabajadores', 'monthly', 1,
    true, 'NIF/NIE', 'XXXXXXXXX',
    'GDPR + LOPDGDD', 'Reglamento General de Protección de Datos (UE) 2016/679 + Ley Orgánica 3/2018', 'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673',
    'Agencia Española de Protección de Datos (AEPD)', 'https://www.aepd.es', 'ciudadano@aepd.es',
    true, 60, 30,
    5, false, true, 14,
    true, true,
    '["acceso", "rectificación", "supresión", "portabilidad", "limitación", "oposición", "no_decisiones_automatizadas"]'::jsonb,
    '["consentimiento", "contrato", "obligación_legal", "interés_vital", "interés_público", "interés_legítimo"]'::jsonb,
    'De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), solicitamos su consentimiento expreso para el tratamiento de sus datos biométricos.',
    'Los datos biométricos constituyen una categoría especial de datos personales según el Art. 9 RGPD. Se procesarán mediante tecnología Azure Face API para control de acceso y asistencia.',
    'El análisis emocional se realiza para programas de bienestar laboral conforme a la Ley 31/1995 de Prevención de Riesgos Laborales. No se utilizará para evaluaciones de desempeño.',
    'Según el RGPD, tiene derecho a: ACCESO (Art. 15), RECTIFICACIÓN (Art. 16), SUPRESIÓN (Art. 17), LIMITACIÓN (Art. 18), PORTABILIDAD (Art. 20), OPOSICIÓN (Art. 21) y a NO ser objeto de decisiones automatizadas (Art. 22).',
    'Puede RETIRAR su consentimiento en cualquier momento sin que ello afecte a la licitud del tratamiento previo. La retirada se procesará en 30 días.',
    'Delegado de Protección de Datos: dpo@empresa.com. Autoridad de control: AEPD (www.aepd.es). Puede presentar reclamación ante la AEPD.',
    72, 30,
    true, 'Hasta 20 millones EUR o 4% facturación anual global (Art. 83 RGPD)', 'EUR',
    20000000.00, 4.00,
    true, true, true
) ON CONFLICT (country_code) DO UPDATE SET
    privacy_law_name = EXCLUDED.privacy_law_name,
    privacy_law_full_name = EXCLUDED.privacy_law_full_name,
    privacy_law_url = EXCLUDED.privacy_law_url,
    privacy_authority_name = EXCLUDED.privacy_authority_name,
    privacy_authority_url = EXCLUDED.privacy_authority_url,
    requires_explicit_consent = EXCLUDED.requires_explicit_consent,
    biometric_data_retention_days = EXCLUDED.biometric_data_retention_days,
    data_subject_rights = EXCLUDED.data_subject_rights,
    consent_intro_text = EXCLUDED.consent_intro_text,
    consent_biometric_text = EXCLUDED.consent_biometric_text,
    consent_emotional_text = EXCLUDED.consent_emotional_text,
    consent_rights_text = EXCLUDED.consent_rights_text,
    consent_revocation_text = EXCLUDED.consent_revocation_text,
    consent_footer_text = EXCLUDED.consent_footer_text,
    requires_dpia_biometric = EXCLUDED.requires_dpia_biometric,
    max_penalty_description = EXCLUDED.max_penalty_description,
    max_penalty_amount = EXCLUDED.max_penalty_amount,
    penalty_percentage_revenue = EXCLUDED.penalty_percentage_revenue,
    is_gdpr_equivalent = EXCLUDED.is_gdpr_equivalent,
    privacy_config_updated_at = NOW();

-- MÉXICO - LFPDPPP
INSERT INTO payroll_countries (
    country_code, country_name, currency_code, currency_symbol,
    decimal_places, thousand_separator, decimal_separator,
    labor_law_name, default_pay_frequency, fiscal_year_start_month,
    aguinaldo_enabled, aguinaldo_frequency, tax_id_name, tax_id_format,
    privacy_law_name, privacy_law_full_name, privacy_law_url,
    privacy_authority_name, privacy_authority_url, privacy_authority_email,
    requires_explicit_consent, biometric_data_retention_days, emotional_data_retention_days,
    audit_log_retention_years, allows_automated_decisions, requires_dpo, min_age_consent,
    data_subject_rights, legal_bases_allowed,
    consent_intro_text, consent_biometric_text, consent_emotional_text,
    consent_rights_text, consent_revocation_text, consent_footer_text,
    breach_notification_hours, requires_dpia_biometric,
    max_penalty_description, penalty_currency,
    is_gdpr_equivalent, is_active
) VALUES (
    'MEX', 'México', 'MXN', '$',
    2, ',', '.',
    'Ley Federal del Trabajo', 'biweekly', 1,
    true, 'annual', 'RFC', 'XXXX-XXXXXX-XXX',
    'LFPDPPP', 'Ley Federal de Protección de Datos Personales en Posesión de los Particulares', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf',
    'Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI)', 'https://home.inai.org.mx', 'atencion@inai.org.mx',
    true, 120, 60,
    5, false, false, 18,
    '["acceso", "rectificación", "cancelación", "oposición"]'::jsonb,
    '["consentimiento", "obligación_legal", "interés_vital", "interés_público"]'::jsonb,
    'En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), ponemos a su disposición el presente Aviso de Privacidad.',
    'Los datos biométricos son considerados datos personales sensibles conforme al Art. 3 fracción VI de la LFPDPPP. Se utilizarán exclusivamente para control de asistencia y acceso.',
    'El análisis de bienestar emocional se realiza conforme a la NOM-035-STPS-2018 para identificar factores de riesgo psicosocial en el trabajo.',
    'Conforme a los Arts. 22-27 de la LFPDPPP, usted tiene derechos ARCO: ACCESO, RECTIFICACIÓN, CANCELACIÓN y OPOSICIÓN al tratamiento de sus datos personales.',
    'Puede revocar su consentimiento en cualquier momento mediante solicitud al área de Recursos Humanos. La revocación se procesará en un plazo máximo de 20 días hábiles.',
    'Responsable: [Nombre de la empresa]. Para ejercer sus derechos ARCO: arco@empresa.com. Autoridad: INAI (home.inai.org.mx)',
    72, true,
    'Multa de 100 a 320,000 UMAS según gravedad (Art. 63-65 LFPDPPP)', 'MXN',
    false, true
) ON CONFLICT (country_code) DO UPDATE SET
    privacy_law_name = EXCLUDED.privacy_law_name,
    privacy_law_full_name = EXCLUDED.privacy_law_full_name,
    privacy_law_url = EXCLUDED.privacy_law_url,
    privacy_authority_name = EXCLUDED.privacy_authority_name,
    privacy_authority_url = EXCLUDED.privacy_authority_url,
    consent_intro_text = EXCLUDED.consent_intro_text,
    consent_biometric_text = EXCLUDED.consent_biometric_text,
    consent_emotional_text = EXCLUDED.consent_emotional_text,
    consent_rights_text = EXCLUDED.consent_rights_text,
    consent_revocation_text = EXCLUDED.consent_revocation_text,
    consent_footer_text = EXCLUDED.consent_footer_text,
    data_subject_rights = EXCLUDED.data_subject_rights,
    privacy_config_updated_at = NOW();

-- BRASIL - LGPD
INSERT INTO payroll_countries (
    country_code, country_name, currency_code, currency_symbol,
    decimal_places, thousand_separator, decimal_separator,
    labor_law_name, default_pay_frequency, fiscal_year_start_month,
    aguinaldo_enabled, aguinaldo_frequency, tax_id_name, tax_id_format,
    privacy_law_name, privacy_law_full_name, privacy_law_url,
    privacy_authority_name, privacy_authority_url, privacy_authority_email,
    requires_explicit_consent, biometric_data_retention_days, emotional_data_retention_days,
    audit_log_retention_years, allows_automated_decisions, requires_dpo, min_age_consent,
    data_subject_rights, legal_bases_allowed,
    consent_intro_text, consent_biometric_text, consent_emotional_text,
    consent_rights_text, consent_revocation_text, consent_footer_text,
    breach_notification_hours, requires_dpia_biometric,
    max_penalty_description, penalty_currency, penalty_percentage_revenue,
    is_gdpr_equivalent, is_active
) VALUES (
    'BRA', 'Brasil', 'BRL', 'R$',
    2, '.', ',',
    'Consolidação das Leis do Trabalho (CLT)', 'monthly', 1,
    true, 'annual', 'CPF/CNPJ', 'XXX.XXX.XXX-XX',
    'LGPD', 'Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)', 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
    'Autoridade Nacional de Proteção de Dados (ANPD)', 'https://www.gov.br/anpd', 'encarregado@anpd.gov.br',
    true, 90, 30,
    5, false, true, 18,
    '["confirmação", "acesso", "correção", "anonimização", "bloqueio", "eliminação", "portabilidade", "informação", "revogação"]'::jsonb,
    '["consentimento", "cumprimento_obrigação_legal", "execução_contrato", "exercício_direitos", "proteção_vida", "tutela_saúde", "interesse_legítimo"]'::jsonb,
    'Nos termos da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados - LGPD), solicitamos seu consentimento específico para o tratamento de seus dados pessoais sensíveis.',
    'Os dados biométricos são considerados dados pessoais sensíveis conforme o Art. 5º, II da LGPD. Serão utilizados exclusivamente para controle de acesso e registro de ponto.',
    'A análise de bem-estar emocional é realizada em conformidade com as NRs de Saúde e Segurança do Trabalho para identificação de fatores de risco psicossociais.',
    'Conforme os Arts. 17-22 da LGPD, você tem direito a: CONFIRMAÇÃO do tratamento, ACESSO aos dados, CORREÇÃO, ANONIMIZAÇÃO, BLOQUEIO, ELIMINAÇÃO, PORTABILIDADE, INFORMAÇÃO sobre compartilhamento e REVOGAÇÃO do consentimento.',
    'Você pode REVOGAR este consentimento a qualquer momento, sem ônus, mediante comunicação ao Encarregado de Dados. A revogação não afeta a licitude do tratamento anterior.',
    'Controlador: [Nome da empresa]. Encarregado de Dados (DPO): dpo@empresa.com. Autoridade: ANPD (www.gov.br/anpd)',
    72, true,
    'Multa de até 2% do faturamento, limitada a R$ 50 milhões por infração (Art. 52 LGPD)', 'BRL', 2.00,
    true, true
) ON CONFLICT (country_code) DO UPDATE SET
    privacy_law_name = EXCLUDED.privacy_law_name,
    privacy_law_full_name = EXCLUDED.privacy_law_full_name,
    privacy_law_url = EXCLUDED.privacy_law_url,
    privacy_authority_name = EXCLUDED.privacy_authority_name,
    privacy_authority_url = EXCLUDED.privacy_authority_url,
    consent_intro_text = EXCLUDED.consent_intro_text,
    consent_biometric_text = EXCLUDED.consent_biometric_text,
    consent_emotional_text = EXCLUDED.consent_emotional_text,
    consent_rights_text = EXCLUDED.consent_rights_text,
    consent_revocation_text = EXCLUDED.consent_revocation_text,
    consent_footer_text = EXCLUDED.consent_footer_text,
    data_subject_rights = EXCLUDED.data_subject_rights,
    requires_dpo = EXCLUDED.requires_dpo,
    is_gdpr_equivalent = EXCLUDED.is_gdpr_equivalent,
    privacy_config_updated_at = NOW();

-- CHILE - Ley 19.628
INSERT INTO payroll_countries (
    country_code, country_name, currency_code, currency_symbol,
    decimal_places, thousand_separator, decimal_separator,
    labor_law_name, default_pay_frequency, fiscal_year_start_month,
    aguinaldo_enabled, tax_id_name, tax_id_format,
    privacy_law_name, privacy_law_full_name, privacy_law_url,
    privacy_authority_name, privacy_authority_url,
    requires_explicit_consent, biometric_data_retention_days,
    audit_log_retention_years, min_age_consent,
    data_subject_rights, legal_bases_allowed,
    consent_intro_text, consent_biometric_text,
    consent_rights_text, consent_revocation_text, consent_footer_text,
    breach_notification_hours, requires_dpia_biometric,
    is_gdpr_equivalent, is_active
) VALUES (
    'CHL', 'Chile', 'CLP', '$',
    0, '.', ',',
    'Código del Trabajo', 'monthly', 1,
    false, 'RUT', 'XX.XXX.XXX-X',
    'Ley 19.628', 'Ley sobre Protección de la Vida Privada', 'https://www.bcn.cl/leychile/navegar?idNorma=141599',
    'Consejo para la Transparencia', 'https://www.consejotransparencia.cl',
    true, 90,
    5, 18,
    '["acceso", "modificación", "eliminación", "bloqueo"]'::jsonb,
    '["consentimiento", "obligación_legal", "interés_vital"]'::jsonb,
    'En cumplimiento de la Ley 19.628 sobre Protección de la Vida Privada, solicitamos su autorización para el tratamiento de datos personales sensibles.',
    'Los datos biométricos serán tratados conforme al Art. 10 de la Ley 19.628 para fines de control de acceso laboral.',
    'Conforme a la Ley 19.628, usted tiene derecho a: ACCEDER a sus datos (Art. 12), MODIFICAR datos inexactos (Art. 12), solicitar la ELIMINACIÓN de sus datos (Art. 12) y el BLOQUEO de datos incorrectos.',
    'Puede revocar su autorización en cualquier momento mediante comunicación escrita a Recursos Humanos.',
    'Responsable: [Nombre de la empresa]. Autoridad: Consejo para la Transparencia (www.consejotransparencia.cl)',
    72, true,
    false, true
) ON CONFLICT (country_code) DO UPDATE SET
    privacy_law_name = EXCLUDED.privacy_law_name,
    privacy_law_full_name = EXCLUDED.privacy_law_full_name,
    privacy_law_url = EXCLUDED.privacy_law_url,
    consent_intro_text = EXCLUDED.consent_intro_text,
    consent_biometric_text = EXCLUDED.consent_biometric_text,
    consent_rights_text = EXCLUDED.consent_rights_text,
    consent_revocation_text = EXCLUDED.consent_revocation_text,
    consent_footer_text = EXCLUDED.consent_footer_text,
    data_subject_rights = EXCLUDED.data_subject_rights,
    privacy_config_updated_at = NOW();

-- COLOMBIA - Ley 1581 de 2012
INSERT INTO payroll_countries (
    country_code, country_name, currency_code, currency_symbol,
    decimal_places, thousand_separator, decimal_separator,
    labor_law_name, default_pay_frequency, fiscal_year_start_month,
    aguinaldo_enabled, tax_id_name, tax_id_format,
    privacy_law_name, privacy_law_full_name, privacy_law_url,
    privacy_authority_name, privacy_authority_url,
    requires_explicit_consent, biometric_data_retention_days,
    audit_log_retention_years, min_age_consent,
    data_subject_rights, legal_bases_allowed,
    consent_intro_text, consent_biometric_text,
    consent_rights_text, consent_revocation_text, consent_footer_text,
    breach_notification_hours, requires_dpia_biometric,
    is_gdpr_equivalent, is_active
) VALUES (
    'COL', 'Colombia', 'COP', '$',
    0, '.', ',',
    'Código Sustantivo del Trabajo', 'monthly', 1,
    true, 'NIT/CC', 'XXXXXXXXXX',
    'Ley 1581', 'Ley Estatutaria 1581 de 2012 - Protección de Datos Personales', 'https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981',
    'Superintendencia de Industria y Comercio (SIC)', 'https://www.sic.gov.co',
    true, 90,
    5, 18,
    '["conocer", "actualizar", "rectificar", "solicitar_prueba", "revocar", "presentar_queja"]'::jsonb,
    '["autorización", "obligación_legal", "contrato", "interés_vital"]'::jsonb,
    'En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, solicitamos su autorización previa, expresa e informada para el tratamiento de datos personales sensibles.',
    'Los datos biométricos son considerados datos sensibles conforme al Art. 5 de la Ley 1581. Su tratamiento requiere autorización expresa conforme al Art. 6.',
    'Conforme al Art. 8 de la Ley 1581, usted tiene derecho a: CONOCER sus datos, ACTUALIZAR información, RECTIFICAR datos, solicitar PRUEBA de la autorización, REVOCAR la autorización y PRESENTAR QUEJAS ante la SIC.',
    'Puede revocar su autorización en cualquier momento mediante solicitud a Recursos Humanos. La revocación se procesará en un plazo máximo de 15 días hábiles.',
    'Responsable: [Nombre de la empresa]. Para ejercer sus derechos: datos@empresa.com. Autoridad: SIC (www.sic.gov.co)',
    72, true,
    false, true
) ON CONFLICT (country_code) DO UPDATE SET
    privacy_law_name = EXCLUDED.privacy_law_name,
    privacy_law_full_name = EXCLUDED.privacy_law_full_name,
    privacy_law_url = EXCLUDED.privacy_law_url,
    consent_intro_text = EXCLUDED.consent_intro_text,
    consent_biometric_text = EXCLUDED.consent_biometric_text,
    consent_rights_text = EXCLUDED.consent_rights_text,
    consent_revocation_text = EXCLUDED.consent_revocation_text,
    consent_footer_text = EXCLUDED.consent_footer_text,
    data_subject_rights = EXCLUDED.data_subject_rights,
    privacy_config_updated_at = NOW();

-- USA (California) - CCPA/CPRA + BIPA
INSERT INTO payroll_countries (
    country_code, country_name, currency_code, currency_symbol,
    decimal_places, thousand_separator, decimal_separator,
    labor_law_name, default_pay_frequency, fiscal_year_start_month,
    aguinaldo_enabled, tax_id_name, tax_id_format,
    privacy_law_name, privacy_law_full_name, privacy_law_url,
    privacy_authority_name, privacy_authority_url,
    requires_explicit_consent, biometric_data_retention_days,
    audit_log_retention_years, min_age_consent,
    data_subject_rights, legal_bases_allowed,
    consent_intro_text, consent_biometric_text,
    consent_rights_text, consent_revocation_text, consent_footer_text,
    breach_notification_hours, requires_dpia_biometric,
    max_penalty_description, penalty_currency,
    is_gdpr_equivalent, is_active
) VALUES (
    'USA', 'United States', 'USD', '$',
    2, ',', '.',
    'Fair Labor Standards Act (FLSA)', 'biweekly', 1,
    false, 'SSN/EIN', 'XXX-XX-XXXX',
    'CCPA/CPRA + BIPA', 'California Consumer Privacy Act + Illinois Biometric Information Privacy Act', 'https://oag.ca.gov/privacy/ccpa',
    'California Privacy Protection Agency (CPPA)', 'https://cppa.ca.gov',
    true, 365,
    7, 13,
    '["know", "access", "delete", "correct", "opt_out", "non_discrimination", "limit_sensitive"]'::jsonb,
    '["consent", "contract", "legal_obligation", "vital_interest"]'::jsonb,
    'Pursuant to the California Consumer Privacy Act (CCPA), California Privacy Rights Act (CPRA), and Illinois Biometric Information Privacy Act (BIPA), we are requesting your informed consent for the collection and processing of your biometric information.',
    'Under BIPA (740 ILCS 14), biometric identifiers include facial geometry data. We will NOT sell, lease, trade, or otherwise profit from your biometric information.',
    'Under CCPA/CPRA, you have the right to: KNOW what personal information is collected, ACCESS your data, DELETE your information, CORRECT inaccuracies, OPT-OUT of sale/sharing, and NOT be DISCRIMINATED against for exercising your rights.',
    'You may withdraw your consent at any time by contacting HR. Upon withdrawal, we will destroy your biometric data within 30 days as required by BIPA.',
    'Data Controller: [Company Name]. Privacy Office: privacy@company.com. Authority: CPPA (cppa.ca.gov) / IL Attorney General (BIPA)',
    72, true,
    'CCPA: $2,500-$7,500 per violation. BIPA: $1,000-$5,000 per violation + private right of action', 'USD',
    false, true
) ON CONFLICT (country_code) DO UPDATE SET
    privacy_law_name = EXCLUDED.privacy_law_name,
    privacy_law_full_name = EXCLUDED.privacy_law_full_name,
    privacy_law_url = EXCLUDED.privacy_law_url,
    consent_intro_text = EXCLUDED.consent_intro_text,
    consent_biometric_text = EXCLUDED.consent_biometric_text,
    consent_rights_text = EXCLUDED.consent_rights_text,
    consent_revocation_text = EXCLUDED.consent_revocation_text,
    consent_footer_text = EXCLUDED.consent_footer_text,
    data_subject_rights = EXCLUDED.data_subject_rights,
    biometric_data_retention_days = EXCLUDED.biometric_data_retention_days,
    max_penalty_description = EXCLUDED.max_penalty_description,
    privacy_config_updated_at = NOW();

-- 4. LOG DE EJECUCIÓN
DO $$
BEGIN
    RAISE NOTICE '✅ Migración de privacidad completada exitosamente';
    RAISE NOTICE '   - Campos de privacidad agregados a payroll_countries';
    RAISE NOTICE '   - 7 países configurados: ARG, ESP, MEX, BRA, CHL, COL, USA';
    RAISE NOTICE '   - Best practices: SAP SuccessFactors, Workday, Oracle HCM';
END $$;
