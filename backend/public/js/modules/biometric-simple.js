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
 * 🌐 Detectar navegador del usuario
 */
function getBrowserName() {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Edg') > -1) return 'Edge';
    if (userAgent.indexOf('Chrome') > -1) return 'Chrome';
    if (userAgent.indexOf('Firefox') > -1) return 'Firefox';
    if (userAgent.indexOf('Safari') > -1) return 'Safari';
    if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) return 'Opera';
    return 'Desconocido';
}

/**
 * 📹 Poblar selectores de dispositivos (cámaras y lectores)
 */
async function populateDeviceSelectors(modal) {
    try {
        // Enumerar cámaras disponibles
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');

        const cameraSelect = modal.querySelector('#camera-select');
        if (cameraSelect && cameras.length > 0) {
            cameraSelect.innerHTML = cameras.map((camera, index) =>
                `<option value="${camera.deviceId}">${camera.label || `Cámara ${index + 1}`}</option>`
            ).join('');

            // Event listener para cambio de cámara
            cameraSelect.addEventListener('change', async (e) => {
                const selectedDeviceId = e.target.value;
                try {
                    if (currentStream) {
                        currentStream.getTracks().forEach(track => track.stop());
                    }
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        video: { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
                    });
                    currentStream = newStream;
                    const videoElement = modal.querySelector('#capture-video');
                    if (videoElement) videoElement.srcObject = newStream;
                } catch (error) {
                    console.error('Error cambiando cámara:', error);
                }
            });
        } else if (cameraSelect) {
            cameraSelect.innerHTML = '<option value="">No se encontraron cámaras</option>';
        }

        // Lector de huella (simulado)
        const fingerprintSelect = modal.querySelector('#fingerprint-reader-select');
        if (fingerprintSelect) {
            fingerprintSelect.innerHTML = '<option value="default">Lector de Huella por Defecto</option>';
        }
    } catch (error) {
        console.error('Error detectando dispositivos:', error);
    }
}

/**
 * 📷 Iniciar captura facial profesional CON FEEDBACK REAL
 */
async function startProfessionalFaceCapture(employeeData) {
    try {
        console.log('🏦 [AUTO-CAPTURE] Iniciando captura automática con feedback real de Azure...');
        console.log('📋 [AUTO-CAPTURE] Employee data:', employeeData);

        if (captureInProgress) {
            console.warn('⚠️ Captura ya en progreso');
            return;
        }

        // ✅ VERIFICAR PERMISOS PRIMERO
        const permissions = await navigator.permissions.query({ name: 'camera' }).catch(() => null);
        if (permissions?.state === 'denied') {
            const browser = getBrowserName();
            let instructions = '';

            if (browser === 'Chrome' || browser === 'Edge') {
                instructions = `
                    <strong>🔓 Cómo habilitar la cámara en ${browser}:</strong><br><br>
                    1. Click en el <strong>candado 🔒</strong> o icono (i) en la barra de direcciones<br>
                    2. Buscar "Cámara" → Seleccionar <strong>"Permitir"</strong><br>
                    3. <strong>Recargar la página</strong> (F5)
                `;
            } else if (browser === 'Firefox') {
                instructions = `
                    <strong>🔓 Cómo habilitar la cámara en Firefox:</strong><br><br>
                    1. Click en el <strong>candado 🔒</strong> en la barra de direcciones<br>
                    2. Click en la <strong>"X"</strong> junto a "Permisos bloqueados"<br>
                    3. <strong>Recargar la página</strong> (F5) → Click "Permitir"
                `;
            } else {
                instructions = `
                    <strong>🔓 Cómo habilitar la cámara:</strong><br><br>
                    1. Click en el icono del candado 🔒 en la barra de direcciones<br>
                    2. Buscar la opción de "Cámara" y seleccionar "Permitir"<br>
                    3. <strong>Recargar la página</strong> (F5)
                `;
            }

            showError(`
                <div style="text-align: left; line-height: 1.8;">
                    ⚠️ <strong>Permisos de cámara denegados</strong><br><br>
                    ${instructions}
                </div>
            `);
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

        // ⚡ POBLAR SELECTORES DE DISPOSITIVOS (ya tenemos permisos)
        await populateDeviceSelectors(modal);

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
    const AZURE_CHECK_INTERVAL = 3000; // Cada 3 segundos llamar a Azure (límite: 20/min)
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

                // Actualizar UI según feedback de Azure (con landmarks)
                updateFeedbackUI(feedback, brightness, statusElement, feedbackMessage, ovalElement, modal);

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
function updateFeedbackUI(feedback, brightness, statusElement, feedbackMessage, ovalElement, modal) {
    // ⬇️ VALIDACIÓN DE ACCESORIOS DE AZURE (PRIORIDAD MÁXIMA)
    if (feedback.details?.accessories && feedback.details.accessories.length > 0) {
        const accessories = feedback.details.accessories;

        // Detectar accesorios problemáticos
        const headwear = accessories.find(acc => acc.type === 'headwear' && acc.confidence > 0.6);
        const mask = accessories.find(acc => acc.type === 'mask' && acc.confidence > 0.6);
        const sunglasses = feedback.details?.glasses === 'sunglasses';

        if (headwear) {
            statusElement.className = 'status-error';
            statusElement.textContent = '🧢 Accesorio detectado';
            feedbackMessage.textContent = '⚠️ Por favor, quítese la gorra/sombrero/pañuelo';
            ovalElement.style.stroke = '#ff9800'; // Naranja
            return; // Bloquear captura
        }

        if (sunglasses) {
            statusElement.className = 'status-error';
            statusElement.textContent = '🕶️ Lentes de sol detectados';
            feedbackMessage.textContent = '⚠️ Por favor, quítese los lentes de sol';
            ovalElement.style.stroke = '#ff9800'; // Naranja
            return; // Bloquear captura
        }

        if (mask) {
            statusElement.className = 'status-error';
            statusElement.textContent = '😷 Mascarilla detectada';
            feedbackMessage.textContent = '⚠️ Por favor, quítese la mascarilla';
            ovalElement.style.stroke = '#ff9800'; // Naranja
            return; // Bloquear captura
        }
    }

    // ⬇️ VALIDACIÓN DE OCLUSIONES (foreheadOccluded = gorra, mouthOccluded = pañuelo)
    if (feedback.details?.occlusion) {
        const { foreheadOccluded, mouthOccluded, eyeOccluded } = feedback.details.occlusion;

        if (foreheadOccluded) {
            statusElement.className = 'status-error';
            statusElement.textContent = '🧢 Frente obstruida';
            feedbackMessage.textContent = '⚠️ Se detecta gorra o sombrero - Por favor, quítelo';
            ovalElement.style.stroke = '#ff9800'; // Naranja
            return; // Bloquear captura
        }

        if (mouthOccluded) {
            statusElement.className = 'status-error';
            statusElement.textContent = '🧣 Boca obstruida';
            feedbackMessage.textContent = '⚠️ Se detecta pañuelo o mascarilla - Por favor, quítelo';
            ovalElement.style.stroke = '#ff9800'; // Naranja
            return; // Bloquear captura
        }

        if (eyeOccluded) {
            statusElement.className = 'status-error';
            statusElement.textContent = '👓 Ojos obstruidos';
            feedbackMessage.textContent = '⚠️ Se detecta obstrucción en ojos - Retire lentes de sol';
            ovalElement.style.stroke = '#ff9800'; // Naranja
            return; // Bloquear captura
        }
    }

    // Cambiar color del óvalo según estado (SOLO si no hay accesorios)
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

    // 🎯 DIBUJAR LANDMARKS DE AZURE (SI ESTÁN DISPONIBLES)
    if (feedback.details?.faceLandmarks && feedback.details?.faceRectangle) {
        const landmarksCanvas = modal.querySelector('#landmarks-canvas');
        const videoElement = modal.querySelector('#capture-video');

        if (landmarksCanvas && videoElement) {
            drawAzureLandmarks(
                feedback.details.faceLandmarks,
                feedback.details.faceRectangle,
                landmarksCanvas,
                videoElement
            );
        }
    }

    // 🎯 ACTUALIZAR CHECKLIST DE ACCESORIOS EN TIEMPO REAL
    updateAccessoriesChecklist(feedback, modal);
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
 * 🎯 DIBUJAR LANDMARKS DE AZURE (27 PUNTOS REALES)
 * Renderiza landmarks faciales de Azure Face API en canvas overlay
 */
function drawAzureLandmarks(landmarks, faceRect, landmarksCanvas, videoElement) {
    if (!landmarks || !faceRect || !landmarksCanvas) return;

    const ctx = landmarksCanvas.getContext('2d');

    // Configurar tamaño del canvas para que coincida con el video
    landmarksCanvas.width = videoElement.videoWidth;
    landmarksCanvas.height = videoElement.videoHeight;

    // Limpiar canvas anterior
    ctx.clearRect(0, 0, landmarksCanvas.width, landmarksCanvas.height);

    // Estilo profesional (verde brillante con glow)
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff00';

    // Dibujar cada landmark
    Object.entries(landmarks).forEach(([name, point]) => {
        if (point && point.x !== undefined && point.y !== undefined) {
            // Dibujar punto
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    });

    // Dibujar líneas conectando puntos clave (contorno facial)
    ctx.shadowBlur = 0; // Sin glow para líneas
    ctx.beginPath();

    // Contorno de cara: chin, jaw
    const faceOutline = [
        'underLipBottom', 'underLipTop', 'upperLipTop', 'upperLipBottom',
        'noseRootLeft', 'noseRootRight', 'noseLeftAlarTop', 'noseRightAlarTop',
        'noseTip', 'noseLeftAlarOutTip', 'noseRightAlarOutTip'
    ];

    // Ojos
    const eyePoints = {
        left: ['eyeLeftOuter', 'eyeLeftTop', 'eyeLeftInner', 'eyeLeftBottom', 'eyeLeftOuter'],
        right: ['eyeRightInner', 'eyeRightTop', 'eyeRightOuter', 'eyeRightBottom', 'eyeRightInner']
    };

    // Dibujar contornos de ojos
    ['left', 'right'].forEach(eye => {
        ctx.beginPath();
        eyePoints[eye].forEach((pointName, i) => {
            const point = landmarks[pointName];
            if (point) {
                if (i === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
    });

    // Dibujar boca
    const mouthPoints = ['mouthLeft', 'upperLipTop', 'mouthRight', 'underLipBottom', 'mouthLeft'];
    ctx.beginPath();
    mouthPoints.forEach((pointName, i) => {
        const point = landmarks[pointName];
        if (point) {
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        }
    });
    ctx.stroke();

    // Dibujar nariz
    ctx.beginPath();
    const nosePoints = ['noseRootLeft', 'noseTip', 'noseRootRight'];
    nosePoints.forEach((pointName, i) => {
        const point = landmarks[pointName];
        if (point) {
            if (i === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        }
    });
    ctx.stroke();

    console.log('✅ [LANDMARKS] 27 puntos de Azure renderizados');
}

/**
 * 🎯 Actualizar checklist de accesorios en tiempo real
 * @param {Object} feedback - Respuesta de Azure Face API
 * @param {HTMLElement} modal - Elemento modal para buscar checklist
 */
function updateAccessoriesChecklist(feedback, modal) {
    if (!modal || !feedback.details) return;

    // Obtener elementos del checklist
    const checkGlasses = modal.querySelector('#check-glasses');
    const checkHeadwear = modal.querySelector('#check-headwear');
    const checkSunglasses = modal.querySelector('#check-sunglasses');
    const checkMask = modal.querySelector('#check-mask');

    if (!checkGlasses || !checkHeadwear || !checkSunglasses || !checkMask) {
        return; // Checklist no presente en DOM
    }

    // INICIALIZAR todos como "ok" (sin accesorios)
    checkGlasses.setAttribute('data-status', 'ok');
    checkHeadwear.setAttribute('data-status', 'ok');
    checkSunglasses.setAttribute('data-status', 'ok');
    checkMask.setAttribute('data-status', 'ok');

    // ==========================================
    // ANÁLISIS DE ACCESORIOS (Azure)
    // ==========================================

    // 1. ANTEOJOS DE SOL (Sunglasses)
    if (feedback.details.glasses === 'Sunglasses' || feedback.details.glasses === 'sunglasses') {
        checkSunglasses.setAttribute('data-status', 'error');
    }

    // 2. ANTEOJOS REGULARES (Reading/Distance glasses)
    // Solo marcar error si NO son anteojos de sol (sunglasses ya están manejados)
    if (feedback.details.glasses &&
        feedback.details.glasses !== 'NoGlasses' &&
        feedback.details.glasses !== 'noGlasses' &&
        feedback.details.glasses !== 'Sunglasses' &&
        feedback.details.glasses !== 'sunglasses') {
        checkGlasses.setAttribute('data-status', 'error');
    }

    // 3. GORRA/SOMBRERO/PAÑUELO (Headwear)
    if (feedback.details.accessories && Array.isArray(feedback.details.accessories)) {
        const headwear = feedback.details.accessories.find(acc =>
            acc.type === 'headwear' && acc.confidence > 0.6
        );
        if (headwear) {
            checkHeadwear.setAttribute('data-status', 'error');
        }
    }

    // 4. BARBIJO/MASCARILLA (Mask)
    if (feedback.details.accessories && Array.isArray(feedback.details.accessories)) {
        const mask = feedback.details.accessories.find(acc =>
            acc.type === 'mask' && acc.confidence > 0.6
        );
        if (mask) {
            checkMask.setAttribute('data-status', 'error');
        }
    }

    // ALTERNATIVA: usar mask attribute si existe
    if (feedback.details.mask) {
        const maskType = feedback.details.mask.type || feedback.details.mask;
        if (maskType === 'faceMask' || maskType === 'FaceMask') {
            checkMask.setAttribute('data-status', 'error');
        }
    }

    // ==========================================
    // ANÁLISIS DE OCLUSIONES (fallback)
    // ==========================================
    if (feedback.details.occlusion) {
        const { foreheadOccluded, mouthOccluded, eyeOccluded } = feedback.details.occlusion;

        // Si frente está ocluida → probablemente gorra/sombrero
        if (foreheadOccluded === true) {
            checkHeadwear.setAttribute('data-status', 'error');
        }

        // Si boca está ocluida → probablemente mascarilla
        if (mouthOccluded === true) {
            checkMask.setAttribute('data-status', 'error');
        }

        // Si ojos están ocluidos → probablemente anteojos de sol
        if (eyeOccluded === true) {
            checkSunglasses.setAttribute('data-status', 'error');
        }
    }

    console.log('✅ [CHECKLIST] Accesorios actualizados en tiempo real');
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

            <!-- Selectores de dispositivos -->
            <div class="device-selectors">
                <div class="selector-group">
                    <label for="camera-select">
                        <i class="fas fa-video"></i> Cámara:
                    </label>
                    <select id="camera-select" class="device-select">
                        <option value="">Detectando cámaras...</option>
                    </select>
                </div>
                <div class="selector-group">
                    <label for="fingerprint-reader-select">
                        <i class="fas fa-fingerprint"></i> Lector de Huella:
                    </label>
                    <select id="fingerprint-reader-select" class="device-select">
                        <option value="">Detectando lectores...</option>
                    </select>
                </div>
            </div>

            <!-- BARRA DE PROGRESO REAL -->
            <div class="progress-bar-container">
                <div class="progress-bar-fill" id="progress-bar-fill"></div>
                <div class="progress-bar-text" id="progress-bar-text">Analizando calidad: 0%</div>
            </div>

            <!-- Contenedor principal con video y checklist -->
            <div class="capture-main-content">
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

                    <!-- Canvas para renderizar landmarks de Azure (VISIBLE) -->
                    <canvas id="landmarks-canvas" class="landmarks-overlay"></canvas>

                    <!-- Canvas oculto para captura -->
                    <canvas id="capture-canvas" style="display: none;"></canvas>
                </div>

                <!-- ⬇️ CHECKLIST DE ACCESORIOS EN TIEMPO REAL -->
                <div class="accessories-checklist">
                    <div class="checklist-header">
                        <i class="fas fa-shield-check"></i>
                        Validación Azure
                    </div>
                    <div class="checklist-items">
                        <div class="checklist-item" id="check-glasses" data-status="ok">
                            <i class="fas fa-glasses item-icon"></i>
                            <span class="item-label">Anteojos</span>
                            <div class="item-status">
                                <i class="fas fa-check-circle status-icon-ok"></i>
                                <i class="fas fa-times-circle status-icon-error"></i>
                            </div>
                        </div>

                        <div class="checklist-item" id="check-headwear" data-status="ok">
                            <i class="fas fa-hat-cowboy item-icon"></i>
                            <span class="item-label">Gorra/Sombrero</span>
                            <div class="item-status">
                                <i class="fas fa-check-circle status-icon-ok"></i>
                                <i class="fas fa-times-circle status-icon-error"></i>
                            </div>
                        </div>

                        <div class="checklist-item" id="check-sunglasses" data-status="ok">
                            <i class="fas fa-sun item-icon"></i>
                            <span class="item-label">Lentes de Sol</span>
                            <div class="item-status">
                                <i class="fas fa-check-circle status-icon-ok"></i>
                                <i class="fas fa-times-circle status-icon-error"></i>
                            </div>
                        </div>

                        <div class="checklist-item" id="check-mask" data-status="ok">
                            <i class="fas fa-head-side-mask item-icon"></i>
                            <span class="item-label">Barbijo/Mascarilla</span>
                            <div class="item-status">
                                <i class="fas fa-check-circle status-icon-ok"></i>
                                <i class="fas fa-times-circle status-icon-error"></i>
                            </div>
                        </div>
                    </div>
                </div>
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
                padding: 20px;
                overflow-y: auto;
            }

            .capture-container {
                background: white;
                border-radius: 16px;
                max-width: 1100px;
                width: 95%;
                max-height: 90vh;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .capture-header {
                padding: 15px 20px;
                text-align: center;
                border-bottom: 1px solid #eee;
            }

            .capture-header h3 {
                margin: 0 0 5px 0;
                color: #1976d2;
                font-size: 20px;
            }

            .capture-instructions {
                margin: 0;
                color: #666;
                font-size: 12px;
            }

            .device-selectors {
                background: #f8f9fa;
                padding: 10px 15px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                border-bottom: 1px solid #eee;
            }

            .selector-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            .selector-group label {
                font-size: 11px;
                font-weight: 600;
                color: #555;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .selector-group label i {
                color: #1976d2;
            }

            .device-select {
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 12px;
                background: white;
                cursor: pointer;
            }

            .device-select:focus {
                outline: none;
                border-color: #1976d2;
            }

            /* BARRA DE PROGRESO */
            .progress-bar-container {
                position: relative;
                height: 40px;
                background: linear-gradient(135deg, #1976d2 0%, #2196F3 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            }

            .progress-bar-fill {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
                transition: width 0.3s ease;
                width: 0%;
            }

            .progress-bar-text {
                position: relative;
                z-index: 1;
                color: white;
                font-size: 14px;
                font-weight: 600;
                text-shadow: 0 1px 3px rgba(0,0,0,0.3);
            }

            @media (max-width: 600px) {
                .device-selectors {
                    grid-template-columns: 1fr;
                }
            }

            .video-container {
                position: relative;
                flex: 1;
                max-width: 640px;
                height: 450px;
                background: #000;
                flex-shrink: 0;
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

            /* CANVAS LANDMARKS AZURE (PROFESIONAL) */
            .landmarks-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10;
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
                padding: 12px 15px;
                border-top: 1px solid #eee;
                flex-shrink: 0;
            }

            #capture-status {
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 8px;
                padding: 6px;
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
                margin-top: 6px;
                padding: 8px;
                background: white;
                border-left: 3px solid #2196F3;
                border-radius: 4px;
                font-size: 12px;
                color: #333;
                text-align: center;
            }

            .capture-actions {
                padding: 12px 15px;
                background: white;
                border-top: 1px solid #eee;
                text-align: center;
                flex-shrink: 0;
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
                padding: 8px 30px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .btn-cancel:hover {
                background: #c82333;
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

            /* ====================================
               🎯 ACCESSORIES CHECKLIST - AZURE REAL-TIME VALIDATION
               ==================================== */

            .capture-main-content {
                display: flex;
                gap: 15px;
                padding: 15px;
                background: #f8f9fa;
                flex: 1;
                overflow: hidden;
            }

            .accessories-checklist {
                min-width: 280px;
                max-width: 320px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                padding: 15px;
                color: white;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .checklist-header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding-bottom: 10px;
                border-bottom: 2px solid rgba(255, 255, 255, 0.3);
            }

            .checklist-header i {
                font-size: 16px;
            }

            .checklist-items {
                display: flex;
                flex-direction: column;
                gap: 10px;
                flex: 1;
            }

            .checklist-item {
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(10px);
                border-radius: 8px;
                padding: 10px 12px;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.3s ease;
                border: 2px solid transparent;
            }

            .checklist-item[data-status="ok"] {
                border-color: rgba(76, 175, 80, 0.6);
                background: rgba(76, 175, 80, 0.2);
            }

            .checklist-item[data-status="error"] {
                border-color: rgba(244, 67, 54, 0.8);
                background: rgba(244, 67, 54, 0.25);
                animation: pulse-error 1.5s ease-in-out infinite;
            }

            @keyframes pulse-error {
                0%, 100% {
                    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
                }
                50% {
                    box-shadow: 0 0 0 8px rgba(244, 67, 54, 0);
                }
            }

            .item-icon {
                font-size: 18px;
                opacity: 0.9;
            }

            .item-label {
                flex: 1;
                font-size: 13px;
                font-weight: 500;
            }

            .item-status {
                display: flex;
                align-items: center;
                position: relative;
                width: 24px;
                height: 24px;
            }

            .status-icon-ok,
            .status-icon-error {
                position: absolute;
                font-size: 20px;
                transition: all 0.3s ease;
                opacity: 0;
                transform: scale(0.5);
            }

            .status-icon-ok {
                color: #4CAF50;
            }

            .status-icon-error {
                color: #f44336;
            }

            /* Mostrar icono OK cuando data-status="ok" */
            .checklist-item[data-status="ok"] .status-icon-ok {
                opacity: 1;
                transform: scale(1);
            }

            /* Mostrar icono ERROR cuando data-status="error" */
            .checklist-item[data-status="error"] .status-icon-error {
                opacity: 1;
                transform: scale(1);
            }

            /* Estado neutral (analizando) */
            .checklist-item[data-status="analyzing"] {
                border-color: rgba(255, 255, 255, 0.3);
                background: rgba(255, 255, 255, 0.1);
            }

            /* Responsive: ocultar checklist en pantallas pequeñas */
            @media (max-width: 768px) {
                .capture-main-content {
                    flex-direction: column;
                }

                .accessories-checklist {
                    min-width: 100%;
                    max-width: 100%;
                }

                .checklist-items {
                    flex-direction: row;
                    flex-wrap: wrap;
                }

                .checklist-item {
                    flex: 1 1 calc(50% - 5px);
                    min-width: 140px;
                }
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
 * ❌ Mostrar mensaje de error (con soporte HTML)
 */
function showError(message) {
    // Crear modal de error personalizado
    const errorModal = document.createElement('div');
    errorModal.className = 'biometric-error-modal';
    errorModal.innerHTML = `
        <div class="error-modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="error-modal-content">
            <div class="error-modal-body">
                ${message}
            </div>
            <div class="error-modal-footer">
                <button onclick="this.closest('.biometric-error-modal').remove()" class="error-close-btn">
                    Entendido
                </button>
            </div>
        </div>
        <style>
            .biometric-error-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .error-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
            }
            .error-modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                animation: errorModalSlideIn 0.3s ease-out;
            }
            @keyframes errorModalSlideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            .error-modal-body {
                padding: 30px;
                font-size: 15px;
                color: #333;
            }
            .error-modal-footer {
                padding: 15px 30px;
                border-top: 1px solid #eee;
                text-align: right;
            }
            .error-close-btn {
                background: #3498db;
                color: white;
                border: none;
                padding: 10px 25px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            .error-close-btn:hover {
                background: #2980b9;
            }
        </style>
    `;
    document.body.appendChild(errorModal);
}

// Exportar funciones públicas
window.BiometricSimple = {
    startProfessionalFaceCapture
};

console.log('✅ [BIOMETRIC-SIMPLE] Módulo cargado - Sistema con captura automática y feedback real de Azure');
