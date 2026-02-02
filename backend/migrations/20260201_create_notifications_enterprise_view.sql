-- Agregar columnas faltantes a notifications_enterprise si es una tabla
-- Resuelve: no existe la columna «created_at» en la relación «notifications_enterprise»

DO $$
BEGIN
  -- Verificar si es una tabla
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications_enterprise' AND table_type = 'BASE TABLE') THEN

    -- Agregar created_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications_enterprise' AND column_name = 'created_at') THEN
      ALTER TABLE notifications_enterprise ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
      RAISE NOTICE 'Columna created_at agregada';
    END IF;

    -- Agregar updated_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications_enterprise' AND column_name = 'updated_at') THEN
      ALTER TABLE notifications_enterprise ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
      RAISE NOTICE 'Columna updated_at agregada';
    END IF;

    -- Agregar read_at si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications_enterprise' AND column_name = 'read_at') THEN
      ALTER TABLE notifications_enterprise ADD COLUMN read_at TIMESTAMP;
      RAISE NOTICE 'Columna read_at agregada';
    END IF;

    RAISE NOTICE 'Tabla notifications_enterprise actualizada correctamente';
  ELSE
    RAISE NOTICE 'notifications_enterprise no es una tabla base';
  END IF;
END $$;
