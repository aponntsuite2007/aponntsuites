-- Insertar módulos SIAC en system_modules

INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
VALUES
(gen_random_uuid(), 'clientes', 'Gestión de Clientes SIAC', 'Sistema integrado de administración comercial - Gestión completa de clientes con categorías, condiciones de IVA y historial comercial', '👥', '#3498db', 'additional', 3000, true, false, 30, '["Gestión de clientes", "Categorías comerciales", "Condiciones IVA", "Historial comercial", "Sesiones concurrentes"]', '["users"]', '1.0.0', 5, null, NOW(), NOW()),

(gen_random_uuid(), 'facturacion', 'Facturación SIAC', 'Sistema integrado de administración comercial - Facturación completa con aislamiento temporal y sesiones concurrentes', '💳', '#e67e22', 'additional', 3500, true, false, 31, '["Facturación completa", "Sesiones temporales", "Aislamiento de datos", "20+ usuarios concurrentes", "Confirmación de facturas"]', '["users", "clientes"]', '1.0.0', 5, null, NOW(), NOW())

ON CONFLICT (module_key) DO NOTHING;