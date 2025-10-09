-- Sistema de Asistencia Biométrico v1.0
-- Esquema de Base de Datos MySQL/MariaDB

CREATE DATABASE IF NOT EXISTS attendance_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE attendance_system;

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_configs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  connection_mode ENUM('local', 'internet', 'hybrid') DEFAULT 'local',
  server_ip VARCHAR(45),
  server_port INT DEFAULT 3000,
  tolerance_minutes_entry INT DEFAULT 10,
  tolerance_minutes_exit INT DEFAULT 15,
  max_overtime_hours DECIMAL(3,1) DEFAULT 3.0,
  gps_radius INT DEFAULT 50,
  require_admin_approval BOOLEAN DEFAULT TRUE,
  send_notifications BOOLEAN DEFAULT TRUE,
  admin_emails JSON,
  admin_phones JSON,
  fingerprint_reader_type VARCHAR(50) DEFAULT 'zkteco',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de sucursales
CREATE TABLE IF NOT EXISTS branches (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  location JSON NOT NULL COMMENT '{"lat": -33.4489, "lng": -70.6693}',
  gps_radius INT DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
);

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  legajo VARCHAR(20) UNIQUE NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  dni VARCHAR(15) UNIQUE NOT NULL,
  company VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  photo_url TEXT,
  role ENUM('admin', 'supervisor', 'employee') DEFAULT 'employee',
  default_branch_id CHAR(36),
  can_work_in_other_branches BOOLEAN DEFAULT FALSE,
  vacation_days INT DEFAULT 0,
  special_permission_days INT DEFAULT 0,
  send_notifications BOOLEAN DEFAULT TRUE,
  require_overtime_alert BOOLEAN DEFAULT TRUE,
  template_id CHAR(36),
  is_active BOOLEAN DEFAULT TRUE,
  last_login DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (default_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  INDEX idx_legajo (legajo),
  INDEX idx_dni (dni),
  INDEX idx_role (role),
  INDEX idx_active (is_active)
);

-- Tabla de turnos
CREATE TABLE IF NOT EXISTS shifts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  type ENUM('fixed', 'rotating', '4x2', 'custom') DEFAULT 'fixed',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  work_days JSON COMMENT '["monday", "tuesday", "wednesday", "thursday", "friday"]',
  work_days_count INT DEFAULT 0,
  rest_days_count INT DEFAULT 0,
  current_cycle_day INT DEFAULT 1,
  break_minutes INT DEFAULT 0,
  overtime_allowed BOOLEAN DEFAULT TRUE,
  max_overtime_hours DECIMAL(3,1) DEFAULT 3.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type)
);

-- Tabla de asistencias
CREATE TABLE IF NOT EXISTS attendances (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36) NOT NULL,
  check_in_time DATETIME NOT NULL,
  check_out_time DATETIME,
  check_in_method ENUM('fingerprint', 'face', 'pin', 'manual') NOT NULL,
  check_out_method ENUM('fingerprint', 'face', 'pin', 'manual'),
  check_in_location JSON COMMENT '{"lat": -33.4489, "lng": -70.6693}',
  check_out_location JSON,
  total_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  status ENUM('present', 'late', 'absent', 'holiday', 'permission') DEFAULT 'present',
  admin_approved BOOLEAN DEFAULT FALSE,
  approved_by CHAR(36),
  notes TEXT,
  alerts JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_date (user_id, check_in_time),
  INDEX idx_branch_date (branch_id, check_in_time),
  INDEX idx_status (status),
  INDEX idx_date (DATE(check_in_time))
);

-- Tabla de datos biométricos
CREATE TABLE IF NOT EXISTS biometric_data (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  type ENUM('fingerprint', 'face') NOT NULL,
  data LONGTEXT NOT NULL COMMENT 'Datos biométricos encriptados',
  device_type VARCHAR(50),
  finger_index INT COMMENT '1-5 para dedos',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_type (user_id, type)
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  recipient_id CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  type ENUM('once', 'recurring') DEFAULT 'once',
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_date DATETIME,
  is_read BOOLEAN DEFAULT FALSE,
  confirmed_at DATETIME,
  confirmed_with ENUM('fingerprint', 'face', 'pin'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_recipient_read (recipient_id, is_read),
  INDEX idx_dates (start_date, end_date)
);

-- Tabla de permisos
CREATE TABLE IF NOT EXISTS permissions (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  type ENUM('vacation', 'medical', 'personal', 'other') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  approved BOOLEAN DEFAULT FALSE,
  approved_by CHAR(36),
  approved_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_dates (user_id, start_date, end_date),
  INDEX idx_approved (approved)
);

-- Tablas de relación muchos a muchos
CREATE TABLE IF NOT EXISTS user_shifts (
  user_id CHAR(36) NOT NULL,
  shift_id CHAR(36) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, shift_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_branches (
  user_id CHAR(36) NOT NULL,
  branch_id CHAR(36) NOT NULL,
  authorized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, branch_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id CHAR(36),
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_created (created_at)
);

-- Insertar datos iniciales
INSERT INTO system_configs (id) 
VALUES (UUID()) 
ON DUPLICATE KEY UPDATE id = id;

-- Usuario administrador inicial
INSERT INTO users (
  legajo, 
  first_name, 
  last_name, 
  dni, 
  company, 
  email, 
  password, 
  role
) VALUES (
  'ADMIN001',
  'Admin',
  'Sistema',
  '00000000',
  'Sistema',
  'admin@sistema.com',
  '$2a$10$k6LQhw2QsFwJhBvY5z0KXOLzN.C6Uy0YbZ8FjQqJhxKVz5m3.LQhO', -- Admin123!
  'admin'
) ON DUPLICATE KEY UPDATE id = id;

-- Sucursal principal
INSERT INTO branches (name, address, location) 
VALUES (
  'Oficina Central',
  'Av. Principal 123',
  '{"lat": -33.4489, "lng": -70.6693}'
) ON DUPLICATE KEY UPDATE id = id;

-- Turno estándar
INSERT INTO shifts (name, type, start_time, end_time, work_days)
VALUES (
  'Turno Central',
  'fixed',
  '08:00:00',
  '17:00:00',
  '["monday", "tuesday", "wednesday", "thursday", "friday"]'
) ON DUPLICATE KEY UPDATE id = id;
