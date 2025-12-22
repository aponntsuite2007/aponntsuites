
-- Agregar columnas para trazabilidad y nuevos estados
DO $$
BEGIN
    -- Columna para vincular con empresa creada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales_meetings' AND column_name = 'resulting_company_id') THEN
        ALTER TABLE sales_meetings ADD COLUMN resulting_company_id INTEGER REFERENCES companies(id);
        COMMENT ON COLUMN sales_meetings.resulting_company_id IS 'Empresa creada como resultado de esta reunión';
    END IF;

    -- Columna para vincular con presupuesto enviado
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales_meetings' AND column_name = 'resulting_budget_id') THEN
        ALTER TABLE sales_meetings ADD COLUMN resulting_budget_id INTEGER;
        COMMENT ON COLUMN sales_meetings.resulting_budget_id IS 'Presupuesto enviado como resultado de esta reunión';
    END IF;

    -- Columna para motivo de cancelación
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales_meetings' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE sales_meetings ADD COLUMN cancellation_reason TEXT;
    END IF;

    -- Columna para quién canceló
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales_meetings' AND column_name = 'cancelled_by') THEN
        ALTER TABLE sales_meetings ADD COLUMN cancelled_by UUID;
    END IF;

    -- Columna para fecha de cancelación
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales_meetings' AND column_name = 'cancelled_at') THEN
        ALTER TABLE sales_meetings ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Columna para soft delete (solo gerentes pueden borrar físicamente)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales_meetings' AND column_name = 'deleted_at') THEN
        ALTER TABLE sales_meetings ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Columna para quién borró
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'sales_meetings' AND column_name = 'deleted_by') THEN
        ALTER TABLE sales_meetings ADD COLUMN deleted_by UUID;
    END IF;
END $$;

-- Actualizar estados válidos si hay constraint
DO $$
BEGIN
    -- Verificar si existe el constraint y actualizarlo
    IF EXISTS (SELECT 1 FROM information_schema.check_constraints
               WHERE constraint_name LIKE '%sales_meetings_status%') THEN
        ALTER TABLE sales_meetings DROP CONSTRAINT IF EXISTS sales_meetings_status_check;
    END IF;

    -- Crear nuevo constraint con todos los estados
    ALTER TABLE sales_meetings ADD CONSTRAINT sales_meetings_status_check
        CHECK (status IN ('draft', 'scheduled', 'survey_sent', 'survey_completed',
                         'pitch_ready', 'reminder_sent', 'in_progress', 'completed',
                         'feedback_pending', 'closed', 'quoted', 'cancelled'));
EXCEPTION WHEN OTHERS THEN
    -- Si falla, continuar (puede que no haya constraint)
    NULL;
END $$;

-- Crear índice para búsqueda por estado
CREATE INDEX IF NOT EXISTS idx_sales_meetings_status ON sales_meetings(status);

-- Crear índice para trazabilidad
CREATE INDEX IF NOT EXISTS idx_sales_meetings_company ON sales_meetings(resulting_company_id);
