/**
 * Add 'e2e' value to audit_log_test_type enum
 * Para E2ECollector - Tests de experiencia de usuario completa
 * Date: 2025-10-22
 */

-- Agregar 'e2e' al enum test_type
ALTER TYPE audit_log_test_type ADD VALUE IF NOT EXISTS 'e2e';

-- Nota: E2E = End-to-End testing desde perspectiva del usuario
-- Tests incluyen CRUD completo, file uploads, notificaciones, approval flows
