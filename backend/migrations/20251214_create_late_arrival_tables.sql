-- ============================================================================
-- MIGRATION: Late Arrival Authorization Tables
-- Created: 2025-12-14
-- Description: Tables for late arrival authorization workflow
-- ============================================================================

-- 1. Late Arrival Authorizations (main table)
CREATE TABLE IF NOT EXISTS late_arrival_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Employee info
    employee_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Authorization request details
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_time TIME NOT NULL,
    actual_arrival_time TIME,
    minutes_late INTEGER NOT NULL,
    reason TEXT,

    -- Shift info
    shift_id UUID REFERENCES shifts(id),
    shift_name VARCHAR(100),

    -- Authorizer info
    requested_authorizer_id UUID REFERENCES users(user_id),
    actual_authorizer_id UUID REFERENCES users(user_id),
    authorizer_position VARCHAR(200),

    -- Status workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Values: pending, approved, rejected, expired, cancelled

    -- Authorization window
    authorization_window_start TIMESTAMP,
    authorization_window_end TIMESTAMP,

    -- Decision details
    decision_timestamp TIMESTAMP,
    decision_reason TEXT,

    -- Notification tracking
    notification_sent_at TIMESTAMP,
    notification_channels JSONB DEFAULT '[]',
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMP,

    -- Completion
    attendance_id UUID,
    completed_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Medical Leaves (for availability checking)
CREATE TABLE IF NOT EXISTS medical_leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Employee info
    user_id UUID NOT NULL REFERENCES users(user_id),
    company_id INTEGER NOT NULL REFERENCES companies(company_id),

    -- Leave details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type VARCHAR(50) NOT NULL DEFAULT 'sick',
    -- Values: sick, medical_appointment, hospitalization, maternity, paternity, other

    -- Medical info
    diagnosis TEXT,
    doctor_name VARCHAR(200),
    medical_institution VARCHAR(200),
    certificate_number VARCHAR(100),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Values: pending, approved, rejected, cancelled

    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP,

    -- Documentation
    has_certificate BOOLEAN DEFAULT false,
    certificate_url TEXT,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_late_arrival_auth_employee ON late_arrival_authorizations(employee_id);
CREATE INDEX IF NOT EXISTS idx_late_arrival_auth_company ON late_arrival_authorizations(company_id);
CREATE INDEX IF NOT EXISTS idx_late_arrival_auth_date ON late_arrival_authorizations(request_date);
CREATE INDEX IF NOT EXISTS idx_late_arrival_auth_status ON late_arrival_authorizations(status);
CREATE INDEX IF NOT EXISTS idx_late_arrival_auth_authorizer ON late_arrival_authorizations(requested_authorizer_id);

CREATE INDEX IF NOT EXISTS idx_medical_leaves_user ON medical_leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_leaves_company ON medical_leaves(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_leaves_dates ON medical_leaves(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_medical_leaves_status ON medical_leaves(status);

-- Comments
COMMENT ON TABLE late_arrival_authorizations IS 'Stores late arrival authorization requests and their resolution';
COMMENT ON TABLE medical_leaves IS 'Stores medical leave records for employees';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Late arrival authorization tables created successfully';
END $$;
