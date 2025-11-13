/**
 * ============================================================================
 * ACTUALIZACIÓN DEL SISTEMA DE CONCIENCIA
 * ============================================================================
 *
 * Registra los cambios realizados en esta sesión:
 * - Email verification obligatorio
 * - Arquitectura modular documentada
 * - Archivos innecesarios limpiados
 * - Documentos creados
 *
 * @version 1.0.0
 * @created 2025-11-01
 * ============================================================================
 */

-- ============================================================================
-- METADATA: Email Verification
-- ============================================================================

INSERT INTO system_metadata (metadata_key, metadata_value, metadata_type, description) VALUES
('email_verification_required', '"true"'::jsonb, 'config', 'Email verification es OBLIGATORIO para activar usuarios'),
('email_verification_link_format', '"http://localhost:9998/verify-email.html?token={token}"'::jsonb, 'config', 'Formato del link de verificación de email'),
('user_default_status', '"pending_verification"'::jsonb, 'config', 'Estado por defecto de nuevos usuarios (pending_verification hasta verificar email)')
ON CONFLICT (metadata_key) DO UPDATE
SET metadata_value = EXCLUDED.metadata_value,
    metadata_type = EXCLUDED.metadata_type,
    description = EXCLUDED.description;

-- ============================================================================
-- METADATA: Arquitectura Modular
-- ============================================================================

INSERT INTO system_metadata (metadata_key, metadata_value, metadata_type, description) VALUES
('total_main_modules', '19'::jsonb, 'config', 'Total de módulos principales con tarjeta en dashboard'),
('total_js_files', '66'::jsonb, 'config', 'Total de archivos .js en public/js/modules/ (incluye submódulos y helpers)'),
('module_architecture', '"main_module + submodules + helpers + integrations"'::jsonb, 'config', 'Arquitectura modular del sistema'),
('avg_files_per_module', '3.5'::jsonb, 'config', 'Promedio de archivos .js por módulo principal')
ON CONFLICT (metadata_key) DO UPDATE
SET metadata_value = EXCLUDED.metadata_value,
    metadata_type = EXCLUDED.metadata_type,
    description = EXCLUDED.description;

-- ============================================================================
-- METADATA: Archivos Externos
-- ============================================================================

INSERT INTO system_metadata (metadata_key, metadata_value, metadata_type, description) VALUES
('external_dependencies', '["postgresql", "nodejs", "ollama_optional"]'::jsonb, 'config', 'Dependencias externas del sistema'),
('imprescindible_directories', '["backend/src", "backend/public", "backend/node_modules", "backend/migrations", "backend/templates"]'::jsonb, 'config', 'Directorios imprescindibles para funcionamiento')
ON CONFLICT (metadata_key) DO UPDATE
SET metadata_value = EXCLUDED.metadata_value,
    metadata_type = EXCLUDED.metadata_type,
    description = EXCLUDED.description;

-- ============================================================================
-- LOGS DE CONCIENCIA
-- ============================================================================

INSERT INTO system_consciousness_log (event_type, result, message, event_data) VALUES
('feature_implemented', 'success', 'Email verification OBLIGATORIO implementado en creación de usuarios',
 jsonb_build_object(
   'module', 'email-verification',
   'requirement', 'mandatory_on_user_creation',
   'files_modified', 8,
   'tables_modified', 2,
   'migration', '20251101_add_email_verification_mandatory_fields.sql'
 )),

('architecture_documented', 'success', '19 módulos principales + 66 archivos JS explicados en ARQUITECTURA-MODULAR-EXPLICADA.md',
 jsonb_build_object(
   'main_modules', 19,
   'total_files', 66,
   'avg_files_per_module', 3.5,
   'doc', 'ARQUITECTURA-MODULAR-EXPLICADA.md'
 )),

('cleanup_executed', 'success', 'Archivos innecesarios eliminados - 1.13 GB liberados',
 jsonb_build_object(
   'space_freed_gb', 1.13,
   'files_deleted', ARRAY['OllamaSetup.exe', 'mysql-installer.msi', 'backup_files', 'bak_files']
 )),

('documentation_created', 'success', 'Documentos técnicos creados',
 jsonb_build_object(
   'documents', ARRAY[
     'ARCHIVOS-EXTERNOS-IMPRESCINDIBLES.md',
     'ARQUITECTURA-MODULAR-EXPLICADA.md'
   ],
   'total_docs', 2
 ));

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Mostrar metadata insertada
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM system_metadata
    WHERE metadata_key IN (
        'email_verification_required',
        'total_main_modules',
        'total_js_files',
        'avg_files_per_module',
        'external_dependencies',
        'imprescindible_directories'
    );

    RAISE NOTICE '========================================';
    RAISE NOTICE 'SISTEMA DE CONCIENCIA ACTUALIZADO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Metadata insertada: % registros', v_count;
    RAISE NOTICE 'Logs de conciencia: 4 eventos registrados';
    RAISE NOTICE '========================================';
END $$;
