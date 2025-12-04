/*
 * 📸 EMPLOYEE BIOMETRIC SCREEN
 * =============================
 * Pantalla de fichaje biométrico para la APP DEL EMPLEADO
 *
 * FLUJO:
 * 1. Verificar credenciales locales (huella/PIN/FaceID)
 * 2. Activar cámara
 * 3. Capturar rostro con SmartCapture (misma tecnología del kiosk)
 * 4. Enviar al backend
 * 5. Mostrar resultado con semáforo
 *
 * Fecha: 2025-11-29
 * Versión: 1.0.0
 *
 * ⚠️ ESTE ARCHIVO ES INDEPENDIENTE - NO MODIFICA NADA DEL KIOSK
 */

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';

import '../services/employee_biometric_capture_service.dart';
import '../services/employee_notification_service.dart';
import '../services/employee_websocket_service.dart';

class EmployeeBiometricScreen extends StatefulWidget {
  const EmployeeBiometricScreen({Key? key}) : super(key: key);

  @override
  State<EmployeeBiometricScreen> createState() => _EmployeeBiometricScreenState();
}

class _EmployeeBiometricScreenState extends State<EmployeeBiometricScreen>
    with WidgetsBindingObserver {
  // Servicios
  final EmployeeBiometricCaptureService _captureService =
      EmployeeBiometricCaptureService();
  final EmployeeNotificationService _notificationService =
      EmployeeNotificationService();
  final EmployeeWebSocketService _wsService = EmployeeWebSocketService();

  // Estado
  bool _isInitializing = true;
  bool _isLocalAuthVerified = false;
  bool _isCapturing = false;
  String _statusMessage = 'Inicializando...';
  EmployeeTrafficLightState _trafficLight = EmployeeTrafficLightState.yellow;
  double _qualityScore = 0.0;
  EmployeeCaptureResult? _lastResult;

  // Subscripciones
  StreamSubscription? _authorizationSub;
  StreamSubscription? _attendanceSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeServices();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authorizationSub?.cancel();
    _attendanceSub?.cancel();
    _captureService.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive) {
      _captureService.stopCapture();
    } else if (state == AppLifecycleState.resumed) {
      if (_isLocalAuthVerified && _captureService.isCameraInitialized) {
        _captureService.startContinuousCapture();
      }
    }
  }

  /// 🚀 Inicializar todos los servicios
  Future<void> _initializeServices() async {
    setState(() {
      _isInitializing = true;
      _statusMessage = 'Inicializando servicios...';
    });

    try {
      // 1. Inicializar notificaciones
      await _notificationService.initialize();

      // 2. Inicializar servicio de captura
      final captureInitialized = await _captureService.initialize();

      if (!captureInitialized) {
        setState(() {
          _statusMessage = 'Error inicializando cámara';
          _isInitializing = false;
        });
        return;
      }

      // 3. Configurar callbacks
      _captureService.onTrafficLightChange = (state) {
        setState(() => _trafficLight = state);
      };

      _captureService.onStatusMessage = (message) {
        setState(() => _statusMessage = message);
      };

      _captureService.onCaptureResult = _handleCaptureResult;

      _captureService.onQualityUpdate = (quality) {
        setState(() => _qualityScore = quality);
      };

      // 4. Inicializar WebSocket (opcional, en background)
      _initializeWebSocket();

      setState(() {
        _isInitializing = false;
        _statusMessage = 'Verifica tu identidad para continuar';
      });
    } catch (e) {
      debugPrint('❌ [EMPLOYEE-SCREEN] Error inicializando: $e');
      setState(() {
        _isInitializing = false;
        _statusMessage = 'Error: $e';
      });
    }
  }

  /// 🔌 Inicializar WebSocket
  Future<void> _initializeWebSocket() async {
    try {
      // TODO: Obtener URL del servidor de configuración
      // await _wsService.initialize(serverUrl);
      // _wsService.connect();

      // Escuchar respuestas de autorización
      _authorizationSub = _wsService.authorizationRequests.listen((data) {
        if (data['type'] == 'response') {
          final approved = data['status'] == 'approved';
          _notificationService.showAuthorizationResponse(
            approved: approved,
            approverName: data['authorizer']?['name'],
          );

          if (mounted) {
            _showAuthorizationResultDialog(approved, data);
          }
        }
      });

      // Escuchar actualizaciones de asistencia
      _attendanceSub = _wsService.attendanceUpdates.listen((data) {
        debugPrint('📋 [EMPLOYEE-SCREEN] Actualización de asistencia: $data');
      });
    } catch (e) {
      debugPrint('⚠️ [EMPLOYEE-SCREEN] WebSocket no disponible: $e');
    }
  }

  /// 🔐 Verificar autenticación local
  Future<void> _verifyLocalAuth() async {
    setState(() {
      _statusMessage = 'Verificando identidad...';
    });

    final result = await _captureService.authenticateLocally();

    if (result.success) {
      setState(() {
        _isLocalAuthVerified = true;
        _statusMessage = 'Identidad verificada. Mire a la cámara.';
      });

      // Pequeña pausa antes de iniciar captura
      await Future.delayed(const Duration(milliseconds: 500));

      // Iniciar captura automática
      _startCapture();
    } else {
      setState(() {
        _statusMessage = result.error ?? 'Verificación fallida';
      });

      _showErrorSnackBar(result.error ?? 'No se pudo verificar tu identidad');
    }
  }

  /// 📸 Iniciar captura
  void _startCapture() {
    if (!_captureService.isCameraInitialized) {
      _showErrorSnackBar('Cámara no disponible');
      return;
    }

    setState(() {
      _isCapturing = true;
      _statusMessage = 'Mire a la cámara...';
    });

    _captureService.startContinuousCapture();
  }

  /// ⏹️ Detener captura
  void _stopCapture() {
    _captureService.stopCapture();
    setState(() {
      _isCapturing = false;
      _statusMessage = 'Captura detenida';
    });
  }

  /// 📋 Manejar resultado de captura
  void _handleCaptureResult(EmployeeCaptureResult result) {
    setState(() {
      _lastResult = result;
      _isCapturing = false;
    });

    if (result.success) {
      if (result.needsAuthorization) {
        // Llegada tardía
        _notificationService.showLateArrivalWarning(
          lateMinutes: result.lateMinutes,
          authorizationSent: true,
        );

        _showLateArrivalDialog(result);
      } else {
        // Fichaje exitoso
        _notificationService.showCheckInSuccess(
          location: 'Dispositivo móvil',
          employeeName: result.employeeName,
        );

        _showSuccessDialog(result);
      }
    } else {
      // Error o no reconocido
      _showErrorDialog(result);
    }

    // Auto-reset después de mostrar resultado
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        _resetForNewCapture();
      }
    });
  }

  /// 🔄 Resetear para nueva captura
  void _resetForNewCapture() {
    _captureService.resetForNewCapture();
    setState(() {
      _isLocalAuthVerified = false;
      _isCapturing = false;
      _lastResult = null;
      _qualityScore = 0.0;
      _trafficLight = EmployeeTrafficLightState.yellow;
      _statusMessage = 'Verifica tu identidad para continuar';
    });
  }

  // ====== DIÁLOGOS Y UI ======

  void _showSuccessDialog(EmployeeCaptureResult result) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.green.shade50,
        icon: const Icon(Icons.check_circle, color: Colors.green, size: 64),
        title: const Text('¡Fichaje Exitoso!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Bienvenido, ${result.employeeName ?? 'Empleado'}',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Hora: ${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')}',
              style: TextStyle(color: Colors.grey.shade700),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  void _showLateArrivalDialog(EmployeeCaptureResult result) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.orange.shade50,
        icon: const Icon(Icons.access_time, color: Colors.orange, size: 64),
        title: const Text('Llegada Tardía'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              result.employeeName ?? 'Empleado',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Llegaste ${result.lateMinutes ?? 0} minutos tarde',
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.orange),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Se ha enviado una solicitud de autorización a tu supervisor',
                      style: TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Entendido'),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(EmployeeCaptureResult result) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.red.shade50,
        icon: const Icon(Icons.error_outline, color: Colors.red, size: 64),
        title: const Text('Error'),
        content: Text(
          result.message,
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _resetForNewCapture();
            },
            child: const Text('Intentar de nuevo'),
          ),
        ],
      ),
    );
  }

  void _showAuthorizationResultDialog(
      bool approved, Map<String, dynamic> data) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor:
            approved ? Colors.green.shade50 : Colors.red.shade50,
        icon: Icon(
          approved ? Icons.check_circle : Icons.cancel,
          color: approved ? Colors.green : Colors.red,
          size: 64,
        ),
        title: Text(
            approved ? 'Autorización Aprobada' : 'Autorización Rechazada'),
        content: Text(
          approved
              ? 'Tu llegada tardía ha sido autorizada'
              : 'Tu solicitud de autorización ha sido rechazada',
          textAlign: TextAlign.center,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Fichaje Biométrico'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_isCapturing)
            IconButton(
              icon: const Icon(Icons.stop),
              onPressed: _stopCapture,
              tooltip: 'Detener',
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _resetForNewCapture,
            tooltip: 'Reiniciar',
          ),
        ],
      ),
      body: _isInitializing
          ? _buildLoadingState()
          : _buildMainContent(),
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(color: Colors.white),
          SizedBox(height: 16),
          Text(
            'Inicializando...',
            style: TextStyle(color: Colors.white, fontSize: 18),
          ),
        ],
      ),
    );
  }

  Widget _buildMainContent() {
    return Column(
      children: [
        // Vista de cámara o estado de verificación
        Expanded(
          child: _isLocalAuthVerified
              ? _buildCameraPreview()
              : _buildAuthPrompt(),
        ),

        // Panel inferior con controles
        _buildBottomPanel(),
      ],
    );
  }

  Widget _buildAuthPrompt() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.2),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.blue, width: 3),
              ),
              child: const Icon(
                Icons.fingerprint,
                size: 64,
                color: Colors.blue,
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'Verificación de Identidad',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Para registrar tu asistencia, primero debes verificar tu identidad con huella digital, PIN o reconocimiento facial del dispositivo.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey.shade400,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: _verifyLocalAuth,
              icon: const Icon(Icons.lock_open, size: 24),
              label: const Text(
                'Verificar Identidad',
                style: TextStyle(fontSize: 18),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraPreview() {
    if (!_captureService.isCameraInitialized ||
        _captureService.cameraController == null) {
      return const Center(
        child: Text(
          'Cámara no disponible',
          style: TextStyle(color: Colors.white),
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        // Preview de cámara
        ClipRRect(
          borderRadius: BorderRadius.circular(0),
          child: CameraPreview(_captureService.cameraController!),
        ),

        // Overlay con guía de rostro
        _buildFaceGuideOverlay(),

        // Semáforo
        Positioned(
          top: 16,
          right: 16,
          child: _buildTrafficLight(),
        ),

        // Indicador de calidad
        Positioned(
          top: 16,
          left: 16,
          child: _buildQualityIndicator(),
        ),
      ],
    );
  }

  Widget _buildFaceGuideOverlay() {
    Color guideColor;
    switch (_trafficLight) {
      case EmployeeTrafficLightState.green:
        guideColor = Colors.green;
        break;
      case EmployeeTrafficLightState.red:
        guideColor = Colors.red;
        break;
      case EmployeeTrafficLightState.yellow:
      default:
        guideColor = Colors.white.withOpacity(0.5);
    }

    return Center(
      child: Container(
        width: 250,
        height: 320,
        decoration: BoxDecoration(
          border: Border.all(color: guideColor, width: 3),
          borderRadius: BorderRadius.circular(150),
        ),
        child: const Center(
          child: Text(
            'Coloca tu rostro aquí',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTrafficLight() {
    Color lightColor;
    IconData lightIcon;

    switch (_trafficLight) {
      case EmployeeTrafficLightState.green:
        lightColor = Colors.green;
        lightIcon = Icons.check_circle;
        break;
      case EmployeeTrafficLightState.red:
        lightColor = Colors.red;
        lightIcon = Icons.cancel;
        break;
      case EmployeeTrafficLightState.yellow:
      default:
        lightColor = Colors.amber;
        lightIcon = Icons.hourglass_empty;
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.black54,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(
        lightIcon,
        color: lightColor,
        size: 48,
      ),
    );
  }

  Widget _buildQualityIndicator() {
    Color qualityColor;
    if (_qualityScore >= 0.65) {
      qualityColor = Colors.green;
    } else if (_qualityScore >= 0.4) {
      qualityColor = Colors.amber;
    } else {
      qualityColor = Colors.red;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black54,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.high_quality, color: Colors.white, size: 20),
          const SizedBox(width: 8),
          Text(
            '${(_qualityScore * 100).toInt()}%',
            style: TextStyle(
              color: qualityColor,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomPanel() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.grey.shade900,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Mensaje de estado
          Text(
            _statusMessage,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),

          // Botones de acción
          if (_isLocalAuthVerified && !_isCapturing)
            ElevatedButton.icon(
              onPressed: _startCapture,
              icon: const Icon(Icons.camera_alt),
              label: const Text('Iniciar Captura'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
              ),
            ),

          if (_isCapturing)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    color: Colors.blue,
                    strokeWidth: 2,
                  ),
                ),
                const SizedBox(width: 12),
                const Text(
                  'Detectando rostro...',
                  style: TextStyle(color: Colors.white70),
                ),
              ],
            ),

          const SizedBox(height: 8),

          // Timestamp
          Text(
            'Hora actual: ${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')}',
            style: TextStyle(
              color: Colors.grey.shade500,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
