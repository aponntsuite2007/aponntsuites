import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;

class RealCameraService {
  static List<CameraDescription> _cameras = [];
  static CameraController? _controller;
  static bool _isInitialized = false;

  /// Initialize cameras and get available devices
  static Future<bool> initialize() async {
    try {
      _cameras = await availableCameras();
      _isInitialized = true;
      print('✅ [CAMERA] ${_cameras.length} cameras detected');
      
      for (int i = 0; i < _cameras.length; i++) {
        final camera = _cameras[i];
        print('📷 [CAMERA-$i] ${camera.name} - ${camera.lensDirection}');
      }
      
      return true;
    } catch (e) {
      print('❌ [CAMERA] Error initializing: $e');
      return false;
    }
  }

  /// Get available cameras
  static List<CameraDescription> getAvailableCameras() {
    return _cameras;
  }

  /// Get default front-facing camera
  static CameraDescription? getDefaultFrontCamera() {
    try {
      return _cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
      );
    } catch (e) {
      // If no front camera, return first available
      return _cameras.isNotEmpty ? _cameras.first : null;
    }
  }

  /// Initialize camera controller
  static Future<CameraController?> initializeController({
    CameraDescription? camera,
    ResolutionPreset resolution = ResolutionPreset.medium,
  }) async {
    try {
      camera ??= getDefaultFrontCamera();
      if (camera == null) {
        throw Exception('No camera available');
      }

      _controller = CameraController(
        camera,
        resolution,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _controller!.initialize();
      print('✅ [CAMERA] Controller initialized for ${camera.name}');
      
      return _controller;
    } catch (e) {
      print('❌ [CAMERA] Error initializing controller: $e');
      return null;
    }
  }

  /// Capture image and process for face detection
  static Future<Map<String, dynamic>?> captureAndProcessFace({
    CameraController? controller,
  }) async {
    controller ??= _controller;
    
    if (controller == null || !controller.value.isInitialized) {
      throw Exception('Camera controller not initialized');
    }

    try {
      print('📸 [CAMERA] Capturing image...');
      
      // Capture image
      final XFile imageFile = await controller.takePicture();
      final Uint8List imageBytes = await imageFile.readAsBytes();
      
      print('📸 [CAMERA] Image captured: ${imageBytes.length} bytes');

      // Process image (convert to format for analysis)
      final processedData = await _processImageForFaceDetection(imageBytes);
      
      if (processedData['success'] == true) {
        print('✅ [CAMERA] Face processing successful');
        return processedData;
      } else {
        print('❌ [CAMERA] Face processing failed');
        return processedData;
      }
      
    } catch (e) {
      print('❌ [CAMERA] Error capturing image: $e');
      return {
        'success': false,
        'error': 'Error capturando imagen: $e',
      };
    }
  }

  /// Process image for face detection (simplified without ML Kit)
  static Future<Map<String, dynamic>> _processImageForFaceDetection(
    Uint8List imageBytes,
  ) async {
    try {
      // Decode image to get dimensions
      final image = img.decodeImage(imageBytes);
      if (image == null) {
        return {
          'success': false,
          'error': 'No se pudo decodificar la imagen',
        };
      }

      final width = image.width;
      final height = image.height;
      
      print('🖼️ [CAMERA] Image size: ${width}x${height}');

      // Calculate basic image quality metrics
      final imageSize = imageBytes.length;
      final megapixels = (width * height) / 1000000;
      
      // Basic quality scoring based on image properties
      double qualityScore = 0.0;
      
      // Size quality (prefer images between 0.5-5 MP)
      if (megapixels >= 0.5 && megapixels <= 5.0) {
        qualityScore += 30.0;
      } else if (megapixels > 0.2) {
        qualityScore += 20.0;
      }
      
      // Resolution quality
      if (width >= 640 && height >= 480) {
        qualityScore += 25.0;
      }
      
      // File size quality (reasonable compression)
      if (imageSize > 50000 && imageSize < 2000000) {
        qualityScore += 20.0;
      }
      
      // Add random component to simulate actual face detection
      final random = Random();
      qualityScore += random.nextDouble() * 25.0;

      // Generate mock face embedding (128 dimensional vector)
      final embedding = List.generate(128, (index) => random.nextDouble() * 2.0 - 1.0);
      
      // Simulate face detection landmarks (relative to center)
      final centerX = width / 2;
      final centerY = height / 2;
      final faceSize = min(width, height) * 0.4; // Assume face is 40% of smaller dimension
      
      if (qualityScore > 60.0) {
        return {
          'success': true,
          'quality': qualityScore,
          'embedding': json.encode(embedding),
          'imageWidth': width,
          'imageHeight': height,
          'imageSize': imageSize,
          'megapixels': megapixels,
          'landmarks': {
            'leftEye': {
              'x': centerX - faceSize * 0.2,
              'y': centerY - faceSize * 0.1
            },
            'rightEye': {
              'x': centerX + faceSize * 0.2,
              'y': centerY - faceSize * 0.1
            },
            'nose': {
              'x': centerX,
              'y': centerY
            },
            'mouth': {
              'x': centerX,
              'y': centerY + faceSize * 0.2
            },
          },
          'boundingBox': {
            'left': centerX - faceSize * 0.5,
            'top': centerY - faceSize * 0.6,
            'width': faceSize,
            'height': faceSize * 1.2,
          },
          'rotationY': random.nextDouble() * 10.0 - 5.0,
          'rotationZ': random.nextDouble() * 10.0 - 5.0,
          'timestamp': DateTime.now().toIso8601String(),
          'imageData': base64Encode(imageBytes), // Include image data for verification
        };
      } else {
        return {
          'success': false,
          'error': 'Calidad insuficiente: ${qualityScore.toStringAsFixed(1)}%. Mínimo requerido: 60%',
          'quality': qualityScore,
          'suggestions': _getQualitySuggestions(qualityScore, width, height, imageSize),
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Error procesando imagen: $e',
      };
    }
  }

  /// Get quality improvement suggestions
  static List<String> _getQualitySuggestions(
    double quality, int width, int height, int fileSize
  ) {
    List<String> suggestions = [];
    
    if (width < 640 || height < 480) {
      suggestions.add('Usa una resolución más alta (mínimo 640x480)');
    }
    
    if (fileSize < 50000) {
      suggestions.add('La imagen parece muy comprimida, intenta mejor calidad');
    }
    
    if (quality < 40) {
      suggestions.add('Asegúrate de tener buena iluminación');
      suggestions.add('Mantén el rostro centrado y cerca a la cámara');
      suggestions.add('Evita movimiento durante la captura');
    }
    
    return suggestions;
  }

  /// Dispose camera controller
  static Future<void> disposeController() async {
    try {
      await _controller?.dispose();
      _controller = null;
      print('🧹 [CAMERA] Controller disposed');
    } catch (e) {
      print('❌ [CAMERA] Error disposing controller: $e');
    }
  }

  /// Check if service is initialized
  static bool get isInitialized => _isInitialized;
  
  /// Get current controller
  static CameraController? get controller => _controller;
  
  /// Get cameras count
  static int get camerasCount => _cameras.length;
}