import 'dart:async';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../../services/real_camera_service.dart';

class FaceCaptureScreen extends StatefulWidget {
  final Function(Map<String, dynamic>) onCaptureComplete;
  final String? userName;

  const FaceCaptureScreen({
    Key? key,
    required this.onCaptureComplete,
    this.userName,
  }) : super(key: key);

  @override
  _FaceCaptureScreenState createState() => _FaceCaptureScreenState();
}

class _FaceCaptureScreenState extends State<FaceCaptureScreen>
    with TickerProviderStateMixin {
  CameraController? _cameraController;
  bool _isInitialized = false;
  bool _isCapturing = false;
  String _statusMessage = 'Inicializando cámara...';
  int _selectedCameraIndex = 0;
  List<CameraDescription> _availableCameras = [];
  
  // Animation controllers
  late AnimationController _pulseController;
  late AnimationController _scanController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _scanAnimation;
  
  Timer? _captureTimer;
  int _countdown = 0;
  bool _showCountdown = false;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _initializeCamera();
  }

  void _initializeAnimations() {
    _pulseController = AnimationController(
      duration: Duration(milliseconds: 1500),
      vsync: this,
    );
    
    _scanController = AnimationController(
      duration: Duration(milliseconds: 2000),
      vsync: this,
    );
    
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.1,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    
    _scanAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _scanController,
      curve: Curves.easeInOut,
    ));

    _pulseController.repeat(reverse: true);
  }

  Future<void> _initializeCamera() async {
    try {
      // Initialize camera service
      await RealCameraService.initialize();
      _availableCameras = RealCameraService.getAvailableCameras();
      
      if (_availableCameras.isEmpty) {
        setState(() {
          _statusMessage = 'No se encontraron cámaras disponibles';
        });
        return;
      }

      // Try to find front camera first
      final frontCamera = RealCameraService.getDefaultFrontCamera();
      if (frontCamera != null) {
        _selectedCameraIndex = _availableCameras.indexOf(frontCamera);
      }

      await _switchCamera(_selectedCameraIndex);
    } catch (e) {
      setState(() {
        _statusMessage = 'Error inicializando cámara: $e';
      });
    }
  }

  Future<void> _switchCamera(int cameraIndex) async {
    if (cameraIndex >= _availableCameras.length) return;

    setState(() {
      _isInitialized = false;
      _statusMessage = 'Cambiando cámara...';
    });

    try {
      // Dispose current controller
      await _cameraController?.dispose();

      // Initialize new camera
      final camera = _availableCameras[cameraIndex];
      _cameraController = await RealCameraService.initializeController(
        camera: camera,
        resolution: ResolutionPreset.high,
      );

      if (_cameraController != null) {
        setState(() {
          _selectedCameraIndex = cameraIndex;
          _isInitialized = true;
          _statusMessage = 'Posiciona tu rostro en el óvalo';
        });
      } else {
        setState(() {
          _statusMessage = 'Error inicializando cámara seleccionada';
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Error cambiando cámara: $e';
      });
    }
  }

  void _startCapture() {
    if (!_isInitialized || _isCapturing) return;

    setState(() {
      _isCapturing = true;
      _showCountdown = true;
      _countdown = 3;
      _statusMessage = 'Preparándose para capturar...';
    });

    _scanController.forward();

    _captureTimer = Timer.periodic(Duration(seconds: 1), (timer) {
      setState(() {
        _countdown--;
      });

      if (_countdown <= 0) {
        timer.cancel();
        _performCapture();
      }
    });
  }

  Future<void> _performCapture() async {
    setState(() {
      _showCountdown = false;
      _statusMessage = 'Capturando imagen...';
    });

    try {
      final result = await RealCameraService.captureAndProcessFace(
        controller: _cameraController,
      );

      if (result != null) {
        _scanController.stop();
        widget.onCaptureComplete(result);
      } else {
        setState(() {
          _isCapturing = false;
          _statusMessage = 'Error en la captura. Intenta nuevamente';
        });
        _scanController.reset();
      }
    } catch (e) {
      setState(() {
        _isCapturing = false;
        _statusMessage = 'Error: $e';
      });
      _scanController.reset();
    }
  }

  Widget _buildCameraPreview() {
    if (!_isInitialized || _cameraController == null) {
      return Container(
        color: Colors.black,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Colors.white),
              SizedBox(height: 16),
              Text(
                _statusMessage,
                style: TextStyle(color: Colors.white),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        // Camera preview
        CameraPreview(_cameraController!),
        
        // Face detection overlay
        _buildFaceOverlay(),
        
        // Scanning animation
        if (_isCapturing)
          AnimatedBuilder(
            animation: _scanAnimation,
            builder: (context, child) {
              return CustomPaint(
                painter: ScanLinePainter(_scanAnimation.value),
                size: Size.infinite,
              );
            },
          ),
      ],
    );
  }

  Widget _buildFaceOverlay() {
    return Center(
      child: AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _pulseAnimation.value,
            child: Container(
              width: 280,
              height: 350,
              decoration: BoxDecoration(
                shape: BoxShape.rectangle,
                borderRadius: BorderRadius.circular(180),
                border: Border.all(
                  color: _isCapturing ? Colors.green : Colors.white,
                  width: 3,
                ),
              ),
              child: CustomPaint(
                painter: FaceGuidePainter(
                  isCapturing: _isCapturing,
                  progress: _scanAnimation.value,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCountdownOverlay() {
    if (!_showCountdown) return SizedBox.shrink();

    return Container(
      color: Colors.black.withOpacity(0.7),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              '$_countdown',
              style: TextStyle(
                fontSize: 120,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 20),
            Text(
              'Mantén el rostro centrado',
              style: TextStyle(
                fontSize: 18,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Captura Biométrica',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          if (_availableCameras.length > 1)
            IconButton(
              icon: Icon(Icons.cameraswitch, color: Colors.white),
              onPressed: _isCapturing ? null : () {
                final nextIndex = (_selectedCameraIndex + 1) % _availableCameras.length;
                _switchCamera(nextIndex);
              },
            ),
        ],
      ),
      body: Stack(
        children: [
          // Camera preview
          _buildCameraPreview(),
          
          // Top instructions
          Positioned(
            top: 20,
            left: 20,
            right: 20,
            child: Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  if (widget.userName != null) ...[
                    Text(
                      'Hola, ${widget.userName}',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 4),
                  ],
                  Text(
                    _statusMessage,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
          
          // Bottom controls
          Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Column(
              children: [
                // Camera info
                if (_availableCameras.isNotEmpty)
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Cámara: ${_availableCameras[_selectedCameraIndex].lensDirection == CameraLensDirection.front ? 'Frontal' : 'Trasera'}',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                
                SizedBox(height: 20),
                
                // Capture button
                GestureDetector(
                  onTap: _isInitialized && !_isCapturing ? _startCapture : null,
                  child: Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isInitialized && !_isCapturing 
                        ? Colors.white 
                        : Colors.grey,
                      border: Border.all(
                        color: Colors.white,
                        width: 4,
                      ),
                    ),
                    child: Icon(
                      _isCapturing ? Icons.hourglass_empty : Icons.camera_alt,
                      color: _isInitialized ? Colors.blue : Colors.grey[400],
                      size: 40,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Countdown overlay
          _buildCountdownOverlay(),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _captureTimer?.cancel();
    _pulseController.dispose();
    _scanController.dispose();
    _cameraController?.dispose();
    RealCameraService.disposeController();
    super.dispose();
  }
}

// Custom painter for face guide
class FaceGuidePainter extends CustomPainter {
  final bool isCapturing;
  final double progress;

  FaceGuidePainter({required this.isCapturing, required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final centerX = size.width / 2;
    final centerY = size.height / 2;

    if (isCapturing) {
      // Draw progress indicator
      paint.color = Colors.green.withOpacity(0.8);
      final sweepAngle = progress * 2 * 3.14159;
      canvas.drawArc(
        Rect.fromCircle(center: Offset(centerX, centerY), radius: 100),
        -3.14159 / 2,
        sweepAngle,
        false,
        paint,
      );
    }

    // Draw guide points
    paint.color = Colors.white.withOpacity(0.8);
    paint.style = PaintingStyle.fill;
    
    // Eye guides
    canvas.drawCircle(Offset(centerX - 40, centerY - 30), 3, paint);
    canvas.drawCircle(Offset(centerX + 40, centerY - 30), 3, paint);
    
    // Nose guide
    canvas.drawCircle(Offset(centerX, centerY), 2, paint);
    
    // Mouth guide
    canvas.drawCircle(Offset(centerX, centerY + 40), 2, paint);
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => true;
}

// Custom painter for scanning line
class ScanLinePainter extends CustomPainter {
  final double progress;

  ScanLinePainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.green.withOpacity(0.8)
      ..strokeWidth = 3;

    final y = size.height * progress;
    canvas.drawLine(
      Offset(0, y),
      Offset(size.width, y),
      paint,
    );
  }

  @override
  bool shouldRepaint(CustomPainter oldDelegate) => true;
}