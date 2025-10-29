/**
 * MÓDULO DE SOPORTE - Sistema Completo
 *
 * CARACTERÍSTICAS:
 * - Tickets multi-tenant con ID único
 * - Acceso temporal de soporte con contraseña aleatoria
 * - Notificaciones integradas
 * - Log de actividad de soporte (transparencia y privacidad)
 * - Sistema de evaluación (1-5 estrellas)
 * - Asignación de vendedor/soporte por empresa
 *
 * @version 1.0.0
 * @date 2025-01-23
 */

-- Habilitar extensión UUID (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA 1: support_tickets - Tickets de soporte
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number VARCHAR(50) UNIQUE NOT NULL, -- Ej: "TICKET-2025-000001"

  -- Multi-tenant
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Usuario que crea el ticket
  created_by_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Módulo afectado
  module_name VARCHAR(100) NOT NULL,
  module_display_name VARCHAR(200),

  -- Descripción del problema
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Acceso temporal de soporte
  allow_support_access BOOLEAN DEFAULT false,
  temp_support_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- Usuario temporal creado
  temp_password_hash VARCHAR(255), -- Hash de la contraseña temporal
  temp_password_expires_at TIMESTAMP WITH TIME ZONE,
  temp_access_granted_at TIMESTAMP WITH TIME ZONE,

  -- Asignación de soporte
  assigned_to_vendor_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- Vendedor/soporte asignado
  assigned_at TIMESTAMP WITH TIME ZONE,

  -- Estado del ticket
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN (
    'open',           -- Abierto (nuevo)
    'in_progress',    -- En progreso (soporte trabajando)
    'waiting_customer', -- Esperando respuesta del cliente
    'resolved',       -- Resuelto (pendiente de cierre)
    'closed'          -- Cerrado
  )),

  -- Cierre del ticket
  closed_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  close_reason TEXT,

  -- Evaluación del soporte (1-5 estrellas)
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  rating_comment TEXT,
  rated_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_support_tickets_company ON support_tickets(company_id);
CREATE INDEX idx_support_tickets_created_by ON support_tickets(created_by_user_id);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to_vendor_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE support_tickets IS 'Tickets de soporte técnico multi-tenant';
COMMENT ON COLUMN support_tickets.ticket_number IS 'Número de ticket auto-generado único globalmente';
COMMENT ON COLUMN support_tickets.allow_support_access IS 'Cliente autoriza acceso temporal a soporte';
COMMENT ON COLUMN support_tickets.temp_support_user_id IS 'Usuario temporal creado para que soporte ingrese';
COMMENT ON COLUMN support_tickets.assigned_to_vendor_id IS 'Vendedor/técnico asignado para dar soporte';

-- ============================================================================
-- TABLA 2: support_ticket_messages - Conversación del ticket
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,

  -- Autor del mensaje
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  user_role VARCHAR(50) NOT NULL, -- 'customer', 'support', 'admin'

  -- Contenido
  message TEXT NOT NULL,

  -- Adjuntos (JSON array de URLs)
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  is_internal BOOLEAN DEFAULT false, -- Notas internas (solo visibles para soporte/admin)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_ticket_messages_ticket ON support_ticket_messages(ticket_id);
CREATE INDEX idx_support_ticket_messages_created_at ON support_ticket_messages(created_at DESC);

COMMENT ON TABLE support_ticket_messages IS 'Mensajes/conversación dentro de cada ticket';
COMMENT ON COLUMN support_ticket_messages.is_internal IS 'Notas internas visibles solo para soporte';

-- ============================================================================
-- TABLA 3: support_activity_log - Log de actividad de soporte en empresa cliente
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_activity_log (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,

  -- Soporte que realizó la acción
  support_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Empresa cliente donde se realizó la acción
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Sesión de acceso temporal
  session_id UUID NOT NULL,
  session_started_at TIMESTAMP WITH TIME ZONE,
  session_ended_at TIMESTAMP WITH TIME ZONE,

  -- Detalles de la actividad
  activity_type VARCHAR(100) NOT NULL, -- 'login', 'view_module', 'edit_record', 'delete_record', etc.
  module_name VARCHAR(100),
  action_description TEXT NOT NULL,

  -- Datos afectados (JSON)
  affected_data JSONB, -- Ej: {"table": "users", "record_id": "123", "action": "updated_email"}

  -- IP y user agent
  ip_address VARCHAR(45),
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_activity_log_ticket ON support_activity_log(ticket_id);
CREATE INDEX idx_support_activity_log_support_user ON support_activity_log(support_user_id);
CREATE INDEX idx_support_activity_log_company ON support_activity_log(company_id);
CREATE INDEX idx_support_activity_log_session ON support_activity_log(session_id);
CREATE INDEX idx_support_activity_log_created_at ON support_activity_log(created_at DESC);

COMMENT ON TABLE support_activity_log IS 'Log transparente de toda actividad de soporte en empresa cliente';
COMMENT ON COLUMN support_activity_log.session_id IS 'ID de sesión temporal de acceso de soporte';
COMMENT ON COLUMN support_activity_log.affected_data IS 'Datos JSON con detalles de registros afectados';

-- ============================================================================
-- TABLA 4: company_support_assignments - Asignación de soporte por empresa
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_support_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Empresa cliente
  company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Soporte asignado
  support_type VARCHAR(50) NOT NULL CHECK (support_type IN (
    'original_vendor',  -- Vendedor original (por defecto)
    'other_vendor',     -- Otro vendedor
    'aponnt_support'    -- Soporte directo de Aponnt
  )),

  -- Vendedor/técnico asignado (NULL si es aponnt_support)
  assigned_vendor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,

  -- Vendedor original (quien hizo la venta)
  original_vendor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Fechas
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  notes TEXT,
  assigned_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_company_support_assignments_company ON company_support_assignments(company_id);
CREATE INDEX idx_company_support_assignments_vendor ON company_support_assignments(assigned_vendor_id);
CREATE INDEX idx_company_support_assignments_active ON company_support_assignments(is_active);

COMMENT ON TABLE company_support_assignments IS 'Asignación de soporte técnico por empresa';
COMMENT ON COLUMN company_support_assignments.support_type IS 'Tipo: vendedor original, otro vendedor, o Aponnt directo';
COMMENT ON COLUMN company_support_assignments.original_vendor_id IS 'Vendedor que realizó la venta inicial';

-- ============================================================================
-- TABLA 5: support_vendor_stats - Estadísticas de soporte por vendedor
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_vendor_stats (
  stat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Período
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Estadísticas
  total_tickets INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,
  tickets_closed INTEGER DEFAULT 0,
  avg_resolution_time_hours DECIMAL(10, 2),
  avg_rating DECIMAL(3, 2), -- Promedio de 1.00 a 5.00

  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(vendor_id, period_start, period_end)
);

CREATE INDEX idx_support_vendor_stats_vendor ON support_vendor_stats(vendor_id);
CREATE INDEX idx_support_vendor_stats_period ON support_vendor_stats(period_start, period_end);

COMMENT ON TABLE support_vendor_stats IS 'Estadísticas agregadas de performance de soporte por vendedor';

-- ============================================================================
-- FUNCIONES HELPER
-- ============================================================================

/**
 * Generar número de ticket único auto-incremental
 */
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  ticket_num TEXT;
BEGIN
  -- Obtener el siguiente número (basado en el año actual)
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 'TICKET-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
  INTO next_number
  FROM support_tickets
  WHERE ticket_number LIKE 'TICKET-' || EXTRACT(YEAR FROM CURRENT_TIMESTAMP) || '-%';

  -- Formatear como TICKET-2025-000001
  ticket_num := 'TICKET-' || EXTRACT(YEAR FROM CURRENT_TIMESTAMP) || '-' || LPAD(next_number::TEXT, 6, '0');

  RETURN ticket_num;
END;
$$ LANGUAGE plpgsql;

/**
 * Obtener vendedor asignado para soporte de una empresa
 */
CREATE OR REPLACE FUNCTION get_company_support_vendor(p_company_id INTEGER)
RETURNS UUID AS $$
DECLARE
  vendor_id UUID;
BEGIN
  SELECT
    CASE
      WHEN support_type = 'aponnt_support' THEN NULL -- Aponnt maneja directamente
      WHEN support_type = 'other_vendor' THEN assigned_vendor_id
      ELSE original_vendor_id -- 'original_vendor'
    END
  INTO vendor_id
  FROM company_support_assignments
  WHERE company_id = p_company_id
    AND is_active = true
  ORDER BY assigned_at DESC
  LIMIT 1;

  RETURN vendor_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Expirar contraseña temporal al cerrar ticket
 */
CREATE OR REPLACE FUNCTION expire_temp_password_on_close()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    -- Marcar contraseña como expirada
    NEW.temp_password_expires_at = CURRENT_TIMESTAMP;

    -- Deshabilitar usuario temporal si existe
    IF NEW.temp_support_user_id IS NOT NULL THEN
      UPDATE users
      SET is_active = false
      WHERE user_id = NEW.temp_support_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expire_temp_password
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION expire_temp_password_on_close();

/**
 * Función para obtener tickets pendientes por vendedor
 */
CREATE OR REPLACE FUNCTION get_vendor_pending_tickets(p_vendor_id UUID)
RETURNS TABLE (
  ticket_id UUID,
  ticket_number VARCHAR(50),
  company_name VARCHAR(255),
  subject VARCHAR(500),
  priority VARCHAR(20),
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE,
  days_open INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.ticket_id,
    st.ticket_number,
    c.name as company_name,
    st.subject,
    st.priority,
    st.status,
    st.created_at,
    EXTRACT(DAY FROM CURRENT_TIMESTAMP - st.created_at)::INTEGER as days_open
  FROM support_tickets st
  INNER JOIN companies c ON st.company_id = c.company_id
  WHERE st.assigned_to_vendor_id = p_vendor_id
    AND st.status IN ('open', 'in_progress', 'waiting_customer')
  ORDER BY
    CASE st.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    st.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Comentario: Los support_assignments se crearán automáticamente cuando:
-- 1. Se cree una nueva empresa (trigger en tabla companies)
-- 2. Se asigne manualmente desde panel administrativo de Aponnt

COMMENT ON FUNCTION generate_ticket_number IS 'Genera número de ticket único: TICKET-2025-000001';
COMMENT ON FUNCTION get_company_support_vendor IS 'Obtiene el vendedor asignado para dar soporte a una empresa';
COMMENT ON FUNCTION get_vendor_pending_tickets IS 'Lista todos los tickets pendientes de un vendedor con prioridad';
