/**
 * Insertar documentación de SYNAPSE Migration en BD
 */

INSERT INTO synapse_documentation (doc_key, title, category, content, summary, tags, created_by) VALUES
(
  'migration-phase4-to-synapse',
  'SYNAPSE Migration - Limpieza Phase4TestOrchestrator',
  'migration',
  E'# SYNAPSE MIGRATION - Limpieza Completa de Phase4TestOrchestrator\n\n**Fecha**: 2025-12-26\n**Tipo**: Migración crítica + Limpieza de ~20,000 líneas de código obsoleto\n\n## Archivos Eliminados\n\n### 1. Core (10,000 líneas)\n- Phase4TestOrchestrator.js (8,897 líneas)\n- autoHealingRoutes.js (~200 líneas)\n- auditorPhase4Routes.js (~300 líneas)\n\n### 2. Collectors Obsoletos (21 archivos, ~8,000 líneas)\n\nEliminados porque solo eran usados por Phase4TestOrchestrator.\n\n### 3. Directorio biometric/ (4 archivos)\n\n## Migración\n\n### auto-healing-dashboard.js\n\n**ANTES**: `/api/auto-healing/run` (Phase4TestOrchestrator)\n**DESPUÉS**: `/api/testing/run-e2e-advanced` (SYNAPSE - Playwright)\n\n### server.js\n\nRutas comentadas con explicación de migración a SYNAPSE.\n\n## Impacto\n\n- ✅ ~20,000 líneas eliminadas (66% de /src/auditor/)\n- ✅ 26 archivos eliminados\n- ✅ 2 archivos modificados\n- ✅ 19 collectors activos (siguen funcionando)\n\n## SYNAPSE\n\nSistema nuevo que incluye:\n1. Playwright E2E (63 configs, 16 layers)\n2. Brain Integration\n3. Sistema Nervioso\n4. Auto-Healing\n\n## Regla de Oro\n\n❌ NO decir: "Phase4", "Puppeteer"\n✅ SÍ decir: "SYNAPSE"',
  'Documentación completa de la migración de Phase4TestOrchestrator a SYNAPSE. Elimina ~20,000 líneas de código obsoleto.',
  ARRAY['migration', 'synapse', 'phase4', 'cleanup', 'playwright'],
  'claude-code'
);

COMMIT;
