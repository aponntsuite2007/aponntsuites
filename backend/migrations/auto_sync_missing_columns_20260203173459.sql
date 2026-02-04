-- ============================================================================
-- MIGRACIÓN AUTO-GENERADA: Sincronización de Schema LOCAL → RENDER
-- ============================================================================
-- Generado: 2026-02-03T17:34:59.262Z
-- Columnas faltantes: 57
-- Tablas faltantes: 0
-- ============================================================================

-- IMPORTANTE: Revisar antes de ejecutar en producción
-- Algunas columnas NOT NULL tienen defaults temporales

BEGIN;

-- ============================================================================
-- PARTE 1: AGREGAR COLUMNAS FALTANTES A TABLAS EXISTENTES
-- ============================================================================

-- Tabla: aponnt_staff
ALTER TABLE "aponnt_staff" ADD COLUMN IF NOT EXISTS "password" VARCHAR(255) DEFAULT NULL;
ALTER TABLE "aponnt_staff" ADD COLUMN IF NOT EXISTS "username" VARCHAR(100) DEFAULT NULL;
ALTER TABLE "aponnt_staff" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP;
ALTER TABLE "aponnt_staff" ADD COLUMN IF NOT EXISTS "first_login" BOOLEAN DEFAULT true;
ALTER TABLE "aponnt_staff" ADD COLUMN IF NOT EXISTS "biometric_enabled" BOOLEAN DEFAULT false;
ALTER TABLE "aponnt_staff" ADD COLUMN IF NOT EXISTS "dni" VARCHAR(50) DEFAULT NULL;

-- Tabla: audit_logs
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_id" UUID;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "action" VARCHAR(100) DEFAULT '';
-- NOTA: "audit_logs"."action" debería ser NOT NULL, revisar manualmente;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "module_id" VARCHAR(50);
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_type" VARCHAR(50);
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_id" VARCHAR(100);
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "old_values" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "new_values" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ip_address" INET;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "session_id" VARCHAR(100);
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "success" BOOLEAN DEFAULT true;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now();

-- Tabla: companies
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "onboarding_manual" BOOLEAN DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "onboarding_manual_reason" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "onboarding_manual_by" VARCHAR(50);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "onboarding_manual_at" TIMESTAMP;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "status_manual" BOOLEAN DEFAULT false;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "status_manual_reason" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "status_manual_by" VARCHAR(50);
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "status_manual_at" TIMESTAMP;

-- Tabla: notification_templates
ALTER TABLE "notification_templates" ADD COLUMN IF NOT EXISTS "workflow_key" VARCHAR(100) DEFAULT '';
-- NOTA: "notification_templates"."workflow_key" debería ser NOT NULL, revisar manualmente;
ALTER TABLE "notification_templates" ADD COLUMN IF NOT EXISTS "channels" JSONB DEFAULT '["email", "inbox"]';
ALTER TABLE "notification_templates" ADD COLUMN IF NOT EXISTS "priority" VARCHAR(20) DEFAULT 'normal';
ALTER TABLE "notification_templates" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);

-- Tabla: notification_workflows
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "process_key" VARCHAR(100) DEFAULT '';
-- NOTA: "notification_workflows"."process_key" debería ser NOT NULL, revisar manualmente;
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "process_name" VARCHAR(255) DEFAULT '';
-- NOTA: "notification_workflows"."process_name" debería ser NOT NULL, revisar manualmente;
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "scope" VARCHAR(20) DEFAULT 'aponnt';
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "workflow_steps" JSONB DEFAULT '{"steps": []}';
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "channels" JSONB DEFAULT '["email"]';
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "primary_channel" VARCHAR(20) DEFAULT 'email';
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "requires_response" BOOLEAN DEFAULT false;
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "response_type" VARCHAR(20);
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "response_options" JSONB;
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "response_timeout_hours" INTEGER DEFAULT 48;
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "auto_action_on_timeout" VARCHAR(50);
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "priority" VARCHAR(20) DEFAULT 'medium';
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "sla_delivery_minutes" INTEGER;
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "sla_response_hours" INTEGER;
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "email_template_key" VARCHAR(100);
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "whatsapp_template_key" VARCHAR(100);
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "sms_template_key" VARCHAR(100);
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "push_template_key" VARCHAR(100);
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "recipient_type" VARCHAR(20);
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "recipient_rules" JSONB;
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "email_config_source" VARCHAR(20) DEFAULT 'process_mapping';
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "email_type" VARCHAR(50);
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "notification_workflows" ADD COLUMN IF NOT EXISTS "updated_by" UUID;

-- Tabla: unified_notifications
ALTER TABLE "unified_notifications" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP;
ALTER TABLE "unified_notifications" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN DEFAULT false;

COMMIT;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
