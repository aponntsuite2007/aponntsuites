/**
 * ENDPOINT ADMINISTRATIVO PARA EJECUTAR MIGRACIONES
 * Solo para uso en producción con autenticación
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const database = require('../config/database');

// Middleware de autenticación simple por token
const authenticateMigrationToken = (req, res, next) => {
    const token = req.headers['x-migration-token'] || req.query.token;

    // El token debe coincidir con una variable de entorno
    const validToken = process.env.MIGRATION_TOKEN || 'rnd_xJHFJ9muRsenVO6Y1z19rvi1fcWq';

    if (token !== validToken) {
        return res.status(403).json({
            success: false,
            message: 'Token de migración inválido'
        });
    }

    next();
};

// Endpoint para ejecutar migraciones de notificaciones
router.post('/migrate-notifications', authenticateMigrationToken, async (req, res) => {
    try {
        console.log('🔄 Iniciando migración de notificaciones...');

        // Verificar si las tablas ya existen
        const [tables] = await database.sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'notification_groups'
        `);

        if (tables.length > 0) {
            return res.json({
                success: true,
                message: 'Las tablas de notificaciones ya existen',
                alreadyExists: true
            });
        }

        // Leer y ejecutar el archivo SQL
        const migrationPath = path.join(__dirname, '../../database/migrations/20251016_create_notification_system_tables_clean.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await database.sequelize.query(sql);

        console.log('✅ Migración ejecutada exitosamente');

        res.json({
            success: true,
            message: 'Migración de notificaciones ejecutada exitosamente',
            tables: '20+ tablas creadas',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al ejecutar migración',
            error: error.message
        });
    }
});

// Endpoint para verificar estado de las tablas
router.get('/check-tables', authenticateMigrationToken, async (req, res) => {
    try {
        const [tables] = await database.sequelize.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'notification%'
            ORDER BY table_name
        `);

        res.json({
            success: true,
            notificationTables: tables.map(t => t.table_name),
            count: tables.length
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// PP-7-IMPL-1: Agregar campos de justificación a attendance
router.post('/migrate-attendance-justification', authenticateMigrationToken, async (req, res) => {
    try {
        console.log('🔄 PP-7-IMPL-1: Agregando campos de justificación a attendance...');

        const results = [];

        // 1. Verificar si las columnas ya existen
        const [existingCols] = await database.sequelize.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'attendances'
            AND column_name IN ('is_justified', 'absence_type', 'absence_reason', 'justified_by', 'justified_at', 'medical_certificate_id')
        `);

        if (existingCols.length >= 6) {
            return res.json({
                success: true,
                message: 'PP-7-IMPL-1: Columnas de justificación ya existen',
                alreadyExists: true,
                columns: existingCols.map(c => c.column_name)
            });
        }

        // 2. Agregar is_justified
        try {
            await database.sequelize.query(`
                ALTER TABLE attendances ADD COLUMN IF NOT EXISTS is_justified BOOLEAN DEFAULT false
            `);
            results.push('is_justified OK');
        } catch(e) { results.push('is_justified: ' + e.message); }

        // 3. Agregar absence_type
        try {
            await database.sequelize.query(`
                ALTER TABLE attendances ADD COLUMN IF NOT EXISTS absence_type VARCHAR(50)
            `);
            results.push('absence_type OK');
        } catch(e) { results.push('absence_type: ' + e.message); }

        // 4. Agregar absence_reason
        try {
            await database.sequelize.query(`
                ALTER TABLE attendances ADD COLUMN IF NOT EXISTS absence_reason TEXT
            `);
            results.push('absence_reason OK');
        } catch(e) { results.push('absence_reason: ' + e.message); }

        // 5. Agregar justified_by
        try {
            await database.sequelize.query(`
                ALTER TABLE attendances ADD COLUMN IF NOT EXISTS justified_by UUID
            `);
            results.push('justified_by OK');
        } catch(e) { results.push('justified_by: ' + e.message); }

        // 6. Agregar justified_at
        try {
            await database.sequelize.query(`
                ALTER TABLE attendances ADD COLUMN IF NOT EXISTS justified_at TIMESTAMP WITH TIME ZONE
            `);
            results.push('justified_at OK');
        } catch(e) { results.push('justified_at: ' + e.message); }

        // 7. Agregar medical_certificate_id
        try {
            await database.sequelize.query(`
                ALTER TABLE attendances ADD COLUMN IF NOT EXISTS medical_certificate_id INTEGER
            `);
            results.push('medical_certificate_id OK');
        } catch(e) { results.push('medical_certificate_id: ' + e.message); }

        // Verificar resultado final
        const [finalCols] = await database.sequelize.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'attendances'
            AND column_name IN ('is_justified', 'absence_type', 'absence_reason', 'justified_by', 'justified_at', 'medical_certificate_id')
            ORDER BY column_name
        `);

        console.log('✅ PP-7-IMPL-1 completado:', finalCols.length + '/6 columnas');

        res.json({
            success: true,
            message: 'PP-7-IMPL-1: Campos de justificación agregados',
            task: 'PP-7-IMPL-1',
            results: results,
            columnsCreated: finalCols.map(c => ({ name: c.column_name, type: c.data_type })),
            totalColumns: finalCols.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error PP-7-IMPL-1:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error en PP-7-IMPL-1',
            error: error.message
        });
    }
});

// Endpoint para ampliar columna de íconos
router.post('/fix-icon-column', authenticateMigrationToken, async (req, res) => {
    try {
        console.log('🔧 Ampliando columna icon...');

        await database.sequelize.query(`
            ALTER TABLE system_modules
            ALTER COLUMN icon TYPE VARCHAR(50)
        `);

        res.json({
            success: true,
            message: 'Columna icon ampliada a VARCHAR(50)'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
