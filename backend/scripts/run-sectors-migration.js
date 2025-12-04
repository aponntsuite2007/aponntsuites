#!/usr/bin/env node
/**
 * Script para ejecutar la migración de sectores
 */
require('dotenv').config();
const { Pool } = require('pg');

// Configuración igual que database.js
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'attendance_system',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'Aedr15150302'
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Iniciando migración de Sectores...\n');

        // 1. Crear tabla sectors
        console.log('1️⃣ Creando tabla sectors...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS sectors (
                id SERIAL PRIMARY KEY,
                company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
                department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                code VARCHAR(20),
                description TEXT,
                supervisor_id UUID REFERENCES users(user_id),
                gps_lat DECIMAL(10, 8),
                gps_lng DECIMAL(11, 8),
                coverage_radius INTEGER DEFAULT 50,
                max_employees INTEGER,
                is_active BOOLEAN DEFAULT true,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ Tabla sectors creada');

        // 2. Crear índices
        console.log('2️⃣ Creando índices...');
        const indices = [
            'CREATE INDEX IF NOT EXISTS idx_sectors_company ON sectors(company_id)',
            'CREATE INDEX IF NOT EXISTS idx_sectors_department ON sectors(department_id)',
            'CREATE INDEX IF NOT EXISTS idx_sectors_supervisor ON sectors(supervisor_id)',
            'CREATE INDEX IF NOT EXISTS idx_sectors_active ON sectors(company_id, is_active)'
        ];
        for (const idx of indices) {
            await client.query(idx);
        }
        console.log('   ✅ Índices creados');

        // 3. Agregar columnas a users
        console.log('3️⃣ Agregando columnas a users...');
        try {
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS sector_id INTEGER REFERENCES sectors(id)');
            console.log('   ✅ Columna sector_id agregada');
        } catch (e) {
            if (!e.message.includes('already exists')) throw e;
            console.log('   ⚠️  sector_id ya existe');
        }

        try {
            await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS salary_category_id INTEGER REFERENCES salary_categories_v2(id)');
            console.log('   ✅ Columna salary_category_id agregada');
        } catch (e) {
            if (!e.message.includes('already exists')) throw e;
            console.log('   ⚠️  salary_category_id ya existe');
        }

        // 4. Crear índices en users
        console.log('4️⃣ Creando índices en users...');
        try {
            await client.query('CREATE INDEX IF NOT EXISTS idx_users_sector ON users(sector_id)');
            await client.query('CREATE INDEX IF NOT EXISTS idx_users_salary_category ON users(salary_category_id)');
            console.log('   ✅ Índices en users creados');
        } catch (e) {
            console.log('   ⚠️  Índices ya existen');
        }

        // 5. Verificar creación
        console.log('5️⃣ Verificando...');
        const tablesCheck = await client.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'sectors'
        `);
        console.log(`   ✅ Tabla sectors: ${tablesCheck.rows.length > 0 ? 'EXISTE' : 'NO EXISTE'}`);

        const usersColumns = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name IN ('sector_id', 'salary_category_id')
        `);
        console.log(`   ✅ Columnas en users: ${usersColumns.rows.map(r => r.column_name).join(', ')}`);

        // 6. Registrar módulo
        console.log('6️⃣ Registrando módulo en system_modules...');
        const moduleCheck = await client.query(`
            SELECT id FROM system_modules WHERE module_key = 'organizational-structure'
        `);

        let moduleId;
        if (moduleCheck.rows.length === 0) {
            const insertResult = await client.query(`
                INSERT INTO system_modules (id, module_key, name, description, icon, category, is_active, is_core, created_at, updated_at)
                VALUES (gen_random_uuid(), 'organizational-structure', 'Estructura Organizacional', 'Gestión de departamentos, sectores, convenios, categorías salariales, turnos y roles adicionales', '🏢', 'rrhh', true, true, NOW(), NOW())
                RETURNING id
            `);
            moduleId = insertResult.rows[0].id;
            console.log(`   ✅ Módulo registrado con ID: ${moduleId}`);
        } else {
            moduleId = moduleCheck.rows[0].id;
            console.log(`   ⚠️  Módulo ya existe con ID: ${moduleId}`);
        }

        // 7. Habilitar para ISI (company_id = 11)
        console.log('7️⃣ Habilitando para ISI...');
        // Primero verificar si ya existe
        const existsCheck = await client.query(`
            SELECT id FROM company_modules WHERE company_id = 11 AND system_module_id = $1
        `, [moduleId]);

        if (existsCheck.rows.length === 0) {
            await client.query(`
                INSERT INTO company_modules (company_id, system_module_id, activo, created_at, updated_at)
                VALUES (11, $1, true, NOW(), NOW())
            `, [moduleId]);
            console.log('   ✅ Módulo habilitado para ISI (company_id=11)');
        } else {
            await client.query(`
                UPDATE company_modules SET activo = true WHERE company_id = 11 AND system_module_id = $1
            `, [moduleId]);
            console.log('   ⚠️  Módulo ya asignado a ISI, actualizado a activo');
        }

        console.log('\n🎉 Migración completada exitosamente!');

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        console.error(error.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
