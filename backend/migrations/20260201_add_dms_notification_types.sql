-- Agregar tipos de notificación de DMS al enum
-- Resuelve: la sintaxis de entrada no es válida para el enum enum_notifications_enterprise_notification_type: «document_request»

DO $$
BEGIN
  -- Agregar document_request si no existe
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'document_request' AND enumtypid = 'enum_notifications_enterprise_notification_type'::regtype) THEN
    ALTER TYPE enum_notifications_enterprise_notification_type ADD VALUE IF NOT EXISTS 'document_request';
    RAISE NOTICE 'Valor document_request agregado al enum';
  END IF;

  -- Agregar document_uploaded si no existe
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'document_uploaded' AND enumtypid = 'enum_notifications_enterprise_notification_type'::regtype) THEN
    ALTER TYPE enum_notifications_enterprise_notification_type ADD VALUE IF NOT EXISTS 'document_uploaded';
    RAISE NOTICE 'Valor document_uploaded agregado al enum';
  END IF;

  -- Agregar document_validated si no existe
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'document_validated' AND enumtypid = 'enum_notifications_enterprise_notification_type'::regtype) THEN
    ALTER TYPE enum_notifications_enterprise_notification_type ADD VALUE IF NOT EXISTS 'document_validated';
    RAISE NOTICE 'Valor document_validated agregado al enum';
  END IF;

  -- Agregar document_rejected si no existe
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'document_rejected' AND enumtypid = 'enum_notifications_enterprise_notification_type'::regtype) THEN
    ALTER TYPE enum_notifications_enterprise_notification_type ADD VALUE IF NOT EXISTS 'document_rejected';
    RAISE NOTICE 'Valor document_rejected agregado al enum';
  END IF;

  -- Agregar document_reminder si no existe
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'document_reminder' AND enumtypid = 'enum_notifications_enterprise_notification_type'::regtype) THEN
    ALTER TYPE enum_notifications_enterprise_notification_type ADD VALUE IF NOT EXISTS 'document_reminder';
    RAISE NOTICE 'Valor document_reminder agregado al enum';
  END IF;

EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error agregando valores al enum: %', SQLERRM;
END $$;
