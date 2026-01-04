-- ═══════════════════════════════════════════════════════════════════════════════
-- WMS SISTEMA DE SOLICITUDES DE MATERIAL PROGRAMADAS
-- Fecha: 2026-01-04
-- Versión: 1.0 - Enterprise Material Request System
--
-- FUNCIONALIDADES:
-- ✅ Solicitudes de material programadas para fechas futuras
-- ✅ Verificación automática de disponibilidad
-- ✅ Sistema de reservas con confirmación del responsable
-- ✅ Conversión automática a transferencia o entrega
-- ✅ Integración con órdenes de compra pendientes
-- ✅ Generación automática de solicitudes de compra
-- ✅ Notificaciones vía sistema central
-- ✅ Integración con estructura organizacional
-- ✅ Dashboard operativo para responsable de almacén
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ASIGNACIÓN DE EMPLEADOS A ALMACENES (Integración Estructura Organizacional)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_warehouse_staff (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id),

    -- Rol en el almacén
    role_in_warehouse VARCHAR(50) NOT NULL DEFAULT 'operator',
    -- operator, supervisor, manager, viewer, receiver, dispatcher

    -- Permisos específicos
    can_approve_requests BOOLEAN DEFAULT FALSE,
    can_approve_transfers BOOLEAN DEFAULT FALSE,
    can_approve_adjustments BOOLEAN DEFAULT FALSE,
    can_dispatch BOOLEAN DEFAULT FALSE,
    can_receive BOOLEAN DEFAULT FALSE,
    approval_limit_amount DECIMAL(15,2),  -- Monto máximo que puede aprobar

    -- Departamento al que pertenece (para solicitudes de su sector)
    department_id INTEGER REFERENCES departments(id),

    -- Turno/horario de trabajo
    shift_start TIME,
    shift_end TIME,
    work_days JSONB DEFAULT '["mon","tue","wed","thu","fri"]',

    -- Estado
    is_primary BOOLEAN DEFAULT FALSE,  -- Es el responsable principal
    is_active BOOLEAN DEFAULT TRUE,

    -- Notificaciones
    receive_low_stock_alerts BOOLEAN DEFAULT TRUE,
    receive_request_alerts BOOLEAN DEFAULT TRUE,
    receive_expiry_alerts BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(warehouse_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wms_warehouse_staff_user ON wms_warehouse_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_wms_warehouse_staff_warehouse ON wms_warehouse_staff(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_warehouse_staff_role ON wms_warehouse_staff(role_in_warehouse);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. SOLICITUDES DE MATERIAL (Material Requests)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_material_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    request_number VARCHAR(50) NOT NULL UNIQUE,

    -- Origen de la solicitud
    requested_by UUID NOT NULL REFERENCES users(user_id),
    requester_department_id INTEGER REFERENCES departments(id),
    requester_name VARCHAR(200),
    requester_position VARCHAR(200),

    -- Destino
    destination_type VARCHAR(30) NOT NULL,  -- WAREHOUSE, SECTOR, EMPLOYEE, PROJECT
    destination_warehouse_id INTEGER REFERENCES wms_warehouses(id),  -- Si es transferencia
    destination_department_id INTEGER REFERENCES departments(id),  -- Si es sector
    destination_employee_id UUID REFERENCES users(user_id),  -- Si es entrega personal
    destination_project_code VARCHAR(50),  -- Si es para un proyecto
    destination_notes TEXT,

    -- Almacén origen
    source_warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),

    -- Programación
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    required_date DATE NOT NULL,  -- Fecha en que se necesita el material
    required_time TIME,  -- Hora aproximada
    urgency_level VARCHAR(20) DEFAULT 'normal',  -- low, normal, urgent, critical

    -- Estado del flujo
    status VARCHAR(30) DEFAULT 'draft',
    -- draft, submitted, pending_approval, approved, partially_reserved, reserved,
    -- in_preparation, ready, dispatched, delivered, completed, cancelled, rejected

    -- Aprobación
    requires_approval BOOLEAN DEFAULT TRUE,
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    rejected_by UUID REFERENCES users(user_id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Reserva
    reservation_status VARCHAR(30),  -- pending, partial, complete, insufficient
    reserved_by UUID REFERENCES users(user_id),
    reserved_at TIMESTAMPTZ,
    reservation_notes TEXT,

    -- Preparación y despacho
    prepared_by UUID REFERENCES users(user_id),
    prepared_at TIMESTAMPTZ,
    dispatched_by UUID REFERENCES users(user_id),
    dispatched_at TIMESTAMPTZ,

    -- Entrega/Recepción
    received_by UUID REFERENCES users(user_id),
    received_at TIMESTAMPTZ,
    reception_notes TEXT,

    -- Documento generado
    generated_document_type VARCHAR(30),  -- TRANSFER, DELIVERY_NOTE
    generated_document_id INTEGER,  -- FK a wms_transfers o documento de entrega

    -- Justificación
    purpose TEXT,  -- Para qué se necesita el material
    cost_center VARCHAR(50),
    project_code VARCHAR(50),

    -- Prioridad calculada
    priority_score INTEGER,  -- 1-100, calculado automáticamente

    -- Métricas
    total_lines INTEGER DEFAULT 0,
    total_quantity DECIMAL(15,4) DEFAULT 0,
    estimated_value DECIMAL(15,2) DEFAULT 0,

    -- Notificaciones enviadas
    notifications_sent JSONB DEFAULT '[]',

    notes TEXT,
    internal_notes TEXT,  -- Solo visible para staff del almacén

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_material_requests_status ON wms_material_requests(status);
CREATE INDEX IF NOT EXISTS idx_wms_material_requests_date ON wms_material_requests(required_date);
CREATE INDEX IF NOT EXISTS idx_wms_material_requests_warehouse ON wms_material_requests(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_material_requests_requester ON wms_material_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_wms_material_requests_pending ON wms_material_requests(status, required_date)
    WHERE status IN ('submitted', 'pending_approval', 'approved', 'partially_reserved');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. LÍNEAS DE SOLICITUD DE MATERIAL
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_material_request_lines (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES wms_material_requests(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,

    -- Producto
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    -- Cantidades
    quantity_requested DECIMAL(15,4) NOT NULL,
    quantity_reserved DECIMAL(15,4) DEFAULT 0,
    quantity_dispatched DECIMAL(15,4) DEFAULT 0,
    quantity_received DECIMAL(15,4) DEFAULT 0,
    unit_of_measure VARCHAR(20),

    -- Estado de la línea
    line_status VARCHAR(30) DEFAULT 'pending',
    -- pending, available, partial, insufficient, reserved, picking, dispatched, received, cancelled

    -- Disponibilidad verificada
    available_quantity DECIMAL(15,4),  -- Stock disponible al momento de verificar
    available_in_transit DECIMAL(15,4),  -- En tránsito (OC pendientes)
    expected_receipt_date DATE,  -- Si hay OC pendiente, cuándo llegaría

    -- Lote/Ubicación asignado para la reserva
    reserved_stock_id INTEGER REFERENCES wms_stock(id),
    reserved_batch_id INTEGER REFERENCES wms_stock_batches(id),
    reserved_location_id INTEGER REFERENCES wms_locations(id),

    -- Alternativas si no hay stock
    suggested_alternative_id INTEGER REFERENCES wms_products(id),
    purchase_order_suggested BOOLEAN DEFAULT FALSE,
    purchase_request_id INTEGER,  -- FK a tabla de compras

    -- Valores
    unit_cost DECIMAL(15,4),
    total_value DECIMAL(15,2),

    -- Notas
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(request_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_wms_request_lines_product ON wms_material_request_lines(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_request_lines_status ON wms_material_request_lines(line_status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. RESERVAS VINCULADAS A SOLICITUDES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Agregar columnas a wms_stock_reservations para vincular con solicitudes
ALTER TABLE wms_stock_reservations
    ADD COLUMN IF NOT EXISTS material_request_id INTEGER REFERENCES wms_material_requests(id),
    ADD COLUMN IF NOT EXISTS material_request_line_id INTEGER REFERENCES wms_material_request_lines(id),
    ADD COLUMN IF NOT EXISTS auto_release_date DATE,  -- Fecha en que se libera automáticamente si no se usa
    ADD COLUMN IF NOT EXISTS is_auto_reservation BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_wms_reservations_request ON wms_stock_reservations(material_request_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. HISTORIAL DE SOLICITUDES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_material_request_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES wms_material_requests(id) ON DELETE CASCADE,

    action VARCHAR(50) NOT NULL,
    -- created, submitted, approved, rejected, reserved, partial_reserved,
    -- prepared, dispatched, received, cancelled, modified

    previous_status VARCHAR(30),
    new_status VARCHAR(30),

    performed_by UUID NOT NULL REFERENCES users(user_id),
    performed_by_name VARCHAR(200),
    performed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Detalles
    details JSONB,  -- Datos específicos de la acción
    ip_address INET,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_request_history_request ON wms_material_request_history(request_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. ÓRDENES DE COMPRA PENDIENTES (Para verificar disponibilidad futura)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_pending_receipts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Documento origen
    source_type VARCHAR(30) NOT NULL,  -- PURCHASE_ORDER, TRANSFER_IN, PRODUCTION
    source_id INTEGER,
    source_number VARCHAR(50),

    -- Producto esperado
    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),

    quantity_ordered DECIMAL(15,4) NOT NULL,
    quantity_received DECIMAL(15,4) DEFAULT 0,
    quantity_pending DECIMAL(15,4) GENERATED ALWAYS AS (quantity_ordered - quantity_received) STORED,

    -- Fechas
    expected_date DATE,
    confirmed_date DATE,

    -- Estado
    status VARCHAR(20) DEFAULT 'pending',  -- pending, partial, received, cancelled

    -- Proveedor (si es OC)
    supplier_id INTEGER,
    supplier_name VARCHAR(200),

    -- Vinculación con solicitudes que esperan este material
    reserved_for_requests JSONB DEFAULT '[]',  -- [{request_id, line_id, quantity}]

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_pending_receipts_product ON wms_pending_receipts(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_pending_receipts_warehouse ON wms_pending_receipts(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_pending_receipts_date ON wms_pending_receipts(expected_date);
CREATE INDEX IF NOT EXISTS idx_wms_pending_receipts_pending ON wms_pending_receipts(status) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. DOCUMENTOS DE ENTREGA (Para entregas a sectores/empleados sin almacén)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_delivery_notes (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    delivery_number VARCHAR(50) NOT NULL UNIQUE,

    -- Origen
    source_warehouse_id INTEGER NOT NULL REFERENCES wms_warehouses(id),
    material_request_id INTEGER REFERENCES wms_material_requests(id),

    -- Destinatario
    recipient_type VARCHAR(30) NOT NULL,  -- EMPLOYEE, DEPARTMENT, EXTERNAL
    recipient_user_id UUID REFERENCES users(user_id),
    recipient_department_id INTEGER REFERENCES departments(id),
    recipient_name VARCHAR(200),
    recipient_position VARCHAR(200),

    -- Estado
    status VARCHAR(20) DEFAULT 'pending',  -- pending, signed, cancelled

    -- Firma de recepción
    signed_by UUID REFERENCES users(user_id),
    signed_at TIMESTAMPTZ,
    signature_data TEXT,  -- Base64 de firma digital/manuscrita

    -- Devolución (si aplica)
    is_returnable BOOLEAN DEFAULT FALSE,
    return_due_date DATE,
    return_status VARCHAR(20),  -- pending, partial, complete

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wms_delivery_note_lines (
    id SERIAL PRIMARY KEY,
    delivery_note_id INTEGER NOT NULL REFERENCES wms_delivery_notes(id) ON DELETE CASCADE,

    product_id INTEGER NOT NULL REFERENCES wms_products(id),
    product_code VARCHAR(50),
    product_name VARCHAR(200),

    quantity_delivered DECIMAL(15,4) NOT NULL,
    quantity_returned DECIMAL(15,4) DEFAULT 0,

    batch_id INTEGER REFERENCES wms_stock_batches(id),
    serial_numbers TEXT[],

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_delivery_notes_warehouse ON wms_delivery_notes(source_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wms_delivery_notes_request ON wms_delivery_notes(material_request_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. COLA DE NOTIFICACIONES WMS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wms_notification_queue (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    notification_type VARCHAR(50) NOT NULL,
    -- NEW_REQUEST, REQUEST_APPROVED, REQUEST_REJECTED, STOCK_RESERVED,
    -- READY_FOR_PICKUP, STOCK_INSUFFICIENT, PENDING_APPROVAL,
    -- EXPIRY_ALERT, LOW_STOCK, OC_RECEIVED

    -- Destinatarios
    target_user_ids UUID[],
    target_roles VARCHAR[],  -- Si se envía a roles específicos
    target_warehouse_id INTEGER REFERENCES wms_warehouses(id),

    -- Contenido
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, urgent

    -- Referencia
    reference_type VARCHAR(50),
    reference_id INTEGER,
    action_url TEXT,

    -- Estado
    status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, failed
    sent_at TIMESTAMPTZ,
    error_message TEXT,

    -- Expiración
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wms_notifications_pending ON wms_notification_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wms_notifications_warehouse ON wms_notification_queue(target_warehouse_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. TIPOS DE ALMACÉN (Categorías versátiles)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Agregar campo de categoría a almacenes si no existe
ALTER TABLE wms_warehouses
    ADD COLUMN IF NOT EXISTS warehouse_type VARCHAR(50) DEFAULT 'general',
    -- general, raw_materials, finished_goods, spare_parts, tools,
    -- machinery, packaging, promotional, hazardous, cold_storage, returns
    ADD COLUMN IF NOT EXISTS sub_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS max_capacity DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS current_occupation DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS auto_replenish BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES users(user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. HISTORIAL DE PRECIOS Y CAMBIOS DE PRODUCTOS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Si no existe, crear tabla de historial de precios (puede ya existir)
CREATE TABLE IF NOT EXISTS wms_product_changes_log (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(company_id),
    product_id INTEGER NOT NULL REFERENCES wms_products(id),

    change_type VARCHAR(50) NOT NULL,
    -- CREATED, UPDATED, PRICE_CHANGE, COST_CHANGE, DEACTIVATED, REACTIVATED
    -- CATEGORY_CHANGE, UNIT_CHANGE, BARCODE_ADDED, BARCODE_REMOVED

    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,

    changed_by UUID REFERENCES users(user_id),
    changed_by_name VARCHAR(200),
    changed_at TIMESTAMPTZ DEFAULT NOW(),

    reason TEXT,
    source VARCHAR(50),  -- MANUAL, IMPORT, SYSTEM, INTEGRATION

    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_wms_product_changes_product ON wms_product_changes_log(product_id);
CREATE INDEX IF NOT EXISTS idx_wms_product_changes_type ON wms_product_changes_log(change_type);
CREATE INDEX IF NOT EXISTS idx_wms_product_changes_date ON wms_product_changes_log(changed_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. FUNCIONES DE UTILIDAD
-- ═══════════════════════════════════════════════════════════════════════════════

-- Función para generar número de solicitud
CREATE OR REPLACE FUNCTION wms_generate_request_number(p_company_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INTEGER;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(NULLIF(SUBSTRING(request_number FROM 'SM-[0-9]{4}-([0-9]+)'), '') AS INTEGER)
    ), 0) + 1 INTO v_sequence
    FROM wms_material_requests
    WHERE company_id = p_company_id
    AND request_number LIKE 'SM-' || v_year || '-%';

    RETURN 'SM-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para generar número de nota de entrega
CREATE OR REPLACE FUNCTION wms_generate_delivery_number(p_company_id INTEGER)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_year VARCHAR(4);
    v_sequence INTEGER;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(NULLIF(SUBSTRING(delivery_number FROM 'NE-[0-9]{4}-([0-9]+)'), '') AS INTEGER)
    ), 0) + 1 INTO v_sequence
    FROM wms_delivery_notes
    WHERE company_id = p_company_id
    AND delivery_number LIKE 'NE-' || v_year || '-%';

    RETURN 'NE-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Función para verificar disponibilidad de material
CREATE OR REPLACE FUNCTION wms_check_material_availability(
    p_product_id INTEGER,
    p_warehouse_id INTEGER,
    p_quantity DECIMAL,
    p_required_date DATE
)
RETURNS TABLE (
    available_now DECIMAL,
    available_reserved DECIMAL,
    available_total DECIMAL,
    pending_from_po DECIMAL,
    expected_po_date DATE,
    can_fulfill BOOLEAN,
    can_fulfill_with_po BOOLEAN
) AS $$
DECLARE
    v_stock_available DECIMAL;
    v_reserved DECIMAL;
    v_pending_po DECIMAL;
    v_po_date DATE;
BEGIN
    -- Stock disponible actual
    SELECT COALESCE(SUM(quantity_on_hand), 0) INTO v_stock_available
    FROM wms_stock
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    -- Cantidad reservada
    SELECT COALESCE(SUM(quantity_reserved), 0) INTO v_reserved
    FROM wms_stock_reservations sr
    JOIN wms_stock s ON sr.stock_id = s.id
    WHERE s.product_id = p_product_id
    AND s.warehouse_id = p_warehouse_id
    AND sr.status = 'active';

    -- Cantidad pendiente de OC
    SELECT COALESCE(SUM(quantity_pending), 0), MIN(expected_date)
    INTO v_pending_po, v_po_date
    FROM wms_pending_receipts
    WHERE product_id = p_product_id
    AND warehouse_id = p_warehouse_id
    AND status = 'pending'
    AND expected_date <= p_required_date;

    -- Retornar resultados
    available_now := v_stock_available;
    available_reserved := v_reserved;
    available_total := v_stock_available - v_reserved;
    pending_from_po := v_pending_po;
    expected_po_date := v_po_date;
    can_fulfill := (v_stock_available - v_reserved) >= p_quantity;
    can_fulfill_with_po := (v_stock_available - v_reserved + v_pending_po) >= p_quantity;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener responsable del almacén
CREATE OR REPLACE FUNCTION wms_get_warehouse_manager(p_warehouse_id INTEGER)
RETURNS UUID AS $$
DECLARE
    v_manager_id UUID;
BEGIN
    -- Primero buscar el manager asignado al almacén
    SELECT manager_user_id INTO v_manager_id
    FROM wms_warehouses WHERE id = p_warehouse_id;

    IF v_manager_id IS NULL THEN
        -- Si no hay, buscar en warehouse_staff
        SELECT user_id INTO v_manager_id
        FROM wms_warehouse_staff
        WHERE warehouse_id = p_warehouse_id
        AND role_in_warehouse = 'manager'
        AND is_active = TRUE
        LIMIT 1;
    END IF;

    IF v_manager_id IS NULL THEN
        -- Si no hay manager, buscar supervisor
        SELECT user_id INTO v_manager_id
        FROM wms_warehouse_staff
        WHERE warehouse_id = p_warehouse_id
        AND role_in_warehouse = 'supervisor'
        AND is_active = TRUE
        LIMIT 1;
    END IF;

    RETURN v_manager_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Trigger para auto-generar número de solicitud
CREATE OR REPLACE FUNCTION wms_auto_request_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        NEW.request_number := wms_generate_request_number(NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_request_number ON wms_material_requests;
CREATE TRIGGER trg_auto_request_number
    BEFORE INSERT ON wms_material_requests
    FOR EACH ROW
    EXECUTE FUNCTION wms_auto_request_number();

-- Trigger para auto-generar número de nota de entrega
CREATE OR REPLACE FUNCTION wms_auto_delivery_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivery_number IS NULL OR NEW.delivery_number = '' THEN
        NEW.delivery_number := wms_generate_delivery_number(NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_delivery_number ON wms_delivery_notes;
CREATE TRIGGER trg_auto_delivery_number
    BEFORE INSERT ON wms_delivery_notes
    FOR EACH ROW
    EXECUTE FUNCTION wms_auto_delivery_number();

-- Trigger para registrar historial de solicitudes
CREATE OR REPLACE FUNCTION wms_log_request_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO wms_material_request_history (
            request_id, action, new_status, performed_by,
            performed_by_name, details
        )
        SELECT
            NEW.id, 'created', NEW.status, NEW.requested_by,
            CONCAT(u."firstName", ' ', u."lastName"),
            jsonb_build_object('required_date', NEW.required_date, 'purpose', NEW.purpose)
        FROM users u WHERE u.user_id = NEW.requested_by;

    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO wms_material_request_history (
            request_id, action, previous_status, new_status,
            performed_by, performed_by_name
        )
        SELECT
            NEW.id,
            CASE NEW.status
                WHEN 'submitted' THEN 'submitted'
                WHEN 'approved' THEN 'approved'
                WHEN 'rejected' THEN 'rejected'
                WHEN 'reserved' THEN 'reserved'
                WHEN 'dispatched' THEN 'dispatched'
                WHEN 'delivered' THEN 'received'
                WHEN 'cancelled' THEN 'cancelled'
                ELSE 'modified'
            END,
            OLD.status, NEW.status,
            COALESCE(NEW.approved_by, NEW.reserved_by, NEW.dispatched_by, NEW.requested_by),
            CONCAT(u."firstName", ' ', u."lastName")
        FROM users u
        WHERE u.user_id = COALESCE(NEW.approved_by, NEW.reserved_by, NEW.dispatched_by, NEW.requested_by);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_request_change ON wms_material_requests;
CREATE TRIGGER trg_log_request_change
    AFTER INSERT OR UPDATE ON wms_material_requests
    FOR EACH ROW
    EXECUTE FUNCTION wms_log_request_change();

-- Trigger para registrar cambios en productos
CREATE OR REPLACE FUNCTION wms_log_product_change()
RETURNS TRIGGER AS $$
DECLARE
    v_company_id INTEGER;
BEGIN
    -- Obtener company_id desde la sucursal del producto
    SELECT b.company_id INTO v_company_id
    FROM wms_branches b
    WHERE b.id = NEW.branch_id;

    IF v_company_id IS NULL THEN
        v_company_id := 11; -- Default a ISI si no encuentra
    END IF;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO wms_product_changes_log (
            company_id, product_id, change_type, new_value, source
        ) VALUES (
            v_company_id, NEW.id, 'CREATED', NEW.name, 'SYSTEM'
        );

    ELSIF TG_OP = 'UPDATE' THEN
        -- Detectar cambios en campos importantes
        IF OLD.name IS DISTINCT FROM NEW.name THEN
            INSERT INTO wms_product_changes_log (company_id, product_id, change_type, field_name, old_value, new_value, source)
            VALUES (v_company_id, NEW.id, 'UPDATED', 'name', OLD.name, NEW.name, 'SYSTEM');
        END IF;

        IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
            INSERT INTO wms_product_changes_log (company_id, product_id, change_type, field_name, old_value, new_value, source)
            VALUES (v_company_id, NEW.id,
                CASE WHEN NEW.is_active THEN 'REACTIVATED' ELSE 'DEACTIVATED' END,
                'is_active', OLD.is_active::TEXT, NEW.is_active::TEXT, 'SYSTEM');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_product_change ON wms_products;
CREATE TRIGGER trg_log_product_change
    AFTER INSERT OR UPDATE ON wms_products
    FOR EACH ROW
    EXECUTE FUNCTION wms_log_product_change();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. VISTAS PARA DASHBOARD OPERATIVO
-- ═══════════════════════════════════════════════════════════════════════════════

-- Vista: Solicitudes pendientes por almacén
CREATE OR REPLACE VIEW wms_pending_requests_dashboard AS
SELECT
    mr.id,
    mr.request_number,
    mr.company_id,
    mr.source_warehouse_id,
    w.name as warehouse_name,
    mr.status,
    mr.required_date,
    mr.urgency_level,
    mr.requester_name,
    d.name as requester_department,
    mr.destination_type,
    mr.total_lines,
    mr.estimated_value,
    mr.created_at,
    CASE
        WHEN mr.required_date < CURRENT_DATE THEN 'overdue'
        WHEN mr.required_date = CURRENT_DATE THEN 'today'
        WHEN mr.required_date = CURRENT_DATE + 1 THEN 'tomorrow'
        ELSE 'future'
    END as urgency_status,
    (mr.required_date - CURRENT_DATE) as days_until_required
FROM wms_material_requests mr
JOIN wms_warehouses w ON mr.source_warehouse_id = w.id
LEFT JOIN departments d ON mr.requester_department_id = d.id
WHERE mr.status NOT IN ('completed', 'cancelled', 'rejected')
ORDER BY
    CASE mr.urgency_level
        WHEN 'critical' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
        ELSE 4
    END,
    mr.required_date ASC;

-- Vista: Stock crítico (bajo stock o próximo a vencer)
CREATE OR REPLACE VIEW wms_critical_stock_dashboard AS
SELECT
    s.id as stock_id,
    p.id as product_id,
    p.internal_code as sku,
    p.name as product_name,
    w.id as warehouse_id,
    w.name as warehouse_name,
    b.company_id,
    s.quantity_on_hand,
    rp.reorder_point,
    rp.safety_stock,
    CASE
        WHEN s.quantity_on_hand <= COALESCE(rp.safety_stock, 0) THEN 'critical'
        WHEN s.quantity_on_hand <= COALESCE(rp.reorder_point, 0) THEN 'low'
        ELSE 'ok'
    END as stock_status,
    MIN(sb.expiry_date) as nearest_expiry,
    (MIN(sb.expiry_date) - CURRENT_DATE) as days_to_expiry
FROM wms_stock s
JOIN wms_products p ON s.product_id = p.id
JOIN wms_warehouses w ON s.warehouse_id = w.id
JOIN wms_branches b ON w.branch_id = b.id
LEFT JOIN wms_reorder_points rp ON rp.product_id = p.id AND rp.warehouse_id = w.id
LEFT JOIN wms_stock_batches sb ON sb.stock_id = s.id AND sb.status = 'active'
WHERE s.quantity_on_hand > 0
GROUP BY s.id, p.id, p.internal_code, p.name, w.id, w.name, b.company_id,
         s.quantity_on_hand, rp.reorder_point, rp.safety_stock
HAVING s.quantity_on_hand <= COALESCE(rp.reorder_point, 999999999)
    OR MIN(sb.expiry_date) <= CURRENT_DATE + 30
ORDER BY
    CASE
        WHEN s.quantity_on_hand <= COALESCE(rp.safety_stock, 0) THEN 1
        WHEN s.quantity_on_hand <= COALESCE(rp.reorder_point, 0) THEN 2
        ELSE 3
    END,
    MIN(sb.expiry_date) ASC NULLS LAST;

-- Vista: Resumen operativo por almacén
CREATE OR REPLACE VIEW wms_warehouse_operations_summary AS
SELECT
    w.id as warehouse_id,
    w.name as warehouse_name,
    b.company_id,

    -- Solicitudes
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.status = 'submitted') as requests_pending_approval,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.status = 'approved') as requests_to_reserve,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.status = 'reserved') as requests_to_prepare,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.status = 'ready') as requests_ready_dispatch,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.required_date = CURRENT_DATE) as requests_due_today,
    COUNT(DISTINCT mr.id) FILTER (WHERE mr.required_date < CURRENT_DATE AND mr.status NOT IN ('completed', 'cancelled')) as requests_overdue,

    -- Transferencias
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'pending') as transfers_pending,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'approved') as transfers_approved,

    -- Stock
    COUNT(DISTINCT s.id) as total_products,
    COUNT(DISTINCT s.id) FILTER (WHERE s.quantity_on_hand <= COALESCE(rp.safety_stock, 0)) as products_critical_stock,

    -- Vencimientos
    COUNT(DISTINCT sb.id) FILTER (WHERE sb.expiry_date <= CURRENT_DATE + 7) as batches_expiring_7days

FROM wms_warehouses w
JOIN wms_branches b ON w.branch_id = b.id
LEFT JOIN wms_material_requests mr ON mr.source_warehouse_id = w.id
LEFT JOIN wms_transfers t ON t.source_warehouse_id = w.id OR t.destination_warehouse_id = w.id
LEFT JOIN wms_stock s ON s.warehouse_id = w.id
LEFT JOIN wms_reorder_points rp ON rp.product_id = s.product_id AND rp.warehouse_id = w.id
LEFT JOIN wms_stock_batches sb ON sb.stock_id = s.id AND sb.status = 'active'
WHERE w.is_active = TRUE
GROUP BY w.id, w.name, b.company_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. DATOS INICIALES PARA ISI (company_id = 11)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Asignar staff al almacén existente
INSERT INTO wms_warehouse_staff (company_id, warehouse_id, user_id, role_in_warehouse,
    can_approve_requests, can_approve_transfers, can_dispatch, can_receive, is_primary)
SELECT
    11,
    w.id,
    u.user_id,
    'manager',
    TRUE, TRUE, TRUE, TRUE, TRUE
FROM wms_warehouses w
JOIN wms_branches b ON w.branch_id = b.id
JOIN users u ON u.company_id = b.company_id AND u.role = 'admin'
WHERE b.company_id = 11
AND NOT EXISTS (
    SELECT 1 FROM wms_warehouse_staff ws
    WHERE ws.warehouse_id = w.id AND ws.user_id = u.user_id
)
LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'wms_material_requests', 'wms_material_request_lines', 'wms_material_request_history',
        'wms_warehouse_staff', 'wms_delivery_notes', 'wms_delivery_note_lines',
        'wms_pending_receipts', 'wms_notification_queue', 'wms_product_changes_log'
    );

    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'WMS MATERIAL REQUESTS ENTERPRISE - Migración completada';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Tablas creadas/actualizadas: %', v_count;
    RAISE NOTICE '';
    RAISE NOTICE 'NUEVAS FUNCIONALIDADES:';
    RAISE NOTICE '  ✅ Sistema de Solicitudes de Material Programadas';
    RAISE NOTICE '  ✅ Asignación de empleados a almacenes';
    RAISE NOTICE '  ✅ Verificación automática de disponibilidad';
    RAISE NOTICE '  ✅ Sistema de reservas con confirmación';
    RAISE NOTICE '  ✅ Integración con OC pendientes';
    RAISE NOTICE '  ✅ Notas de entrega para sectores/empleados';
    RAISE NOTICE '  ✅ Historial completo de cambios';
    RAISE NOTICE '  ✅ Dashboard operativo para responsables';
    RAISE NOTICE '  ✅ Cola de notificaciones WMS';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
END $$;
