/**
 * Script final para migración WMS Advanced & Enterprise
 */
const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function runMigration() {
    console.log('🏭 [WMS] Ejecutando migración final...\n');

    const client = new Client({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB || 'attendance_system'
    });

    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL');

        const sql = `
        -- ═══════════════════════════════════════════════════════════════════
        -- EXTENSIONES DE TABLAS EXISTENTES
        -- ═══════════════════════════════════════════════════════════════════
        ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS rotation_policy VARCHAR(10) DEFAULT 'FIFO';
        ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS storage_cost_per_m3_day DECIMAL(15,4) DEFAULT 0;
        ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS capital_cost_rate_annual DECIMAL(5,4) DEFAULT 0.12;
        ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS max_days_without_rotation INTEGER DEFAULT 90;
        ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS alert_days_before_expiry INTEGER DEFAULT 30;
        ALTER TABLE wms_warehouses ADD COLUMN IF NOT EXISTS require_approval_for_adjustments BOOLEAN DEFAULT true;

        ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS is_catch_weight BOOLEAN DEFAULT false;
        ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS nominal_weight DECIMAL(15,4);
        ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS is_serialized BOOLEAN DEFAULT false;
        ALTER TABLE wms_products ADD COLUMN IF NOT EXISTS volume_m3 DECIMAL(10,6);

        -- ═══════════════════════════════════════════════════════════════════
        -- NUEVAS TABLAS - WMS ADVANCED
        -- ═══════════════════════════════════════════════════════════════════

        -- Razones de ajuste
        CREATE TABLE IF NOT EXISTS wms_adjustment_reasons (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            code VARCHAR(20) NOT NULL,
            name VARCHAR(100) NOT NULL,
            adjustment_type VARCHAR(20) NOT NULL,
            requires_approval BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(company_id, code)
        );

        -- Trazabilidad completa
        CREATE TABLE IF NOT EXISTS wms_traceability_log (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            trace_code VARCHAR(50) NOT NULL UNIQUE,
            movement_type VARCHAR(30) NOT NULL,
            product_id INTEGER NOT NULL,
            batch_id INTEGER,
            serial_number VARCHAR(100),
            quantity DECIMAL(15,4) NOT NULL,
            from_warehouse_id INTEGER,
            to_warehouse_id INTEGER,
            from_location_id INTEGER,
            to_location_id INTEGER,
            unit_cost_at_movement DECIMAL(15,4),
            performed_by UUID,
            performed_at TIMESTAMPTZ DEFAULT NOW(),
            approved_by UUID,
            approved_at TIMESTAMPTZ,
            notes TEXT,
            metadata JSONB DEFAULT '{}'
        );

        -- Inventarios programados
        CREATE TABLE IF NOT EXISTS wms_inventory_schedules (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            schedule_code VARCHAR(30) NOT NULL,
            name VARCHAR(200) NOT NULL,
            inventory_type VARCHAR(30) NOT NULL,
            warehouse_id INTEGER,
            frequency VARCHAR(20) NOT NULL,
            tolerance_percentage DECIMAL(5,2) DEFAULT 2.0,
            requires_blind_count BOOLEAN DEFAULT false,
            require_approval BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true,
            next_execution_date TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Ejecuciones de inventario
        CREATE TABLE IF NOT EXISTS wms_inventory_executions (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            schedule_id INTEGER,
            execution_code VARCHAR(30) NOT NULL UNIQUE,
            status VARCHAR(20) DEFAULT 'PENDING',
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            total_products INTEGER DEFAULT 0,
            products_with_difference INTEGER DEFAULT 0,
            total_difference_value DECIMAL(15,2) DEFAULT 0,
            approved_by UUID,
            approved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Métricas de rotación (FIFO/LIFO/FEFO)
        CREATE TABLE IF NOT EXISTS wms_rotation_metrics (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            period_type VARCHAR(20) NOT NULL,
            opening_stock DECIMAL(15,4) DEFAULT 0,
            closing_stock DECIMAL(15,4) DEFAULT 0,
            average_stock DECIMAL(15,4) DEFAULT 0,
            total_receipts DECIMAL(15,4) DEFAULT 0,
            total_shipments DECIMAL(15,4) DEFAULT 0,
            inventory_turnover_ratio DECIMAL(10,4),
            days_inventory_outstanding DECIMAL(10,2),
            days_without_movement INTEGER DEFAULT 0,
            storage_cost DECIMAL(15,2) DEFAULT 0,
            capital_cost DECIMAL(15,2) DEFAULT 0,
            depreciation_cost DECIMAL(15,2) DEFAULT 0,
            total_holding_cost DECIMAL(15,2) DEFAULT 0,
            is_slow_moving BOOLEAN DEFAULT false,
            is_dead_stock BOOLEAN DEFAULT false,
            is_overstock BOOLEAN DEFAULT false,
            anomaly_score DECIMAL(5,2) DEFAULT 0,
            calculated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_id, warehouse_id, period_start, period_end, period_type)
        );

        -- Clasificación ABC/XYZ
        CREATE TABLE IF NOT EXISTS wms_abc_classification (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            warehouse_id INTEGER,
            abc_class CHAR(1),
            value_percentage DECIMAL(5,2),
            xyz_class CHAR(1),
            demand_cv DECIMAL(10,4),
            combined_class VARCHAR(2),
            recommended_reorder_policy VARCHAR(30),
            recommended_safety_stock DECIMAL(15,4),
            analysis_date DATE NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_id, warehouse_id, analysis_date)
        );

        -- Alertas de anomalías
        CREATE TABLE IF NOT EXISTS wms_anomaly_alerts (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            anomaly_type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) DEFAULT 'MEDIUM',
            product_id INTEGER NOT NULL,
            warehouse_id INTEGER,
            batch_id INTEGER,
            stock_quantity DECIMAL(15,4),
            stock_value DECIMAL(15,2),
            potential_loss DECIMAL(15,2),
            holding_cost_monthly DECIMAL(15,2),
            status VARCHAR(20) DEFAULT 'OPEN',
            recommended_action VARCHAR(50),
            detected_at TIMESTAMPTZ DEFAULT NOW(),
            resolved_at TIMESTAMPTZ,
            resolution_notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Configuración de reposición inteligente
        CREATE TABLE IF NOT EXISTS wms_replenishment_config (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            replenishment_method VARCHAR(30) DEFAULT 'MIN_MAX',
            min_stock DECIMAL(15,4),
            max_stock DECIMAL(15,4),
            reorder_point DECIMAL(15,4),
            reorder_quantity DECIMAL(15,4),
            safety_stock DECIMAL(15,4),
            service_level_target DECIMAL(5,2) DEFAULT 95.00,
            lead_time_days INTEGER DEFAULT 7,
            is_active BOOLEAN DEFAULT true,
            auto_generate_orders BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_id, warehouse_id)
        );

        -- Pronósticos de demanda
        CREATE TABLE IF NOT EXISTS wms_demand_forecasts (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            warehouse_id INTEGER,
            forecast_date DATE NOT NULL,
            forecast_period VARCHAR(20) NOT NULL,
            forecast_method VARCHAR(50),
            forecasted_quantity DECIMAL(15,4) NOT NULL,
            confidence_level DECIMAL(5,2),
            lower_bound DECIMAL(15,4),
            upper_bound DECIMAL(15,4),
            actual_quantity DECIMAL(15,4),
            forecast_error DECIMAL(15,4),
            mape DECIMAL(10,4),
            generated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(product_id, warehouse_id, forecast_date, forecast_period)
        );

        -- Sugerencias de reposición
        CREATE TABLE IF NOT EXISTS wms_replenishment_suggestions (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            suggestion_type VARCHAR(30) NOT NULL,
            priority VARCHAR(20) DEFAULT 'MEDIUM',
            current_stock DECIMAL(15,4),
            suggested_quantity DECIMAL(15,4),
            optimal_quantity DECIMAL(15,4),
            days_of_stock_current INTEGER,
            days_of_stock_after INTEGER,
            stockout_probability DECIMAL(5,2),
            estimated_order_cost DECIMAL(15,2),
            current_holding_cost_monthly DECIMAL(15,2),
            net_benefit DECIMAL(15,2),
            space_utilization_current DECIMAL(5,2),
            capital_efficiency_improvement DECIMAL(5,2),
            status VARCHAR(20) DEFAULT 'PENDING',
            generated_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- KPIs consolidados
        CREATE TABLE IF NOT EXISTS wms_kpi_snapshots (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            warehouse_id INTEGER,
            snapshot_date DATE NOT NULL,
            period_type VARCHAR(20) NOT NULL,
            total_sku_count INTEGER DEFAULT 0,
            active_sku_count INTEGER DEFAULT 0,
            total_stock_value DECIMAL(15,2) DEFAULT 0,
            avg_inventory_turnover DECIMAL(10,4),
            avg_days_inventory DECIMAL(10,2),
            slow_moving_sku_count INTEGER DEFAULT 0,
            dead_stock_sku_count INTEGER DEFAULT 0,
            dead_stock_value DECIMAL(15,2) DEFAULT 0,
            space_utilization_percentage DECIMAL(5,2),
            inventory_accuracy_percentage DECIMAL(5,2),
            total_storage_cost DECIMAL(15,2) DEFAULT 0,
            total_capital_cost DECIMAL(15,2) DEFAULT 0,
            total_holding_cost DECIMAL(15,2) DEFAULT 0,
            fill_rate_percentage DECIMAL(5,2),
            stockout_count INTEGER DEFAULT 0,
            near_expiry_sku_count INTEGER DEFAULT 0,
            near_expiry_value DECIMAL(15,2) DEFAULT 0,
            expired_value DECIMAL(15,2) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(company_id, warehouse_id, snapshot_date, period_type)
        );

        -- Números de serie
        CREATE TABLE IF NOT EXISTS wms_serial_numbers (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            serial_number VARCHAR(100) NOT NULL,
            status VARCHAR(20) DEFAULT 'AVAILABLE',
            warehouse_id INTEGER,
            location_id INTEGER,
            batch_id INTEGER,
            manufacturing_date DATE,
            warranty_expiry_date DATE,
            received_at TIMESTAMPTZ,
            sold_at TIMESTAMPTZ,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(company_id, product_id, serial_number)
        );

        -- Inspecciones QC
        CREATE TABLE IF NOT EXISTS wms_qc_inspections (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            inspection_number VARCHAR(30) NOT NULL UNIQUE,
            inspection_point VARCHAR(30) NOT NULL,
            product_id INTEGER NOT NULL,
            batch_id INTEGER,
            total_quantity DECIMAL(15,4) NOT NULL,
            sample_quantity DECIMAL(15,4),
            passed_quantity DECIMAL(15,4),
            failed_quantity DECIMAL(15,4),
            status VARCHAR(20) DEFAULT 'PENDING',
            overall_result VARCHAR(20),
            checkpoint_results JSONB,
            photos JSONB DEFAULT '[]',
            inspected_by UUID,
            completed_at TIMESTAMPTZ,
            disposition VARCHAR(30),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Devoluciones (RMA)
        CREATE TABLE IF NOT EXISTS wms_returns (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            return_number VARCHAR(30) NOT NULL UNIQUE,
            return_type VARCHAR(20) NOT NULL,
            customer_id INTEGER,
            supplier_id INTEGER,
            original_document_number VARCHAR(50),
            reason_notes TEXT,
            status VARCHAR(20) DEFAULT 'PENDING',
            received_at TIMESTAMPTZ,
            expected_quantity DECIMAL(15,4) DEFAULT 0,
            received_quantity DECIMAL(15,4) DEFAULT 0,
            total_value DECIMAL(15,2) DEFAULT 0,
            credit_issued DECIMAL(15,2) DEFAULT 0,
            carrier_name VARCHAR(100),
            tracking_number VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tareas de personal (Labor Management)
        CREATE TABLE IF NOT EXISTS wms_labor_tasks (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            user_id UUID NOT NULL,
            shift_date DATE NOT NULL,
            task_type VARCHAR(50) NOT NULL,
            task_reference_id INTEGER,
            from_location_id INTEGER,
            to_location_id INTEGER,
            lines_processed INTEGER DEFAULT 0,
            units_processed DECIMAL(15,4) DEFAULT 0,
            started_at TIMESTAMPTZ NOT NULL,
            completed_at TIMESTAMPTZ,
            duration_seconds INTEGER,
            expected_duration_seconds INTEGER,
            performance_percentage DECIMAL(5,2),
            device_id VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Muelles
        CREATE TABLE IF NOT EXISTS wms_docks (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            dock_number VARCHAR(20) NOT NULL,
            dock_type VARCHAR(20) NOT NULL,
            height_cm INTEGER,
            width_cm INTEGER,
            is_refrigerated BOOLEAN DEFAULT false,
            status VARCHAR(20) DEFAULT 'AVAILABLE',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(company_id, warehouse_id, dock_number)
        );

        -- Citas de muelle
        CREATE TABLE IF NOT EXISTS wms_dock_appointments (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            appointment_number VARCHAR(30) NOT NULL UNIQUE,
            appointment_type VARCHAR(20) NOT NULL,
            dock_id INTEGER,
            scheduled_arrival TIMESTAMPTZ NOT NULL,
            scheduled_departure TIMESTAMPTZ,
            duration_minutes INTEGER DEFAULT 60,
            carrier_name VARCHAR(200),
            driver_name VARCHAR(200),
            vehicle_plate VARCHAR(20),
            expected_pallets INTEGER,
            expected_weight DECIMAL(15,4),
            status VARCHAR(20) DEFAULT 'SCHEDULED',
            check_in_at TIMESTAMPTZ,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            actual_pallets INTEGER,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Oleadas de picking
        CREATE TABLE IF NOT EXISTS wms_waves (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            warehouse_id INTEGER NOT NULL,
            wave_number VARCHAR(30) NOT NULL UNIQUE,
            status VARCHAR(20) DEFAULT 'PLANNED',
            order_count INTEGER DEFAULT 0,
            line_count INTEGER DEFAULT 0,
            total_units DECIMAL(15,4) DEFAULT 0,
            planned_start TIMESTAMPTZ,
            planned_end TIMESTAMPTZ,
            actual_start TIMESTAMPTZ,
            actual_end TIMESTAMPTZ,
            lines_picked INTEGER DEFAULT 0,
            units_picked DECIMAL(15,4) DEFAULT 0,
            progress_percentage DECIMAL(5,2) DEFAULT 0,
            assigned_pickers INTEGER[],
            released_by UUID,
            released_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Workflows de aprobación
        CREATE TABLE IF NOT EXISTS wms_approval_workflows (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL,
            workflow_code VARCHAR(30) NOT NULL,
            name VARCHAR(100) NOT NULL,
            document_type VARCHAR(50) NOT NULL,
            min_amount DECIMAL(15,2),
            max_amount DECIMAL(15,2),
            approval_levels JSONB NOT NULL,
            require_all_levels BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(company_id, workflow_code)
        );

        -- ═══════════════════════════════════════════════════════════════════
        -- ÍNDICES PARA PERFORMANCE
        -- ═══════════════════════════════════════════════════════════════════
        CREATE INDEX IF NOT EXISTS idx_wms_trace_product ON wms_traceability_log(product_id);
        CREATE INDEX IF NOT EXISTS idx_wms_trace_date ON wms_traceability_log(performed_at);
        CREATE INDEX IF NOT EXISTS idx_wms_rotation_product ON wms_rotation_metrics(product_id, warehouse_id);
        CREATE INDEX IF NOT EXISTS idx_wms_rotation_anomaly ON wms_rotation_metrics(is_slow_moving, is_dead_stock);
        CREATE INDEX IF NOT EXISTS idx_wms_anomaly_status ON wms_anomaly_alerts(status);
        CREATE INDEX IF NOT EXISTS idx_wms_repl_status ON wms_replenishment_suggestions(status);
        CREATE INDEX IF NOT EXISTS idx_wms_labor_user ON wms_labor_tasks(user_id, shift_date);
        CREATE INDEX IF NOT EXISTS idx_wms_wave_status ON wms_waves(status);
        CREATE INDEX IF NOT EXISTS idx_wms_dock_appt ON wms_dock_appointments(scheduled_arrival);
        `;

        await client.query(sql);
        console.log('✅ Tablas avanzadas creadas\n');

        // Datos iniciales
        await client.query(`
            INSERT INTO wms_adjustment_reasons (company_id, code, name, adjustment_type, requires_approval)
            VALUES
                (11, 'DAMAGED', 'Producto Dañado', 'DECREASE', true),
                (11, 'EXPIRED', 'Producto Vencido', 'DECREASE', true),
                (11, 'THEFT', 'Robo/Hurto', 'DECREASE', true),
                (11, 'COUNT_ERROR', 'Error de Conteo', 'BOTH', true),
                (11, 'FOUND', 'Producto Encontrado', 'INCREASE', false),
                (11, 'SAMPLING', 'Muestra/Degustación', 'DECREASE', false),
                (11, 'INTERNAL_USE', 'Uso Interno', 'DECREASE', true),
                (11, 'WRITE_OFF', 'Baja Definitiva', 'DECREASE', true)
            ON CONFLICT (company_id, code) DO NOTHING
        `);
        console.log('✅ Razones de ajuste insertadas');

        // Workflow de aprobación por defecto
        await client.query(`
            INSERT INTO wms_approval_workflows (company_id, workflow_code, name, document_type, min_amount, approval_levels)
            VALUES (
                11,
                'ADJ_APPROVAL',
                'Aprobación de Ajustes',
                'ADJUSTMENT',
                100,
                '[{"level": 1, "role": "supervisor", "min_amount": 100}, {"level": 2, "role": "manager", "min_amount": 5000}]'
            )
            ON CONFLICT (company_id, workflow_code) DO NOTHING
        `);
        console.log('✅ Workflow de aprobación creado');

        // Contar tablas
        const result = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name LIKE 'wms_%'
            ORDER BY table_name
        `);

        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log(`📊 Total tablas WMS: ${result.rows.length}`);
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('\n📦 Tablas creadas:');
        result.rows.forEach(r => console.log(`   ✓ ${r.table_name}`));

        console.log('\n═══════════════════════════════════════════════════════════════════');
        console.log('✅ WMS ENTERPRISE COMPLETO');
        console.log('═══════════════════════════════════════════════════════════════════');
        console.log('\nFuncionalidades disponibles:');
        console.log('  🔄 FIFO/LIFO/FEFO configurable por almacén');
        console.log('  📋 Trazabilidad completa de movimientos');
        console.log('  📊 Inventarios programados con aprobaciones');
        console.log('  ⚠️ Detección de anomalías (stock parado, depreciación)');
        console.log('  🎯 Plan de reposición inteligente con forecast');
        console.log('  📈 Clasificación ABC/XYZ automática');
        console.log('  📉 KPIs y estadísticas consolidadas');
        console.log('  🔢 Serial number tracking');
        console.log('  ✅ Quality control con inspecciones');
        console.log('  ↩️ Returns management (RMA)');
        console.log('  👷 Labor management y productividad');
        console.log('  🚚 Dock scheduling');
        console.log('  📦 Wave planning');
        console.log('═══════════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.detail) console.error('   Detalle:', error.detail);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
