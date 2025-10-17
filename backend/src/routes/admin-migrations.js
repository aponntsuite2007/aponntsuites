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
