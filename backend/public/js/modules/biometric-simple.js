/**
 * 🏦 SISTEMA DE CAPTURA BIOMÉTRICA PROFESIONAL
 *
 * Arquitectura enterprise como bancos:
 * - Frontend: Video + Overlay visual (óvalo guía) - SIN detección en tiempo real
 * - Backend: Validación seria con Azure Face API (99.8% precisión)
 *
 * Ventajas:
 * ✅ Rápido (no carga modelos pesados)
 * ✅ Confiable (no se congela)
 * ✅ Profesional (guía visual como bancos)
 * ✅ Validación seria (Azure en backend)
 */

// Estado global de captura
let currentStream = null;
let captureInProgress = false;

/**
 * 📷 Iniciar captura facial profesional
 */
export async function startProfessionalFaceCapture(employeeData) {
    try {
        console.log('🏦 [PROFESSIONAL-CAPTURE] Iniciando captura facial enterprise...');

        if (captureInProgress) {
            console.warn('⚠️ Captura ya en progreso');
            return;
        }

        captureInProgress = true;

        // Crear modal con guía visual
        const modal = createCaptureModalWithGuide();
        document.body.appendChild(modal);

        // Acceder a cámara
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });

        currentStream = stream;

        const video = modal.querySelector('#capture-video');
        video.srcObject = stream;
        await video.play();

        // Ajustar canvas al tamaño del video
        const canvas = modal.querySelector('#capture-canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        console.log('✅ [PROFESSIONAL-CAPTURE] Cámara iniciada - esperando captura del usuario');

    } catch (error) {
        console.error('❌ [PROFESSIONAL-CAPTURE] Error:', error);
        captureInProgress = false;
        showError('No se pudo acceder a la cámara. Verifique los permisos.');
    }
}

/**
 * 🎨 Crear modal con guía visual profesional (óvalo como bancos)
 */
function createCaptureModalWithGuide() {
    const modal = document.createElement('div');
    modal.className = 'biometric-capture-modal';
    modal.innerHTML = `
        <div class="capture-container">
            <!-- Header -->
            <div class="capture-header">
                <h3>📷 Registro Facial Biométrico</h3>
                <p class="capture-instructions">Posicione su rostro dentro del óvalo</p>
            </div>

            <!-- Video preview con overlay -->
            <div class="video-container">
                <video id="capture-video" autoplay playsinline></video>

                <!-- Óvalo guía (SVG overlay) -->
                <svg class="face-guide-oval" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <!-- Fondo oscurecido -->
                    <defs>
                        <mask id="oval-mask">
                            <rect width="100" height="100" fill="white"/>
                            <ellipse cx="50" cy="45" rx="28" ry="38" fill="black"/>
                        </mask>
                    </defs>
                    <rect width="100" height="100" fill="rgba(0,0,0,0.5)" mask="url(#oval-mask)"/>

                    <!-- Óvalo guía -->
                    <ellipse cx="50" cy="45" rx="28" ry="38"
                             fill="none"
                             stroke="#4CAF50"
                             stroke-width="0.5"
                             stroke-dasharray="2,1"
                             class="guide-oval"/>
                </svg>

                <!-- Canvas oculto para captura -->
                <canvas id="capture-canvas" style="display: none;"></canvas>
            </div>

            <!-- Instrucciones dinámicas -->
            <div class="capture-guidance">
                <div id="capture-status" class="status-ready">
                    ✓ Listo para capturar
                </div>
                <ul class="capture-tips">
                    <li>✓ Asegúrese de estar solo en el cuadro</li>
                    <li>✓ Ilumine bien su rostro</li>
                    <li>✓ Mire directamente a la cámara</li>
                    <li>✓ Retire lentes oscuros si los usa</li>
                </ul>
            </div>

            <!-- Botones de acción -->
            <div class="capture-actions">
                <button id="btn-capture" class="btn-capture">
                    📸 Capturar Rostro
                </button>
                <button id="btn-cancel" class="btn-cancel">
                    ✕ Cancelar
                </button>
            </div>

            <!-- Indicador de procesamiento -->
            <div id="processing-indicator" class="processing-indicator" style="display: none;">
                <div class="spinner"></div>
                <p>Validando con Azure Face API...</p>
            </div>
        </div>

        <style>
            .biometric-capture-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }

            .capture-container {
                background: white;
                border-radius: 16px;
                padding: 24px;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }

            .capture-header {
                text-align: center;
                margin-bottom: 20px;
            }

            .capture-header h3 {
                margin: 0 0 8px 0;
                color: #1976d2;
                font-size: 24px;
            }

            .capture-instructions {
                margin: 0;
                color: #666;
                font-size: 14px;
            }

            .video-container {
                position: relative;
                width: 100%;
                aspect-ratio: 4/3;
                border-radius: 12px;
                overflow: hidden;
                background: #000;
                margin-bottom: 20px;
            }

            #capture-video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .face-guide-oval {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }

            .guide-oval {
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { stroke-opacity: 0.8; }
                50% { stroke-opacity: 1; }
            }

            .capture-guidance {
                background: #f5f5f5;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
            }

            #capture-status {
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 12px;
                padding: 8px;
                border-radius: 4px;
                text-align: center;
            }

            .status-ready {
                background: #e8f5e9;
                color: #2e7d32;
            }

            .status-processing {
                background: #fff3e0;
                color: #e65100;
            }

            .status-error {
                background: #ffebee;
                color: #c62828;
            }

            .capture-tips {
                margin: 0;
                padding-left: 20px;
                font-size: 13px;
                color: #666;
            }

            .capture-tips li {
                margin: 4px 0;
            }

            .capture-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
            }

            .btn-capture {
                flex: 1;
                padding: 14px 24px;
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-capture:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
            }

            .btn-capture:active {
                transform: translateY(0);
            }

            .btn-cancel {
                padding: 14px 24px;
                background: #f5f5f5;
                color: #666;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-cancel:hover {
                background: #e0e0e0;
            }

            .processing-indicator {
                text-align: center;
                padding: 20px;
                background: #fff3e0;
                border-radius: 8px;
                margin-top: 16px;
            }

            .spinner {
                width: 40px;
                height: 40px;
                margin: 0 auto 12px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #1976d2;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        </style>
    `;

    // Event listeners
    const btnCapture = modal.querySelector('#btn-capture');
    const btnCancel = modal.querySelector('#btn-cancel');

    btnCapture.addEventListener('click', () => captureAndValidate(modal));
    btnCancel.addEventListener('click', () => closeCaptureModal(modal));

    return modal;
}

/**
 * 📸 Capturar foto y enviar a backend para validación Azure
 */
async function captureAndValidate(modal) {
    try {
        const video = modal.querySelector('#capture-video');
        const canvas = modal.querySelector('#capture-canvas');
        const ctx = canvas.getContext('2d');
        const status = modal.querySelector('#capture-status');
        const btnCapture = modal.querySelector('#btn-capture');
        const processingIndicator = modal.querySelector('#processing-indicator');

        // Deshabilitar botón
        btnCapture.disabled = true;
        btnCapture.textContent = '⏳ Procesando...';

        // Actualizar status
        status.className = 'status-processing';
        status.textContent = '📷 Capturando imagen...';

        // Capturar frame actual
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convertir a blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));

        console.log('📸 [CAPTURE] Imagen capturada:', {
            size: `${(blob.size / 1024).toFixed(2)} KB`,
            dimensions: `${canvas.width}x${canvas.height}`
        });

        // Mostrar indicador de procesamiento
        processingIndicator.style.display = 'block';
        status.textContent = '🌐 Validando con Azure Face API...';

        // Enviar al backend para validación con Azure
        const formData = new FormData();
        formData.append('faceImage', blob, 'face-capture.jpg');

        // Obtener employeeId del contexto actual
        const employeeId = getCurrentEmployeeId();
        if (!employeeId) {
            throw new Error('No se pudo obtener el ID del empleado');
        }

        formData.append('employeeId', employeeId);
        formData.append('quality', '0.8'); // Calidad mínima

        const response = await fetch('/api/v2/biometric-enterprise/enroll-face', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || 'token_test'}`
            },
            body: formData
        });

        const result = await response.json();

        processingIndicator.style.display = 'none';

        if (result.success) {
            // ✅ Registro exitoso
            status.className = 'status-ready';
            status.textContent = '✅ Rostro registrado exitosamente';

            console.log('✅ [AZURE-VALIDATION] Registro exitoso:', result.data);

            showSuccessMessage(`
                ✅ Registro biométrico completado

                Proveedor: ${result.data.provider || 'Azure Face API'}
                Precisión: ${result.data.accuracy || '99.8%'}
                Calidad: ${result.data.qualityScore ? (result.data.qualityScore * 100).toFixed(1) + '%' : 'N/A'}
                Confianza: ${result.data.confidenceScore ? (result.data.confidenceScore * 100).toFixed(1) + '%' : 'N/A'}
            `);

            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                closeCaptureModal(modal);
                // Recargar datos del empleado para mostrar biometría registrada
                if (typeof refreshEmployeeData === 'function') {
                    refreshEmployeeData();
                }
            }, 2000);

        } else {
            // ❌ Error de validación
            status.className = 'status-error';

            // Mensajes específicos según el error de Azure
            let errorMessage = result.message || 'Error al validar rostro';

            if (result.error === 'MULTIPLE_FACES') {
                errorMessage = '⚠️ Se detectaron múltiples personas - Asegúrese de estar solo';
            } else if (result.error === 'NO_FACE_DETECTED') {
                errorMessage = '⚠️ No se detectó ningún rostro - Acérquese a la cámara';
            } else if (result.error === 'POOR_QUALITY') {
                errorMessage = '⚠️ Calidad insuficiente - Mejore la iluminación';
            }

            status.textContent = errorMessage;

            console.error('❌ [AZURE-VALIDATION] Error:', result);

            showError(errorMessage);

            // Rehabilitar botón para reintentar
            btnCapture.disabled = false;
            btnCapture.textContent = '🔄 Reintentar Captura';
        }

    } catch (error) {
        console.error('❌ [CAPTURE] Error:', error);

        const status = modal.querySelector('#capture-status');
        const btnCapture = modal.querySelector('#btn-capture');
        const processingIndicator = modal.querySelector('#processing-indicator');

        processingIndicator.style.display = 'none';
        status.className = 'status-error';
        status.textContent = '❌ Error al procesar imagen';

        showError('Error al capturar imagen. Intente nuevamente.');

        btnCapture.disabled = false;
        btnCapture.textContent = '🔄 Reintentar';
    }
}

/**
 * 🚪 Cerrar modal y liberar cámara
 */
function closeCaptureModal(modal) {
    // Detener stream de cámara
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }

    // Remover modal
    modal.remove();

    captureInProgress = false;

    console.log('🚪 [CAPTURE] Modal cerrado y cámara liberada');
}

/**
 * 🆔 Obtener ID del empleado actual desde el contexto
 */
function getCurrentEmployeeId() {
    // 1. Intentar desde employeeRegistrationState (biometric.js)
    if (window.employeeRegistrationState) {
        if (window.employeeRegistrationState.selectedEmployee && window.employeeRegistrationState.selectedEmployee.id) {
            console.log('✅ [EMPLOYEE-ID] Obtenido desde employeeRegistrationState.selectedEmployee:', window.employeeRegistrationState.selectedEmployee.id);
            return window.employeeRegistrationState.selectedEmployee.id;
        }

        if (window.employeeRegistrationState.currentEmployee && window.employeeRegistrationState.currentEmployee.id) {
            console.log('✅ [EMPLOYEE-ID] Obtenido desde employeeRegistrationState.currentEmployee:', window.employeeRegistrationState.currentEmployee.id);
            return window.employeeRegistrationState.currentEmployee.id;
        }
    }

    // 2. Intentar obtener desde el panel de empleado visible
    const employeePanel = document.querySelector('[data-employee-id]');
    if (employeePanel) {
        const id = employeePanel.getAttribute('data-employee-id');
        console.log('✅ [EMPLOYEE-ID] Obtenido desde panel DOM:', id);
        return id;
    }

    // 3. Intentar obtener desde variable global si existe
    if (window.currentEmployeeData && window.currentEmployeeData.id) {
        console.log('✅ [EMPLOYEE-ID] Obtenido desde currentEmployeeData:', window.currentEmployeeData.id);
        return window.currentEmployeeData.id;
    }

    console.error('❌ [EMPLOYEE-ID] No se pudo obtener el ID del empleado actual');
    console.error('   employeeRegistrationState:', window.employeeRegistrationState);
    console.error('   currentEmployeeData:', window.currentEmployeeData);
    return null;
}

/**
 * ✅ Mostrar mensaje de éxito
 */
function showSuccessMessage(message) {
    alert(message); // Temporal - reemplazar con notificación elegante
}

/**
 * ❌ Mostrar mensaje de error
 */
function showError(message) {
    alert(message); // Temporal - reemplazar con notificación elegante
}

// Exportar funciones públicas
window.BiometricSimple = {
    startProfessionalFaceCapture
};

console.log('✅ [BIOMETRIC-SIMPLE] Módulo cargado - Sistema profesional sin Face-API.js');
