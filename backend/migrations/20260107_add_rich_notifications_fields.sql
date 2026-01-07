-- ============================================================================
-- AGREGAR SOPORTE PARA RICH NOTIFICATIONS
-- ============================================================================
-- Fecha: 2026-01-07
-- Propósito: Agregar campos para notificaciones ricas (imágenes, attachments, botones)
-- ============================================================================

-- Agregar campos de rich content a unified_notifications
ALTER TABLE unified_notifications
ADD COLUMN IF NOT EXISTS rich_content JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS action_buttons JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Comentarios descriptivos
COMMENT ON COLUMN unified_notifications.rich_content IS 'Contenido rico en formato JSON (HTML, Markdown, etc.)';
COMMENT ON COLUMN unified_notifications.attachments IS 'Array de archivos adjuntos [{url, name, type, size}]';
COMMENT ON COLUMN unified_notifications.action_buttons IS 'Array de botones de acción [{label, action, style, url}]';
COMMENT ON COLUMN unified_notifications.image_url IS 'URL de imagen principal de la notificación';
COMMENT ON COLUMN unified_notifications.icon_url IS 'URL de ícono personalizado';

-- Índice para buscar notificaciones con attachments
CREATE INDEX IF NOT EXISTS idx_unified_notif_has_attachments
ON unified_notifications((jsonb_array_length(attachments)))
WHERE jsonb_array_length(attachments) > 0
  AND deleted_at IS NULL;

-- Índice para buscar notificaciones con acción requerida y botones
CREATE INDEX IF NOT EXISTS idx_unified_notif_action_buttons
ON unified_notifications((jsonb_array_length(action_buttons)))
WHERE requires_action = TRUE
  AND jsonb_array_length(action_buttons) > 0
  AND deleted_at IS NULL;

-- También agregar a notification_templates para plantillas ricas
ALTER TABLE notification_templates
ADD COLUMN IF NOT EXISTS supports_rich_content BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS default_image_url TEXT,
ADD COLUMN IF NOT EXISTS default_icon_url TEXT,
ADD COLUMN IF NOT EXISTS default_action_buttons JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN notification_templates.supports_rich_content IS 'TRUE si la plantilla soporta contenido rico';
COMMENT ON COLUMN notification_templates.default_image_url IS 'URL de imagen por defecto para la plantilla';
COMMENT ON COLUMN notification_templates.default_icon_url IS 'URL de ícono por defecto';
COMMENT ON COLUMN notification_templates.default_action_buttons IS 'Botones de acción por defecto [{label, action, style}]';

-- ============================================================================
-- EJEMPLOS DE USO
-- ============================================================================

/*
EJEMPLO 1: Notificación con imagen y botones

rich_content: {
  "html": "<p>Orden de compra <strong>#12345</strong> requiere aprobación</p>",
  "markdown": "Orden de compra **#12345** requiere aprobación"
}

attachments: [
  {
    "url": "https://storage.example.com/documents/purchase-order-12345.pdf",
    "name": "Orden de Compra #12345.pdf",
    "type": "application/pdf",
    "size": 245678
  }
]

action_buttons: [
  {
    "label": "Aprobar",
    "action": "approve",
    "style": "success",
    "confirm": "¿Confirmar aprobación?"
  },
  {
    "label": "Rechazar",
    "action": "reject",
    "style": "danger",
    "confirm": "¿Confirmar rechazo?"
  },
  {
    "label": "Ver Detalles",
    "action": "view",
    "style": "info",
    "url": "/procurement/orders/12345"
  }
]

image_url: "https://storage.example.com/images/purchase-order-preview.jpg"
icon_url: "https://storage.example.com/icons/procurement.png"
*/

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
