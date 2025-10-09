const { default: fetch } = require('node-fetch');
const FormData = require('form-data');

async function testBiometricSave() {
    try {
        console.log('🔬 [TEST] Iniciando test de guardado biométrico...');

        // Crear FormData simulando la captura biométrica
        const formData = new FormData();
        formData.append('type', 'facial');
        formData.append('quality', '0.85');
        formData.append('employeeId', '766de495-e4f3-4e91-a509-1a495c52e15c');
        formData.append('companyId', '11');

        // Crear un blob simulado (imagen pequeña)
        const fakeImageBuffer = Buffer.from('fake image data', 'utf8');
        formData.append('biometricData', fakeImageBuffer, {
            filename: 'facial_capture.jpg',
            contentType: 'image/jpeg'
        });

        console.log('📤 [TEST] Enviando datos de prueba...');
        console.log('📋 [TEST] Datos:', {
            type: 'facial',
            quality: '0.85',
            employeeId: '766de495-e4f3-4e91-a509-1a495c52e15c',
            companyId: '11',
            biometricData: 'fake blob'
        });

        const response = await fetch('http://localhost:9998/api/v1/biometric/save', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        console.log('📥 [TEST] Status:', response.status);
        console.log('📥 [TEST] Resultado:', JSON.stringify(result, null, 2));

        if (response.ok) {
            console.log('✅ [TEST] Prueba exitosa!');
        } else {
            console.log('❌ [TEST] Prueba falló:', result.message || result.error);
        }

    } catch (error) {
        console.error('💥 [TEST] Error en la prueba:', error.message);
        console.error('💥 [TEST] Stack:', error.stack);
    }
}

// Ejecutar test
testBiometricSave();