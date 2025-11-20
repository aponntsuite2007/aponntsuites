-- ===============================================================
-- MIGRACIÓN: Crear Tabla vendor_statistics
-- ===============================================================
-- Fecha: 2025-01-19
-- Propósito: Tabla con estadísticas consolidadas de vendedores
-- Actualizada automáticamente por triggers
-- ===============================================================

-- Crear tabla vendor_statistics
CREATE TABLE IF NOT EXISTS vendor_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relación con vendedor
    vendor_id UUID NOT NULL REFERENCES aponnt_staff(id) ON DELETE CASCADE,

    -- Empresas asignadas
    total_companies INTEGER DEFAULT 0,
    sales_companies INTEGER DEFAULT 0,         -- Empresas donde es vendedor de venta
    support_companies INTEGER DEFAULT 0,       -- Empresas donde es vendedor de soporte

    -- Usuarios gestionados
    total_users INTEGER DEFAULT 0,
    sales_users INTEGER DEFAULT 0,             -- Usuarios de empresas de venta
    support_users INTEGER DEFAULT 0,           -- Usuarios de empresas de soporte

    -- Comisiones de Venta
    sales_commission_percentage DECIMAL(5,2) DEFAULT 10.00,  -- % comisión permanente
    total_sales_commission_usd DECIMAL(12,2) DEFAULT 0.00,  -- Total acumulado en USD
    monthly_sales_commission_usd DECIMAL(12,2) DEFAULT 0.00, -- Comisión del mes actual

    -- Comisiones de Soporte
    support_commission_percentage DECIMAL(5,2) DEFAULT 0.00,  -- % comisión temporal
    total_support_commission_usd DECIMAL(12,2) DEFAULT 0.00,  -- Total acumulado en USD
    monthly_support_commission_usd DECIMAL(12,2) DEFAULT 0.00, -- Comisión del mes actual

    -- Referidos (vendedores que trajo)
    total_referrals INTEGER DEFAULT 0,
    referral_commission_usd DECIMAL(12,2) DEFAULT 0.00,  -- Comisión por referidos

    -- Totales generales
    grand_total_commission_usd DECIMAL(12,2) DEFAULT 0.00,  -- Suma de todas las comisiones
    total_modules_value_usd DECIMAL(12,2) DEFAULT 0.00,     -- Valor total de módulos vendidos

    -- Calificación y desempeño
    rating DECIMAL(3,1) DEFAULT 0.0,           -- Rating promedio (0-5)
    total_ratings INTEGER DEFAULT 0,            -- Cantidad de calificaciones recibidas

    -- Datos bancarios (movido aquí desde companies)
    cbu VARCHAR(22),                            -- CBU del vendedor

    -- Timestamps
    last_updated_at TIMESTAMP DEFAULT NOW(),    -- Última actualización de estadísticas
    created_at TIMESTAMP DEFAULT NOW(),

    -- Constraint único
    CONSTRAINT vendor_statistics_vendor_id_unique UNIQUE(vendor_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vendor_statistics_vendor_id ON vendor_statistics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_statistics_grand_total ON vendor_statistics(grand_total_commission_usd DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_statistics_rating ON vendor_statistics(rating DESC);

-- ===============================================================
-- FUNCIÓN: Recalcular Estadísticas de Vendedor
-- ===============================================================

CREATE OR REPLACE FUNCTION refresh_vendor_statistics(p_vendor_id UUID)
RETURNS VOID AS $$
DECLARE
    v_sales_companies INTEGER;
    v_support_companies INTEGER;
    v_sales_users INTEGER;
    v_support_users INTEGER;
    v_total_sales_usd DECIMAL(12,2);
    v_total_support_usd DECIMAL(12,2);
    v_total_modules_value DECIMAL(12,2);
BEGIN
    -- Contar empresas de venta
    SELECT COUNT(*) INTO v_sales_companies
    FROM companies
    WHERE assigned_vendor_id = p_vendor_id AND is_active = true;

    -- Contar empresas de soporte
    SELECT COUNT(*) INTO v_support_companies
    FROM companies
    WHERE support_vendor_id = p_vendor_id AND is_active = true;

    -- Contar usuarios de ventas
    SELECT COALESCE(SUM(u.total_users), 0) INTO v_sales_users
    FROM companies c
    LEFT JOIN (
        SELECT company_id, COUNT(*) as total_users
        FROM users
        GROUP BY company_id
    ) u ON c.company_id = u.company_id
    WHERE c.assigned_vendor_id = p_vendor_id AND c.is_active = true;

    -- Contar usuarios de soporte
    SELECT COALESCE(SUM(u.total_users), 0) INTO v_support_users
    FROM companies c
    LEFT JOIN (
        SELECT company_id, COUNT(*) as total_users
        FROM users
        GROUP BY company_id
    ) u ON c.company_id = u.company_id
    WHERE c.support_vendor_id = p_vendor_id AND c.is_active = true;

    -- Calcular comisiones de venta (suma de sales_commission_usd de todas las empresas)
    SELECT COALESCE(SUM(sales_commission_usd), 0) INTO v_total_sales_usd
    FROM companies
    WHERE assigned_vendor_id = p_vendor_id AND is_active = true;

    -- Calcular comisiones de soporte
    SELECT COALESCE(SUM(support_commission_usd), 0) INTO v_total_support_usd
    FROM companies
    WHERE support_vendor_id = p_vendor_id AND is_active = true;

    -- Calcular valor total de módulos (suma de monthly_total)
    SELECT COALESCE(SUM(monthly_total), 0) INTO v_total_modules_value
    FROM companies
    WHERE (assigned_vendor_id = p_vendor_id OR support_vendor_id = p_vendor_id)
    AND is_active = true;

    -- Actualizar o insertar en vendor_statistics
    INSERT INTO vendor_statistics (
        vendor_id,
        sales_companies,
        support_companies,
        total_companies,
        sales_users,
        support_users,
        total_users,
        total_sales_commission_usd,
        monthly_sales_commission_usd,
        total_support_commission_usd,
        monthly_support_commission_usd,
        grand_total_commission_usd,
        total_modules_value_usd,
        last_updated_at
    ) VALUES (
        p_vendor_id,
        v_sales_companies,
        v_support_companies,
        v_sales_companies + v_support_companies,
        v_sales_users,
        v_support_users,
        v_sales_users + v_support_users,
        v_total_sales_usd,
        v_total_sales_usd,  -- Por ahora igual, después se puede filtrar por mes
        v_total_support_usd,
        v_total_support_usd,
        v_total_sales_usd + v_total_support_usd,
        v_total_modules_value,
        NOW()
    )
    ON CONFLICT (vendor_id) DO UPDATE SET
        sales_companies = EXCLUDED.sales_companies,
        support_companies = EXCLUDED.support_companies,
        total_companies = EXCLUDED.total_companies,
        sales_users = EXCLUDED.sales_users,
        support_users = EXCLUDED.support_users,
        total_users = EXCLUDED.total_users,
        total_sales_commission_usd = EXCLUDED.total_sales_commission_usd,
        monthly_sales_commission_usd = EXCLUDED.monthly_sales_commission_usd,
        total_support_commission_usd = EXCLUDED.total_support_commission_usd,
        monthly_support_commission_usd = EXCLUDED.monthly_support_commission_usd,
        grand_total_commission_usd = EXCLUDED.grand_total_commission_usd,
        total_modules_value_usd = EXCLUDED.total_modules_value_usd,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ===============================================================
-- TRIGGER: Auto-actualizar estadísticas cuando cambia companies
-- ===============================================================

CREATE OR REPLACE FUNCTION update_vendor_statistics_on_company_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular estadísticas del vendedor de venta
    IF NEW.assigned_vendor_id IS NOT NULL THEN
        PERFORM refresh_vendor_statistics(NEW.assigned_vendor_id);
    END IF;

    -- Recalcular estadísticas del vendedor de soporte
    IF NEW.support_vendor_id IS NOT NULL THEN
        PERFORM refresh_vendor_statistics(NEW.support_vendor_id);
    END IF;

    -- Si cambió el vendedor, recalcular para el vendedor anterior también
    IF TG_OP = 'UPDATE' THEN
        IF OLD.assigned_vendor_id IS NOT NULL AND OLD.assigned_vendor_id != NEW.assigned_vendor_id THEN
            PERFORM refresh_vendor_statistics(OLD.assigned_vendor_id);
        END IF;
        IF OLD.support_vendor_id IS NOT NULL AND OLD.support_vendor_id != NEW.support_vendor_id THEN
            PERFORM refresh_vendor_statistics(OLD.support_vendor_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vendor_stats_on_company ON companies;

CREATE TRIGGER trigger_update_vendor_stats_on_company
    AFTER INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_statistics_on_company_change();
