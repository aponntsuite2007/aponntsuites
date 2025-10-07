-- Script de datos iniciales para desarrollo/testing
-- Sistema de Asistencia Biométrico

-- Insertar empresa de prueba si no existe
INSERT INTO companies (
  name, slug, display_name, legal_name,
  email, phone, address, city, country,
  tax_id, license_type, subscription_type,
  max_employees, contracted_employees,
  is_active, status
) VALUES (
  'Empresa Demo',
  'empresa-demo',
  'Empresa Demostración',
  'Empresa Demo S.A.',
  'demo@aponntsuites.com',
  '+54 11 4000-0000',
  'Av. Corrientes 1000',
  'Buenos Aires',
  'Argentina',
  '20-12345678-9',
  'professional',
  'professional',
  100,
  50,
  true,
  'active'
) ON CONFLICT (slug) DO NOTHING;

-- Insertar módulos del sistema básicos si no existen
INSERT INTO system_modules (module_key, name, description, category, base_price, is_active, is_core, display_order, rubro) VALUES
  ('users', 'Gestión de Usuarios', 'Administración de empleados y usuarios del sistema', 'core', 0.50, true, true, 1, 'Core'),
  ('attendance', 'Control de Asistencia', 'Registro y control de asistencia de empleados', 'core', 1.00, true, true, 2, 'Core'),
  ('biometric', 'Autenticación Biométrica', 'Sistema de autenticación por huella digital y facial', 'security', 2.00, true, false, 3, 'Seguridad'),
  ('departments', 'Departamentos', 'Gestión de departamentos y áreas', 'core', 0.75, true, false, 4, 'Core'),
  ('shifts', 'Turnos', 'Gestión de turnos y horarios', 'core', 0.75, true, false, 5, 'Core'),
  ('reports', 'Reportes', 'Generación de reportes y estadísticas', 'core', 1.50, true, false, 6, 'Core'),
  ('medical', 'Gestión Médica', 'Control médico y certificados', 'medical', 3.00, true, false, 7, 'Medicina Laboral'),
  ('gps_tracking', 'Seguimiento GPS', 'Rastreo de ubicación de empleados', 'additional', 2.50, true, false, 8, 'Adicionales')
ON CONFLICT (module_key) DO NOTHING;

-- Crear usuario administrador de prueba (contraseña: admin123)
-- Hash bcrypt de 'admin123': $2b$10$rIVkUxqV1d7xWvL5Y1k5K.vY8l5vTH5vC5vY5vY5vY5vY5vY5vY5u
INSERT INTO users (
  "employeeId", legajo, usuario,
  "firstName", "lastName",
  email, phone, password, role,
  company_id, is_active
)
SELECT
  'ADMIN001',
  'LEG001',
  'admin',
  'Administrador',
  'Sistema',
  'admin@aponntsuites.com',
  '+54 11 4000-0001',
  '$2b$10$rIVkUxqV1d7xWvL5Y1k5K.vY8l5vTH5vC5vY5vY5vY5vY5vY5vY5u',
  'super_admin',
  company_id,
  true
FROM companies
WHERE slug = 'empresa-demo'
ON CONFLICT ("employeeId") DO NOTHING;

-- Asociar módulos core a la empresa demo
INSERT INTO company_modules (company_id, system_module_id, is_active, contracted_price, employee_tier)
SELECT
  c.company_id,
  sm.id,
  true,
  sm.base_price,
  '1-50'
FROM companies c
CROSS JOIN system_modules sm
WHERE c.slug = 'empresa-demo'
  AND sm.is_core = true
ON CONFLICT (company_id, system_module_id) DO NOTHING;

-- Crear departamento de prueba
INSERT INTO departments (name, description, company_id, is_active)
SELECT
  'Administración',
  'Departamento administrativo',
  company_id,
  true
FROM companies
WHERE slug = 'empresa-demo'
ON CONFLICT DO NOTHING;

-- Crear turno de prueba
INSERT INTO shifts (name, start_time, end_time, company_id, is_active)
SELECT
  'Turno Mañana',
  '08:00:00',
  '16:00:00',
  company_id,
  true
FROM companies
WHERE slug = 'empresa-demo'
ON CONFLICT DO NOTHING;

-- Crear kiosk de prueba
INSERT INTO kiosks (name, location, company_id, is_active)
SELECT
  'Kiosk Principal',
  'Recepción',
  company_id,
  true
FROM companies
WHERE slug = 'empresa-demo'
ON CONFLICT DO NOTHING;
