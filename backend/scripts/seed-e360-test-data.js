/**
 * Script para generar datos de prueba para Employee 360
 * Crea: attendances, biometric_emotional_analysis
 */
const { sequelize } = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

const USER_ID = '766de495-e4f3-4e91-a509-1a495c52e15c'; // Admin ISI
const COMPANY_ID = 11;

async function seedData() {
    try {
        console.log('=== CREANDO DATOS DE PRUEBA PARA E360 ===\n');

        // 1. CREAR REGISTROS DE ASISTENCIA (últimos 30 días)
        console.log('1. Creando registros de asistencia...');
        const attendanceRecords = [];
        const now = new Date();

        for (let i = 0; i < 30; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            const checkIn = new Date(date);
            checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30), 0);

            const checkOut = new Date(date);
            checkOut.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 30), 0);

            const workingHours = (checkOut - checkIn) / (1000 * 60 * 60);

            // Algunos días con tardanza
            const isLate = Math.random() > 0.8;
            const status = isLate ? 'late' : 'present';

            // Métodos válidos: fingerprint, face, pin, manual, mobile
            const methods = ['fingerprint', 'face', 'face', 'fingerprint']; // mayormente biométrico
            const method = methods[Math.floor(Math.random() * methods.length)];

            attendanceRecords.push({
                id: uuidv4(),
                date: date.toISOString().split('T')[0],
                checkInTime: checkIn.toISOString(),
                checkOutTime: checkOut.toISOString(),
                checkInMethod: method,
                checkOutMethod: method,
                workingHours: workingHours.toFixed(2),
                status: status,
                UserId: USER_ID,
                company_id: COMPANY_ID,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        // Insertar asistencias
        for (const att of attendanceRecords) {
            await sequelize.query(`
                INSERT INTO attendances (id, date, "checkInTime", "checkOutTime", "checkInMethod", "checkOutMethod", "workingHours", status, "UserId", company_id, "createdAt", "updatedAt")
                VALUES (:id, :date, :checkInTime, :checkOutTime, :checkInMethod, :checkOutMethod, :workingHours, :status, :UserId, :company_id, :createdAt, :updatedAt)
                ON CONFLICT (id) DO NOTHING
            `, { replacements: att });
        }
        console.log(`   ✓ Creados ${attendanceRecords.length} registros de asistencia`);

        // 2. CREAR REGISTROS DE ANÁLISIS EMOCIONAL BIOMÉTRICO
        console.log('\n2. Creando registros de análisis emocional biométrico...');
        const emotionalRecords = [];

        for (let i = 0; i < 30; i++) {
            const timestamp = new Date(now);
            timestamp.setDate(timestamp.getDate() - i);
            timestamp.setHours(8, Math.floor(Math.random() * 30), 0);

            // Skip weekends
            if (timestamp.getDay() === 0 || timestamp.getDay() === 6) continue;

            // Generar emociones aleatorias (suman aproximadamente 1.0)
            const happiness = Math.random() * 0.6 + 0.2; // 0.2 - 0.8
            const neutral = Math.random() * 0.3; // 0 - 0.3
            const remaining = 1 - happiness - neutral;

            emotionalRecords.push({
                company_id: COMPANY_ID,
                user_id: USER_ID,
                scan_timestamp: timestamp.toISOString(),
                emotion_anger: Math.random() * remaining * 0.2,
                emotion_contempt: Math.random() * remaining * 0.1,
                emotion_disgust: Math.random() * remaining * 0.1,
                emotion_fear: Math.random() * remaining * 0.2,
                emotion_happiness: happiness,
                emotion_neutral: neutral,
                emotion_sadness: Math.random() * remaining * 0.2,
                emotion_surprise: Math.random() * remaining * 0.2,
                dominant_emotion: happiness > 0.5 ? 'happiness' : (neutral > 0.3 ? 'neutral' : 'sadness'),
                confidence_score: 0.85 + Math.random() * 0.1,
                fatigue_index: Math.random() * 0.3,
                stress_index: Math.random() * 0.4,
                created_at: new Date().toISOString()
            });
        }

        // Verificar si las columnas existen antes de insertar
        const [cols] = await sequelize.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'biometric_emotional_analysis'"
        );
        const colNames = cols.map(c => c.column_name);
        console.log('   Columnas disponibles:', colNames.slice(0, 15).join(', '), '...');

        // Insertar solo columnas que existen
        for (const rec of emotionalRecords) {
            const insertCols = [];
            const insertVals = [];

            if (colNames.includes('company_id')) { insertCols.push('company_id'); insertVals.push(rec.company_id); }
            if (colNames.includes('user_id')) { insertCols.push('user_id'); insertVals.push(`'${rec.user_id}'`); }
            if (colNames.includes('scan_timestamp')) { insertCols.push('scan_timestamp'); insertVals.push(`'${rec.scan_timestamp}'`); }
            if (colNames.includes('emotion_anger')) { insertCols.push('emotion_anger'); insertVals.push(rec.emotion_anger.toFixed(4)); }
            if (colNames.includes('emotion_contempt')) { insertCols.push('emotion_contempt'); insertVals.push(rec.emotion_contempt.toFixed(4)); }
            if (colNames.includes('emotion_disgust')) { insertCols.push('emotion_disgust'); insertVals.push(rec.emotion_disgust.toFixed(4)); }
            if (colNames.includes('emotion_fear')) { insertCols.push('emotion_fear'); insertVals.push(rec.emotion_fear.toFixed(4)); }
            if (colNames.includes('emotion_happiness')) { insertCols.push('emotion_happiness'); insertVals.push(rec.emotion_happiness.toFixed(4)); }
            if (colNames.includes('emotion_neutral')) { insertCols.push('emotion_neutral'); insertVals.push(rec.emotion_neutral.toFixed(4)); }
            if (colNames.includes('emotion_sadness')) { insertCols.push('emotion_sadness'); insertVals.push(rec.emotion_sadness.toFixed(4)); }
            if (colNames.includes('emotion_surprise')) { insertCols.push('emotion_surprise'); insertVals.push(rec.emotion_surprise.toFixed(4)); }
            if (colNames.includes('dominant_emotion')) { insertCols.push('dominant_emotion'); insertVals.push(`'${rec.dominant_emotion}'`); }
            if (colNames.includes('confidence_score')) { insertCols.push('confidence_score'); insertVals.push(rec.confidence_score.toFixed(4)); }
            if (colNames.includes('fatigue_index')) { insertCols.push('fatigue_index'); insertVals.push(rec.fatigue_index.toFixed(4)); }
            if (colNames.includes('stress_index')) { insertCols.push('stress_index'); insertVals.push(rec.stress_index.toFixed(4)); }
            if (colNames.includes('created_at')) { insertCols.push('created_at'); insertVals.push(`'${rec.created_at}'`); }

            if (insertCols.length > 0) {
                await sequelize.query(`
                    INSERT INTO biometric_emotional_analysis (${insertCols.join(', ')})
                    VALUES (${insertVals.join(', ')})
                `);
            }
        }
        console.log(`   ✓ Creados ${emotionalRecords.length} registros de análisis emocional`);

        // 3. VERIFICAR DATOS CREADOS
        console.log('\n3. Verificando datos creados...');
        const [attCount] = await sequelize.query('SELECT COUNT(*) as total FROM attendances WHERE company_id = 11');
        const [bioCount] = await sequelize.query('SELECT COUNT(*) as total FROM biometric_emotional_analysis WHERE company_id = 11');

        console.log(`   - attendances: ${attCount[0].total} registros`);
        console.log(`   - biometric_emotional_analysis: ${bioCount[0].total} registros`);

        console.log('\n=== DATOS DE PRUEBA CREADOS EXITOSAMENTE ===');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

seedData();
