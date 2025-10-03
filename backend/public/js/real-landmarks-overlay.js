/**
 * 👁️ REAL LANDMARKS OVERLAY - 68 PUNTOS REALES
 * ===============================================
 * Implementación de landmarks visuales en tiempo real
 * Compatible con Face-API.js y todos los módulos
 * SIN ROMPER funcionalidad existente
 */

class RealLandmarksOverlay {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.isActive = false;
    this.detectionInterval = null;

    // Configuración visual profesional
    this.config = {
      pointColor: '#00ff00',        // Verde brillante
      lineColor: '#ffffff',         // Líneas blancas
      pointSize: 2,                 // Tamaño de puntos
      lineWidth: 1,                 // Grosor de líneas
      opacity: 0.8,                 // Transparencia
      refreshRate: 100              // 10 FPS para suavidad
    };

    console.log('👁️ [LANDMARKS] Sistema inicializado');
  }

  /**
   * 🚀 Iniciar detección de landmarks en tiempo real
   */
  async start() {
    if (this.isActive) return;

    try {
      console.log('👁️ [LANDMARKS] Iniciando detección en tiempo real...');

      // Asegurar que Face-API esté cargado
      if (typeof faceapi === 'undefined') {
        console.error('❌ [LANDMARKS] Face-API.js no está cargado');
        return false;
      }

      // ✅ CARGAR MODELOS REALES desde CDN
      console.log('📦 [LANDMARKS] Cargando modelos Face-API.js...');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'),
        faceapi.nets.faceLandmark68Net.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights')
      ]);
      console.log('✅ [LANDMARKS] Modelos Face-API.js cargados correctamente');

      this.isActive = true;
      this.detectionInterval = setInterval(() => {
        this.detectAndDrawLandmarks();
      }, this.config.refreshRate);

      console.log('✅ [LANDMARKS] Detección iniciada');
      return true;

    } catch (error) {
      console.error('❌ [LANDMARKS] Error iniciando:', error);
      return false;
    }
  }

  /**
   * 🛑 Detener detección de landmarks
   */
  stop() {
    if (!this.isActive) return;

    console.log('🛑 [LANDMARKS] Deteniendo detección...');

    this.isActive = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    // Limpiar canvas
    this.clearCanvas();
    console.log('✅ [LANDMARKS] Detección detenida');
  }

  /**
   * 🎯 Detectar y dibujar landmarks en tiempo real
   */
  async detectAndDrawLandmarks() {
    if (!this.isActive || !this.video.videoWidth) return;

    try {
      // Ajustar canvas al tamaño del video
      this.resizeCanvas();

      // Detectar rostro con landmarks usando Face-API.js REAL
      const detection = await faceapi
        .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks();

      // Limpiar canvas anterior
      this.clearCanvas();

      if (detection) {
        // Dibujar landmarks reales
        this.drawLandmarks(detection.landmarks);

        // Opcional: Dibujar bounding box
        this.drawFaceBox(detection.detection.box);
      }

    } catch (error) {
      // Error silencioso para no interrumpir flujo
      console.debug('⚠️ [LANDMARKS] Detección temporal falló:', error.message);
    }
  }

  /**
   * 🎨 Dibujar 68 landmarks reales
   */
  drawLandmarks(landmarks) {
    const positions = landmarks.positions;

    this.ctx.save();
    this.ctx.globalAlpha = this.config.opacity;

    // Dibujar puntos individuales
    this.ctx.fillStyle = this.config.pointColor;
    positions.forEach(point => {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, this.config.pointSize, 0, 2 * Math.PI);
      this.ctx.fill();
    });

    // Dibujar líneas conectoras (contorno facial)
    this.ctx.strokeStyle = this.config.lineColor;
    this.ctx.lineWidth = this.config.lineWidth;

    // Contorno de la cara (puntos 0-16)
    this.drawConnectedPoints(positions.slice(0, 17));

    // Cejas izquierda (puntos 17-21) y derecha (22-26)
    this.drawConnectedPoints(positions.slice(17, 22));
    this.drawConnectedPoints(positions.slice(22, 27));

    // Nariz (puntos 27-35)
    this.drawConnectedPoints(positions.slice(27, 31)); // Puente nasal
    this.drawConnectedPoints(positions.slice(31, 36)); // Base nasal

    // Ojo izquierdo (puntos 36-41) y derecho (42-47)
    this.drawClosedShape(positions.slice(36, 42));
    this.drawClosedShape(positions.slice(42, 48));

    // Boca exterior (puntos 48-59) e interior (60-67)
    this.drawClosedShape(positions.slice(48, 60));
    this.drawClosedShape(positions.slice(60, 68));

    this.ctx.restore();
  }

  /**
   * 📦 Dibujar bounding box del rostro
   */
  drawFaceBox(box) {
    this.ctx.save();
    this.ctx.strokeStyle = this.config.lineColor;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.6;

    this.ctx.strokeRect(box.x, box.y, box.width, box.height);

    this.ctx.restore();
  }

  /**
   * 🔗 Dibujar líneas conectadas entre puntos
   */
  drawConnectedPoints(points) {
    if (points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    this.ctx.stroke();
  }

  /**
   * ⭕ Dibujar forma cerrada (ojos, boca)
   */
  drawClosedShape(points) {
    if (points.length < 3) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }

    this.ctx.closePath();
    this.ctx.stroke();
  }

  /**
   * 📏 Ajustar canvas al tamaño del video
   */
  resizeCanvas() {
    const { videoWidth, videoHeight } = this.video;

    if (this.canvas.width !== videoWidth || this.canvas.height !== videoHeight) {
      this.canvas.width = videoWidth;
      this.canvas.height = videoHeight;
    }
  }

  /**
   * 🧹 Limpiar canvas
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * ⚙️ Actualizar configuración visual
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [LANDMARKS] Configuración actualizada:', this.config);
  }

  /**
   * 📊 Obtener información de landmarks actual
   */
  async getCurrentLandmarks() {
    if (!this.video.videoWidth) return null;

    try {
      const detection = await faceapi
        .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      return detection ? {
        landmarks: detection.landmarks.positions,
        confidence: detection.detection.score,
        faceBox: detection.detection.box,
        timestamp: Date.now()
      } : null;

    } catch (error) {
      console.error('❌ [LANDMARKS] Error obteniendo landmarks:', error);
      return null;
    }
  }
}

// 🌟 INTEGRACIÓN SIMPLE CON SISTEMA EXISTENTE
class BiometricLandmarksIntegration {
  constructor() {
    this.landmarksOverlay = null;
    this.isIntegrated = false;
  }

  /**
   * 🔌 Integrar con sistema biométrico existente
   */
  async integrate() {
    console.log('🔌 [INTEGRATION] Integrando landmarks con sistema biométrico...');

    try {
      // Buscar video element existente
      const video = document.querySelector('video');
      if (!video) {
        console.warn('⚠️ [INTEGRATION] Video element no encontrado');
        return false;
      }

      // Crear overlay canvas si no existe
      let canvas = document.querySelector('#landmarks-overlay');
      if (!canvas) {
        canvas = this.createOverlayCanvas(video);
      }

      // Inicializar landmarks overlay
      this.landmarksOverlay = new RealLandmarksOverlay(video, canvas);
      this.isIntegrated = true;

      console.log('✅ [INTEGRATION] Landmarks integrados exitosamente');
      return true;

    } catch (error) {
      console.error('❌ [INTEGRATION] Error integrando:', error);
      return false;
    }
  }

  /**
   * 🎨 Crear canvas overlay transparente
   */
  createOverlayCanvas(video) {
    const canvas = document.createElement('canvas');
    canvas.id = 'landmarks-overlay';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10';

    // Posicionar sobre el video
    video.parentElement.style.position = 'relative';
    video.parentElement.appendChild(canvas);

    return canvas;
  }

  /**
   * 🚀 Activar landmarks en tiempo real
   */
  async activate() {
    if (!this.isIntegrated) {
      await this.integrate();
    }

    return this.landmarksOverlay ? this.landmarksOverlay.start() : false;
  }

  /**
   * 🛑 Desactivar landmarks
   */
  deactivate() {
    if (this.landmarksOverlay) {
      this.landmarksOverlay.stop();
    }
  }
}

// 🌍 Export global para uso en todos los módulos
window.RealLandmarksOverlay = RealLandmarksOverlay;
window.BiometricLandmarksIntegration = BiometricLandmarksIntegration;

// 🎯 Auto-inicialización opcional
window.initLandmarks = async function() {
  const integration = new BiometricLandmarksIntegration();
  const success = await integration.activate();

  if (success) {
    console.log('🎯 [AUTO-INIT] Landmarks activados automáticamente');
  } else {
    console.warn('⚠️ [AUTO-INIT] No se pudieron activar landmarks automáticamente');
  }

  return integration;
};

console.log('👁️ [LANDMARKS] Sistema de landmarks reales cargado - Listo para usar');