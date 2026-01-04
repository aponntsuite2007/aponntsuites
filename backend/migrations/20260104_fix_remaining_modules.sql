-- =====================================================
-- FIX: Módulos que quedaron mal clasificados en ISI
-- =====================================================
-- Fecha: 2026-01-04
-- Problema: 4 módulos tienen clasificación incorrecta
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ai-assistant → web-widget (NO tarjeta)
-- =====================================================
-- Es un CHAT FLOTANTE, no un módulo con pantalla propia
-- Se carga automáticamente (auto_init: true)
-- NO debe aparecer como tarjeta en el dashboard

UPDATE system_modules
SET
  module_type = 'web-widget',
  metadata = metadata || '{
    "reason": "Chat flotante que aparece en todas las pantallas, no es una tarjeta independiente",
    "auto_init": true,
    "frontend_file": "/js/modules/ai-assistant-chat.js",
    "show_as_card": false,
    "hideFromDashboard": true
  }'::jsonb
WHERE module_key = 'ai-assistant';

-- =====================================================
-- 2. company-email-process → admin panel
-- =====================================================
-- Es configuración administrativa, no módulo comercial
-- Solo administradores deben configurar emails

UPDATE system_modules
SET
  available_in = 'admin',
  category = 'admin',
  is_core = true
WHERE module_key = 'company-email-process';

-- =====================================================
-- 3. company-account → admin panel
-- =====================================================
-- Es configuración de cuenta/empresa, administrativo
-- Solo administradores deben modificar datos fiscales

UPDATE system_modules
SET
  available_in = 'admin',
  category = 'admin',
  is_core = true
WHERE module_key = 'company-account';

-- =====================================================
-- 4. user-support → Revisar si duplica ai-assistant
-- =====================================================
-- Si user-support es solo para ver tickets, puede quedar
-- Si duplica funcionalidad de ai-assistant, desactivar

-- Por ahora solo documentamos, no cambiamos
COMMENT ON COLUMN system_modules.module_key IS
'user-support: Dashboard de tickets. Revisar si duplica ai-assistant (chat + escalate to ticket)';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
DECLARE
  v_ai_type VARCHAR;
  v_email_panel VARCHAR;
  v_account_panel VARCHAR;
BEGIN
  -- Verificar ai-assistant
  SELECT module_type INTO v_ai_type
  FROM system_modules
  WHERE module_key = 'ai-assistant';

  IF v_ai_type = 'web-widget' THEN
    RAISE NOTICE '✅ ai-assistant ahora es web-widget (NO tarjeta)';
  ELSE
    RAISE WARNING '❌ ai-assistant sigue siendo %', v_ai_type;
  END IF;

  -- Verificar company-email-process
  SELECT available_in INTO v_email_panel
  FROM system_modules
  WHERE module_key = 'company-email-process';

  IF v_email_panel = 'admin' THEN
    RAISE NOTICE '✅ company-email-process movido a panel-administrativo';
  ELSE
    RAISE WARNING '❌ company-email-process sigue en %', v_email_panel;
  END IF;

  -- Verificar company-account
  SELECT available_in INTO v_account_panel
  FROM system_modules
  WHERE module_key = 'company-account';

  IF v_account_panel = 'admin' THEN
    RAISE NOTICE '✅ company-account movido a panel-administrativo';
  ELSE
    RAISE WARNING '❌ company-account sigue en %', v_account_panel;
  END IF;

  -- Contar módulos afectados en v_modules_by_panel
  RAISE NOTICE '';
  RAISE NOTICE '📊 Resumen v_modules_by_panel:';
  RAISE NOTICE '   ai-assistant show_as_card: %',
    (SELECT show_as_card FROM v_modules_by_panel WHERE module_key = 'ai-assistant');
  RAISE NOTICE '   company-email-process target_panel: %',
    (SELECT target_panel FROM v_modules_by_panel WHERE module_key = 'company-email-process');
  RAISE NOTICE '   company-account target_panel: %',
    (SELECT target_panel FROM v_modules_by_panel WHERE module_key = 'company-account');
END $$;

COMMIT;

-- =====================================================
-- INSTRUCCIONES POST-MIGRACIÓN
-- =====================================================

/*
📋 Después de ejecutar esta migración:

1. Ejecutar script de limpieza de ISI:
   node scripts/cleanup-isi-company-modules.js

2. Verificar que en company_modules de ISI NO estén:
   - ai-assistant (es web-widget, no tarjeta)
   - company-email-process (movido a admin)
   - company-account (movido a admin)

3. Verificar v_modules_by_panel:
   SELECT module_key, target_panel, show_as_card, commercial_type
   FROM v_modules_by_panel
   WHERE module_key IN ('ai-assistant', 'company-email-process', 'company-account');

   Resultado esperado:
   - ai-assistant: show_as_card = false
   - company-email-process: target_panel = 'panel-administrativo'
   - company-account: target_panel = 'panel-administrativo'
*/
