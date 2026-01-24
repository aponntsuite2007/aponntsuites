import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'dart:convert';
import 'dart:async';
import 'dart:io';
import 'dart:math';
import '../services/config_service.dart';

/// 🎯 FACE ENROLLMENT SCREEN - Multi-Angle Template Capture
/// =========================================================
/// Guía al empleado para capturar su template facial desde múltiples ángulos:
/// 1. Frente (obligatorio)
/// 2. Perfil izquierdo (~30 grados)
/// 3. Perfil derecho (~30 grados)
/// 4. Con/sin lentes (opcional)
///
/// Cada captura se envía al backend para generar el embedding 128D
/// y almacenarlo encriptado en biometric_templates.

enum EnrollmentStep { front, left, right, confirm }

class FaceEnrollmentScreen extends StatefulWidget {
  final String employeeId;
  final String companyId;
  final String employeeName;

  const FaceEnrollmentScreen({
    Key? key,
    required this.employeeId,
    required this.companyId,
    required this.employeeName,
  }) : super(key: key);

  @override
  _FaceEnrollmentScreenState createState() => _FaceEnrollmentScreenState();
}

class _FaceEnrollmentScreenState extends State<FaceEnrollmentScreen> {
  CameraController? _cameraController;
  bool _isCameraInitialized = false;
  EnrollmentStep _currentStep = EnrollmentStep.front;
  final List<File> _capturedPhotos = [];
  final List<String> _capturedLabels = [];
  bool _isCapturing = false;
  bool _isUploading = false;
  String _instruction = 'Mire directamente a la cámara';
  String? _serverUrl;
  double _faceQuality = 0.0;
  bool _faceDetected = false;
  double _headYAngle = 0.0;

  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableClassification: true,
      enableLandmarks: true,
      enableTracking: true,
      performanceMode: FaceDetectorMode.accurate,
      minFaceSize: 0.3,
    ),
  );

  Timer? _detectionTimer;
  int _successfulCaptures = 0;

  @override
  void initState() {
    super.initState();
    _initCamera();
    _loadConfig();
  }

  Future<void> _loadConfig() async {
    _serverUrl = await ConfigService.getServerUrl();
  }

  Future<void> _initCamera() async {
    final cameras = await availableCameras();
    final frontCamera = cameras.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.front,
      orElse: () => cameras.first,
    );

    _cameraController = CameraController(
      frontCamera,
      ResolutionPreset.high,
      enableAudio: false,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );

    await _cameraController!.initialize();
    if (mounted) {
      setState(() => _isCameraInitialized = true);
      _startFaceDetection();
    }
  }

  void _startFaceDetection() {
    _detectionTimer = Timer.periodic(const Duration(milliseconds: 500), (_) async {
      if (!_isCameraInitialized || _isCapturing || _cameraController == null) return;

      try {
        final image = await _cameraController!.takePicture();
        final inputImage = InputImage.fromFilePath(image.path);
        final faces = await _faceDetector.processImage(inputImage);

        if (mounted) {
          if (faces.isEmpty) {
            setState(() {
              _faceDetected = false;
              _faceQuality = 0.0;
            });
          } else if (faces.length == 1) {
            final face = faces.first;
            final headY = face.headEulerAngleY ?? 0.0;
            final quality = _calculateQuality(face);

            setState(() {
              _faceDetected = true;
              _faceQuality = quality;
              _headYAngle = headY;
            });

            // Verificar si la pose coincide con el paso actual
            if (quality >= 0.6 && _isPoseCorrect(headY)) {
              setState(() => _instruction = _getReadyInstruction());
            } else {
              setState(() => _instruction = _getStepInstruction());
            }
          } else {
            setState(() {
              _faceDetected = false;
              _instruction = 'Solo una persona frente a la cámara';
            });
          }
        }

        // Limpiar archivo temporal
        try { await File(image.path).delete(); } catch (_) {}
      } catch (_) {}
    });
  }

  double _calculateQuality(Face face) {
    double score = 0.5;
    if (face.boundingBox.width > 150) score += 0.2;
    if ((face.leftEyeOpenProbability ?? 0) > 0.5) score += 0.15;
    if ((face.rightEyeOpenProbability ?? 0) > 0.5) score += 0.15;
    return min(1.0, score);
  }

  bool _isPoseCorrect(double headY) {
    switch (_currentStep) {
      case EnrollmentStep.front:
        return headY.abs() < 10; // Mirando al frente
      case EnrollmentStep.left:
        return headY > 20 && headY < 50; // Girado a la izquierda
      case EnrollmentStep.right:
        return headY < -20 && headY > -50; // Girado a la derecha
      case EnrollmentStep.confirm:
        return true;
    }
  }

  String _getStepInstruction() {
    switch (_currentStep) {
      case EnrollmentStep.front:
        return 'Mire directamente a la cámara';
      case EnrollmentStep.left:
        return 'Gire la cabeza hacia la IZQUIERDA';
      case EnrollmentStep.right:
        return 'Gire la cabeza hacia la DERECHA';
      case EnrollmentStep.confirm:
        return 'Capturas completadas';
    }
  }

  String _getReadyInstruction() {
    switch (_currentStep) {
      case EnrollmentStep.front:
        return '¡Perfecto! Toque el botón para capturar';
      case EnrollmentStep.left:
        return '¡Bien! Mantenga la pose y capture';
      case EnrollmentStep.right:
        return '¡Excelente! Capture ahora';
      case EnrollmentStep.confirm:
        return 'Listo para enviar';
    }
  }

  Future<void> _capturePhoto() async {
    if (_isCapturing || !_faceDetected || _faceQuality < 0.6) return;

    setState(() => _isCapturing = true);

    try {
      final image = await _cameraController!.takePicture();
      final file = File(image.path);

      _capturedPhotos.add(file);
      _capturedLabels.add(_currentStep.name);
      _successfulCaptures++;

      // Avanzar al siguiente paso
      setState(() {
        switch (_currentStep) {
          case EnrollmentStep.front:
            _currentStep = EnrollmentStep.left;
            break;
          case EnrollmentStep.left:
            _currentStep = EnrollmentStep.right;
            break;
          case EnrollmentStep.right:
            _currentStep = EnrollmentStep.confirm;
            _detectionTimer?.cancel();
            break;
          case EnrollmentStep.confirm:
            break;
        }
        _instruction = _getStepInstruction();
      });
    } finally {
      setState(() => _isCapturing = false);
    }
  }

  Future<void> _uploadTemplates() async {
    if (_capturedPhotos.isEmpty) return;

    setState(() => _isUploading = true);

    try {
      final baseUrl = _serverUrl ?? 'https://www.aponnt.com';
      int successCount = 0;

      for (int i = 0; i < _capturedPhotos.length; i++) {
        final uri = Uri.parse('$baseUrl/api/v2/biometric-enterprise/enroll-face');
        final request = http.MultipartRequest('POST', uri);

        request.fields['employeeId'] = widget.employeeId;
        request.fields['captureAngle'] = _capturedLabels[i];
        request.fields['isPrimary'] = (i == 0).toString(); // Frente es primario
        request.fields['quality'] = '0.7';

        final bytes = await _capturedPhotos[i].readAsBytes();
        request.files.add(http.MultipartFile.fromBytes(
          'faceImage',
          bytes,
          filename: 'enrollment_${_capturedLabels[i]}_${DateTime.now().millisecondsSinceEpoch}.jpg',
          contentType: http_parser.MediaType('image', 'jpeg'),
        ));

        final token = await ConfigService.getAdminToken();
        if (token != null) {
          request.headers['Authorization'] = 'Bearer $token';
        }
        request.headers['X-Company-Id'] = widget.companyId;

        final response = await request.send().timeout(const Duration(seconds: 15));
        if (response.statusCode == 200 || response.statusCode == 201) {
          successCount++;
        }
      }

      if (mounted) {
        if (successCount == _capturedPhotos.length) {
          _showResultDialog(true, '$successCount templates registrados exitosamente');
        } else {
          _showResultDialog(false, '$successCount de ${_capturedPhotos.length} templates registrados');
        }
      }
    } catch (e) {
      if (mounted) {
        _showResultDialog(false, 'Error: ${e.toString()}');
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  void _showResultDialog(bool success, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(success ? 'Registro Exitoso' : 'Error'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              if (success) Navigator.of(context).pop(true);
            },
            child: Text('Aceptar'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _detectionTimer?.cancel();
    _cameraController?.dispose();
    _faceDetector.close();
    // Limpiar fotos temporales
    for (final file in _capturedPhotos) {
      try { file.deleteSync(); } catch (_) {}
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[900],
      appBar: AppBar(
        title: Text('Registro Facial - ${widget.employeeName}'),
        backgroundColor: Colors.blue[900],
      ),
      body: Column(
        children: [
          // Progreso
          _buildProgressBar(),

          // Cámara
          Expanded(
            child: _isCameraInitialized && _currentStep != EnrollmentStep.confirm
                ? Stack(
                    children: [
                      Center(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: SizedBox(
                            width: 300,
                            height: 400,
                            child: FittedBox(
                              fit: BoxFit.cover,
                              child: SizedBox(
                                width: _cameraController!.value.previewSize!.height,
                                height: _cameraController!.value.previewSize!.width,
                                child: CameraPreview(_cameraController!),
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Guía de pose
                      Center(
                        child: _buildPoseGuide(),
                      ),
                      // Indicador de calidad
                      Positioned(
                        bottom: 20,
                        left: 20,
                        right: 20,
                        child: _buildQualityIndicator(),
                      ),
                    ],
                  )
                : _buildConfirmationView(),
          ),

          // Instrucción
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.black87,
            width: double.infinity,
            child: Text(
              _instruction,
              style: TextStyle(
                color: _faceDetected && _faceQuality >= 0.6 ? Colors.greenAccent : Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
          ),

          // Botón de captura
          if (_currentStep != EnrollmentStep.confirm)
            Padding(
              padding: const EdgeInsets.all(16),
              child: ElevatedButton.icon(
                onPressed: (_faceDetected && _faceQuality >= 0.6 && _isPoseCorrect(_headYAngle))
                    ? _capturePhoto
                    : null,
                icon: Icon(Icons.camera_alt, size: 28),
                label: Text('Capturar ${_currentStep.name.toUpperCase()}',
                    style: TextStyle(fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue[700],
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                ),
              ),
            ),

          // Botón de enviar (en confirm)
          if (_currentStep == EnrollmentStep.confirm)
            Padding(
              padding: const EdgeInsets.all(16),
              child: _isUploading
                  ? CircularProgressIndicator(color: Colors.blue)
                  : ElevatedButton.icon(
                      onPressed: _uploadTemplates,
                      icon: Icon(Icons.cloud_upload, size: 28),
                      label: Text('Registrar ${_capturedPhotos.length} Templates',
                          style: TextStyle(fontSize: 16)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green[700],
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                      ),
                    ),
            ),
        ],
      ),
    );
  }

  Widget _buildProgressBar() {
    final steps = ['Frente', 'Izquierda', 'Derecha', 'Confirmar'];
    final currentIndex = EnrollmentStep.values.indexOf(_currentStep);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      color: Colors.black54,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(steps.length, (i) {
          final isCompleted = i < currentIndex;
          final isCurrent = i == currentIndex;
          return Column(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: isCompleted
                    ? Colors.green
                    : isCurrent
                        ? Colors.blue
                        : Colors.grey[700],
                child: isCompleted
                    ? Icon(Icons.check, size: 16, color: Colors.white)
                    : Text('${i + 1}', style: TextStyle(color: Colors.white, fontSize: 12)),
              ),
              SizedBox(height: 4),
              Text(steps[i],
                  style: TextStyle(
                    color: isCurrent ? Colors.blue[200] : Colors.grey,
                    fontSize: 11,
                  )),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildPoseGuide() {
    IconData icon;
    double rotation = 0;
    switch (_currentStep) {
      case EnrollmentStep.front:
        icon = Icons.face;
        break;
      case EnrollmentStep.left:
        icon = Icons.face;
        rotation = 0.3;
        break;
      case EnrollmentStep.right:
        icon = Icons.face;
        rotation = -0.3;
        break;
      default:
        icon = Icons.check_circle;
    }

    return Transform.rotate(
      angle: rotation,
      child: Container(
        width: 200,
        height: 260,
        decoration: BoxDecoration(
          border: Border.all(
            color: _faceDetected && _isPoseCorrect(_headYAngle)
                ? Colors.green.withOpacity(0.8)
                : Colors.white.withOpacity(0.4),
            width: 3,
          ),
          borderRadius: BorderRadius.circular(100),
        ),
      ),
    );
  }

  Widget _buildQualityIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _faceDetected ? Icons.face : Icons.face_retouching_off,
            color: _faceDetected ? Colors.green : Colors.red,
            size: 20,
          ),
          SizedBox(width: 8),
          Text(
            _faceDetected ? 'Calidad: ${(_faceQuality * 100).toInt()}%' : 'Sin rostro',
            style: TextStyle(color: Colors.white, fontSize: 14),
          ),
          if (_faceDetected) ...[
            SizedBox(width: 12),
            Text(
              'Ángulo: ${_headYAngle.toStringAsFixed(0)}°',
              style: TextStyle(color: Colors.grey[400], fontSize: 12),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildConfirmationView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline, size: 80, color: Colors.green),
          SizedBox(height: 20),
          Text(
            '${_capturedPhotos.length} fotos capturadas',
            style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 10),
          Text(
            'Ángulos: ${_capturedLabels.join(", ")}',
            style: TextStyle(color: Colors.grey[400], fontSize: 16),
          ),
          SizedBox(height: 30),
          Text(
            'Toque "Registrar Templates" para enviar al servidor',
            style: TextStyle(color: Colors.grey[300], fontSize: 14),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
