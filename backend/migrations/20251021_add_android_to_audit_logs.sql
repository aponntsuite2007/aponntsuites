/**
 * Add 'android' value to audit_log_test_type enum
 * Fix para AndroidKioskCollector
 * Date: 2025-10-21
 */

-- Agregar 'android' al enum test_type
ALTER TYPE audit_log_test_type ADD VALUE IF NOT EXISTS 'android';

-- Nota: En PostgreSQL 9.1+, los ENUMs se pueden extender con ADD VALUE
-- Si da error "already exists", significa que ya está agregado (OK)
