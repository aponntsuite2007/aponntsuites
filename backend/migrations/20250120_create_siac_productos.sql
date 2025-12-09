/**
 * MIGRACIÓN: siac_productos (Padrón de Productos/Servicios)
 *
 * Tabla multi-tenant para catálogo de productos y servicios.
 * Usada tanto por Aponnt (módulos comerciales) como por empresas (sus productos/servicios).
 *
 * USOS:
 * - Aponnt: Módulos del sistema (users, attendance, payroll, etc.) con pricing
 * - Empresas: Productos/servicios que venden a SUS clientes
 *
 * Created: 2025-01-20
 */

-- Crear tabla siac_productos
CREATE TABLE IF NOT EXISTS siac_productos (
    id SERIAL PRIMARY KEY,

    -- Multi-tenant
    company_id INTEGER NOT NULL,
    -- company_id = 1 (Aponnt) → Módulos comerciales del sistema
    -- company_id > 1 → Productos/servicios de cada empresa

    -- Identificación del producto/servicio
    codigo VARCHAR(50),
    -- Ejemplos: "MOD-USERS", "MOD-ATTENDANCE", "SERV-LIMPIEZA-BAÑOS"

    nombre VARCHAR(255) NOT NULL,
    -- Ejemplos: "Módulo de Usuarios", "Servicio de Limpieza Mensual"

    descripcion TEXT,

    -- Tipo de producto
    tipo VARCHAR(50) DEFAULT 'SERVICIO',
    -- SERVICIO, PRODUCTO, BUNDLE, MODULO

    -- Pricing
    precio_unitario DECIMAL(15,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'USD',
    -- USD, ARS, EUR, etc.

    -- Categoría (opcional)
    categoria VARCHAR(100),
    -- Ejemplos: "RRHH", "OPERACIONES", "SEGURIDAD", "LIMPIEZA"

    -- Estado
    activo BOOLEAN DEFAULT TRUE,

    -- Metadata adicional (flexible)
    metadata JSONB DEFAULT '{}',
    -- Puede contener: bundle_modules (si es bundle), requirements, etc.

    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT fk_siac_productos_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_codigo_per_company
        UNIQUE (company_id, codigo)
);

-- Índices
CREATE INDEX idx_siac_productos_company ON siac_productos(company_id);
CREATE INDEX idx_siac_productos_activo ON siac_productos(activo);
CREATE INDEX idx_siac_productos_tipo ON siac_productos(tipo);
CREATE INDEX idx_siac_productos_codigo ON siac_productos(codigo);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_siac_productos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_siac_productos_timestamp
    BEFORE UPDATE ON siac_productos
    FOR EACH ROW
    EXECUTE FUNCTION update_siac_productos_timestamp();

-- Comentarios
COMMENT ON TABLE siac_productos IS 'Padrón de productos y servicios multi-tenant. Usado por Aponnt (módulos comerciales) y empresas (catálogo de productos/servicios).';
COMMENT ON COLUMN siac_productos.company_id IS 'company_id = 1 (Aponnt módulos), company_id > 1 (productos de empresas)';
COMMENT ON COLUMN siac_productos.codigo IS 'Código único del producto dentro de la empresa (ej: MOD-USERS, SERV-001)';
COMMENT ON COLUMN siac_productos.tipo IS 'SERVICIO | PRODUCTO | BUNDLE | MODULO';
COMMENT ON COLUMN siac_productos.metadata IS 'JSONB flexible para bundle_modules, requirements, etc.';

-- Datos iniciales: Módulos comerciales de Aponnt (company_id = 1)
-- Estos corresponden a los módulos que Aponnt vende a las empresas
INSERT INTO siac_productos (company_id, codigo, nombre, descripcion, tipo, precio_unitario, moneda, categoria, metadata) VALUES
(1, 'MOD-USERS', 'Módulo de Usuarios', 'Gestión completa de usuarios y permisos', 'MODULO', 25.00, 'USD', 'RRHH', '{"module_key": "users"}'),
(1, 'MOD-ATTENDANCE', 'Módulo de Asistencia', 'Control de asistencia biométrico', 'MODULO', 300.00, 'USD', 'OPERACIONES', '{"module_key": "attendance"}'),
(1, 'MOD-PAYROLL', 'Módulo de Liquidación de Sueldos', 'Liquidación de sueldos con recibos digitales', 'MODULO', 450.00, 'USD', 'RRHH', '{"module_key": "payroll-liquidation"}'),
(1, 'MOD-MEDICAL', 'Módulo de Servicio Médico', 'Gestión de servicio médico empresarial', 'MODULO', 280.00, 'USD', 'SALUD', '{"module_key": "medical-service"}'),
(1, 'MOD-NOTIFICATIONS', 'Módulo de Notificaciones Enterprise', 'Sistema de notificaciones push y email', 'MODULO', 150.00, 'USD', 'COMUNICACIONES', '{"module_key": "notifications-enterprise"}'),
(1, 'BUNDLE-RRHH', 'Bundle RRHH Completo', 'Incluye: Usuarios + Asistencia + Liquidación de Sueldos', 'BUNDLE', 700.00, 'USD', 'RRHH', '{"bundle_modules": ["users", "attendance", "payroll-liquidation"], "discount_percentage": 10}'),
(1, 'BUNDLE-EMPRESA-COMPLETO', 'Bundle Empresa Completo', 'Todos los módulos core del sistema', 'BUNDLE', 1800.00, 'USD', 'GENERAL', '{"bundle_modules": ["users", "attendance", "payroll-liquidation", "medical-service", "notifications-enterprise"], "discount_percentage": 15}');

COMMIT;
