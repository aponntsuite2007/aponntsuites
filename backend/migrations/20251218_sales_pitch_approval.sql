
-- Columnas para aprobación de pitch
ALTER TABLE sales_meetings ADD COLUMN IF NOT EXISTS pitch_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales_meetings ADD COLUMN IF NOT EXISTS pitch_approved_by UUID;
ALTER TABLE sales_meetings ADD COLUMN IF NOT EXISTS pitch_rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE sales_meetings ADD COLUMN IF NOT EXISTS pitch_rejected_feedback TEXT;
ALTER TABLE sales_meetings ADD COLUMN IF NOT EXISTS pitch_sent_at TIMESTAMP WITH TIME ZONE;

-- Actualizar constraint de status para incluir nuevos estados
ALTER TABLE sales_meetings DROP CONSTRAINT IF EXISTS sales_meetings_status_check;
ALTER TABLE sales_meetings ADD CONSTRAINT sales_meetings_status_check
    CHECK (status IN (
        'draft', 'scheduled', 'survey_sent', 'survey_completed',
        'pitch_ready', 'pitch_approved', 'pitch_rejected', 'pitch_sent',
        'reminder_sent', 'in_progress', 'completed',
        'feedback_pending', 'closed', 'quoted', 'cancelled'
    ));
