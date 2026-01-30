-- =====================================================
-- MIGRACIÓN: Crear rol SADMIN (Super Administrador)
-- Fecha: 2026-01-27
-- Descripción: Rol con level -1, por encima de GG (level 0)
-- =====================================================

-- 1. Crear el rol SADMIN
INSERT INTO aponnt_staff_roles (role_code, role_name, role_name_i18n, role_area, level, is_sales_role, is_country_specific, reports_to_role_code, description, responsibilities)
VALUES (
  'SADMIN',
  'Super Administrador',
  '{
    "es": "Super Administrador",
    "en": "Super Administrator",
    "pt": "Super Administrador",
    "fr": "Super Administrateur",
    "de": "Super Administrator",
    "it": "Super Amministratore"
  }'::jsonb,
  'direccion',
  -1,
  false,
  false,
  NULL,
  'Máximo nivel de acceso al sistema. Control total sobre la plataforma Aponnt.',
  '["Acceso total al sistema", "Gestión de roles y permisos globales", "Operaciones críticas de plataforma", "Supervisión de todos los niveles"]'::jsonb
) ON CONFLICT (role_code) DO NOTHING;

-- 2. Asignar rol SADMIN al admin (admin@aponnt.com)
UPDATE aponnt_staff
SET role_id = (SELECT role_id FROM aponnt_staff_roles WHERE role_code = 'SADMIN'),
    level = -1
WHERE staff_id = '7a06ce1a-a7d5-4feb-a46a-21eb86b2aa3a';
