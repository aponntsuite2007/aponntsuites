-- Crear tabla de relación many-to-many entre users y shifts
-- Esta tabla permite asignar múltiples turnos a múltiples usuarios

BEGIN;

CREATE TABLE IF NOT EXISTS user_shifts (
  user_id UUID NOT NULL,
  shift_id UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (user_id, shift_id),

  CONSTRAINT fk_user_shifts_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user_shifts_shift
    FOREIGN KEY (shift_id)
    REFERENCES shifts(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_shifts_user_id ON user_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shifts_shift_id ON user_shifts(shift_id);

COMMENT ON TABLE user_shifts IS 'Tabla de relación many-to-many entre usuarios y turnos';
COMMENT ON COLUMN user_shifts.user_id IS 'ID del usuario (UUID)';
COMMENT ON COLUMN user_shifts.shift_id IS 'ID del turno (UUID)';

COMMIT;
