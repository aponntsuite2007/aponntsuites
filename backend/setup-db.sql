-- Crear usuario y base de datos PostgreSQL
DROP USER IF EXISTS attendance_user;
CREATE USER attendance_user WITH PASSWORD 'Aedr15150302';
DROP DATABASE IF EXISTS attendance_system_postgres;
CREATE DATABASE attendance_system_postgres OWNER attendance_user;
GRANT ALL PRIVILEGES ON DATABASE attendance_system_postgres TO attendance_user;