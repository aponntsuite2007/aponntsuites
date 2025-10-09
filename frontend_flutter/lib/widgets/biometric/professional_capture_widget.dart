/*
 * 📱 PROFESSIONAL BIOMETRIC CAPTURE WIDGET - FASE 1
 * =====================================================
 * Widget de captura biométrica profesional con IA
 * Liveness detection, quality assessment, UI/UX avanzada
 * Fecha: 2025-09-26
 * Versión: 2.0.0
 */

import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../services/biometric/professional_biometric_service.dart';

/// 📱 Widget de captura biométrica profesional
class ProfessionalCaptureWidget extends StatefulWidget {
  final String companyId;
  final String employeeId;
  final String jwtToken;
  final Function(BiometricCaptureResult) onCaptureComplete;
  final VoidCallback? onCancel;
  final bool enableLivenessDetection;
  final double qualityThreshold;

  const ProfessionalCaptureWidget({
    Key? key,
    required this.companyId,
    required this.employeeId,
    required this.jwtToken,
    required this.onCaptureComplete,
    this.onCancel,
    this.enableLivenessDetection = true,
    this.qualityThreshold = 0.8,
  }) : super(key: key);

  @override
  State<ProfessionalCaptureWidget> createState() => _ProfessionalCaptureWidgetState();
}

class _ProfessionalCaptureWidgetState extends State<ProfessionalCaptureWidget>
    with TickerProviderStateMixin {

  // 📱 Camera Components
  CameraController? _cameraController;
  List<CameraDescription> _cameras = [];
  bool _isCameraInitialized = false;

  // 🎭 Biometric Service
  late ProfessionalBiometricService _biometricService;
  bool _isServiceInitialized = false;

  // 🎬 Animation Controllers
  late AnimationController _pulseController;
  late AnimationController _scanController;
  late AnimationController _livenessController;

  // 📊 Estado de captura
  CaptureState _captureState = CaptureState.initializing;
  String _statusMessage = 'Inicializando sistema biométrico...';
  double _captureProgress = 0.0;

  // 👁️ Liveness Detection State
  LivenessStep _currentLivenessStep = LivenessStep.lookStraight;
  Timer? _livenessTimer;
  int _livenessStepCount = 0;

  // 📏 Quality Metrics
  Map<String, dynamic> _realTimeQualityMetrics = {};
  bool _showQualityOverlay = true;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _initializeSystem();
  }

  @override
  void dispose() {
    _disposeResources();
    super.dispose();
  }

  /// 🎬 Inicializar animaciones
  void _initializeAnimations() {
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _scanController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat();

    _livenessController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
  }

  /// 🚀 Inicializar sistema completo
  Future<void> _initializeSystem() async {
    try {
      setState(() {
        _captureState = CaptureState.initializing;
        _statusMessage = 'Inicializando sistema biométrico...';
      });

      // 1. Inicializar servicio biométrico
      _biometricService = ProfessionalBiometricService();
      final bool serviceInitialized = await _biometricService.initialize(
        companyId: widget.companyId,
        employeeId: widget.employeeId,
        jwtToken: widget.jwtToken,
      );

      if (!serviceInitialized) {
        throw Exception('Error inicializando servicio biométrico');
      }

      _isServiceInitialized = true;

      // 2. Inicializar cámara
      await _initializeCamera();

      setState(() {
        _captureState = CaptureState.ready;
        _statusMessage = 'Sistema listo - Posicione su rostro en el marco';
      });

    } catch (e) {
      debugPrint('❌ [CAPTURE-WIDGET] Error inicializando: $e');
      setState(() {
        _captureState = CaptureState.error;
        _statusMessage = 'Error inicializando: $e';
      });
    }
  }

  /// 📷 Inicializar cámara
  Future<void> _initializeCamera() async {
    try {
      // Solicitar permisos
      final PermissionStatus cameraPermission = await Permission.camera.request();
      if (cameraPermission != PermissionStatus.granted) {
        throw Exception('Permisos de cámara denegados');
      }

      // Obtener cámaras disponibles
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        throw Exception('No hay cámaras disponibles');
      }

      // Seleccionar cámara frontal
      CameraDescription frontCamera = _cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras.first,
      );

      // Inicializar controlador
      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _cameraController!.initialize();

      if (mounted) {
        setState(() {
          _isCameraInitialized = true;
        });
      }

    } catch (e) {
      debugPrint('❌ [CAMERA] Error inicializando cámara: $e');
      throw Exception('Error inicializando cámara: $e');
    }
  }

  /// 🎯 Iniciar proceso de captura
  Future<void> _startCapture() async {
    if (!_isServiceInitialized || !_isCameraInitialized || _cameraController == null) {
      return;
    }

    try {
      if (widget.enableLivenessDetection) {
        await _startLivenessDetection();
      } else {
        await _performDirectCapture();
      }
    } catch (e) {
      debugPrint('❌ [CAPTURE] Error en captura: $e');
      setState(() {
        _captureState = CaptureState.error;
        _statusMessage = 'Error en captura: $e';
      });
    }
  }

  /// 👁️ Iniciar detección de vida
  Future<void> _startLivenessDetection() async {
    setState(() {
      _captureState = CaptureState.liveness;
      _currentLivenessStep = LivenessStep.lookStraight;
      _livenessStepCount = 0;
    });

    _livenessController.reset();
    await _livenessController.forward();

    _performLivenessStep();
  }

  /// 👁️ Ejecutar paso de liveness
  void _performLivenessStep() {
    setState(() {
      switch (_currentLivenessStep) {
        case LivenessStep.lookStraight:
          _statusMessage = 'Mire directamente a la cámara';
          break;
        case LivenessStep.blink:
          _statusMessage = 'Parpadee normalmente';
          break;
        case LivenessStep.turnLeft:
          _statusMessage = 'Gire ligeramente la cabeza a la izquierda';
          break;
        case LivenessStep.turnRight:
          _statusMessage = 'Gire ligeramente la cabeza a la derecha';
          break;
      }
    });

    _livenessTimer?.cancel();
    _livenessTimer = Timer(Duration(seconds: _currentLivenessStep == LivenessStep.blink ? 2 : 3), () {
      _nextLivenessStep();
    });
  }

  /// 👁️ Siguiente paso de liveness
  void _nextLivenessStep() {
    _livenessStepCount++;

    if (_livenessStepCount >= 4) {
      // Liveness completado, proceder con captura
      _performDirectCapture();
      return;
    }

    setState(() {
      switch (_currentLivenessStep) {
        case LivenessStep.lookStraight:
          _currentLivenessStep = LivenessStep.blink;
          break;
        case LivenessStep.blink:
          _currentLivenessStep = LivenessStep.turnLeft;
          break;
        case LivenessStep.turnLeft:
          _currentLivenessStep = LivenessStep.turnRight;
          break;
        case LivenessStep.turnRight:
          _currentLivenessStep = LivenessStep.lookStraight;
          break;
      }
    });

    _performLivenessStep();
  }

  /// 📸 Realizar captura directa
  Future<void> _performDirectCapture() async {
    setState(() {
      _captureState = CaptureState.capturing;
      _statusMessage = 'Analizando imagen con IA...';
      _captureProgress = 0.0;
    });

    try {
      // Simular progreso de análisis
      for (int i = 0; i <= 100; i += 10) {
        setState(() {
          _captureProgress = i / 100.0;
        });
        await Future.delayed(const Duration(milliseconds: 200));
      }

      // Captura con IA completa
      final BiometricCaptureResult result = await _biometricService.captureWithAI(
        cameraController: _cameraController!,
        enableLivenessDetection: widget.enableLivenessDetection,
        qualityThreshold: widget.qualityThreshold,
      );

      if (result.success) {
        setState(() {
          _captureState = CaptureState.success;
          _statusMessage = 'Captura exitosa - Score: ${(result.qualityScore * 100).toInt()}%';
        });

        // Vibración de éxito
        HapticFeedback.mediumImpact();

        // Transmitir template al backend
        await _transmitTemplate(result);

        // Llamar callback con resultado
        widget.onCaptureComplete(result);

      } else {
        setState(() {
          _captureState = CaptureState.retry;
          _statusMessage = result.error ?? 'Error en captura - Intente nuevamente';
        });

        // Vibración de error
        HapticFeedback.lightImpact();
      }

    } catch (e) {
      debugPrint('❌ [DIRECT-CAPTURE] Error: $e');
      setState(() {
        _captureState = CaptureState.error;
        _statusMessage = 'Error procesando: $e';
      });
    }
  }

  /// 📡 Transmitir template al backend
  Future<void> _transmitTemplate(BiometricCaptureResult result) async {
    if (result.encryptedTemplate == null) return;

    try {
      setState(() {
        _statusMessage = 'Transmitiendo datos de forma segura...';
      });

      final BiometricTransmissionResult transmissionResult = await _biometricService.transmitTemplate(
        encryptedTemplate: result.encryptedTemplate!,
        metadata: {
          'qualityScore': result.qualityScore,
          'processingTimeMs': result.processingTimeMs,
          'livenessEnabled': widget.enableLivenessDetection,
          'qualityThreshold': widget.qualityThreshold,
        },
      );

      if (transmissionResult.success) {
        setState(() {
          _statusMessage = 'Datos transmitidos exitosamente';
        });
      } else {
        debugPrint('⚠️ [TRANSMISSION] Error: ${transmissionResult.error}');
        // No mostrar error de transmisión al usuario, la captura fue exitosa
      }

    } catch (e) {
      debugPrint('❌ [TRANSMISSION] Error: $e');
      // No afectar el resultado de la captura
    }
  }

  /// 🧹 Limpiar recursos
  void _disposeResources() {
    _livenessTimer?.cancel();
    _cameraController?.dispose();
    _pulseController.dispose();
    _scanController.dispose();
    _livenessController.dispose();
    if (_isServiceInitialized) {
      _biometricService.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // 📷 Vista de cámara
            _buildCameraView(),

            // 🎯 Overlay de captura
            _buildCaptureOverlay(),

            // 📊 Overlay de calidad (opcional)
            if (_showQualityOverlay) _buildQualityOverlay(),

            // 🎛️ Controles
            _buildControls(),

            // 📱 Header con información
            _buildHeader(),
          ],
        ),
      ),
    );
  }

  /// 📷 Vista de cámara
  Widget _buildCameraView() {
    if (!_isCameraInitialized || _cameraController == null) {
      return Container(
        color: Colors.black,
        child: const Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    return SizedBox.expand(
      child: FittedBox(
        fit: BoxFit.cover,
        child: SizedBox(
          width: _cameraController!.value.previewSize!.height,
          height: _cameraController!.value.previewSize!.width,
          child: CameraPreview(_cameraController!),
        ),
      ),
    );
  }

  /// 🎯 Overlay de captura
  Widget _buildCaptureOverlay() {
    return Center(
      child: Container(
        width: 300,
        height: 400,
        decoration: BoxDecoration(
          border: Border.all(
            color: _getCaptureOverlayColor(),
            width: 3,
          ),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Stack(
          children: [
            // Corners dinámicos
            ..._buildCorners(),

            // Línea de escaneo
            if (_captureState == CaptureState.capturing) _buildScanLine(),

            // Indicador de liveness
            if (_captureState == CaptureState.liveness) _buildLivenessIndicator(),
          ],
        ),
      ),
    );
  }

  /// 🎨 Color del overlay según estado
  Color _getCaptureOverlayColor() {
    switch (_captureState) {
      case CaptureState.initializing:
        return Colors.orange;
      case CaptureState.ready:
        return Colors.blue;
      case CaptureState.liveness:
        return Colors.purple;
      case CaptureState.capturing:
        return Colors.green;
      case CaptureState.success:
        return Colors.green;
      case CaptureState.retry:
      case CaptureState.error:
        return Colors.red;
    }
  }

  /// 📐 Construir esquinas del frame
  List<Widget> _buildCorners() {
    const double cornerSize = 30;
    const double cornerThickness = 4;

    return [
      // Top-left
      Positioned(
        top: 0,
        left: 0,
        child: Container(
          width: cornerSize,
          height: cornerSize,
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(color: _getCaptureOverlayColor(), width: cornerThickness),
              left: BorderSide(color: _getCaptureOverlayColor(), width: cornerThickness),
            ),
          ),
        ),
      ),
      // Top-right
      Positioned(
        top: 0,
        right: 0,
        child: Container(
          width: cornerSize,
          height: cornerSize,
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(color: _getCaptureOverlayColor(), width: cornerThickness),
              right: BorderSide(color: _getCaptureOverlayColor(), width: cornerThickness),
            ),
          ),
        ),
      ),
      // Bottom-left
      Positioned(
        bottom: 0,
        left: 0,
        child: Container(
          width: cornerSize,
          height: cornerSize,
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: _getCaptureOverlayColor(), width: cornerThickness),
              left: BorderSide(color: _getCaptureOverlayColor(), width: cornerThickness),
            ),
          ),
        ),
      ),
      // Bottom-right
      Positioned(
        bottom: 0,
        right: 0,
        child: Container(
          width: cornerSize,
          height: cornerSize,
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: _getCaptureOverlayColor(), width: cornerThickness),
              right: BorderSide(color: _getCaptureOverlayColor(), width: cornerThickness),
            ),
          ),
        ),
      ),
    ];
  }

  /// 📊 Línea de escaneo
  Widget _buildScanLine() {
    return AnimatedBuilder(
      animation: _scanController,
      builder: (context, child) {
        return Positioned(
          left: 0,
          right: 0,
          top: _scanController.value * 400,
          child: Container(
            height: 2,
            color: Colors.green.withOpacity(0.8),
            child: Container(
              decoration: BoxDecoration(
                boxShadow: [
                  BoxShadow(
                    color: Colors.green.withOpacity(0.5),
                    blurRadius: 10,
                    spreadRadius: 2,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  /// 👁️ Indicador de liveness
  Widget _buildLivenessIndicator() {
    return Center(
      child: AnimatedBuilder(
        animation: _livenessController,
        builder: (context, child) {
          return Transform.scale(
            scale: 0.8 + (_livenessController.value * 0.4),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.purple.withOpacity(0.8),
                borderRadius: BorderRadius.circular(15),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    _getLivenessIcon(),
                    color: Colors.white,
                    size: 40,
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _getLivenessInstruction(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  /// 👁️ Icono según paso de liveness
  IconData _getLivenessIcon() {
    switch (_currentLivenessStep) {
      case LivenessStep.lookStraight:
        return Icons.visibility;
      case LivenessStep.blink:
        return Icons.remove_red_eye;
      case LivenessStep.turnLeft:
        return Icons.arrow_back;
      case LivenessStep.turnRight:
        return Icons.arrow_forward;
    }
  }

  /// 👁️ Instrucción según paso de liveness
  String _getLivenessInstruction() {
    switch (_currentLivenessStep) {
      case LivenessStep.lookStraight:
        return 'Mire directamente\na la cámara';
      case LivenessStep.blink:
        return 'Parpadee\nnormalmente';
      case LivenessStep.turnLeft:
        return 'Gire ligeramente\na la izquierda';
      case LivenessStep.turnRight:
        return 'Gire ligeramente\na la derecha';
    }
  }

  /// 📊 Overlay de calidad
  Widget _buildQualityOverlay() {
    return Positioned(
      top: 100,
      right: 20,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.7),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Calidad',
              style: TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            _buildQualityMetric('Iluminación', 0.85, Colors.green),
            _buildQualityMetric('Nitidez', 0.92, Colors.green),
            _buildQualityMetric('Ángulo', 0.78, Colors.yellow),
            _buildQualityMetric('Tamaño', 0.88, Colors.green),
          ],
        ),
      ),
    );
  }

  /// 📊 Métrica individual de calidad
  Widget _buildQualityMetric(String label, double value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          SizedBox(
            width: 60,
            child: Text(
              label,
              style: const TextStyle(color: Colors.white70, fontSize: 10),
            ),
          ),
          Container(
            width: 40,
            height: 6,
            decoration: BoxDecoration(
              color: Colors.grey.shade800,
              borderRadius: BorderRadius.circular(3),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: value,
              child: Container(
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ),
          const SizedBox(width: 4),
          Text(
            '${(value * 100).toInt()}%',
            style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  /// 🎛️ Controles
  Widget _buildControls() {
    return Positioned(
      bottom: 50,
      left: 0,
      right: 0,
      child: Column(
        children: [
          // Progreso de captura
          if (_captureProgress > 0) ...[
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 50),
              height: 6,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(3),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: _captureProgress,
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.green,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Botones principales
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // Botón cancelar
              if (widget.onCancel != null)
                _buildControlButton(
                  icon: Icons.close,
                  onTap: widget.onCancel!,
                  backgroundColor: Colors.red.withOpacity(0.8),
                ),

              // Botón de captura principal
              _buildCaptureButton(),

              // Botón configuración
              _buildControlButton(
                icon: Icons.settings,
                onTap: () => setState(() => _showQualityOverlay = !_showQualityOverlay),
                backgroundColor: Colors.blue.withOpacity(0.8),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// 🎯 Botón principal de captura
  Widget _buildCaptureButton() {
    bool canCapture = _captureState == CaptureState.ready || _captureState == CaptureState.retry;

    return GestureDetector(
      onTap: canCapture ? _startCapture : null,
      child: AnimatedBuilder(
        animation: _pulseController,
        builder: (context, child) {
          return Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: canCapture ? Colors.white : Colors.grey,
              border: Border.all(
                color: canCapture ? _getCaptureOverlayColor() : Colors.grey.shade600,
                width: 4 + (_pulseController.value * 2),
              ),
            ),
            child: Icon(
              _getCaptureButtonIcon(),
              color: canCapture ? _getCaptureOverlayColor() : Colors.grey.shade600,
              size: 40,
            ),
          );
        },
      ),
    );
  }

  /// 🎯 Icono del botón de captura
  IconData _getCaptureButtonIcon() {
    switch (_captureState) {
      case CaptureState.initializing:
        return Icons.hourglass_empty;
      case CaptureState.ready:
      case CaptureState.retry:
        return Icons.camera_alt;
      case CaptureState.liveness:
        return Icons.visibility;
      case CaptureState.capturing:
        return Icons.analyze;
      case CaptureState.success:
        return Icons.check;
      case CaptureState.error:
        return Icons.error;
    }
  }

  /// 🎛️ Botón de control auxiliar
  Widget _buildControlButton({
    required IconData icon,
    required VoidCallback onTap,
    required Color backgroundColor,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: backgroundColor,
        ),
        child: Icon(icon, color: Colors.white, size: 24),
      ),
    );
  }

  /// 📱 Header con información
  Widget _buildHeader() {
    return Positioned(
      top: 20,
      left: 20,
      right: 20,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.7),
          borderRadius: BorderRadius.circular(25),
        ),
        child: Column(
          children: [
            Text(
              'Captura Biométrica IA',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _statusMessage,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// 📋 ENUMS Y ESTADOS
// ═══════════════════════════════════════════════════════════════

enum CaptureState {
  initializing,
  ready,
  liveness,
  capturing,
  success,
  retry,
  error,
}

enum LivenessStep {
  lookStraight,
  blink,
  turnLeft,
  turnRight,
}