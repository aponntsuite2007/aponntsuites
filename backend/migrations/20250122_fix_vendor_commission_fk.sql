-- ===============================================================
-- MIGRACIÓN: FIX FOREIGN KEYS DE VENDOR_COMMISSIONS
-- ===============================================================
-- Fecha: 2025-01-22
-- Propósito: Cambiar FKs de users → aponnt_staff
-- Razón: El sistema de comisiones debe usar aponnt_staff, no users
-- ===============================================================

-- ===============================================================
-- PASO 1: DROP CONSTRAINTS EXISTENTES (si existen)
-- ===============================================================

-- Verificar y eliminar constraint de vendor_id
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = 'vendor_commissions'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_name LIKE '%vendor_id%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE vendor_commissions DROP CONSTRAINT ' || constraint_name;
    RAISE NOTICE 'Eliminado constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No se encontro constraint para vendor_id';
  END IF;
END $$;

-- Verificar y eliminar constraint de original_vendor_id
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = 'vendor_commissions'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.constraint_name LIKE '%original_vendor_id%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE vendor_commissions DROP CONSTRAINT ' || constraint_name;
    RAISE NOTICE 'Eliminado constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No se encontro constraint para original_vendor_id';
  END IF;
END $$;

-- ===============================================================
-- PASO 2: AGREGAR NUEVOS CONSTRAINTS A aponnt_staff
-- ===============================================================

-- FK para vendor_id → aponnt_staff.staff_id
ALTER TABLE vendor_commissions
ADD CONSTRAINT fk_vendor_commissions_vendor_staff
FOREIGN KEY (vendor_id) REFERENCES aponnt_staff(staff_id)
ON DELETE CASCADE
ON UPDATE CASCADE;

COMMENT ON CONSTRAINT fk_vendor_commissions_vendor_staff ON vendor_commissions IS
'FK a aponnt_staff. Define el vendedor que recibe la comisión';

-- FK para original_vendor_id → aponnt_staff.staff_id
ALTER TABLE vendor_commissions
ADD CONSTRAINT fk_vendor_commissions_original_vendor_staff
FOREIGN KEY (original_vendor_id) REFERENCES aponnt_staff(staff_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

COMMENT ON CONSTRAINT fk_vendor_commissions_original_vendor_staff ON vendor_commissions IS
'FK a aponnt_staff. Define el vendedor original antes de una transferencia';

-- ===============================================================
-- PASO 3: CREAR ÍNDICES PARA PERFORMANCE
-- ===============================================================

-- Índice para vendor_id (ya debería existir, pero aseguramos)
CREATE INDEX IF NOT EXISTS idx_vendor_commissions_vendor_id
ON vendor_commissions(vendor_id);

-- Índice para original_vendor_id
CREATE INDEX IF NOT EXISTS idx_vendor_commissions_original_vendor_id
ON vendor_commissions(original_vendor_id)
WHERE original_vendor_id IS NOT NULL;

-- ===============================================================
-- PASO 4: ACTUALIZAR COMENTARIOS DE COLUMNAS
-- ===============================================================

COMMENT ON COLUMN vendor_commissions.vendor_id IS
'UUID del staff de Aponnt que recibe la comisión (FK a aponnt_staff.staff_id)';

COMMENT ON COLUMN vendor_commissions.original_vendor_id IS
'UUID del staff original antes de transferencia (FK a aponnt_staff.staff_id)';

-- ===============================================================
-- FIN DE MIGRACIÓN
-- ===============================================================

-- Log de éxito
DO $$
BEGIN
  RAISE NOTICE 'Migracion de Foreign Keys de vendor_commissions COMPLETADA';
  RAISE NOTICE '   Actualizado vendor_id: users.id -> aponnt_staff.staff_id';
  RAISE NOTICE '   Actualizado original_vendor_id: users.id -> aponnt_staff.staff_id';
  RAISE NOTICE '   Creados indices de optimizacion';
END $$;
