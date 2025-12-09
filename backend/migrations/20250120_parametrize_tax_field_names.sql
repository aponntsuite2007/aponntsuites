/**
 * ============================================================================
 * MIGRACIÓN: Parametrizar nombres de campos fiscales por país
 * ============================================================================
 *
 * Agrega campos a tax_templates para parametrizar nombres de campos según país:
 * - CUIT en Argentina
 * - RUT en Chile
 * - RUC en Perú, Ecuador, etc.
 * - RFC en México
 * - CNPJ en Brasil
 *
 * Created: 2025-01-20
 */

\echo ''
\echo '🌎 [TAX-TEMPLATES] Parametrizando nombres de campos fiscales...'
\echo ''

-- ============================================
-- AGREGAR CAMPOS PARA NOMBRES PERSONALIZADOS
-- ============================================

-- Nombre del campo de identificación fiscal (CUIT, RUT, RUC, RFC, CNPJ, etc.)
ALTER TABLE tax_templates
ADD COLUMN IF NOT EXISTS tax_id_field_name VARCHAR(50) DEFAULT 'CUIT';

-- Descripción del campo (ej: "CUIT - Clave Única de Identificación Tributaria")
ALTER TABLE tax_templates
ADD COLUMN IF NOT EXISTS tax_id_field_description VARCHAR(200);

-- Formato/máscara del campo (ej: "XX-XXXXXXXX-X" para CUIT Argentina)
ALTER TABLE tax_templates
ADD COLUMN IF NOT EXISTS tax_id_format_mask VARCHAR(50);

-- Expresión regular para validar el campo
ALTER TABLE tax_templates
ADD COLUMN IF NOT EXISTS tax_id_validation_regex VARCHAR(200);

-- Longitud mínima y máxima
ALTER TABLE tax_templates
ADD COLUMN IF NOT EXISTS tax_id_min_length INTEGER DEFAULT 8;

ALTER TABLE tax_templates
ADD COLUMN IF NOT EXISTS tax_id_max_length INTEGER DEFAULT 15;

-- Si es obligatorio para facturación
ALTER TABLE tax_templates
ADD COLUMN IF NOT EXISTS tax_id_required_for_invoicing BOOLEAN DEFAULT true;

\echo '   ✅ Campos de parametrización agregados a tax_templates'

-- ============================================
-- DATOS DE EJEMPLO PARA PAÍSES EXISTENTES
-- ============================================

-- ARGENTINA
UPDATE tax_templates
SET tax_id_field_name = 'CUIT',
    tax_id_field_description = 'CUIT - Clave Única de Identificación Tributaria',
    tax_id_format_mask = 'XX-XXXXXXXX-X',
    tax_id_validation_regex = '^\d{2}-\d{8}-\d{1}$',
    tax_id_min_length = 11,
    tax_id_max_length = 13,
    tax_id_required_for_invoicing = true
WHERE country_code = 'AR';

-- CHILE
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tax_templates WHERE country_code = 'CL') THEN
        UPDATE tax_templates
        SET tax_id_field_name = 'RUT',
            tax_id_field_description = 'RUT - Rol Único Tributario',
            tax_id_format_mask = 'XX.XXX.XXX-X',
            tax_id_validation_regex = '^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$',
            tax_id_min_length = 9,
            tax_id_max_length = 12,
            tax_id_required_for_invoicing = true
        WHERE country_code = 'CL';
    ELSE
        -- Crear plantilla para Chile si no existe
        INSERT INTO tax_templates (
            country_code, country_name, currency, invoice_format,
            requires_cae, is_active,
            tax_id_field_name, tax_id_field_description,
            tax_id_format_mask, tax_id_validation_regex,
            tax_id_min_length, tax_id_max_length
        ) VALUES (
            'CL', 'Chile', 'CLP', 'standard',
            false, true,
            'RUT', 'RUT - Rol Único Tributario',
            'XX.XXX.XXX-X', '^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$',
            9, 12
        );
    END IF;
END $$;

-- PERÚ
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tax_templates WHERE country_code = 'PE') THEN
        UPDATE tax_templates
        SET tax_id_field_name = 'RUC',
            tax_id_field_description = 'RUC - Registro Único de Contribuyentes',
            tax_id_format_mask = 'XXXXXXXXXXX',
            tax_id_validation_regex = '^\d{11}$',
            tax_id_min_length = 11,
            tax_id_max_length = 11,
            tax_id_required_for_invoicing = true
        WHERE country_code = 'PE';
    ELSE
        -- Crear plantilla para Perú si no existe
        INSERT INTO tax_templates (
            country_code, country_name, currency, invoice_format,
            requires_cae, is_active,
            tax_id_field_name, tax_id_field_description,
            tax_id_format_mask, tax_id_validation_regex,
            tax_id_min_length, tax_id_max_length
        ) VALUES (
            'PE', 'Perú', 'PEN', 'standard',
            false, true,
            'RUC', 'RUC - Registro Único de Contribuyentes',
            'XXXXXXXXXXX', '^\d{11}$',
            11, 11
        );
    END IF;
END $$;

-- MÉXICO
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tax_templates WHERE country_code = 'MX') THEN
        UPDATE tax_templates
        SET tax_id_field_name = 'RFC',
            tax_id_field_description = 'RFC - Registro Federal de Contribuyentes',
            tax_id_format_mask = 'XXXXXXXXXXXX',
            tax_id_validation_regex = '^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$',
            tax_id_min_length = 12,
            tax_id_max_length = 13,
            tax_id_required_for_invoicing = true
        WHERE country_code = 'MX';
    ELSE
        -- Crear plantilla para México si no existe
        INSERT INTO tax_templates (
            country_code, country_name, currency, invoice_format,
            requires_cae, is_active,
            tax_id_field_name, tax_id_field_description,
            tax_id_format_mask, tax_id_validation_regex,
            tax_id_min_length, tax_id_max_length
        ) VALUES (
            'MX', 'México', 'MXN', 'standard',
            false, true,
            'RFC', 'RFC - Registro Federal de Contribuyentes',
            'XXXXXXXXXXXX', '^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$',
            12, 13
        );
    END IF;
END $$;

-- BRASIL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tax_templates WHERE country_code = 'BR') THEN
        UPDATE tax_templates
        SET tax_id_field_name = 'CNPJ',
            tax_id_field_description = 'CNPJ - Cadastro Nacional da Pessoa Jurídica',
            tax_id_format_mask = 'XX.XXX.XXX/XXXX-XX',
            tax_id_validation_regex = '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$',
            tax_id_min_length = 14,
            tax_id_max_length = 18,
            tax_id_required_for_invoicing = true
        WHERE country_code = 'BR';
    ELSE
        -- Crear plantilla para Brasil si no existe
        INSERT INTO tax_templates (
            country_code, country_name, currency, invoice_format,
            requires_cae, is_active,
            tax_id_field_name, tax_id_field_description,
            tax_id_format_mask, tax_id_validation_regex,
            tax_id_min_length, tax_id_max_length
        ) VALUES (
            'BR', 'Brasil', 'BRL', 'standard',
            false, true,
            'CNPJ', 'CNPJ - Cadastro Nacional da Pessoa Jurídica',
            'XX.XXX.XXX/XXXX-XX', '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$',
            14, 18
        );
    END IF;
END $$;

-- COLOMBIA
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tax_templates WHERE country_code = 'CO') THEN
        UPDATE tax_templates
        SET tax_id_field_name = 'NIT',
            tax_id_field_description = 'NIT - Número de Identificación Tributaria',
            tax_id_format_mask = 'XXX.XXX.XXX-X',
            tax_id_validation_regex = '^\d{3}\.\d{3}\.\d{3}-\d{1}$',
            tax_id_min_length = 9,
            tax_id_max_length = 13,
            tax_id_required_for_invoicing = true
        WHERE country_code = 'CO';
    ELSE
        -- Crear plantilla para Colombia si no existe
        INSERT INTO tax_templates (
            country_code, country_name, currency, invoice_format,
            requires_cae, is_active,
            tax_id_field_name, tax_id_field_description,
            tax_id_format_mask, tax_id_validation_regex,
            tax_id_min_length, tax_id_max_length
        ) VALUES (
            'CO', 'Colombia', 'COP', 'standard',
            false, true,
            'NIT', 'NIT - Número de Identificación Tributaria',
            'XXX.XXX.XXX-X', '^\d{3}\.\d{3}\.\d{3}-\d{1}$',
            9, 13
        );
    END IF;
END $$;

\echo '   ✅ Datos de ejemplo cargados para 6 países'

-- ============================================
-- COMENTARIOS EN CAMPOS
-- ============================================

COMMENT ON COLUMN tax_templates.tax_id_field_name IS 'Nombre del campo de identificación fiscal según país (CUIT, RUT, RUC, RFC, CNPJ, NIT)';
COMMENT ON COLUMN tax_templates.tax_id_field_description IS 'Descripción completa del campo fiscal';
COMMENT ON COLUMN tax_templates.tax_id_format_mask IS 'Máscara de formato (ej: XX-XXXXXXXX-X)';
COMMENT ON COLUMN tax_templates.tax_id_validation_regex IS 'Expresión regular para validar el formato';
COMMENT ON COLUMN tax_templates.tax_id_required_for_invoicing IS 'Si es obligatorio para facturación';

\echo ''
\echo '✅ [TAX-TEMPLATES] Migración completada exitosamente'
\echo ''
\echo '📋 Campos parametrizables por país:'
\echo '   - tax_id_field_name (CUIT, RUT, RUC, RFC, CNPJ, NIT)'
\echo '   - tax_id_field_description'
\echo '   - tax_id_format_mask'
\echo '   - tax_id_validation_regex'
\echo ''
\echo '🌎 Países configurados:'
\echo '   - Argentina: CUIT (XX-XXXXXXXX-X)'
\echo '   - Chile: RUT (XX.XXX.XXX-X)'
\echo '   - Perú: RUC (XXXXXXXXXXX)'
\echo '   - México: RFC (XXXXXXXXXXXX)'
\echo '   - Brasil: CNPJ (XX.XXX.XXX/XXXX-XX)'
\echo '   - Colombia: NIT (XXX.XXX.XXX-X)'
\echo ''
