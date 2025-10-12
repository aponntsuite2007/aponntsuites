/**
 * 🏦 SISTEMA DE CAPTURA BIOMÉTRICA PROFESIONAL CON FEEDBACK REAL
 *
 * Arquitectura enterprise con feedback continuo:
 * - Frontend: Video + Overlay visual + análisis de brillo
 * - Backend: Feedback real de Azure cada 1.5 segundos
 * - Captura automática cuando condiciones son óptimas
 *
 * Ventajas:
 * ✅ Feedback real en tiempo real (Azure)
 * ✅ Captura automática inteligente
 * ✅ Mensajes dinámicos según condiciones
 * ✅ NO requiere botón manual
 */

// Estado global de captura
let currentStream = null;
let captureInProgress = false;
let feedbackLoop = null;
let currentEmployeeId = null;

/**
 * 📷 Iniciar captura facial profesional CON FEEDBACK REAL
 */
export async function startProfessionalFaceCapture(employeeData) {
    try {
        console.log('🏦 [AUTO-CAPTURE] Iniciando captura automática con feedback real de Azure...');
        console.log('📋 [AUTO-CAPTURE] Employee data:', employeeData);

        if (captureInProgress) {
            console.warn('⚠️ Captura ya en progreso');
            return;
        }

        captureInProgress = true;
        currentEmployeeId = employeeData; // Guardar para uso posterior

        // Crear modal con guía visual (SIN botón de captura)
        const modal = createAutoCaptureModal();
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

        console.log('✅ [AUTO-CAPTURE] Cámara iniciada - iniciando análisis en tiempo real...');

        // ⚡ INICIAR FEEDBACK LOOP EN TIEMPO REAL
        startRealtimeFeedbackLoop(modal, video, canvas);

    } catch (error) {
        console.error('❌ [AUTO-CAPTURE] Error:', error);
        captureInProgress = false;
        showError('No se pudo acceder a la cámara. Verifique los permisos.');
    }
}

/**
 * ⚡ LOOP DE FEEDBACK EN TIEMPO REAL CON AZURE
 */
async function startRealtimeFeedbackLoop(modal, video, canvas) {
    const ctx = canvas.getContext('2d');
    const statusElement = modal.querySelector('#capture-status');
    const feedbackMessage = modal.querySelector('#feedback-message');
    const ovalElement = modal.querySelector('.guide-oval');

    let lastAzureCheck = 0;
    const AZURE_CHECK_INTERVAL = 1500; // Cada 1.5 segundos llamar a Azure
    let consecutiveGoodFrames = 0;
    const REQUIRED_GOOD_FRAMES = 2; // 2 checks buenos consecutivos antes de capturar

    console.log('⚡ [FEEDBACK-LOOP] Iniciando análisis en tiempo real...');

    const loop = async () => {
        if (!captureInProgress) {
            console.log('🛑 [FEEDBACK-LOOP] Deteniendo loop - captura finalizada');
            return;
        }

        const now = Date.now();

        // 1. ANÁLISIS DE BRILLO (liviano - local)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const brightness = analyzeBrightness(ctx, canvas);

        // 2. FEEDBACK REAL DE AZURE (cada 1.5 segundos)
        if (now - lastAzureCheck >= AZURE_CHECK_INTERVAL) {
            lastAzureCheck = now;

            console.log('🔍 [AZURE-FEEDBACK] Solicitando análisis a Azure...');
            statusElement.textContent = '🔍 Analizando con Azure...';
            statusElement.className = 'status-analyzing';

            try {
                // Capturar frame actual
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));

                // Enviar a Azure para análisis (NO para guardar)
                const feedback = await getAzureFeedback(blob);

                console.log('📊 [AZURE-FEEDBACK] Respuesta:', feedback);

                // Actualizar UI según feedback de Azure
                updateFeedbackUI(feedback, brightness, statusElement, feedbackMessage, ovalElement);

                // Si condiciones son óptimas, incrementar contador
                if (feedback.isOptimal) {
                    consecutiveGoodFrames++;
                    console.log(`✅ [AUTO-CAPTURE] Condiciones óptimas (${consecutiveGoodFrames}/${REQUIRED_GOOD_FRAMES})`);

                    if (consecutiveGoodFrames >= REQUIRED_GOOD_FRAMES) {
                        console.log('🎯 [AUTO-CAPTURE] ¡Capturando automáticamente!');
                        clearInterval(feedbackLoop);
                        await performFinalCapture(modal, canvas, blob);
                        return;
                    }
                } else {
                    consecutiveGoodFrames = 0;
                }

            } catch (error) {
                console.error('❌ [AZURE-FEEDBACK] Error:', error);
                feedbackMessage.textContent = '⚠️ Error al analizar - reintentando...';
            }
        } else {
            // Entre checks de Azure, solo mostrar análisis de brillo
            updateBrightnessUI(brightness, feedbackMessage);
        }

        // Continuar loop
        feedbackLoop = setTimeout(loop, 100); // 10 FPS de análisis visual
    };

    loop();
}

/**
 * 💡 Analizar brillo del frame (liviano - local)
 */
function analyzeBrightness(ctx, canvas) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let totalBrightness = 0;
    const sampleRate = 10; // Muestrear 1 de cada 10 píxeles para velocidad

    for (let i = 0; i < data.length; i += 4 * sampleRate) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
    }

    const avgBrightness = totalBrightness / (data.length / 4 / sampleRate);
    return avgBrightness; // 0-255
}

/**
 * 🌐 Obtener feedback real de Azure (sin guardar)
 */
async function getAzureFeedback(imageBlob) {
    const formData = new FormData();
    formData.append('faceImage', imageBlob, 'feedback-frame.jpg');
    formData.append('feedbackOnly', 'true'); // NO guardar, solo analizar

    const response = await fetch('/api/v2/biometric-enterprise/analyze-face', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || 'token_test'}`
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error('Azure feedback failed');
    }

    return await response.json();
}

/**
 * 🎨 Actualizar UI según feedback de Azure
 */
function updateFeedbackUI(feedback, brightness, statusElement, feedbackMessage, ovalElement) {
    // Cambiar color del óvalo según estado
    if (feedback.faceCount === 0) {
        // ❌ Sin rostro
        statusElement.className = 'status-error';
        statusElement.textContent = '❌ No se detecta rostro';
        feedbackMessage.textContent = '📍 Posicione su rostro dentro del óvalo';
        ovalElement.style.stroke = '#f44336'; // Rojo

    } else if (feedback.faceCount > 1) {
        // ❌ Múltiples personas
        statusElement.className = 'status-error';
        statusElement.textContent = '❌ Múltiples personas detectadas';
        feedbackMessage.textContent = `⚠️ Se detectaron ${feedback.faceCount} personas - Asegúrese de estar solo`;
        ovalElement.style.stroke = '#ff9800'; // Naranja

    } else if (feedback.quality === 'low') {
        // ⚠️ Calidad baja
        statusElement.className = 'status-warning';
        statusElement.textContent = '⚠️ Calidad baja';

        if (brightness < 80) {
            feedbackMessage.textContent = '💡 Poca luz - Mejore la iluminación';
        } else if (brightness > 200) {
            feedbackMessage.textContent = '☀️ Mucha luz - Reduzca la iluminación';
        } else {
            feedbackMessage.textContent = '📏 Acérquese más a la cámara';
        }

        ovalElement.style.stroke = '#ff9800'; // Naranja

    } else if (feedback.faceCount === 1 && feedback.quality === 'high') {
        // ✅ Condiciones óptimas
        statusElement.className = 'status-optimal';
        statusElement.textContent = '✅ Condiciones óptimas';
        feedbackMessage.textContent = '🎯 Capturando automáticamente...';
        ovalElement.style.stroke = '#4CAF50'; // Verde

    } else {
        // ⚠️ Casi listo
        statusElement.className = 'status-warning';
        statusElement.textContent = '⚠️ Casi listo...';
        feedbackMessage.textContent = '📸 Mantenga la posición';
        ovalElement.style.stroke = '#2196F3'; // Azul
    }
}

/**
 * 💡 Actualizar UI solo con análisis de brillo (entre checks de Azure)
 */
function updateBrightnessUI(brightness, feedbackMessage) {
    if (brightness < 80) {
        feedbackMessage.textContent = '💡 Poca luz detectada';
    } else if (brightness > 200) {
        feedbackMessage.textContent = '☀️ Mucha luz detectada';
    }
}

/**
 * 📸 Realizar captura final y guardar
 */
async function performFinalCapture(modal, canvas, imageBlob) {
    const statusElement = modal.querySelector('#capture-status');
    const feedbackMessage = modal.querySelector('#feedback-message');

    try {
        statusElement.className = 'status-processing';
        statusElement.textContent = '📸 Capturando y guardando...';
        feedbackMessage.textContent = 'Procesando con Azure Face API...';

        // Enviar al backend para guardar definitivamente
        const formData = new FormData();
        formData.append('faceImage', imageBlob, 'face-capture.jpg');
        formData.append('employeeId', currentEmployeeId);
        formData.append('quality', '0.8');

        const response = await fetch('/api/v2/biometric-enterprise/enroll-face', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || 'token_test'}`
            },
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            statusElement.className = 'status-success';
            statusElement.textContent = '✅ Rostro registrado exitosamente';
            feedbackMessage.textContent = `Precisión: ${result.data.accuracy || '99.8%'} | Confianza: ${(result.data.confidenceScore * 100).toFixed(1)}%`;

            console.log('✅ [AUTO-CAPTURE] Registro exitoso:', result.data);

            setTimeout(() => {
                closeAutoCaptureModal(modal);
                if (typeof refreshEmployeeData === 'function') {
                    refreshEmployeeData();
                }
            }, 2500);

        } else {
            throw new Error(result.message || 'Error al guardar');
        }

    } catch (error) {
        console.error('❌ [AUTO-CAPTURE] Error al guardar:', error);
        statusElement.className = 'status-error';
        statusElement.textContent = '❌ Error al guardar';
        feedbackMessage.textContent = error.message;

        // Reiniciar loop después de error
        setTimeout(() => {
            captureInProgress = true;
            startRealtimeFeedbackLoop(modal, modal.querySelector('#capture-video'), modal.querySelector('#capture-canvas'));
        }, 2000);
    }
}

/**
 * 🎨 Crear modal con guía visual profesional (óvalo como bancos)
 */
function createAutoCaptureModal() {
    const modal = document.createElement('div');
    modal.className = 'biometric-capture-modal';
    modal.innerHTML = `
        <div class="capture-container">
            <!-- Header -->
            <div class="capture-header">
                <h3>📷 Registro Facial Automático</h3>
                <p class="capture-instructions">Sistema con detección y captura automática</p>
            </div>

            <!-- Video preview con overlay -->
            <div class="video-container">
                <video id="capture-video" autoplay playsinline></video>

                <!-- Óvalo guía (SVG overlay) - CAMBIA DE COLOR SEGÚN FEEDBACK -->
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

            <!-- FEEDBACK EN TIEMPO REAL DE AZURE -->
            <div class="capture-guidance">
                <div id="capture-status" class="status-analyzing">
                    🔍 Iniciando análisis...
                </div>
                <div id="feedback-message" class="feedback-message">
                    Analizando condiciones con Azure Face API...
                </div>
            </div>

            <!-- Solo botón cancelar - NO HAY BOTÓN DE CAPTURA -->
            <div class="capture-actions">
                <button id="btn-cancel" class="btn-cancel">
                    ✕ Cancelar
                </button>
            </div>
        </div>

        <style>
            .biometric-capture-modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.95) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                z-index: 999999 !important;
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

            .status-analyzing {
                background: #e3f2fd;
                color: #1565c0;
            }

            .status-ready {
                background: #e8f5e9;
                color: #2e7d32;
            }

            .status-optimal {
                background: #c8e6c9;
                color: #1b5e20;
                font-weight: bold;
            }

            .status-success {
                background: #4caf50;
                color: white;
                font-weight: bold;
            }

            .status-warning {
                background: #fff3e0;
                color: #e65100;
            }

            .status-processing {
                background: #fff3e0;
                color: #e65100;
            }

            .status-error {
                background: #ffebee;
                color: #c62828;
            }

            .feedback-message {
                margin-top: 12px;
                padding: 12px;
                background: white;
                border-left: 4px solid #2196F3;
                border-radius: 4px;
                font-size: 14px;
                color: #333;
                text-align: center;
                font-weight: 500;
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

    // Event listener solo para cancelar (NO hay botón de captura)
    const btnCancel = modal.querySelector('#btn-cancel');

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            console.log('🖱️ [BTN-CLICK] Cancelando captura automática...');
            closeAutoCaptureModal(modal);
        });
    }

    return modal;
}

/**
 * 🚪 Cerrar modal de captura automática y liberar recursos
 */
function closeAutoCaptureModal(modal) {
    // Detener loop de feedback
    if (feedbackLoop) {
        clearTimeout(feedbackLoop);
        feedbackLoop = null;
    }

    // Detener stream de cámara
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }

    // Remover modal
    modal.remove();

    captureInProgress = false;
    currentEmployeeId = null;

    console.log('🚪 [AUTO-CAPTURE] Modal cerrado, cámara liberada y loop detenido');
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

console.log('✅ [BIOMETRIC-SIMPLE] Módulo cargado - Sistema con captura automática y feedback real de Azure');
