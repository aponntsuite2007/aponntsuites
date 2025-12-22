/*
 * ================================================================
 * MIGRACIÓN: Workflow de Alta y Baja de Empleados
 * ================================================================
 *
 * Descripción:
 * - Agrega campos para proceso de alta condicional
 * - Agrega campos para proceso de baja (renuncia/despido)
 * - Campos para certificado de buena conducta
 * - Campos para evaluación ambiental
 *
 * Autor: Claude Code
 * Fecha: 2025-12-16
 */

-- ========================================
-- NUEVOS CAMPOS: Proceso de Alta
-- ========================================

-- Certificado de Buena Conducta
ALTER TABLE employees ADD COLUMN IF NOT EXISTS certificado_buena_conducta JSONB DEFAULT '{
  "estado": "pendiente",
  "archivo_url": null,
  "fecha_emision": null,
  "fecha_vencimiento": null,
  "entidad_emisora": null,
  "observaciones": null
}'::jsonb;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS certificado_obligatorio BOOLEAN DEFAULT false;

COMMENT ON COLUMN employees.certificado_buena_conducta IS 'Estado del certificado: pendiente, aprobado, rechazado, vencido';
COMMENT ON COLUMN employees.certificado_obligatorio IS 'Si true, bloquea alta hasta tener certificado aprobado';

-- Evaluación Ambiental
ALTER TABLE employees ADD COLUMN IF NOT EXISTS evaluacion_ambiental JSONB DEFAULT '{
  "aprobado": null,
  "descripcion": null,
  "fecha_evaluacion": null,
  "evaluador": null,
  "observaciones": null
}'::jsonb;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS evaluacion_determinante BOOLEAN DEFAULT false;

COMMENT ON COLUMN employees.evaluacion_ambiental IS 'Evaluación de adaptación al ambiente laboral';
COMMENT ON COLUMN employees.evaluacion_determinante IS 'Si true y aprobado=false, bloquea alta';

-- Referencias a aprobaciones de otros dashboards (FK opcionales)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS aprobacion_medica_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS aprobacion_legal_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS aprobacion_rrhh_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS evaluacion_capacitacion_id INTEGER;

COMMENT ON COLUMN employees.aprobacion_medica_id IS 'FK a dashboard_medico (si aplica)';
COMMENT ON COLUMN employees.aprobacion_legal_id IS 'FK a dashboard_legal (si aplica)';
COMMENT ON COLUMN employees.aprobacion_rrhh_id IS 'FK a postulaciones (si aplica)';
COMMENT ON COLUMN employees.aprobacion_capacitacion_id IS 'FK a capacitacion (si aplica)';

-- ========================================
-- NUEVOS CAMPOS: Proceso de Baja
-- ========================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS tipo_baja VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nro_documento_baja VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS fecha_baja DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS motivo_baja TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS gestionado_por_legal BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS caso_legal_id INTEGER;

COMMENT ON COLUMN employees.tipo_baja IS 'Tipo: renuncia, despido, despido_causa, fin_contrato, mutual_acuerdo';
COMMENT ON COLUMN employees.nro_documento_baja IS 'Número de telegrama, carta documento, etc.';
COMMENT ON COLUMN employees.fecha_baja IS 'Fecha efectiva de baja';
COMMENT ON COLUMN employees.motivo_baja IS 'Descripción del motivo de baja';
COMMENT ON COLUMN employees.gestionado_por_legal IS 'Si true, baja gestionada por dashboard legal';
COMMENT ON COLUMN employees.caso_legal_id IS 'FK a dashboard_legal.casos (si aplica)';

-- ========================================
-- TABLA: Historial de Estados de Alta
-- ========================================

CREATE TABLE IF NOT EXISTS employee_hiring_status (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Requisitos de alta
  requiere_aprobacion_medica BOOLEAN DEFAULT false,
  aprobacion_medica_estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobado, rechazado
  aprobacion_medica_fecha TIMESTAMP,
  aprobacion_medica_observaciones TEXT,

  requiere_aprobacion_legal BOOLEAN DEFAULT false,
  aprobacion_legal_estado VARCHAR(20) DEFAULT 'pendiente',
  aprobacion_legal_fecha TIMESTAMP,
  aprobacion_legal_observaciones TEXT,

  requiere_aprobacion_rrhh BOOLEAN DEFAULT false,
  aprobacion_rrhh_estado VARCHAR(20) DEFAULT 'pendiente',
  aprobacion_rrhh_fecha TIMESTAMP,
  aprobacion_rrhh_observaciones TEXT,

  requiere_evaluacion_capacitacion BOOLEAN DEFAULT false,
  evaluacion_capacitacion_estado VARCHAR(20) DEFAULT 'pendiente',
  evaluacion_capacitacion_fecha TIMESTAMP,
  evaluacion_capacitacion_observaciones TEXT,

  requiere_certificado_conducta BOOLEAN DEFAULT false,
  certificado_conducta_estado VARCHAR(20) DEFAULT 'pendiente',
  certificado_conducta_fecha TIMESTAMP,

  requiere_evaluacion_ambiental BOOLEAN DEFAULT false,
  evaluacion_ambiental_estado VARCHAR(20) DEFAULT 'pendiente',
  evaluacion_ambiental_fecha TIMESTAMP,

  -- Estado general
  estado_general VARCHAR(20) DEFAULT 'pendiente', -- pendiente, en_proceso, aprobado, rechazado
  puede_activarse BOOLEAN DEFAULT false,
  motivo_bloqueo TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hiring_status_employee ON employee_hiring_status(employee_id);
CREATE INDEX idx_hiring_status_company ON employee_hiring_status(company_id);

COMMENT ON TABLE employee_hiring_status IS 'Registro del proceso de alta de empleados con validaciones condicionales';

-- ========================================
-- FUNCIÓN: Calcular si puede activarse
-- ========================================

CREATE OR REPLACE FUNCTION calculate_hiring_status(p_employee_id INTEGER)
RETURNS TABLE(
  puede_activarse BOOLEAN,
  motivo_bloqueo TEXT,
  requisitos_pendientes JSONB
) AS $$
DECLARE
  v_status RECORD;
  v_pendientes JSONB := '[]'::jsonb;
  v_puede_activarse BOOLEAN := true;
  v_motivo TEXT := '';
BEGIN
  -- Obtener status actual
  SELECT * INTO v_status FROM employee_hiring_status WHERE employee_id = p_employee_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No se encontró registro de hiring status', '[]'::jsonb;
    RETURN;
  END IF;

  -- Verificar cada requisito
  IF v_status.requiere_aprobacion_medica AND v_status.aprobacion_medica_estado != 'aprobado' THEN
    v_puede_activarse := false;
    v_pendientes := v_pendientes || jsonb_build_object('tipo', 'medica', 'estado', v_status.aprobacion_medica_estado);
  END IF;

  IF v_status.requiere_aprobacion_legal AND v_status.aprobacion_legal_estado != 'aprobado' THEN
    v_puede_activarse := false;
    v_pendientes := v_pendientes || jsonb_build_object('tipo', 'legal', 'estado', v_status.aprobacion_legal_estado);
  END IF;

  IF v_status.requiere_aprobacion_rrhh AND v_status.aprobacion_rrhh_estado != 'aprobado' THEN
    v_puede_activarse := false;
    v_pendientes := v_pendientes || jsonb_build_object('tipo', 'rrhh', 'estado', v_status.aprobacion_rrhh_estado);
  END IF;

  IF v_status.requiere_evaluacion_capacitacion AND v_status.evaluacion_capacitacion_estado != 'aprobado' THEN
    v_puede_activarse := false;
    v_pendientes := v_pendientes || jsonb_build_object('tipo', 'capacitacion', 'estado', v_status.evaluacion_capacitacion_estado);
  END IF;

  IF v_status.requiere_certificado_conducta AND v_status.certificado_conducta_estado != 'aprobado' THEN
    v_puede_activarse := false;
    v_pendientes := v_pendientes || jsonb_build_object('tipo', 'certificado_conducta', 'estado', v_status.certificado_conducta_estado);
  END IF;

  IF v_status.requiere_evaluacion_ambiental AND v_status.evaluacion_ambiental_estado != 'aprobado' THEN
    v_puede_activarse := false;
    v_pendientes := v_pendientes || jsonb_build_object('tipo', 'evaluacion_ambiental', 'estado', v_status.evaluacion_ambiental_estado);
  END IF;

  -- Construir motivo de bloqueo
  IF NOT v_puede_activarse THEN
    v_motivo := 'Requisitos pendientes: ' || jsonb_array_length(v_pendientes)::text;
  END IF;

  RETURN QUERY SELECT v_puede_activarse, v_motivo, v_pendientes;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGER: Actualizar hiring status
-- ========================================

CREATE OR REPLACE FUNCTION update_hiring_status_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_resultado RECORD;
BEGIN
  -- Calcular nuevo estado
  SELECT * INTO v_resultado FROM calculate_hiring_status(NEW.employee_id);

  -- Actualizar registro
  UPDATE employee_hiring_status
  SET
    puede_activarse = v_resultado.puede_activarse,
    motivo_bloqueo = v_resultado.motivo_bloqueo,
    estado_general = CASE
      WHEN v_resultado.puede_activarse THEN 'aprobado'
      ELSE 'en_proceso'
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE employee_id = NEW.employee_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_hiring_status
AFTER UPDATE ON employee_hiring_status
FOR EACH ROW
EXECUTE FUNCTION update_hiring_status_trigger();

-- ========================================
-- DATOS INICIALES
-- ========================================

-- Crear registro de hiring status para empleados existentes que no tengan
INSERT INTO employee_hiring_status (employee_id, company_id, puede_activarse, estado_general)
SELECT
  e.id,
  e.company_id,
  true, -- Empleados existentes están aprobados automáticamente
  'aprobado'
FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM employee_hiring_status h WHERE h.employee_id = e.id
);

COMMENT ON TABLE employee_hiring_status IS 'Workflow de alta: validaciones condicionales según módulos contratados por empresa';
