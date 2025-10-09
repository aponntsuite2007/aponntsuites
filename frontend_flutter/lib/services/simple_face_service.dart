import 'dart:convert';
import 'dart:math';

class SimpleFaceService {
  
  /// Simulate face capture and processing
  static Future<Map<String, dynamic>?> captureAndProcessFace() async {
    // Simulate processing time
    await Future.delayed(Duration(seconds: 2));
    
    // Generate a random quality score between 75-95
    final random = Random();
    final quality = 75.0 + random.nextDouble() * 20.0;
    
    // Generate mock face embedding (128 dimensional vector)
    final embedding = List.generate(128, (index) => random.nextDouble() * 2.0 - 1.0);
    
    // Simulate success/failure based on quality
    final success = quality > 70.0;
    
    if (success) {
      return {
        'success': true,
        'quality': quality,
        'embedding': json.encode(embedding),
        'landmarks': {
          'leftEye': {'x': 120.5, 'y': 85.2},
          'rightEye': {'x': 180.3, 'y': 84.8},
          'nose': {'x': 150.1, 'y': 110.5},
          'mouth': {'x': 149.8, 'y': 140.2},
        },
        'boundingBox': {
          'left': 80.0,
          'top': 60.0,
          'width': 140.0,
          'height': 160.0,
        },
        'rotationY': random.nextDouble() * 10.0 - 5.0,
        'rotationZ': random.nextDouble() * 10.0 - 5.0,
        'timestamp': DateTime.now().toIso8601String(),
      };
    } else {
      return {
        'success': false,
        'error': 'Calidad insuficiente: ${quality.toStringAsFixed(1)}%. Mínimo requerido: 70%',
        'quality': quality,
      };
    }
  }
  
  /// Initialize service (placeholder for real implementation)
  static Future<bool> initialize() async {
    await Future.delayed(Duration(milliseconds: 500));
    print('⚠️ [SIMPLE-FACE] Service initialized (DEPRECATED - Use RealCameraService instead)');
    return true;
  }
  
  /// Get available cameras (mock data)
  static List<Map<String, dynamic>> getAvailableCameras() {
    return [
      {
        'id': 0,
        'name': 'Camera 0',
        'lensDirection': 'front',
        'description': 'Cámara Frontal',
      },
      {
        'id': 1,
        'name': 'Camera 1', 
        'lensDirection': 'back',
        'description': 'Cámara Trasera',
      },
    ];
  }
  
  /// Dispose resources
  static Future<void> dispose() async {
    print('🧹 [SIMPLE-FACE] Service disposed');
  }
}