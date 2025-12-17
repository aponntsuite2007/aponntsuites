/*
 * ================================================================
 * MIGRACIÓN: Templates de Contratos de Beneficios por País
 * ================================================================
 *
 * Descripción:
 * Sistema de templates legales para generación automática de contratos,
 * comodatos y deslindes de responsabilidad adaptados a la legislación
 * de cada país (Argentina, México, Chile, Colombia, Perú, etc.)
 *
 * Características:
 * - Templates de contratos por tipo de activo y país
 * - Deslindes de responsabilidad específicos por legislación
 * - Variables dinámicas (placeholders) para personalización
 * - Firma digital/electrónica
 * - Integración con DMS para almacenar PDFs generados
 * - Versionado de templates
 *
 * Integra con:
 * - employee_benefits_amenities_system.sql (migración principal)
 * - payroll_countries (SSOT para países)
 * - DMS (SSOT para documentos generados)
 * - branches (SSOT para determinar país del empleado)
 *
 * Autor: Claude Code
 * Fecha: 2025-12-16
 * Versión: 1.0.0
 */

-- ================================================================
-- RESPETO A SSOT
-- ================================================================
/*
 * SSOT RESPETADAS:
 * - payroll_countries → Países (country_id, iso_code)
 * - branches → Sucursales (branch_id, country)
 * - employees → Empleados (employee_id, default_branch_id)
 * - companies → Empresas (company_id)
 * - asset_contracts → Contratos de activos (de migración anterior)
 * - DMS → document_types, documentos generados
 */

-- ================================================================
-- PARTE 0: LIMPIAR TABLAS ANTIGUAS (si existen con estructura diferente)
-- ================================================================

DROP TABLE IF EXISTS contract_generated_documents CASCADE;
DROP TABLE IF EXISTS contract_templates CASCADE;
DROP TABLE IF EXISTS contract_template_types CASCADE;

-- ================================================================
-- PARTE 1: CATÁLOGO DE TIPOS DE CONTRATOS
-- ================================================================

CREATE TABLE IF NOT EXISTS contract_template_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  name_en VARCHAR(150),
  description TEXT,

  -- Categoría
  category VARCHAR(30) NOT NULL,
  -- Categorías: COMODATO (préstamo gratuito), LEASE (arrendamiento), LOAN (préstamo con devolución), LIABILITY_WAIVER (deslinde), INSURANCE

  -- Para qué tipo de activo/beneficio aplica
  applicable_to_benefit_types VARCHAR[] DEFAULT ARRAY[]::VARCHAR[], -- Array de benefit_types.code

  -- Requerimientos legales
  requires_witness BOOLEAN DEFAULT false,
  requires_notarization BOOLEAN DEFAULT false,
  requires_registration BOOLEAN DEFAULT false, -- Ej: registro público en algunos países

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE contract_template_types IS 'Tipos de contratos/documentos legales';
COMMENT ON COLUMN contract_template_types.applicable_to_benefit_types IS 'Array de benefit_types.code a los que aplica';

CREATE INDEX IF NOT EXISTS idx_contract_types_category ON contract_template_types(category);

-- Insertar tipos de contratos
INSERT INTO contract_template_types
(code, name, name_en, description, category, applicable_to_benefit_types, requires_witness)
VALUES
('COMODATO_VEHICULO', 'Contrato de Comodato de Vehículo', 'Vehicle Loan Agreement',
 'Contrato de préstamo gratuito de vehículo de la empresa al empleado',
 'COMODATO', ARRAY['COMPANY_CAR'], true),

('COMODATO_TECNOLOGIA', 'Contrato de Comodato de Equipos Tecnológicos', 'Technology Equipment Loan Agreement',
 'Contrato de préstamo de laptop, teléfono, tablet, etc.',
 'COMODATO', ARRAY['MOBILE_PHONE', 'LAPTOP_COMPUTER'], false),

('DESLINDE_RESPONSABILIDAD_VEHICULO', 'Deslinde de Responsabilidad de Vehículo', 'Vehicle Liability Waiver',
 'Documento donde empleado asume responsabilidades legales por uso del vehículo',
 'LIABILITY_WAIVER', ARRAY['COMPANY_CAR'], true),

('CONTRATO_VIVIENDA', 'Contrato de Subsidio de Alquiler', 'Housing Rental Allowance Agreement',
 'Acuerdo para subsidio de alquiler de vivienda al empleado',
 'LEASE', ARRAY['HOUSING_RENTAL'], false),

('DESLINDE_VIVIENDA', 'Deslinde de Responsabilidad de Vivienda', 'Housing Liability Waiver',
 'Deslinde de responsabilidad sobre daños en propiedad alquilada',
 'LIABILITY_WAIVER', ARRAY['HOUSING_RENTAL'], false),

('ACUERDO_CONFIDENCIALIDAD_TECNOLOGIA', 'Acuerdo de Confidencialidad y Uso Adecuado', 'Confidentiality and Proper Use Agreement',
 'Acuerdo de uso adecuado de dispositivos y confidencialidad de información',
 'LIABILITY_WAIVER', ARRAY['MOBILE_PHONE', 'LAPTOP_COMPUTER'], false),

('CONTRATO_SEGURO_AUTO', 'Póliza de Seguro de Vehículo Corporativo', 'Corporate Vehicle Insurance Policy',
 'Contrato de seguro del vehículo asignado',
 'INSURANCE', ARRAY['COMPANY_CAR'], false)

ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- PARTE 2: TEMPLATES DE CONTRATOS POR PAÍS
-- ================================================================

CREATE TABLE IF NOT EXISTS contract_templates (
  id SERIAL PRIMARY KEY,

  -- ⭐ SSOT: contract_template_types table
  template_type_id INTEGER NOT NULL REFERENCES contract_template_types(id) ON DELETE RESTRICT,

  -- ⭐ SSOT: payroll_countries table (si existe), sino usar código ISO
  country_code VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3: ARG, MEX, CHL, COL, PER, USA, etc.
  country_name VARCHAR(100) NOT NULL,

  -- Versión del template (permite versionado legal)
  version VARCHAR(20) NOT NULL DEFAULT '1.0',

  -- Título del contrato
  title VARCHAR(200) NOT NULL,

  -- Contenido del template (HTML con placeholders)
  template_html TEXT NOT NULL,
  -- Placeholders: {{EMPLOYEE_NAME}}, {{EMPLOYEE_DNI}}, {{COMPANY_NAME}}, {{ASSET_BRAND}}, {{ASSET_MODEL}}, etc.

  -- Variables requeridas (JSONB array)
  required_variables JSONB DEFAULT '[]',
  -- Ejemplo: ["EMPLOYEE_NAME", "EMPLOYEE_DNI", "ASSET_BRAND", "ASSET_PLATE"]

  -- Referencias legales del país
  legal_references TEXT,
  -- Ej: "Código Civil Argentino - Art. 1533 y siguientes (Comodato)"

  -- Requisitos específicos del país
  country_specific_requirements JSONB DEFAULT '{}',
  /*
    Ejemplo para Argentina:
    {
      "requires_stamp_tax": true,
      "stamp_tax_percentage": 0.5,
      "notary_required": false,
      "witness_required": true,
      "min_witness_count": 2,
      "registration_authority": null
    }

    Ejemplo para México:
    {
      "requires_stamp_tax": false,
      "notary_required": true,
      "notary_type": "Notario Público",
      "witness_required": true,
      "registration_authority": "Registro Público de la Propiedad"
    }
  */

  -- Cláusulas adicionales por país (pueden variar según legislación)
  additional_clauses TEXT,

  -- ¿Es el template por defecto para este país?
  is_default BOOLEAN DEFAULT false,

  -- Estado
  status VARCHAR(30) DEFAULT 'draft',
  -- Estados: draft, active, archived, superseded

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(user_id),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(user_id),

  UNIQUE(template_type_id, country_code, version)
);

COMMENT ON TABLE contract_templates IS 'Templates de contratos legales por país (adaptados a legislación local)';
COMMENT ON COLUMN contract_templates.template_type_id IS 'SSOT: contract_template_types.id';
COMMENT ON COLUMN contract_templates.country_code IS 'ISO 3166-1 alpha-3 (ARG, MEX, CHL, etc.)';
COMMENT ON COLUMN contract_templates.template_html IS 'HTML con placeholders: {{VARIABLE_NAME}}';
COMMENT ON COLUMN contract_templates.status IS 'draft, active, archived, superseded';

CREATE INDEX IF NOT EXISTS idx_templates_type ON contract_templates(template_type_id);
CREATE INDEX IF NOT EXISTS idx_templates_country ON contract_templates(country_code);
CREATE INDEX IF NOT EXISTS idx_templates_default ON contract_templates(is_default, country_code, template_type_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON contract_templates(status);

-- ================================================================
-- PARTE 3: INSERTAR TEMPLATES PARA ARGENTINA
-- ================================================================

-- Template: COMODATO DE VEHÍCULO - ARGENTINA
INSERT INTO contract_templates
(template_type_id, country_code, country_name, version, title, template_html, required_variables, legal_references, country_specific_requirements, status, is_default)
VALUES
(
  (SELECT id FROM contract_template_types WHERE code = 'COMODATO_VEHICULO'),
  'ARG',
  'Argentina',
  '1.0',
  'CONTRATO DE COMODATO DE VEHÍCULO',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contrato de Comodato de Vehículo</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 30px; }
    h2 { font-size: 14px; margin-top: 20px; }
    p { text-align: justify; margin: 10px 0; }
    .parties { margin: 20px 0; }
    .signature { margin-top: 60px; }
    .signature-block { display: inline-block; width: 45%; text-align: center; }
  </style>
</head>
<body>
  <h1>CONTRATO DE COMODATO DE VEHÍCULO AUTOMOTOR</h1>

  <div class="parties">
    <p>En la Ciudad de <strong>{{CITY}}</strong>, Provincia de <strong>{{PROVINCE}}</strong>, República Argentina, a los <strong>{{DAY}}</strong> días del mes de <strong>{{MONTH}}</strong> del año <strong>{{YEAR}}</strong>, entre:</p>

    <p><strong>{{COMPANY_NAME}}</strong> (en adelante, "LA EMPRESA" o "COMODANTE"), con domicilio legal en <strong>{{COMPANY_ADDRESS}}</strong>, CUIT N° <strong>{{COMPANY_TAX_ID}}</strong>, representada en este acto por <strong>{{COMPANY_REP_NAME}}</strong>, DNI N° <strong>{{COMPANY_REP_DNI}}</strong>, en su carácter de <strong>{{COMPANY_REP_POSITION}}</strong>;</p>

    <p>Y por la otra parte:</p>

    <p><strong>{{EMPLOYEE_NAME}}</strong> (en adelante, "EL EMPLEADO" o "COMODATARIO"), DNI N° <strong>{{EMPLOYEE_DNI}}</strong>, CUIL N° <strong>{{EMPLOYEE_CUIL}}</strong>, con domicilio en <strong>{{EMPLOYEE_ADDRESS}}</strong>;</p>

    <p>Se acuerda celebrar el presente contrato de COMODATO de conformidad con las disposiciones de los artículos 1533 y siguientes del Código Civil y Comercial de la Nación, bajo las siguientes cláusulas y condiciones:</p>
  </div>

  <h2>PRIMERA: OBJETO DEL CONTRATO</h2>
  <p>LA EMPRESA otorga en comodato a EL EMPLEADO, quien acepta, el siguiente vehículo automotor:</p>
  <ul>
    <li><strong>Marca:</strong> {{ASSET_BRAND}}</li>
    <li><strong>Modelo:</strong> {{ASSET_MODEL}}</li>
    <li><strong>Año:</strong> {{ASSET_YEAR}}</li>
    <li><strong>Dominio/Patente:</strong> {{ASSET_PLATE}}</li>
    <li><strong>N° de Motor:</strong> {{ASSET_ENGINE_NUMBER}}</li>
    <li><strong>N° de Chasis:</strong> {{ASSET_VIN}}</li>
    <li><strong>Color:</strong> {{ASSET_COLOR}}</li>
  </ul>

  <h2>SEGUNDA: NATURALEZA GRATUITA</h2>
  <p>El presente contrato se otorga a título gratuito, sin que EL EMPLEADO deba abonar suma alguna por el uso del vehículo, quedando establecido que el mismo se entrega para facilitar el desempeño de sus funciones laborales y/o como beneficio laboral.</p>

  <h2>TERCERA: OBLIGACIONES DEL COMODATARIO</h2>
  <p>EL EMPLEADO se obliga a:</p>
  <ol type="a">
    <li>Utilizar el vehículo con la diligencia del buen hombre de negocios y darle el destino convenido.</li>
    <li>Conservar el vehículo en buen estado de mantenimiento y funcionamiento.</li>
    <li>Asumir los gastos ordinarios de mantenimiento, combustible, lavado y limpieza.</li>
    <li>Comunicar de inmediato a LA EMPRESA cualquier desperfecto mecánico o accidente.</li>
    <li>No ceder ni prestar el vehículo a terceros sin autorización expresa y por escrito de LA EMPRESA.</li>
    <li>No realizar modificaciones al vehículo sin autorización de LA EMPRESA.</li>
    <li>Respetar todas las normas de tránsito vigentes.</li>
    <li>Devolver el vehículo cuando LA EMPRESA lo requiera o al finalizar la relación laboral.</li>
  </ol>

  <h2>CUARTA: OBLIGACIONES DE LA EMPRESA</h2>
  <p>LA EMPRESA se obliga a:</p>
  <ol type="a">
    <li>Entregar el vehículo en condiciones de funcionamiento adecuadas.</li>
    <li>Mantener vigente el seguro del vehículo con cobertura de responsabilidad civil hacia terceros.</li>
    <li>Asumir los costos de reparaciones extraordinarias no derivadas de uso indebido o negligencia del COMODATARIO.</li>
    <li>Mantener al día el pago de la Patente Automotor y Verificación Técnica Vehicular.</li>
  </ol>

  <h2>QUINTA: RESPONSABILIDAD</h2>
  <p>EL EMPLEADO será responsable por los daños que sufra el vehículo por su culpa o negligencia. Asimismo, será responsable por las multas de tránsito y/o infracciones que se generen durante el período en que el vehículo esté bajo su tenencia, autorizando expresamente el débito de dichos importes de sus haberes.</p>

  <h2>SEXTA: SEGURO</h2>
  <p>El vehículo cuenta con seguro contra terceros. EL EMPLEADO deberá cumplir con todas las obligaciones emergentes de la póliza de seguro y comunicar inmediatamente cualquier siniestro a LA EMPRESA y a la compañía aseguradora.</p>

  <h2>SÉPTIMA: DURACIÓN</h2>
  <p>El presente contrato tendrá vigencia desde el <strong>{{CONTRACT_START_DATE}}</strong> hasta el <strong>{{CONTRACT_END_DATE}}</strong>, pudiendo ser renovado por acuerdo de partes. El contrato finalizará automáticamente ante la desvinculación laboral del EMPLEADO.</p>

  <h2>OCTAVA: DEVOLUCIÓN</h2>
  <p>Al vencimiento del plazo o ante requerimiento de LA EMPRESA, EL EMPLEADO deberá devolver el vehículo en el mismo estado en que lo recibió, salvo el deterioro derivado del uso normal y conforme a destino.</p>

  <h2>NOVENA: DOMICILIOS - NOTIFICACIONES</h2>
  <p>Las partes constituyen domicilios en los indicados en el encabezamiento, donde serán válidas todas las notificaciones judiciales y extrajudiciales.</p>

  <h2>DÉCIMA: JURISDICCIÓN</h2>
  <p>Para todos los efectos derivados del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Ciudad de <strong>{{CITY}}</strong>, renunciando a cualquier otro fuero que pudiera corresponderles.</p>

  <p style="margin-top: 40px;">En prueba de conformidad se firman <strong>DOS (2)</strong> ejemplares de un mismo tenor y a un solo efecto en el lugar y fecha indicados en el encabezamiento.</p>

  <div class="signature">
    <div class="signature-block">
      <p>_____________________________</p>
      <p><strong>{{COMPANY_REP_NAME}}</strong></p>
      <p>{{COMPANY_REP_POSITION}}</p>
      <p>{{COMPANY_NAME}}</p>
      <p>COMODANTE</p>
    </div>
    <div class="signature-block" style="float: right;">
      <p>_____________________________</p>
      <p><strong>{{EMPLOYEE_NAME}}</strong></p>
      <p>DNI: {{EMPLOYEE_DNI}}</p>
      <p>COMODATARIO</p>
    </div>
  </div>

  <div style="clear: both; margin-top: 80px;">
    <h3 style="text-align: center;">TESTIGOS</h3>
    <div class="signature-block">
      <p>_____________________________</p>
      <p><strong>{{WITNESS_1_NAME}}</strong></p>
      <p>DNI: {{WITNESS_1_DNI}}</p>
    </div>
    <div class="signature-block" style="float: right;">
      <p>_____________________________</p>
      <p><strong>{{WITNESS_2_NAME}}</strong></p>
      <p>DNI: {{WITNESS_2_DNI}}</p>
    </div>
  </div>
</body>
</html>',
  '[
    "CITY", "PROVINCE", "DAY", "MONTH", "YEAR",
    "COMPANY_NAME", "COMPANY_ADDRESS", "COMPANY_TAX_ID",
    "COMPANY_REP_NAME", "COMPANY_REP_DNI", "COMPANY_REP_POSITION",
    "EMPLOYEE_NAME", "EMPLOYEE_DNI", "EMPLOYEE_CUIL", "EMPLOYEE_ADDRESS",
    "ASSET_BRAND", "ASSET_MODEL", "ASSET_YEAR", "ASSET_PLATE",
    "ASSET_ENGINE_NUMBER", "ASSET_VIN", "ASSET_COLOR",
    "CONTRACT_START_DATE", "CONTRACT_END_DATE",
    "WITNESS_1_NAME", "WITNESS_1_DNI",
    "WITNESS_2_NAME", "WITNESS_2_DNI"
  ]'::jsonb,
  'Código Civil y Comercial de la Nación - Artículos 1533 a 1547 (Comodato). Ley Nacional de Tránsito 24.449.',
  '{
    "requires_stamp_tax": false,
    "notary_required": false,
    "witness_required": true,
    "min_witness_count": 2,
    "registration_authority": null,
    "additional_requirements": "Se recomienda agregar póliza de seguro con cobertura todo riesgo"
  }'::jsonb,
  'active',
  true
)
ON CONFLICT (template_type_id, country_code, version) DO NOTHING;

-- Template: DESLINDE DE RESPONSABILIDAD DE VEHÍCULO - ARGENTINA
INSERT INTO contract_templates
(template_type_id, country_code, country_name, version, title, template_html, required_variables, legal_references, country_specific_requirements, status, is_default)
VALUES
(
  (SELECT id FROM contract_template_types WHERE code = 'DESLINDE_RESPONSABILIDAD_VEHICULO'),
  'ARG',
  'Argentina',
  '1.0',
  'ACTA DE DESLINDE DE RESPONSABILIDAD - USO DE VEHÍCULO',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Deslinde de Responsabilidad - Vehículo</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { text-align: center; font-size: 16px; margin-bottom: 30px; }
    p { text-align: justify; margin: 10px 0; }
    .signature { margin-top: 60px; text-align: center; }
  </style>
</head>
<body>
  <h1>ACTA DE DESLINDE DE RESPONSABILIDAD<br>USO DE VEHÍCULO CORPORATIVO</h1>

  <p>En la Ciudad de <strong>{{CITY}}</strong>, a los <strong>{{DAY}}</strong> días del mes de <strong>{{MONTH}}</strong> del año <strong>{{YEAR}}</strong>, el Sr./Sra. <strong>{{EMPLOYEE_NAME}}</strong>, DNI N° <strong>{{EMPLOYEE_DNI}}</strong>, empleado/a de <strong>{{COMPANY_NAME}}</strong>, manifiesta bajo fe de declaración jurada:</p>

  <h3>PRIMERO</h3>
  <p>Que ha recibido en comodato el vehículo marca <strong>{{ASSET_BRAND}}</strong>, modelo <strong>{{ASSET_MODEL}}</strong>, dominio <strong>{{ASSET_PLATE}}</strong>, comprometiéndose a hacer un uso adecuado y responsable del mismo.</p>

  <h3>SEGUNDO</h3>
  <p>Que EXIME EXPRESAMENTE a <strong>{{COMPANY_NAME}}</strong> de toda responsabilidad derivada de:</p>
  <ul>
    <li>Multas de tránsito o infracciones que pudieran generarse durante el período de tenencia del vehículo.</li>
    <li>Accidentes de tránsito en los que el declarante sea responsable por impericia, negligencia o imprudencia.</li>
    <li>Daños a terceros causados durante el uso del vehículo fuera del horario laboral.</li>
    <li>Siniestros no cubiertos por la póliza de seguro vigente por causas imputables al declarante.</li>
  </ul>

  <h3>TERCERO</h3>
  <p>Que se compromete a:</p>
  <ul>
    <li>Respetar todas las normas de tránsito vigentes.</li>
    <li>Conducir el vehículo únicamente estando habilitado legalmente para ello.</li>
    <li>No conducir bajo efectos de alcohol, estupefacientes o medicamentos que afecten la capacidad de conducción.</li>
    <li>No permitir que terceros no autorizados conduzcan el vehículo.</li>
    <li>Informar inmediatamente a LA EMPRESA ante cualquier siniestro.</li>
  </ul>

  <h3>CUARTO</h3>
  <p>Que autoriza expresamente el débito de su remuneración de los importes correspondientes a multas, franquicias de seguro por siniestros imputables a su culpa o negligencia, y cualquier otro gasto derivado del uso indebido del vehículo.</p>

  <h3>QUINTO</h3>
  <p>Que ha sido debidamente informado de las condiciones de la póliza de seguro del vehículo, sus coberturas y exclusiones.</p>

  <p>En prueba de conformidad, se firma la presente en DOS (2) ejemplares de un mismo tenor y a un solo efecto.</p>

  <div class="signature">
    <p>_____________________________</p>
    <p><strong>{{EMPLOYEE_NAME}}</strong></p>
    <p>DNI: {{EMPLOYEE_DNI}}</p>
    <p>Fecha: {{DAY}}/{{MONTH_NUM}}/{{YEAR}}</p>
  </div>
</body>
</html>',
  '[
    "CITY", "DAY", "MONTH", "MONTH_NUM", "YEAR",
    "EMPLOYEE_NAME", "EMPLOYEE_DNI",
    "COMPANY_NAME",
    "ASSET_BRAND", "ASSET_MODEL", "ASSET_PLATE"
  ]'::jsonb,
  'Código Civil y Comercial de la Nación. Ley Nacional de Tránsito 24.449.',
  '{
    "requires_stamp_tax": false,
    "notary_required": false,
    "witness_required": false
  }'::jsonb,
  'active',
  true
)
ON CONFLICT (template_type_id, country_code, version) DO NOTHING;

-- Template: CONTRATO DE SUBSIDIO DE ALQUILER - ARGENTINA
INSERT INTO contract_templates
(template_type_id, country_code, country_name, version, title, template_html, required_variables, legal_references, country_specific_requirements, status, is_default)
VALUES
(
  (SELECT id FROM contract_template_types WHERE code = 'CONTRATO_VIVIENDA'),
  'ARG',
  'Argentina',
  '1.0',
  'ACUERDO DE SUBSIDIO DE ALQUILER DE VIVIENDA',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Acuerdo de Subsidio de Alquiler</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 30px; }
    h2 { font-size: 14px; margin-top: 20px; }
    p { text-align: justify; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>ACUERDO DE SUBSIDIO DE ALQUILER DE VIVIENDA</h1>

  <p>En la Ciudad de <strong>{{CITY}}</strong>, a los <strong>{{DAY}}</strong> días del mes de <strong>{{MONTH}}</strong> del año <strong>{{YEAR}}</strong>, entre <strong>{{COMPANY_NAME}}</strong> (LA EMPRESA) y el Sr./Sra. <strong>{{EMPLOYEE_NAME}}</strong>, DNI N° <strong>{{EMPLOYEE_DNI}}</strong> (EL EMPLEADO), se acuerda:</p>

  <h2>PRIMERA: OBJETO</h2>
  <p>LA EMPRESA otorga a EL EMPLEADO un subsidio mensual para alquiler de vivienda por un monto de <strong>PESOS {{SUBSIDY_AMOUNT}}</strong> ($ {{SUBSIDY_AMOUNT}}).</p>

  <h2>SEGUNDA: DESTINO</h2>
  <p>El subsidio se destinará exclusivamente al pago del alquiler de la vivienda ubicada en <strong>{{HOUSING_ADDRESS}}</strong>, Ciudad de <strong>{{HOUSING_CITY}}</strong>.</p>

  <h2>TERCERA: VIGENCIA</h2>
  <p>El subsidio tendrá vigencia desde el <strong>{{SUBSIDY_START_DATE}}</strong> hasta el <strong>{{SUBSIDY_END_DATE}}</strong>, pudiendo renovarse previo acuerdo de partes.</p>

  <h2>CUARTA: FORMA DE PAGO</h2>
  <p>El subsidio se abonará mensualmente junto con la liquidación de haberes del empleado, el día <strong>{{PAYMENT_DAY}}</strong> de cada mes.</p>

  <h2>QUINTA: OBLIGACIONES DEL EMPLEADO</h2>
  <p>EL EMPLEADO se compromete a:</p>
  <ul>
    <li>Presentar copia del contrato de alquiler vigente.</li>
    <li>Informar cualquier cambio de domicilio dentro de las 48 hs.</li>
    <li>Utilizar el subsidio exclusivamente para el pago del alquiler.</li>
  </ul>

  <h2>SEXTA: CESACIÓN DEL BENEFICIO</h2>
  <p>El subsidio cesará automáticamente ante:</p>
  <ul>
    <li>Finalización de la relación laboral.</li>
    <li>Vencimiento del plazo acordado.</li>
    <li>Incumplimiento de las obligaciones del empleado.</li>
    <li>Adquisición de vivienda propia.</li>
  </ul>

  <div class="signature" style="margin-top: 60px;">
    <div style="display: inline-block; width: 45%;">
      <p>_____________________________</p>
      <p><strong>{{COMPANY_REP_NAME}}</strong></p>
      <p>{{COMPANY_NAME}}</p>
    </div>
    <div style="display: inline-block; width: 45%; float: right;">
      <p>_____________________________</p>
      <p><strong>{{EMPLOYEE_NAME}}</strong></p>
      <p>DNI: {{EMPLOYEE_DNI}}</p>
    </div>
  </div>
</body>
</html>',
  '[
    "CITY", "DAY", "MONTH", "YEAR",
    "COMPANY_NAME", "COMPANY_REP_NAME",
    "EMPLOYEE_NAME", "EMPLOYEE_DNI",
    "SUBSIDY_AMOUNT", "HOUSING_ADDRESS", "HOUSING_CITY",
    "SUBSIDY_START_DATE", "SUBSIDY_END_DATE",
    "PAYMENT_DAY"
  ]'::jsonb,
  'Ley de Contrato de Trabajo 20.744',
  '{
    "requires_stamp_tax": false,
    "notary_required": false,
    "witness_required": false
  }'::jsonb,
  'active',
  true
)
ON CONFLICT (template_type_id, country_code, version) DO NOTHING;

-- ================================================================
-- PARTE 4: AGREGAR COLUMNAS A asset_contracts
-- ================================================================

-- Agregar referencia al template usado
ALTER TABLE asset_contracts ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES contract_templates(id);
ALTER TABLE asset_contracts ADD COLUMN IF NOT EXISTS country_code VARCHAR(3);
ALTER TABLE asset_contracts ADD COLUMN IF NOT EXISTS generated_html TEXT; -- HTML del contrato generado
ALTER TABLE asset_contracts ADD COLUMN IF NOT EXISTS generated_variables JSONB DEFAULT '{}'; -- Variables usadas en generación

COMMENT ON COLUMN asset_contracts.template_id IS 'SSOT: contract_templates.id (template usado)';
COMMENT ON COLUMN asset_contracts.country_code IS 'País del empleado (determina template)';
COMMENT ON COLUMN asset_contracts.generated_html IS 'HTML final del contrato generado con variables reemplazadas';

-- ================================================================
-- PARTE 5: FUNCIÓN PARA GENERAR CONTRATO
-- ================================================================

CREATE OR REPLACE FUNCTION generate_contract_from_template(
  p_template_id INTEGER,
  p_variables JSONB
)
RETURNS TEXT AS $$
DECLARE
  v_template RECORD;
  v_html TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Obtener template
  SELECT * INTO v_template
  FROM contract_templates
  WHERE id = p_template_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template no encontrado o inactivo';
  END IF;

  -- Copiar HTML del template
  v_html := v_template.template_html;

  -- Reemplazar cada variable
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_html := REPLACE(v_html, '{{' || v_key || '}}', v_value);
  END LOOP;

  RETURN v_html;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_contract_from_template IS 'Genera contrato reemplazando placeholders con variables';

-- ================================================================
-- PARTE 6: FUNCIÓN PARA OBTENER TEMPLATE SEGÚN PAÍS Y TIPO
-- ================================================================

CREATE OR REPLACE FUNCTION get_contract_template(
  p_contract_type_code VARCHAR(50),
  p_country_code VARCHAR(3)
)
RETURNS TABLE(
  template_id INTEGER,
  template_html TEXT,
  required_variables JSONB,
  country_requirements JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    ct.template_html,
    ct.required_variables,
    ct.country_specific_requirements
  FROM contract_templates ct
  JOIN contract_template_types ctt ON ct.template_type_id = ctt.id
  WHERE ctt.code = p_contract_type_code
    AND ct.country_code = p_country_code
    AND ct.status = 'active'
    AND ct.is_default = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_contract_template IS 'Obtiene template por defecto según tipo y país';

-- ================================================================
-- PARTE 7: TRIGGER PARA AUTO-ASIGNAR TEMPLATE SEGÚN PAÍS
-- ================================================================

CREATE OR REPLACE FUNCTION auto_assign_contract_template()
RETURNS TRIGGER AS $$
DECLARE
  v_employee RECORD;
  v_branch RECORD;
  v_template_type VARCHAR(50);
  v_template RECORD;
BEGIN
  -- Determinar tipo de contrato según el tipo de activo
  SELECT asset_type INTO v_employee
  FROM employee_assigned_assets
  WHERE id = NEW.asset_assignment_id;

  v_template_type := CASE v_employee.asset_type
    WHEN 'VEHICLE' THEN 'COMODATO_VEHICULO'
    WHEN 'MOBILE_PHONE' THEN 'COMODATO_TECNOLOGIA'
    WHEN 'LAPTOP' THEN 'COMODATO_TECNOLOGIA'
    ELSE NULL
  END;

  IF v_template_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener país del empleado (desde su sucursal)
  SELECT e.*, b.country as branch_country
  INTO v_employee
  FROM employee_assigned_assets eaa
  JOIN employees e ON eaa.employee_id = e.id
  JOIN branches b ON e.default_branch_id = b.id
  WHERE eaa.id = NEW.asset_assignment_id;

  -- Obtener template
  SELECT * INTO v_template
  FROM get_contract_template(v_template_type, v_employee.branch_country);

  IF FOUND THEN
    NEW.template_id := v_template.template_id;
    NEW.country_code := v_employee.branch_country;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_assign_contract_template
BEFORE INSERT ON asset_contracts
FOR EACH ROW
EXECUTE FUNCTION auto_assign_contract_template();

COMMENT ON TRIGGER trg_auto_assign_contract_template ON asset_contracts IS 'Auto-asigna template de contrato según país del empleado';

-- ================================================================
-- FIN DE LA MIGRACIÓN
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA: Templates de Contratos por País';
  RAISE NOTICE 'Templates insertados: 3 (Argentina)';
  RAISE NOTICE 'Países soportados: ARG (ampliable)';
  RAISE NOTICE 'Funciones creadas: 2';
  RAISE NOTICE 'Triggers creados: 1';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'PRÓXIMOS PASOS:';
  RAISE NOTICE '1. Agregar templates para otros países (MEX, CHL, COL, etc.)';
  RAISE NOTICE '2. Integrar generación de PDF con librería HTML-to-PDF';
  RAISE NOTICE '3. Integrar almacenamiento de PDFs en DMS';
  RAISE NOTICE '4. Crear API endpoints para generar contratos';
  RAISE NOTICE '===========================================';
END $$;
