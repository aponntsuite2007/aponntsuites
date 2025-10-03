@echo off
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE USER attendance_user WITH PASSWORD 'Aedr15150302';"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE attendance_system_postgres OWNER attendance_user;"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE attendance_system_postgres TO attendance_user;"
echo PostgreSQL configurado exitosamente
pause
