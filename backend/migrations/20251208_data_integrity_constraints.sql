-- ============================================================================
-- DATA INTEGRITY CONSTRAINTS - Enterprise Grade
-- ============================================================================
-- Fecha: 2025-12-08
-- Objetivo: Prevenir errores de integridad detectados por EnterpriseSimulationCollector
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATIONS: Garantizar recipient válido
-- ============================================================================

-- 1.1 Primero limpiar datos huérfanos existentes
DELETE FROM notifications WHERE recipient_user_id IS NULL;

-- 1.2 Agregar constraint NOT NULL con default seguro (solo si hay datos huérfanos)
-- NOTA: No podemos poner NOT NULL porque hay notificaciones broadcast sin destinatario específico
-- En su lugar, creamos un trigger de validación

-- 1.3 Crear función de validación
CREATE OR REPLACE FUNCTION validate_notification_recipient()
RETURNS TRIGGER AS $$
BEGIN
    -- Las notificaciones tipo 'broadcast' o 'system' pueden no tener recipient
    IF NEW.notification_type NOT IN ('broadcast', 'system_alert', 'company_announcement') THEN
        IF NEW.recipient_user_id IS NULL THEN
            RAISE EXCEPTION 'Las notificaciones de tipo % requieren un recipient_user_id válido', NEW.notification_type;
        END IF;

        -- Verificar que el usuario existe y está activo
        IF NOT EXISTS (
            SELECT 1 FROM users
            WHERE user_id = NEW.recipient_user_id
            AND "isActive" = true
        ) THEN
            RAISE EXCEPTION 'El recipient_user_id % no existe o está inactivo', NEW.recipient_user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1.4 Crear trigger
DROP TRIGGER IF EXISTS trg_validate_notification_recipient ON notifications;
CREATE TRIGGER trg_validate_notification_recipient
    BEFORE INSERT OR UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION validate_notification_recipient();

-- ============================================================================
-- 2. USER_SHIFTS: Garantizar que usuarios activos tengan turno asignado
-- ============================================================================

-- 2.1 Crear función que verifica turno al activar usuario
CREATE OR REPLACE FUNCTION check_user_shift_on_activate()
RETURNS TRIGGER AS $$
DECLARE
    has_shift BOOLEAN;
    company_requires_shift BOOLEAN;
BEGIN
    -- Solo verificar cuando se activa un usuario (role=employee)
    IF NEW."isActive" = true AND NEW.role = 'employee' THEN
        -- Verificar si la empresa requiere turno obligatorio (configurable)
        SELECT COALESCE(
            (SELECT (config->>'require_shift_assignment')::boolean
             FROM companies
             WHERE company_id = NEW.company_id),
            false
        ) INTO company_requires_shift;

        IF company_requires_shift THEN
            -- Verificar si tiene turno asignado
            SELECT EXISTS (
                SELECT 1 FROM user_shifts
                WHERE user_id = NEW.user_id
            ) INTO has_shift;

            IF NOT has_shift THEN
                RAISE WARNING 'Usuario % (%) activado sin turno asignado. Se recomienda asignar turno.',
                    NEW."firstName" || ' ' || NEW."lastName", NEW.user_id;
                -- Por ahora solo WARNING, no bloquear
                -- Si quieres bloquear: RAISE EXCEPTION '...'
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Crear trigger
DROP TRIGGER IF EXISTS trg_check_user_shift ON users;
CREATE TRIGGER trg_check_user_shift
    AFTER INSERT OR UPDATE OF "isActive" ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_user_shift_on_activate();

-- ============================================================================
-- 3. ATTENDANCE: Prevenir duplicados y check-out sin check-in
-- ============================================================================

-- 3.1 Función para prevenir duplicados de check-in
CREATE OR REPLACE FUNCTION prevent_duplicate_checkin()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si ya existe un check-in sin check-out para hoy
    IF NEW."checkOutTime" IS NULL THEN
        IF EXISTS (
            SELECT 1 FROM attendances
            WHERE "UserId" = NEW."UserId"
            AND DATE(date) = DATE(NEW.date)
            AND "checkOutTime" IS NULL
            AND id != COALESCE(NEW.id, -1)
        ) THEN
            RAISE EXCEPTION 'El usuario ya tiene un check-in abierto para hoy. Debe registrar check-out primero.';
        END IF;
    END IF;

    -- Verificar coherencia de horarios
    IF NEW."checkOutTime" IS NOT NULL AND NEW."checkInTime" IS NOT NULL THEN
        IF NEW."checkOutTime" < NEW."checkInTime" THEN
            RAISE EXCEPTION 'El check-out no puede ser anterior al check-in';
        END IF;

        -- Verificar jornada máxima (16 horas como límite razonable)
        IF EXTRACT(EPOCH FROM (NEW."checkOutTime" - NEW."checkInTime")) / 3600 > 16 THEN
            RAISE WARNING 'Jornada de más de 16 horas detectada para usuario %', NEW."UserId";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Crear trigger
DROP TRIGGER IF EXISTS trg_prevent_duplicate_checkin ON attendances;
CREATE TRIGGER trg_prevent_duplicate_checkin
    BEFORE INSERT OR UPDATE ON attendances
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_checkin();

-- ============================================================================
-- 4. VACATION_REQUESTS: Prevenir exceso de días
-- ============================================================================

-- 4.1 Función para validar balance de vacaciones
CREATE OR REPLACE FUNCTION validate_vacation_balance()
RETURNS TRIGGER AS $$
DECLARE
    available_days INTEGER;
    used_days INTEGER;
    annual_days INTEGER := 14; -- Default 14 días
BEGIN
    -- Obtener días usados este año
    SELECT COALESCE(SUM(total_days), 0) INTO used_days
    FROM vacation_requests
    WHERE user_id = NEW.user_id
    AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NEW.start_date)
    AND status IN ('approved', 'pending')
    AND id != COALESCE(NEW.id, -1);

    -- Calcular disponibles
    available_days := annual_days - used_days;

    -- Validar
    IF NEW.total_days > available_days AND NEW.status IN ('pending', 'approved') THEN
        RAISE EXCEPTION 'Solicitud de % días excede el balance disponible de % días',
            NEW.total_days, available_days;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Crear trigger
DROP TRIGGER IF EXISTS trg_validate_vacation_balance ON vacation_requests;
CREATE TRIGGER trg_validate_vacation_balance
    BEFORE INSERT OR UPDATE ON vacation_requests
    FOR EACH ROW
    EXECUTE FUNCTION validate_vacation_balance();

-- ============================================================================
-- 5. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice para búsqueda rápida de check-ins abiertos
CREATE INDEX IF NOT EXISTS idx_attendances_open_checkins
ON attendances ("UserId", date)
WHERE "checkOutTime" IS NULL;

-- Índice para búsqueda de vacaciones por año
CREATE INDEX IF NOT EXISTS idx_vacation_requests_year
ON vacation_requests (user_id, EXTRACT(YEAR FROM start_date));

-- Índice para notificaciones por recipient
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
ON notifications (recipient_user_id, company_id)
WHERE recipient_user_id IS NOT NULL;

-- ============================================================================
-- 6. FUNCIÓN DE AUDITORÍA AUTOMÁTICA
-- ============================================================================

-- Tabla de log de integridad
CREATE TABLE IF NOT EXISTS data_integrity_log (
    id SERIAL PRIMARY KEY,
    check_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(100),
    company_id INTEGER,
    issue_description TEXT,
    auto_fixed BOOLEAN DEFAULT false,
    fix_description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Función de auditoría que puede ejecutarse con cron
CREATE OR REPLACE FUNCTION run_data_integrity_check(p_company_id INTEGER DEFAULT NULL)
RETURNS TABLE (
    check_name TEXT,
    issues_found INTEGER,
    auto_fixed INTEGER
) AS $$
DECLARE
    v_orphan_notifs INTEGER;
    v_users_no_shift INTEGER;
    v_duplicate_checkins INTEGER;
BEGIN
    -- 1. Notificaciones huérfanas
    SELECT COUNT(*) INTO v_orphan_notifs
    FROM notifications n
    LEFT JOIN users u ON n.recipient_user_id = u.user_id
    WHERE n.recipient_user_id IS NOT NULL
    AND u.user_id IS NULL
    AND (p_company_id IS NULL OR n.company_id = p_company_id);

    IF v_orphan_notifs > 0 THEN
        INSERT INTO data_integrity_log (check_type, table_name, company_id, issue_description, auto_fixed, fix_description)
        VALUES ('orphan_reference', 'notifications', p_company_id,
                v_orphan_notifs || ' notificaciones con recipient inexistente',
                true, 'Eliminadas automáticamente');

        DELETE FROM notifications n
        WHERE n.recipient_user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = n.recipient_user_id)
        AND (p_company_id IS NULL OR n.company_id = p_company_id);
    END IF;

    RETURN QUERY SELECT 'Orphan Notifications'::TEXT, v_orphan_notifs, v_orphan_notifs;

    -- 2. Usuarios sin turno (solo advertencia)
    SELECT COUNT(*) INTO v_users_no_shift
    FROM users u
    LEFT JOIN user_shifts us ON u.user_id = us.user_id
    WHERE u."isActive" = true
    AND u.role = 'employee'
    AND us.user_id IS NULL
    AND (p_company_id IS NULL OR u.company_id = p_company_id);

    IF v_users_no_shift > 0 THEN
        INSERT INTO data_integrity_log (check_type, table_name, company_id, issue_description, auto_fixed)
        VALUES ('missing_relation', 'users', p_company_id,
                v_users_no_shift || ' empleados activos sin turno asignado',
                false);
    END IF;

    RETURN QUERY SELECT 'Employees Without Shift'::TEXT, v_users_no_shift, 0;

    -- 3. Check-ins duplicados
    SELECT COUNT(*) INTO v_duplicate_checkins
    FROM (
        SELECT "UserId", date, COUNT(*) as cnt
        FROM attendances
        WHERE "checkOutTime" IS NULL
        AND (p_company_id IS NULL OR company_id = p_company_id)
        GROUP BY "UserId", date
        HAVING COUNT(*) > 1
    ) dups;

    RETURN QUERY SELECT 'Duplicate Open Check-ins'::TEXT, v_duplicate_checkins, 0;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON FUNCTION validate_notification_recipient() IS
'Trigger que valida que notificaciones no-broadcast tengan recipient válido';

COMMENT ON FUNCTION prevent_duplicate_checkin() IS
'Trigger que previene check-ins duplicados y valida coherencia de horarios';

COMMENT ON FUNCTION validate_vacation_balance() IS
'Trigger que valida que solicitudes de vacaciones no excedan balance disponible';

COMMENT ON FUNCTION run_data_integrity_check(INTEGER) IS
'Función de auditoría ejecutable por cron para detectar y corregir problemas de integridad';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
