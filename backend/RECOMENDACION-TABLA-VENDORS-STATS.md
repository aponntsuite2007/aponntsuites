# 📊 RECOMENDACIÓN - TABLA DE ESTADÍSTICAS DE VENDEDORES

**Fecha**: 2025-01-19
**Contexto**: Modal de Editar Empresas + Listado de Vendedores

---

## 🎯 PROBLEMA A RESOLVER

Actualmente, en el **modal de editar empresas** se calculan y muestran:
- `salesCommissionUSD` - Comisión por venta en USD (calculada automáticamente)
- `supportCommissionUSD` - Comisión por soporte en USD (calculada automáticamente)

Y en el **listado de vendedores** se muestran columnas con datos que NO existen en ninguna tabla:
- Cantidad de empresas (ventas/soporte)
- Cantidad de usuarios (ventas/soporte)
- Porcentajes y montos de comisiones
- Cantidad de referidos
- Total general de comisiones
- Valor total de módulos
- Rating

**Necesitamos una tabla que consolide toda esta información.**

---

## ✅ SOLUCIÓN PROPUESTA: Tabla `vendor_statistics`

Esta tabla guarda **estadísticas consolidadas** de cada vendedor, actualizadas en tiempo real.

### **Estructura de Tabla**

```sql
CREATE TABLE vendor_statistics (
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

    -- Índices
    CONSTRAINT vendor_statistics_vendor_id_unique UNIQUE(vendor_id)
);

CREATE INDEX idx_vendor_statistics_vendor_id ON vendor_statistics(vendor_id);
CREATE INDEX idx_vendor_statistics_grand_total ON vendor_statistics(grand_total_commission_usd DESC);
CREATE INDEX idx_vendor_statistics_rating ON vendor_statistics(rating DESC);
```

---

## 📝 DESCRIPCIÓN DE CAMPOS

### **Empresas y Usuarios**
- `total_companies`: Total de empresas asignadas (venta + soporte)
- `sales_companies`: Empresas donde es vendedor de VENTA (`companies.assigned_vendor_id`)
- `support_companies`: Empresas donde es vendedor de SOPORTE (`companies.support_vendor_id`)
- `total_users`, `sales_users`, `support_users`: Usuarios de esas empresas

### **Comisiones**
- `sales_commission_percentage`: % permanente (ej: 10%)
- `support_commission_percentage`: % temporal (ej: 5%)
- `total_sales_commission_usd`: **Suma histórica** de todas las comisiones por venta
- `monthly_sales_commission_usd`: **Solo del mes actual** (se resetea cada mes)
- Lo mismo para soporte

### **Referidos**
- `total_referrals`: Cantidad de vendedores que refirió
- `referral_commission_usd`: Comisión por traer nuevos vendedores

### **Totales**
- `grand_total_commission_usd`: **SUMA de todas las comisiones** (venta + soporte + referidos)
- `total_modules_value_usd`: Valor total de los módulos contratados por sus empresas

---

## 🔄 ACTUALIZACIÓN DE ESTADÍSTICAS

### **Triggers para actualizar automáticamente**

#### 1. Cuando se crea/actualiza una empresa
```sql
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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vendor_stats_on_company
    AFTER INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_statistics_on_company_change();
```

#### 2. Función para recalcular estadísticas completas
```sql
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
    ) u ON c.id = u.company_id
    WHERE c.assigned_vendor_id = p_vendor_id AND c.is_active = true;

    -- Contar usuarios de soporte
    SELECT COALESCE(SUM(u.total_users), 0) INTO v_support_users
    FROM companies c
    LEFT JOIN (
        SELECT company_id, COUNT(*) as total_users
        FROM users
        GROUP BY company_id
    ) u ON c.id = u.company_id
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
```

---

## 🔗 MODIFICACIONES EN TABLA `companies`

Agregar campos que faltaban:

```sql
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS sales_commission_usd DECIMAL(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS support_commission_usd DECIMAL(12,2) DEFAULT 0.00;

-- Índices
CREATE INDEX IF NOT EXISTS idx_companies_assigned_vendor ON companies(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_companies_support_vendor ON companies(support_vendor_id);
```

---

## 📊 CÓMO SE USA EN EL FRONTEND

### **Modal de Editar Empresas**

```javascript
// Al editar empresa:
document.getElementById('salesCommissionUSD').value = `$${company.sales_commission_usd.toFixed(2)}`;
document.getElementById('supportCommissionUSD').value = `$${company.support_commission_usd.toFixed(2)}`;

// Al guardar empresa (ya implementado):
companyData.salesCommissionUSD = parseFloat(...);  // Se guarda en companies.sales_commission_usd
companyData.supportCommissionUSD = parseFloat(...);  // Se guarda en companies.support_commission_usd
```

### **Listado de Vendedores**

```javascript
// Obtener estadísticas del vendedor desde API
GET /api/vendors/:id/statistics

// Respuesta:
{
    "vendor_id": "uuid-here",
    "total_companies": 15,
    "sales_companies": 10,
    "support_companies": 5,
    "total_users": 150,
    "sales_users": 100,
    "support_users": 50,
    "sales_commission_percentage": 10.0,
    "total_sales_commission_usd": 15000.00,
    "monthly_sales_commission_usd": 1200.00,
    "support_commission_percentage": 5.0,
    "total_support_commission_usd": 3000.00,
    "monthly_support_commission_usd": 250.00,
    "grand_total_commission_usd": 18000.00,
    "total_modules_value_usd": 180000.00,
    "rating": 4.5,
    "cbu": "1234567890123456789012"
}

// Renderizar en tabla:
<td>
    ${stats.sales_companies} ventas<br>
    ${stats.support_companies} soporte
</td>
<td>
    ${stats.sales_commission_percentage}%<br>
    $${stats.monthly_sales_commission_usd.toFixed(2)}
</td>
<td>
    ${stats.support_commission_percentage}%<br>
    $${stats.monthly_support_commission_usd.toFixed(2)}
</td>
<td>$${stats.grand_total_commission_usd.toFixed(2)}</td>
```

---

## 🎯 VENTAJAS DE ESTA SOLUCIÓN

1. ✅ **Performance**: Datos pre-calculados, consultas rápidas
2. ✅ **Consistencia**: Triggers mantienen sincronización automática
3. ✅ **Escalabilidad**: Fácil agregar nuevas métricas
4. ✅ **Auditoría**: Historial de cambios con `last_updated_at`
5. ✅ **Flexibilidad**: Permite cálculos mensuales, anuales, históricos

---

## 📁 ARCHIVOS MODIFICADOS (FRONTEND)

- `panel-administrativo.html:4393-4421` - Grid de comisiones con USD
- `panel-administrativo.html:6105-6107` - Carga de comisiones USD
- `panel-administrativo.html:6530-6547` - Cálculo automático de comisiones
- `panel-administrativo.html:6656-6657` - Guardado de comisiones USD

---

## 🚀 PRÓXIMOS PASOS

1. **Backend implementa**:
   - Crear tabla `vendor_statistics`
   - Agregar campos a `companies` (`sales_commission_usd`, `support_commission_usd`)
   - Crear triggers y función `refresh_vendor_statistics()`
   - Crear endpoint `GET /api/vendors/:id/statistics`

2. **Frontend (ya listo)**:
   - Modal de empresas calcula comisiones automáticamente ✅
   - Guarda `salesCommissionUSD` y `supportCommissionUSD` ✅
   - Carga valores al editar ✅

3. **Listado de vendedores** (pendiente):
   - Modificar para consumir API `GET /api/vendors/:id/statistics`
   - Mostrar datos reales en lugar de hardcodeados

---

**FIN DE RECOMENDACIÓN** 🎉
