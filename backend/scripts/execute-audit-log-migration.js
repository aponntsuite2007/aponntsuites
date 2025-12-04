/**
 * Script simple para ejecutar migración via API
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const options = {
    hostname: 'localhost',
    port: 9998,
    path: '/api/temp/run-audit-migration',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('🚀 Ejecutando migración via API...\n');

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            if (response.success) {
                console.log('✅ Migración completada exitosamente');
                console.log('\n📋 Detalles:');
                console.log(JSON.stringify(response, null, 2));
            } else {
                console.error('❌ Error en migración:', response.error);
            }
        } catch (e) {
            console.error('❌ Error parseando respuesta:', e.message);
            console.error('Respuesta raw:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error ejecutando request:', error.message);
    console.error('\n⚠️ ¿Está el servidor corriendo en puerto 9998?');
});

req.end();
