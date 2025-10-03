-- Insertar módulos faltantes en system_modules

INSERT INTO system_modules (id, module_key, name, description, icon, color, category, base_price, is_active, is_core, display_order, features, requirements, version, min_employees, max_employees, created_at, updated_at)
VALUES
(gen_random_uuid(), 'psychological-assessment', 'Evaluación Psicológica', 'Sistema de evaluación psicológica integral con detección de estrés y violencia', '🧠', '#9b59b6', 'medical', 2500, true, false, 25, '["Evaluación de estrés", "Detección de violencia", "Reportes psicológicos", "Alertas automáticas"]', '["medical-dashboard"]', '1.0.0', 10, null, NOW(), NOW()),

(gen_random_uuid(), 'sanctions-management', 'Gestión de Sanciones', 'Sistema completo de gestión disciplinaria y sanciones', '⚖️', '#e74c3c', 'additional', 1800, true, false, 26, '["Registro de infracciones", "Escalamiento automático", "Historial disciplinario", "Notificaciones"]', '["users", "notifications"]', '1.0.0', 5, null, NOW(), NOW()),

(gen_random_uuid(), 'vacation-management', 'Gestión de Vacaciones', 'Sistema integral de gestión de vacaciones y licencias con programación automática', '🏖️', '#27ae60', 'additional', 2200, true, false, 27, '["Solicitudes web y móvil", "Programación automática", "Matriz de compatibilidad", "Licencias extraordinarias"]', '["users", "notifications"]', '1.0.0', 5, null, NOW(), NOW())

ON CONFLICT (module_key) DO NOTHING;