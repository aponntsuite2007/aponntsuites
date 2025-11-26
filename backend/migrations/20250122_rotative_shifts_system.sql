--
-- 🔄 SISTEMA DE TURNOS ROTATIVOS - Multi-tenant Enterprise
-- Fecha: 2025-01-22
-- Descripción: Sistema completo de turnos rotativos con reloj global
--              y asignación de usuarios que se acoplan en marcha
--

-- ========================================
-- PASO 1: Actualizar tabla shifts
-- ========================================

-- Agregar campos para turnos rotativos avanzados
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS global_cycle_start_date DATE,
ADD COLUMN IF NOT EXISTS phases JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN shifts.global_cycle_start_date IS 'Fecha en que ARRANCÓ el ciclo del turno (reloj propio global)';
COMMENT ON COLUMN shifts.phases IS 'Fases detalladas del turno: [{ name, duration, startTime, endTime, groupName, sector }]';

-- Ejemplo de phases JSONB:
-- [
--   { "name": "mañana", "duration": 5, "startTime": "06:00", "endTime": "14:00",
--     "groupName": "Producción - Paletizado - Mañana", "sector": "paletizado" },
--   { "name": "descanso", "duration": 2 },
--   { "name": "tarde", "duration": 5, "startTime": "14:00", "endTime": "22:00",
--     "groupName": "Producción - Paletizado - Tarde", "sector": "paletizado" },
--   { "name": "descanso", "duration": 2 },
--   { "name": "noche", "duration": 5, "startTime": "22:00", "endTime": "06:00",
--     "groupName": "Producción - Paletizado - Noche", "sector": "paletizado" },
--   { "name": "descanso", "duration": 2 }
-- ]

CREATE INDEX IF NOT EXISTS idx_shifts_global_cycle
ON shifts (global_cycle_start_date)
WHERE global_cycle_start_date IS NOT NULL;

-- ========================================
-- PASO 2: Crear tabla user_shift_assignments
-- ========================================

CREATE TABLE IF NOT EXISTS user_shift_assignments (
  id BIGSERIAL PRIMARY KEY,

  -- Relaciones Multi-tenant
  user_id UUID NOT NULL,
  shift_id UUID NOT NULL,
  company_id INTEGER NOT NULL,

  -- Configuración de acoplamiento
  join_date DATE NOT NULL,
    COMMENT ON COLUMN join_date IS 'Fecha en que el usuario se ACOPLA al turno en marcha',

  assigned_phase VARCHAR(50) NOT NULL,
    COMMENT ON COLUMN assigned_phase IS 'Fase/Grupo al que se asigna: mañana, tarde, noche, etc.',

  group_name VARCHAR(255),
    COMMENT ON COLUMN group_name IS 'Nombre descriptivo del grupo: "Producción - Paletizado - Mañana"',

  sector VARCHAR(100),
    COMMENT ON COLUMN sector IS 'Sector específico dentro del departamento',

  -- Metadata de asignación
  assigned_by UUID,
  assigned_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  deactivated_at TIMESTAMP,
  deactivated_by UUID,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT fk_user_shift_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user_shift_shift
    FOREIGN KEY (shift_id)
    REFERENCES shifts(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user_shift_company
    FOREIGN KEY (company_id)
    REFERENCES companies(company_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user_shift_assigned_by
    FOREIGN KEY (assigned_by)
    REFERENCES users(user_id)
    ON DELETE SET NULL,

  CONSTRAINT fk_user_shift_deactivated_by
    FOREIGN KEY (deactivated_by)
    REFERENCES users(user_id)
    ON DELETE SET NULL
);

-- ========================================
-- PASO 3: Índices para performance
-- ========================================

-- Índice principal: buscar asignación activa de un usuario
CREATE INDEX idx_user_shift_active
ON user_shift_assignments (user_id, is_active, join_date DESC)
WHERE is_active = TRUE;

-- Índice para filtrar por empresa y turno
CREATE INDEX idx_user_shift_company_shift
ON user_shift_assignments (company_id, shift_id, is_active);

-- Índice para filtrar por fase/grupo
CREATE INDEX idx_user_shift_phase
ON user_shift_assignments (assigned_phase, is_active)
WHERE is_active = TRUE;

-- Índice para búsquedas por sector
CREATE INDEX idx_user_shift_sector
ON user_shift_assignments (sector, company_id)
WHERE sector IS NOT NULL;

-- Constraint: Solo UNA asignación activa por usuario
CREATE UNIQUE INDEX idx_user_shift_unique_active
ON user_shift_assignments (user_id)
WHERE is_active = TRUE;

-- ========================================
-- PASO 4: Trigger para updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_user_shift_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_shift_updated_at ON user_shift_assignments;

CREATE TRIGGER trigger_user_shift_updated_at
BEFORE UPDATE ON user_shift_assignments
FOR EACH ROW
EXECUTE FUNCTION update_user_shift_updated_at();

-- ========================================
-- PASO 5: Comentarios en tabla
-- ========================================

COMMENT ON TABLE user_shift_assignments IS
'Asignación de usuarios a turnos rotativos. Los usuarios se ACOPLAN al turno en marcha.';

COMMENT ON COLUMN user_shift_assignments.join_date IS
'Fecha en que el usuario se incorpora al turno rotativo (puede ser después de que el turno arrancó)';

COMMENT ON COLUMN user_shift_assignments.assigned_phase IS
'Grupo/Fase a la que pertenece el usuario (mañana, tarde, noche). Solo trabaja cuando el turno global está en esta fase.';

COMMENT ON COLUMN user_shift_assignments.group_name IS
'Nombre completo del grupo para UI: "Departamento - Sector - Fase"';

COMMENT ON COLUMN user_shift_assignments.is_active IS
'Si está activo. Solo puede haber UNA asignación activa por usuario (constraint).';

-- ========================================
-- PASO 6: Datos de ejemplo (OPCIONAL)
-- ========================================

-- Ejemplo: Turno 5x2 Producción - Paletizado
/*
INSERT INTO shifts (
  id, name, "shiftType", "rotationPattern",
  global_cycle_start_date, phases, company_id,
  "isActive", "toleranceMinutes"
) VALUES (
  gen_random_uuid(),
  '5x2 Producción - Paletizado',
  'rotative',
  '5x2x5x2x5x2',
  '2025-01-15', -- Turno arrancó el 15 de enero
  '[
    {"name": "mañana", "duration": 5, "startTime": "06:00", "endTime": "14:00",
     "groupName": "Producción - Paletizado - Mañana", "sector": "paletizado"},
    {"name": "descanso", "duration": 2},
    {"name": "tarde", "duration": 5, "startTime": "14:00", "endTime": "22:00",
     "groupName": "Producción - Paletizado - Tarde", "sector": "paletizado"},
    {"name": "descanso", "duration": 2},
    {"name": "noche", "duration": 5, "startTime": "22:00", "endTime": "06:00",
     "groupName": "Producción - Paletizado - Noche", "sector": "paletizado"},
    {"name": "descanso", "duration": 2}
  ]'::jsonb,
  1, -- company_id
  TRUE,
  10
) ON CONFLICT DO NOTHING;

-- Ejemplo: Asignar usuario al grupo TARDE
-- Juan se acopla el 22/01 (hoy) al grupo de tarde
INSERT INTO user_shift_assignments (
  user_id, shift_id, company_id, join_date,
  assigned_phase, group_name, sector, is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- user_id de Juan
  (SELECT id FROM shifts WHERE name = '5x2 Producción - Paletizado' LIMIT 1),
  1,
  '2025-01-22', -- Se acopla HOY
  'tarde',
  'Producción - Paletizado - Tarde',
  'paletizado',
  TRUE
) ON CONFLICT DO NOTHING;
*/

-- ========================================
-- ✅ MIGRACIÓN COMPLETADA
-- ========================================

-- Para verificar:
-- SELECT * FROM user_shift_assignments;
-- SELECT id, name, global_cycle_start_date, phases FROM shifts WHERE "shiftType" = 'rotative';
