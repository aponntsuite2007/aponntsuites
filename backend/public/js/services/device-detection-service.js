/**
 * 🎥📱👆🎤 SERVICIO DE DETECCIÓN DE DISPOSITIVOS BIOMÉTRICOS
 * ========================================================
 * Detección automática de cámaras, micrófonos, lectores de huellas y calidad
 * Selección inteligente del mejor dispositivo disponible
 * Validación de calidad mínima para garantizar precisión biométrica
 * Guías de mejores prácticas para captura óptima
 */

class BiometricDeviceDetectionService {
    constructor() {
        this.devices = {
            cameras: [],
            microphones: [],
            speakers: [],
            fingerprintReaders: []
        };

        this.currentDevices = {
            selectedCamera: null,
            selectedMicrophone: null,
            selectedFingerprintReader: null
        };

        this.qualityThresholds = {
            camera: {
                minResolution: { width: 640, height: 480 },
                minFrameRate: 15,
                minLighting: 0.3,
                minSharpness: 0.6
            },
            microphone: {
                minSampleRate: 16000,
                minBitDepth: 16,
                maxNoiseLevel: 0.2,
                minSignalStrength: 0.4
            },
            fingerprint: {
                minDpi: 500,
                minArea: { width: 200, height: 200 },
                maxResponseTime: 2000
            }
        };

        this.isInitialized = false;
        this.onDeviceChange = null;
        this.onQualityChange = null;

        console.log('🎥 [DEVICE-DETECTION] Servicio inicializado');
    }

    /**
     * 🚀 Inicializar detección de dispositivos
     */
    async initializeDeviceDetection() {
        console.log('🔍 [DEVICE-DETECTION] Iniciando detección de dispositivos...');

        try {
            // Detectar dispositivos de media (cámaras y micrófonos)
            await this.detectMediaDevices();

            // Detectar lectores de huellas
            await this.detectFingerprintReaders();

            // Configurar monitoreo de cambios
            this.setupDeviceChangeMonitoring();

            // Seleccionar mejores dispositivos automáticamente
            await this.selectBestDevices();

            this.isInitialized = true;
            console.log('✅ [DEVICE-DETECTION] Detección inicializada correctamente');

            return {
                success: true,
                devicesFound: {
                    cameras: this.devices.cameras.length,
                    microphones: this.devices.microphones.length,
                    fingerprintReaders: this.devices.fingerprintReaders.length
                }
            };

        } catch (error) {
            console.error('❌ [DEVICE-DETECTION] Error al inicializar:', error);
            throw error;
        }
    }

    /**
     * 📹 Detectar dispositivos de media (cámaras y micrófonos)
     */
    async detectMediaDevices() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            throw new Error('API de MediaDevices no soportada en este navegador');
        }

        try {
            // Solicitar permisos primero
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

            // Enumerar dispositivos
            const devices = await navigator.mediaDevices.enumerateDevices();

            this.devices.cameras = devices.filter(device => device.kind === 'videoinput');
            this.devices.microphones = devices.filter(device => device.kind === 'audioinput');
            this.devices.speakers = devices.filter(device => device.kind === 'audiooutput');

            console.log(`📹 [DEVICE-DETECTION] Encontradas ${this.devices.cameras.length} cámaras`);
            console.log(`🎤 [DEVICE-DETECTION] Encontrados ${this.devices.microphones.length} micrófonos`);

            // DEBUG: Mostrar detalles de cada dispositivo detectado
            console.log('\n🔍 [DEBUG] DETALLES DE DISPOSITIVOS DETECTADOS:');
            console.log('================================');

            console.log('\n📹 CÁMARAS:');
            this.devices.cameras.forEach((camera, index) => {
                console.log(`   ${index + 1}. ${camera.label || 'Sin nombre'}`);
                console.log(`      - Device ID: ${camera.deviceId}`);
                console.log(`      - Group ID: ${camera.groupId || 'N/A'}`);
            });

            console.log('\n🎤 MICRÓFONOS:');
            this.devices.microphones.forEach((mic, index) => {
                console.log(`   ${index + 1}. ${mic.label || 'Sin nombre'}`);
                console.log(`      - Device ID: ${mic.deviceId}`);
                console.log(`      - Group ID: ${mic.groupId || 'N/A'}`);
            });

            console.log('\n🔊 ALTAVOCES:');
            this.devices.speakers.forEach((speaker, index) => {
                console.log(`   ${index + 1}. ${speaker.label || 'Sin nombre'}`);
                console.log(`      - Device ID: ${speaker.deviceId}`);
                console.log(`      - Group ID: ${speaker.groupId || 'N/A'}`);
            });

            console.log('================================\n');

            // Analizar calidad de cada cámara
            for (let camera of this.devices.cameras) {
                camera.quality = await this.analyzeCameraQuality(camera);
            }

            // Analizar calidad de cada micrófono
            for (let microphone of this.devices.microphones) {
                microphone.quality = await this.analyzeMicrophoneQuality(microphone);
            }

        } catch (error) {
            console.error('❌ [DEVICE-DETECTION] Error detectando dispositivos de media:', error);
            throw error;
        }
    }

    /**
     * 👆 Detectar lectores de huellas
     */
    async detectFingerprintReaders() {
        console.log('👆 [DEVICE-DETECTION] Detectando lectores de huellas reales...');

        try {
            this.devices.fingerprintReaders = [];

            // Detectar dispositivos HID (Human Interface Device) que podrían ser lectores de huellas
            if ('hid' in navigator) {
                try {
                    const hidDevices = await navigator.hid.getDevices();

                    // Filtrar dispositivos que podrían ser lectores de huellas por vendor/product ID conocidos
                    const knownFingerprintVendors = [
                        0x08ff, // AuthenTec
                        0x138a, // Validity Sensors
                        0x147e, // Upek
                        0x27c6, // Goodix
                        0x04f3, // Elan Microelectronics
                        0x1c7a, // LighTuning Technology
                        0x06cb, // Synaptics
                        0x0483  // STMicroelectronics
                    ];

                    for (const device of hidDevices) {
                        if (knownFingerprintVendors.includes(device.vendorId)) {
                            this.devices.fingerprintReaders.push({
                                id: `hid_${device.vendorId}_${device.productId}`,
                                name: device.productName || `Lector de Huellas (VID: ${device.vendorId.toString(16)})`,
                                type: 'hid',
                                vendorId: device.vendorId,
                                productId: device.productId,
                                connected: true,
                                interface: 'HID'
                            });
                        }
                    }
                } catch (hidError) {
                    console.log('ℹ️ [DEVICE-DETECTION] HID API no disponible o sin permisos');
                }
            }

            // Detectar dispositivos USB que podrían ser lectores de huellas
            if ('usb' in navigator) {
                try {
                    const usbDevices = await navigator.usb.getDevices();

                    const knownFingerprintVendors = [
                        0x08ff, // AuthenTec
                        0x138a, // Validity Sensors
                        0x147e, // Upek
                        0x27c6, // Goodix
                        0x04f3, // Elan Microelectronics
                        0x1c7a, // LighTuning Technology
                        0x06cb, // Synaptics
                        0x0483  // STMicroelectronics
                    ];

                    for (const device of usbDevices) {
                        if (knownFingerprintVendors.includes(device.vendorId)) {
                            // Evitar duplicados de HID
                            const existingDevice = this.devices.fingerprintReaders.find(
                                reader => reader.vendorId === device.vendorId && reader.productId === device.productId
                            );

                            if (!existingDevice) {
                                this.devices.fingerprintReaders.push({
                                    id: `usb_${device.vendorId}_${device.productId}`,
                                    name: device.productName || `Lector de Huellas USB (VID: ${device.vendorId.toString(16)})`,
                                    type: 'usb',
                                    vendorId: device.vendorId,
                                    productId: device.productId,
                                    connected: true,
                                    interface: 'USB'
                                });
                            }
                        }
                    }
                } catch (usbError) {
                    console.log('ℹ️ [DEVICE-DETECTION] USB API no disponible o sin permisos');
                }
            }

            // Verificar Windows Hello (si está disponible)
            if ('credentials' in navigator && 'create' in navigator.credentials) {
                try {
                    // Verificar si hay autenticadores biométricos disponibles
                    const publicKeyCredentialCreationOptions = {
                        challenge: new Uint8Array(32),
                        rp: { name: "Sistema Biométrico", id: "localhost" },
                        user: {
                            id: new Uint8Array(16),
                            name: "test@test.com",
                            displayName: "Test User"
                        },
                        pubKeyCredParams: [{alg: -7, type: "public-key"}],
                        authenticatorSelection: {
                            authenticatorAttachment: "platform",
                            userVerification: "required"
                        },
                        timeout: 5000
                    };

                    // Verificar disponibilidad sin crear credencial real
                    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

                    if (available) {
                        this.devices.fingerprintReaders.push({
                            id: 'platform_authenticator',
                            name: 'Autenticador de Plataforma (Windows Hello/TouchID)',
                            type: 'platform',
                            connected: true,
                            interface: 'WebAuthn Platform'
                        });
                    }
                } catch (webauthnError) {
                    console.log('ℹ️ [DEVICE-DETECTION] WebAuthn platform authenticator no disponible');
                }
            }

            console.log(`👆 [DEVICE-DETECTION] Encontrados ${this.devices.fingerprintReaders.length} lectores de huellas reales`);

            // DEBUG: Mostrar detalles de lectores de huellas
            console.log('\n👆 [DEBUG] LECTORES DE HUELLAS DETECTADOS:');
            console.log('==========================================');

            if (this.devices.fingerprintReaders.length === 0) {
                console.log('❌ NO SE DETECTARON LECTORES DE HUELLAS REALES');
                console.log('   Esto es CORRECTO si no hay hardware biométrico físico conectado.');
                console.log('   Si esperabas detectar un lector, verifica:');
                console.log('   - ¿Está físicamente conectado el dispositivo?');
                console.log('   - ¿Están instalados los drivers correctos?');
                console.log('   - ¿Funciona en otras aplicaciones?');
            } else {
                this.devices.fingerprintReaders.forEach((reader, index) => {
                    console.log(`\n   ${index + 1}. ${reader.name}`);
                    console.log(`      - ID: ${reader.id}`);
                    console.log(`      - Tipo: ${reader.type}`);
                    console.log(`      - Interface: ${reader.interface}`);
                    console.log(`      - Vendor ID: 0x${reader.vendorId?.toString(16) || 'N/A'}`);
                    console.log(`      - Product ID: 0x${reader.productId?.toString(16) || 'N/A'}`);
                    console.log(`      - Conectado: ${reader.connected ? '✅ Sí' : '❌ No'}`);
                });
            }

            console.log('==========================================\n');

        } catch (error) {
            console.error('❌ [DEVICE-DETECTION] Error detectando lectores de huellas:', error);
            this.devices.fingerprintReaders = [];
        }
    }

    /**
     * 📊 Analizar calidad de cámara
     */
    async analyzeCameraQuality(camera) {
        try {
            console.log(`📹 [QUALITY-ANALYSIS] Analizando cámara: ${camera.label}`);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: camera.deviceId }
            });

            const videoTrack = stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            const capabilities = videoTrack.getCapabilities();

            // Análisis de calidad
            const quality = {
                resolution: {
                    width: settings.width || 640,
                    height: settings.height || 480,
                    score: this.calculateResolutionScore(settings.width, settings.height)
                },
                frameRate: settings.frameRate || 30,
                facingMode: settings.facingMode || 'user',
                lighting: await this.analyzeLighting(stream),
                sharpness: await this.analyzeSharpness(stream),
                capabilities: capabilities,
                overallScore: 0
            };

            // Calcular puntuación general
            quality.overallScore = this.calculateOverallCameraScore(quality);

            // Cerrar stream
            stream.getTracks().forEach(track => track.stop());

            console.log(`📊 [QUALITY-ANALYSIS] Calidad cámara ${camera.label}: ${quality.overallScore.toFixed(2)}`);

            return quality;

        } catch (error) {
            console.error(`❌ [QUALITY-ANALYSIS] Error analizando cámara ${camera.label}:`, error);
            return {
                resolution: { width: 0, height: 0, score: 0 },
                frameRate: 0,
                lighting: 0,
                sharpness: 0,
                overallScore: 0,
                error: error.message
            };
        }
    }

    /**
     * 🎤 Analizar calidad de micrófono
     */
    async analyzeMicrophoneQuality(microphone) {
        try {
            console.log(`🎤 [QUALITY-ANALYSIS] Analizando micrófono: ${microphone.label}`);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: microphone.deviceId }
            });

            const audioTrack = stream.getAudioTracks()[0];
            const settings = audioTrack.getSettings();

            // Análisis de audio
            const quality = {
                sampleRate: settings.sampleRate || 44100,
                channelCount: settings.channelCount || 1,
                noiseLevel: await this.analyzeNoiseLevel(stream),
                signalStrength: await this.analyzeSignalStrength(stream),
                clarity: await this.analyzeAudioClarity(stream),
                overallScore: 0
            };

            // Calcular puntuación general
            quality.overallScore = this.calculateOverallMicrophoneScore(quality);

            // Cerrar stream
            stream.getTracks().forEach(track => track.stop());

            console.log(`📊 [QUALITY-ANALYSIS] Calidad micrófono ${microphone.label}: ${quality.overallScore.toFixed(2)}`);

            return quality;

        } catch (error) {
            console.error(`❌ [QUALITY-ANALYSIS] Error analizando micrófono ${microphone.label}:`, error);
            return {
                sampleRate: 0,
                channelCount: 0,
                noiseLevel: 1,
                signalStrength: 0,
                clarity: 0,
                overallScore: 0,
                error: error.message
            };
        }
    }

    /**
     * 💡 Analizar iluminación de video
     */
    async analyzeLighting(stream) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            video.srcObject = stream;
            video.play();

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                setTimeout(() => {
                    ctx.drawImage(video, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    let brightness = 0;
                    const pixels = imageData.data;

                    for (let i = 0; i < pixels.length; i += 4) {
                        brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
                    }

                    brightness = brightness / (pixels.length / 4) / 255;
                    resolve(Math.min(Math.max(brightness, 0), 1));
                }, 500);
            };
        });
    }

    /**
     * 🔍 Analizar nitidez de video
     */
    async analyzeSharpness(stream) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            video.srcObject = stream;
            video.play();

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                setTimeout(() => {
                    ctx.drawImage(video, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    // Algoritmo simple de detección de bordes para medir nitidez
                    const sharpness = this.calculateEdgeVariance(imageData);
                    resolve(Math.min(Math.max(sharpness, 0), 1));
                }, 500);
            };
        });
    }

    /**
     * 🔊 Analizar nivel de ruido de audio
     */
    async analyzeNoiseLevel(stream) {
        return new Promise((resolve) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();

            source.connect(analyser);
            analyser.fftSize = 256;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            setTimeout(() => {
                analyser.getByteFrequencyData(dataArray);

                let total = 0;
                for (let i = 0; i < bufferLength; i++) {
                    total += dataArray[i];
                }

                const average = total / bufferLength / 255;
                audioContext.close();
                resolve(average);
            }, 1000);
        });
    }

    /**
     * 💪 Analizar intensidad de señal de audio
     */
    async analyzeSignalStrength(stream) {
        return new Promise((resolve) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();

            source.connect(analyser);
            analyser.fftSize = 256;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            setTimeout(() => {
                analyser.getByteTimeDomainData(dataArray);

                let max = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const amplitude = Math.abs(dataArray[i] - 128);
                    max = Math.max(max, amplitude);
                }

                audioContext.close();
                resolve(max / 128);
            }, 1000);
        });
    }

    /**
     * 🎵 Analizar claridad de audio
     */
    async analyzeAudioClarity(stream) {
        // Simulación de análisis de claridad
        return 0.7 + Math.random() * 0.3;
    }

    /**
     * 📊 Calcular puntuación de resolución
     */
    calculateResolutionScore(width, height) {
        const pixels = (width || 0) * (height || 0);

        if (pixels >= 1920 * 1080) return 1.0;      // 1080p+
        if (pixels >= 1280 * 720) return 0.9;       // 720p
        if (pixels >= 640 * 480) return 0.7;        // VGA
        if (pixels >= 320 * 240) return 0.5;        // QVGA
        return 0.3;
    }

    /**
     * 📊 Calcular puntuación general de cámara
     */
    calculateOverallCameraScore(quality) {
        const weights = {
            resolution: 0.3,
            lighting: 0.25,
            sharpness: 0.25,
            frameRate: 0.2
        };

        const frameRateScore = Math.min(quality.frameRate / 30, 1);

        return (
            quality.resolution.score * weights.resolution +
            quality.lighting * weights.lighting +
            quality.sharpness * weights.sharpness +
            frameRateScore * weights.frameRate
        );
    }

    /**
     * 📊 Calcular puntuación general de micrófono
     */
    calculateOverallMicrophoneScore(quality) {
        const weights = {
            sampleRate: 0.2,
            noiseLevel: 0.3,
            signalStrength: 0.3,
            clarity: 0.2
        };

        const sampleRateScore = Math.min(quality.sampleRate / 44100, 1);
        const noiseLevelScore = 1 - quality.noiseLevel;

        return (
            sampleRateScore * weights.sampleRate +
            noiseLevelScore * weights.noiseLevel +
            quality.signalStrength * weights.signalStrength +
            quality.clarity * weights.clarity
        );
    }

    /**
     * 🔍 Calcular varianza de bordes para nitidez
     */
    calculateEdgeVariance(imageData) {
        const pixels = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        let variance = 0;
        let count = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;

                // Convertir a escala de grises
                const gray = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

                // Calcular gradiente
                const gx = pixels[((y * width) + x + 1) * 4] - pixels[((y * width) + x - 1) * 4];
                const gy = pixels[((y + 1) * width + x) * 4] - pixels[((y - 1) * width + x) * 4];

                variance += Math.sqrt(gx * gx + gy * gy);
                count++;
            }
        }

        return variance / count / 255;
    }

    /**
     * 🎯 Seleccionar mejores dispositivos automáticamente
     */
    async selectBestDevices() {
        console.log('🎯 [DEVICE-SELECTION] Seleccionando mejores dispositivos...');

        // Seleccionar mejor cámara
        if (this.devices.cameras.length > 0) {
            this.currentDevices.selectedCamera = this.devices.cameras.reduce((best, current) => {
                const currentScore = current.quality?.overallScore || 0;
                const bestScore = best.quality?.overallScore || 0;
                return currentScore > bestScore ? current : best;
            });
            console.log(`📹 [DEVICE-SELECTION] Cámara seleccionada: ${this.currentDevices.selectedCamera.label}`);
        }

        // Seleccionar mejor micrófono
        if (this.devices.microphones.length > 0) {
            this.currentDevices.selectedMicrophone = this.devices.microphones.reduce((best, current) => {
                const currentScore = current.quality?.overallScore || 0;
                const bestScore = best.quality?.overallScore || 0;
                return currentScore > bestScore ? current : best;
            });
            console.log(`🎤 [DEVICE-SELECTION] Micrófono seleccionado: ${this.currentDevices.selectedMicrophone.label}`);
        }

        // Seleccionar mejor lector de huellas
        if (this.devices.fingerprintReaders.length > 0) {
            this.currentDevices.selectedFingerprintReader = this.devices.fingerprintReaders.reduce((best, current) => {
                const currentScore = current.quality?.score || 0;
                const bestScore = best.quality?.score || 0;
                return currentScore > bestScore ? current : best;
            });
            console.log(`👆 [DEVICE-SELECTION] Lector de huellas seleccionado: ${this.currentDevices.selectedFingerprintReader.name}`);
        }
    }

    /**
     * 🔄 Configurar monitoreo de cambios de dispositivos
     */
    setupDeviceChangeMonitoring() {
        if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', async () => {
                console.log('🔄 [DEVICE-MONITORING] Cambio de dispositivos detectado');
                await this.detectMediaDevices();
                await this.selectBestDevices();

                if (this.onDeviceChange) {
                    this.onDeviceChange(this.devices, this.currentDevices);
                }
            });
        }
    }

    /**
     * ✅ Validar calidad mínima para captura
     */
    validateMinimumQuality() {
        const validation = {
            camera: { valid: false, issues: [] },
            microphone: { valid: false, issues: [] },
            fingerprint: { valid: false, issues: [] },
            overall: false
        };

        // Validar cámara
        if (this.currentDevices.selectedCamera) {
            const camera = this.currentDevices.selectedCamera;
            const quality = camera.quality;

            if (quality.overallScore >= 0.6) {
                validation.camera.valid = true;
            } else {
                if (quality.lighting < 0.3) validation.camera.issues.push('Iluminación insuficiente');
                if (quality.sharpness < 0.6) validation.camera.issues.push('Imagen no nítida');
                if (quality.resolution.score < 0.7) validation.camera.issues.push('Resolución muy baja');
            }
        } else {
            validation.camera.issues.push('No hay cámara disponible');
        }

        // Validar micrófono
        if (this.currentDevices.selectedMicrophone) {
            const microphone = this.currentDevices.selectedMicrophone;
            const quality = microphone.quality;

            if (quality.overallScore >= 0.5) {
                validation.microphone.valid = true;
            } else {
                if (quality.noiseLevel > 0.3) validation.microphone.issues.push('Demasiado ruido de fondo');
                if (quality.signalStrength < 0.4) validation.microphone.issues.push('Señal muy débil');
                if (quality.sampleRate < 16000) validation.microphone.issues.push('Calidad de audio insuficiente');
            }
        } else {
            validation.microphone.issues.push('No hay micrófono disponible');
        }

        // Validar lector de huellas
        if (this.devices.fingerprintReaders.length > 0) {
            validation.fingerprint.valid = true;
        } else {
            validation.fingerprint.issues.push('No hay lector de huellas conectado');
        }

        validation.overall = validation.camera.valid && validation.microphone.valid && validation.fingerprint.valid;

        return validation;
    }

    /**
     * 📋 Generar guías de mejores prácticas
     */
    generateBestPracticesGuide() {
        const guide = {
            facial: [
                '💡 Asegúrese de tener buena iluminación frontal',
                '📐 Mantenga la cara centrada en el encuadre',
                '😐 Expresión neutra, ojos abiertos',
                '📏 Distancia óptima: 50-70 cm de la cámara',
                '🚫 Retire gafas, gorros o elementos que cubran el rostro'
            ],
            fingerprint: [
                '🧼 Limpie el dedo y el sensor antes de la captura',
                '👆 Presione firmemente pero sin exceso',
                '📐 Centre el dedo en el sensor',
                '⏱️ Mantenga la posición hasta el pitido',
                '🔄 Capture diferentes ángulos si es necesario'
            ],
            qr: [
                '📱 Muestre el código QR de forma clara',
                '💡 Buena iluminación sin reflejos',
                '📏 Mantenga el código a 20-30 cm de la cámara',
                '⏱️ Mantenga estable hasta el escaneo',
                '✅ Asegúrese que el código esté completo en el encuadre'
            ],
            nfc: [
                '📱 Acerque la tarjeta/dispositivo al lector',
                '⏱️ Mantenga cerca por 1-2 segundos',
                '🚫 No retire hasta escuchar confirmación',
                '📐 Asegure contacto completo con el sensor',
                '🔄 Si falla, reintente con pequeños ajustes de posición'
            ]
        };

        return guide;
    }

    /**
     * 📊 Obtener estado actual de dispositivos
     */
    getDeviceStatus() {
        return {
            initialized: this.isInitialized,
            devices: this.devices,
            currentDevices: this.currentDevices,
            validation: this.validateMinimumQuality(),
            bestPractices: this.generateBestPracticesGuide()
        };
    }

    /**
     * 🔄 Cambiar dispositivo seleccionado
     */
    async selectDevice(type, deviceId) {
        console.log(`🔄 [DEVICE-SELECTION] Cambiando ${type} a: ${deviceId}`);

        try {
            switch (type) {
                case 'camera':
                    const camera = this.devices.cameras.find(c => c.deviceId === deviceId);
                    if (camera) {
                        this.currentDevices.selectedCamera = camera;
                        console.log(`📹 [DEVICE-SELECTION] Cámara cambiada: ${camera.label}`);
                    }
                    break;

                case 'microphone':
                    const microphone = this.devices.microphones.find(m => m.deviceId === deviceId);
                    if (microphone) {
                        this.currentDevices.selectedMicrophone = microphone;
                        console.log(`🎤 [DEVICE-SELECTION] Micrófono cambiado: ${microphone.label}`);
                    }
                    break;

                case 'fingerprint':
                    const reader = this.devices.fingerprintReaders.find(r => r.id === deviceId);
                    if (reader) {
                        this.currentDevices.selectedFingerprintReader = reader;
                        console.log(`👆 [DEVICE-SELECTION] Lector cambiado: ${reader.name}`);
                    }
                    break;
            }

            if (this.onDeviceChange) {
                this.onDeviceChange(this.devices, this.currentDevices);
            }

            return true;
        } catch (error) {
            console.error(`❌ [DEVICE-SELECTION] Error cambiando ${type}:`, error);
            return false;
        }
    }
}

// Instancia global del servicio
window.biometricDeviceService = new BiometricDeviceDetectionService();

console.log('✅ [DEVICE-DETECTION-SERVICE] Servicio de detección de dispositivos biométricos cargado');