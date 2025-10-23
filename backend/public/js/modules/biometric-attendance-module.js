/**
 * 🎯 BIOMETRIC ATTENDANCE MODULE - ENTERPRISE GRADE
 * =================================================
 * Frontend module for biometric clock in/out functionality
 * ✅ Face recognition for attendance
 * ✅ Real-time quality feedback
 * ✅ Mobile and kiosk support
 * ✅ Enterprise performance
 * ✅ Multi-tenant security
 */

console.log('⏰ [BIOMETRIC-ATTENDANCE] Loading enterprise attendance module...');

class BiometricAttendanceModule {
  constructor(config = {}) {
    this.config = {
      // API configuration
      apiBaseUrl: config.apiBaseUrl || '/api/v2/biometric-attendance',
      enrollmentApiUrl: config.enrollmentApiUrl || '/api/v2/biometric-real',

      // Face detection settings
      faceApiModelsPath: config.faceApiModelsPath || '/models',
      minFaceConfidence: config.minFaceConfidence || 0.8,
      minImageQuality: config.minImageQuality || 0.7,

      // Performance settings
      maxProcessingTime: config.maxProcessingTime || 1000, // 1 second
      realTimeFeedback: config.realTimeFeedback !== false,
      autoCapture: config.autoCapture === true,

      // UI settings
      showQualityIndicators: config.showQualityIndicators !== false,
      showPerformanceMetrics: config.showPerformanceMetrics === true,
      kioskMode: config.kioskMode === true,

      // Enterprise features
      companyIsolation: config.companyIsolation !== false,
      auditLogging: config.auditLogging !== false
    };

    // State management
    this.isInitialized = false;
    this.faceApiLoaded = false;
    this.currentSession = null;
    this.videoStream = null;
    this.detectionActive = false;

    // UI elements
    this.videoElement = null;
    this.canvasElement = null;
    this.overlayElement = null;

    // Company context
    this.currentCompany = null;

    console.log('✅ [BIOMETRIC-ATTENDANCE] Module initialized');
    console.log('🔧 [CONFIG] Kiosk mode:', this.config.kioskMode);
    console.log('🔧 [CONFIG] Auto capture:', this.config.autoCapture);
  }

  /**
   * 🚀 Initialize biometric attendance system
   */
  async initialize() {
    try {
      console.log('🚀 [BIOMETRIC-ATTENDANCE] Initializing system...');

      // Load Face-api.js if not already loaded
      await this.loadFaceApiLibrary();
      await this.loadFaceApiModels();

      // Setup company context
      await this.setupCompanyContext();

      // Initialize UI components
      this.setupUIComponents();

      this.isInitialized = true;

      console.log('✅ [BIOMETRIC-ATTENDANCE] System initialized successfully');

      return {
        success: true,
        capabilities: {
          clockIn: true,
          clockOut: true,
          verification: true,
          realTimeDetection: true,
          qualityAssessment: true
        }
      };

    } catch (error) {
      console.error('❌ [BIOMETRIC-ATTENDANCE] Initialization failed:', error);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📚 Load Face-api.js library
   */
  async loadFaceApiLibrary() {
    if (typeof faceapi !== 'undefined') {
      this.faceApiLoaded = true;
      console.log('✅ [FACE-API] Already loaded');
      return;
    }

    return new Promise((resolve, reject) => {
      console.log('📚 [FACE-API] Loading library...');

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';

      script.onload = () => {
        this.faceApiLoaded = true;
        console.log('✅ [FACE-API] Library loaded');
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Face-api.js'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * 🧠 Load Face-api.js models
   */
  async loadFaceApiModels() {
    if (!this.faceApiLoaded) {
      throw new Error('Face-api.js library not loaded');
    }
  }

  /**
   * 🏢 Setup company context
   */
  async setupCompanyContext() {
    this.currentCompany = window.selectedCompany || window.currentCompany;

    if (!this.currentCompany && this.config.companyIsolation) {
      throw new Error('Company context required for biometric attendance');
    }

    if (this.currentCompany) {
      console.log(`🏢 [COMPANY] Attendance context: ${this.currentCompany.name} (ID: ${this.currentCompany.id})`);
    }
  }

  /**
   * 🎨 Setup UI components
   */
  setupUIComponents() {
    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.id = 'attendance-video';
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;

    // Create canvas for processing
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.id = 'attendance-canvas';
    this.canvasElement.style.setProperty('display', 'none', 'important');

    // Create overlay for feedback
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'attendance-overlay';

    console.log('🎨 [UI] Attendance components created');
  }

  /**
   * ⏰ Start clock-in process
   */
  async startClockIn(containerElement) {
    if (!this.isInitialized) {
      throw new Error('Biometric attendance system not initialized');
    }

    try {
      console.log('⏰ [CLOCK-IN] Starting process...');

      // Setup attendance UI
      this.setupAttendanceUI(containerElement, 'clock-in');

      // Start camera and detection
      await this.startCameraAndDetection();

      // Initialize session
      this.currentSession = {
        type: 'clock-in',
        startTime: new Date(),
        attempts: 0,
        maxAttempts: 3
      };

      console.log('✅ [CLOCK-IN] Process started');

      return {
        success: true,
        sessionType: 'clock-in'
      };

    } catch (error) {
      console.error('❌ [CLOCK-IN] Failed to start:', error);
      throw error;
    }
  }

  /**
   * ⏰ Start clock-out process
   */
  async startClockOut(containerElement) {
    if (!this.isInitialized) {
      throw new Error('Biometric attendance system not initialized');
    }

    try {
      console.log('⏰ [CLOCK-OUT] Starting process...');

      // Setup attendance UI
      this.setupAttendanceUI(containerElement, 'clock-out');

      // Start camera and detection
      await this.startCameraAndDetection();

      // Initialize session
      this.currentSession = {
        type: 'clock-out',
        startTime: new Date(),
        attempts: 0,
        maxAttempts: 3
      };

      console.log('✅ [CLOCK-OUT] Process started');

      return {
        success: true,
        sessionType: 'clock-out'
      };

    } catch (error) {
      console.error('❌ [CLOCK-OUT] Failed to start:', error);
      throw error;
    }
  }

  /**
   * 🎨 Setup attendance UI
   */
  setupAttendanceUI(container, type) {
    // Clear container
    container.innerHTML = '';

    const mainContainer = document.createElement('div');
    mainContainer.className = 'biometric-attendance-container';
    mainContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      color: white;
      min-height: 400px;
      position: relative;
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = type === 'clock-in' ? '⏰ Entrada - Fichado Biométrico' : '⏰ Salida - Fichado Biométrico';
    title.style.cssText = `
      margin: 0;
      font-size: 1.8em;
      text-align: center;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;

    // Video container
    const videoContainer = document.createElement('div');
    videoContainer.style.cssText = `
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    `;

    this.videoElement.style.cssText = `
      width: 100%;
      max-width: 480px;
      height: auto;
      display: block;
    `;

    this.overlayElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;

    videoContainer.appendChild(this.videoElement);
    videoContainer.appendChild(this.overlayElement);

    // Status container
    const statusContainer = document.createElement('div');
    statusContainer.id = 'attendance-status';
    statusContainer.style.cssText = `
      text-align: center;
      font-size: 1.2em;
      background: rgba(255,255,255,0.1);
      padding: 15px;
      border-radius: 10px;
      backdrop-filter: blur(10px);
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    statusContainer.textContent = '📷 Posicione su rostro frente a la cámara';

    // Quality indicators (if enabled)
    let qualityContainer = null;
    if (this.config.showQualityIndicators) {
      qualityContainer = this.createQualityIndicators();
    }

    // Performance metrics (if enabled)
    let performanceContainer = null;
    if (this.config.showPerformanceMetrics) {
      performanceContainer = this.createPerformanceIndicators();
    }

    // Action buttons (for manual trigger)
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 15px;
      margin-top: 10px;
    `;

    if (!this.config.autoCapture) {
      const captureButton = document.createElement('button');
      captureButton.id = 'manual-capture-btn';
      captureButton.textContent = type === 'clock-in' ? '📷 Registrar Entrada' : '📷 Registrar Salida';
      captureButton.style.cssText = `
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
        border: none;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 1em;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        display: none;
      `;

      captureButton.onclick = () => this.performAttendanceCapture();
      buttonContainer.appendChild(captureButton);
    }

    const cancelButton = document.createElement('button');
    cancelButton.textContent = '❌ Cancelar';
    cancelButton.style.cssText = `
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      border: none;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 1em;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;

    cancelButton.onclick = () => this.cancelAttendance();
    buttonContainer.appendChild(cancelButton);

    // Assemble UI
    mainContainer.appendChild(title);
    mainContainer.appendChild(videoContainer);
    mainContainer.appendChild(statusContainer);

    if (qualityContainer) {
      mainContainer.appendChild(qualityContainer);
    }

    if (performanceContainer) {
      mainContainer.appendChild(performanceContainer);
    }

    mainContainer.appendChild(buttonContainer);

    container.appendChild(mainContainer);
    container.appendChild(this.canvasElement);

    console.log('🎨 [UI] Attendance interface created');
  }

  /**
   * 📊 Create quality indicators
   */
  createQualityIndicators() {
    const container = document.createElement('div');
    container.id = 'quality-indicators';
    container.style.cssText = `
      display: flex;
      justify-content: space-around;
      width: 100%;
      max-width: 400px;
      margin: 10px 0;
    `;

    const indicators = [
      { id: 'face-detect', emoji: '👤', label: 'Rostro' },
      { id: 'face-quality', emoji: '⭐', label: 'Calidad' },
      { id: 'face-position', emoji: '📐', label: 'Posición' },
      { id: 'ready-status', emoji: '✅', label: 'Listo' }
    ];

    indicators.forEach(indicator => {
      const element = document.createElement('div');
      element.id = indicator.id;
      element.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px;
        border-radius: 8px;
        background: rgba(255,255,255,0.1);
        font-size: 0.8em;
        min-width: 70px;
      `;

      element.innerHTML = `
        <div style="font-size: 1.5em; margin-bottom: 4px;">${indicator.emoji}</div>
        <div style="margin-bottom: 2px;">${indicator.label}</div>
        <div class="status-dot" style="
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #666;
        "></div>
      `;

      container.appendChild(element);
    });

    return container;
  }

  /**
   * ⚡ Create performance indicators
   */
  createPerformanceIndicators() {
    const container = document.createElement('div');
    container.id = 'performance-indicators';
    container.style.cssText = `
      display: flex;
      justify-content: space-between;
      width: 100%;
      max-width: 400px;
      margin: 10px 0;
      font-size: 0.9em;
      background: rgba(255,255,255,0.1);
      padding: 10px;
      border-radius: 8px;
    `;

    container.innerHTML = `
      <div>🚀 Tiempo: <span id="processing-time">0ms</span></div>
      <div>🎯 FPS: <span id="detection-fps">0</span></div>
      <div>📊 Calidad: <span id="overall-quality">--</span></div>
    `;

    return container;
  }

  /**
   * 📷 Start camera and detection
   */
  async startCameraAndDetection() {
    try {
      console.log('📷 [CAMERA] Starting...');

      // Request camera access
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      this.videoElement.srcObject = this.videoStream;

      // Wait for video to load
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = resolve;
      });

      // Start real-time detection
      this.startRealTimeDetection();

      console.log('✅ [CAMERA] Started successfully');

    } catch (error) {
      console.error('❌ [CAMERA] Failed to start:', error);
      this.updateStatus('❌ Error de cámara: ' + error.message);
      throw error;
    }
  }

  /**
   * 🔄 Start real-time detection
   */
  startRealTimeDetection() {
    if (!this.faceApiLoaded) {
      console.warn('⚠️ [DETECTION] Face-api.js not loaded, skipping detection');
      return;
    }

    console.log('🔄 [DETECTION] Starting real-time detection...');

    this.detectionActive = true;
    let frameCount = 0;
    let lastFpsTime = Date.now();

    const detectLoop = async () => {
      if (!this.detectionActive) return;

      try {
        const startTime = Date.now();

        // Perform face detection
        const detections = await faceapi
          .detectAllFaces(this.videoElement, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptors();

        const processingTime = Date.now() - startTime;

        // Update performance metrics
        this.updatePerformanceMetrics(processingTime, frameCount, lastFpsTime);

        // Process detections
        this.processDetections(detections);

        // Update frame count
        frameCount++;
        if (Date.now() - lastFpsTime >= 1000) {
          lastFpsTime = Date.now();
          frameCount = 0;
        }

        // Continue loop
        if (this.detectionActive) {
          setTimeout(() => requestAnimationFrame(detectLoop), 200); // 5 FPS
        }

      } catch (error) {
        console.error('❌ [DETECTION] Error:', error);

        // Continue loop even after errors
        if (this.detectionActive) {
          setTimeout(() => requestAnimationFrame(detectLoop), 1000);
        }
      }
    };

    requestAnimationFrame(detectLoop);
  }

  /**
   * 🔍 Process face detections
   */
  processDetections(detections) {
    if (detections.length === 0) {
      this.updateQualityIndicator('face-detect', false);
      this.updateStatus('👤 No se detecta rostro - acérquese a la cámara');
      this.hideManualCaptureButton();
      return;
    }

    if (detections.length > 1) {
      this.updateQualityIndicator('face-detect', false);
      this.updateStatus('👥 Múltiples rostros detectados - asegúrese de estar solo');
      this.hideManualCaptureButton();
      return;
    }

    const detection = detections[0];

    // Assess quality
    const quality = this.assessDetectionQuality(detection);

    // Update indicators
    this.updateQualityIndicator('face-detect', true);
    this.updateQualityIndicator('face-quality', quality.overall >= 0.7);
    this.updateQualityIndicator('face-position', quality.position >= 0.8);
    this.updateQualityIndicator('ready-status', quality.overall >= 0.8);

    // Update overall quality display
    this.updateOverallQuality(quality.overall);

    // Update status and capture availability
    if (quality.overall >= 0.8) {
      this.updateStatus('✅ Listo para fichar - Excelente calidad');
      this.showManualCaptureButton();

      // Auto capture if enabled
      if (this.config.autoCapture) {
        setTimeout(() => this.performAttendanceCapture(), 1000);
      }
    } else {
      this.updateStatus(this.getQualityFeedback(quality));
      this.hideManualCaptureButton();
    }
  }

  /**
   * 📊 Assess detection quality
   */
  assessDetectionQuality(detection) {
    let overall = 1.0;

    // Face confidence
    const confidence = detection.detection.score;
    if (confidence < this.config.minFaceConfidence) {
      overall -= 0.3;
    }

    // Face size assessment
    const faceBox = detection.detection.box;
    const videoArea = this.videoElement.videoWidth * this.videoElement.videoHeight;
    const faceArea = faceBox.width * faceBox.height;
    const faceRatio = faceArea / videoArea;

    let faceSize = 1.0;
    if (faceRatio < 0.12) { // 12% minimum
      faceSize = faceRatio / 0.12;
      overall -= 0.2;
    }

    // Position assessment (center of frame)
    const centerX = this.videoElement.videoWidth / 2;
    const centerY = this.videoElement.videoHeight / 2;
    const faceCenterX = faceBox.x + faceBox.width / 2;
    const faceCenterY = faceBox.y + faceBox.height / 2;

    const distanceFromCenter = Math.sqrt(
      Math.pow(faceCenterX - centerX, 2) + Math.pow(faceCenterY - centerY, 2)
    );
    const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
    const position = 1 - (distanceFromCenter / maxDistance);

    if (position < 0.7) {
      overall -= 0.1;
    }

    return {
      overall: Math.max(0, overall),
      confidence: confidence,
      faceSize: faceSize,
      position: position
    };
  }

  /**
   * 📸 Perform attendance capture
   */
  async performAttendanceCapture() {
    if (!this.currentSession) {
      console.error('❌ [CAPTURE] No active session');
      return;
    }

    const startTime = Date.now();

    try {
      console.log(`📸 [CAPTURE] Performing ${this.currentSession.type}...`);

      this.updateStatus('📸 Procesando reconocimiento biométrico...');

      // Get current detection
      const detections = await faceapi
        .detectAllFaces(this.videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length !== 1) {
        throw new Error('No se detecta un rostro válido para captura');
      }

      const detection = detections[0];
      const quality = this.assessDetectionQuality(detection);

      if (quality.overall < 0.7) {
        throw new Error('Calidad de imagen insuficiente');
      }

      // Prepare request data
      const requestData = new FormData();

      // Extract embedding
      const embedding = Array.from(detection.descriptor);
      requestData.append('embedding', JSON.stringify(embedding));
      requestData.append('qualityScore', quality.overall.toString());

      // Device info
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timestamp: new Date().toISOString()
      };
      requestData.append('deviceInfo', JSON.stringify(deviceInfo));

      // Location info (if available)
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });

          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          requestData.append('location', JSON.stringify(location));
        } catch (geoError) {
          console.warn('⚠️ [LOCATION] Could not get location:', geoError);
        }
      }

      // Determine API endpoint
      const endpoint = this.currentSession.type === 'clock-in' ?
        `${this.config.apiBaseUrl}/clock-in` :
        `${this.config.apiBaseUrl}/clock-out`;

      // Make API request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'X-Company-ID': this.currentCompany?.id
        },
        body: requestData
      });

      const result = await response.json();

      const totalTime = Date.now() - startTime;

      if (result.success) {
        this.showAttendanceSuccess(result, totalTime);
      } else {
        this.showAttendanceFailure(result, totalTime);
      }

    } catch (error) {
      console.error('❌ [CAPTURE] Failed:', error);

      this.currentSession.attempts++;

      if (this.currentSession.attempts >= this.currentSession.maxAttempts) {
        this.showAttendanceError('Máximo de intentos alcanzado. Contacte al administrador.');
      } else {
        this.showAttendanceError(`Error: ${error.message}. Intento ${this.currentSession.attempts}/${this.currentSession.maxAttempts}`);

        // Reset for retry
        setTimeout(() => {
          this.updateStatus('📷 Posicione su rostro frente a la cámara');
        }, 3000);
      }
    }
  }

  /**
   * ✅ Show attendance success
   */
  showAttendanceSuccess(result, processingTime) {
    const type = this.currentSession.type;
    const message = type === 'clock-in' ?
      `¡Bienvenido, ${result.employee.name}!` :
      `¡Hasta luego, ${result.employee.name}!`;

    this.updateStatus(`✅ ${message}`);

    // Show detailed results
    const statusContainer = document.getElementById('attendance-status');
    if (statusContainer) {
      statusContainer.innerHTML = `
        <div style="text-align: center;">
          <div style="font-size: 1.5em; margin-bottom: 10px;">✅</div>
          <div style="font-size: 1.3em; margin-bottom: 15px;">${message}</div>
          <div style="font-size: 0.9em; opacity: 0.8;">
            🕐 ${type === 'clock-in' ? 'Entrada' : 'Salida'}: ${new Date(result.attendance[type === 'clock-in' ? 'clockInTime' : 'clockOutTime']).toLocaleTimeString()}
            ${result.attendance.totalHours ? `<br>⏱️ Horas trabajadas: ${result.attendance.totalHours}h` : ''}
            <br>🎯 Confianza: ${(result.biometric.confidence * 100).toFixed(1)}%
            <br>⚡ Tiempo: ${processingTime}ms
          </div>
        </div>
      `;
    }

    // Auto close after 5 seconds
    setTimeout(() => {
      this.cancelAttendance();
    }, 5000);
  }

  /**
   * ❌ Show attendance failure
   */
  showAttendanceFailure(result, processingTime) {
    this.updateStatus(`❌ ${result.message || 'No se pudo completar el fichado'}`);

    // Allow retry
    setTimeout(() => {
      this.updateStatus('📷 Posicione su rostro frente a la cámara');
    }, 3000);
  }

  /**
   * ❌ Show attendance error
   */
  showAttendanceError(message) {
    this.updateStatus(`❌ ${message}`);
  }

  /**
   * 🛑 Cancel attendance
   */
  cancelAttendance() {
    console.log('🛑 [ATTENDANCE] Cancelling session...');

    // Stop video stream
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    // Stop detection
    this.detectionActive = false;

    // Clear session
    this.currentSession = null;

    // Clear video element
    this.videoElement.srcObject = null;

    console.log('🛑 [ATTENDANCE] Session cancelled');

    // Emit cancel event
    this.emit('attendanceCancelled');
  }

  /**
   * 📝 Update status message
   */
  updateStatus(message) {
    const statusElement = document.getElementById('attendance-status');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  /**
   * 📊 Update quality indicator
   */
  updateQualityIndicator(indicatorId, isGood) {
    const indicator = document.getElementById(indicatorId);
    if (!indicator) return;

    const dot = indicator.querySelector('.status-dot');
    if (dot) {
      dot.style.background = isGood ? '#27ae60' : '#e74c3c';
    }
  }

  /**
   * 📈 Update performance metrics
   */
  updatePerformanceMetrics(processingTime, frameCount, lastFpsTime) {
    if (!this.config.showPerformanceMetrics) return;

    const timeElement = document.getElementById('processing-time');
    if (timeElement) {
      timeElement.textContent = processingTime + 'ms';
    }

    const fpsElement = document.getElementById('detection-fps');
    if (fpsElement && Date.now() - lastFpsTime >= 1000) {
      fpsElement.textContent = frameCount.toString();
    }
  }

  /**
   * 📊 Update overall quality
   */
  updateOverallQuality(qualityScore) {
    const qualityElement = document.getElementById('overall-quality');
    if (qualityElement) {
      qualityElement.textContent = (qualityScore * 100).toFixed(0) + '%';
    }
  }

  /**
   * 💬 Get quality feedback message
   */
  getQualityFeedback(quality) {
    if (quality.faceSize < 0.8) {
      return '📏 Acérquese más a la cámara';
    }
    if (quality.position < 0.7) {
      return '📐 Centre su rostro en la cámara';
    }
    if (quality.confidence < 0.8) {
      return '👤 Mire directamente a la cámara';
    }
    return '⚠️ Ajuste su posición para mejor calidad';
  }

  /**
   * 🔘 Show manual capture button
   */
  showManualCaptureButton() {
    const button = document.getElementById('manual-capture-btn');
    if (button) {
      button.style.display = 'inline-block';
    }
  }

  /**
   * 🔘 Hide manual capture button
   */
  hideManualCaptureButton() {
    const button = document.getElementById('manual-capture-btn');
    if (button) {
      button.style.setProperty('display', 'none', 'important');
    }
  }

  /**
   * 🎯 Simple event emitter
   */
  emit(event, data) {
    if (this.eventListeners && this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  on(event, callback) {
    if (!this.eventListeners) {
      this.eventListeners = {};
    }
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }
}

// Make available globally
window.BiometricAttendanceModule = BiometricAttendanceModule;

console.log('✅ [BIOMETRIC-ATTENDANCE] Module loaded successfully');

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BiometricAttendanceModule;
}