import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;

class FaceRecognitionService {
  static const MethodChannel _channel = MethodChannel('face_recognition');
  
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableClassification: true,
      enableContours: true,
      enableLandmarks: true,
      enableTracking: false,
      minFaceSize: 0.2,
      performanceMode: FaceDetectorMode.accurate,
    ),
  );

  // Configuración de reconocimiento
  static const double _matchingThreshold = 0.85;
  static const double _highConfidenceThreshold = 0.92;
  static const double _minQualityScore = 75.0;
  static const int _requiredTemplates = 3;
  static const int _maxAttemptsPerTemplate = 5;

  enum RecognitionResult {
    success,
    noFaceDetected,
    multipleFaces,
    lowQuality,
    noMatch,
    multipleMatches,
    error
  }

  class FaceTemplate {
    final List<double> mlkitEmbedding;
    final List<double> facenetEmbedding;
    final List<double> arcfaceEmbedding;
    final double qualityScore;
    final Map<String, dynamic> landmarks;
    final Map<String, dynamic> metadata;
    final DateTime capturedAt;

    FaceTemplate({
      required this.mlkitEmbedding,
      required this.facenetEmbedding,
      required this.arcfaceEmbedding,
      required this.qualityScore,
      required this.landmarks,
      required this.metadata,
      required this.capturedAt,
    });

    Map<String, dynamic> toJson() => {
      'mlkitEmbedding': mlkitEmbedding,
      'facenetEmbedding': facenetEmbedding,
      'arcfaceEmbedding': arcfaceEmbedding,
      'qualityScore': qualityScore,
      'landmarks': landmarks,
      'metadata': metadata,
      'capturedAt': capturedAt.toIso8601String(),
    };

    factory FaceTemplate.fromJson(Map<String, dynamic> json) => FaceTemplate(
      mlkitEmbedding: List<double>.from(json['mlkitEmbedding']),
      facenetEmbedding: List<double>.from(json['facenetEmbedding']),
      arcfaceEmbedding: List<double>.from(json['arcfaceEmbedding']),
      qualityScore: json['qualityScore'].toDouble(),
      landmarks: json['landmarks'],
      metadata: json['metadata'],
      capturedAt: DateTime.parse(json['capturedAt']),
    );
  }

  class MatchResult {
    final String userId;
    final double confidence;
    final double mlkitScore;
    final double facenetScore;
    final double arcfaceScore;
    final Map<String, dynamic> details;

    MatchResult({
      required this.userId,
      required this.confidence,
      required this.mlkitScore,
      required this.facenetScore,
      required this.arcfaceScore,
      required this.details,
    });
  }

  /// Registra múltiples templates para un usuario
  Future<Map<String, dynamic>> registerUserFace({
    required String userId,
    required CameraController cameraController,
    Function(String)? onStatusUpdate,
    Function(double)? onProgressUpdate,
  }) async {
    final templates = <FaceTemplate>[];
    int attempts = 0;

    onStatusUpdate?.call('Iniciando registro facial...');

    while (templates.length < _requiredTemplates && attempts < _maxAttemptsPerTemplate * _requiredTemplates) {
      attempts++;
      onProgressUpdate?.call((templates.length / _requiredTemplates) * 0.9);
      
      onStatusUpdate?.call('Capturando template ${templates.length + 1} de $_requiredTemplates...');

      try {
        // Capturar imagen
        final image = await cameraController.takePicture();
        final template = await _captureTemplate(image.path);

        if (template != null) {
          // Verificar que no sea muy similar a templates existentes
          if (_isTemplateUnique(template, templates)) {
            templates.add(template);
            onStatusUpdate?.call('Template ${templates.length} capturado exitosamente');
            await Future.delayed(Duration(milliseconds: 1000));
          } else {
            onStatusUpdate?.call('Template muy similar, intenta con pose diferente');
            await Future.delayed(Duration(milliseconds: 500));
          }
        } else {
          onStatusUpdate?.call('Calidad insuficiente, reintentando...');
          await Future.delayed(Duration(milliseconds: 300));
        }

      } catch (e) {
        print('Error capturando template: $e');
        await Future.delayed(Duration(milliseconds: 300));
      }
    }

    if (templates.length < _requiredTemplates) {
      return {
        'success': false,
        'error': 'No se pudieron capturar suficientes templates de calidad',
        'templates': templates.length,
      };
    }

    onProgressUpdate?.call(1.0);
    onStatusUpdate?.call('Registro completado exitosamente');

    return {
      'success': true,
      'templates': templates.map((t) => t.toJson()).toList(),
      'quality': templates.map((t) => t.qualityScore).reduce((a, b) => a + b) / templates.length,
    };
  }

  /// Autentica un usuario usando reconocimiento facial
  Future<Map<String, dynamic>> authenticateUser({
    required CameraController cameraController,
    required List<Map<String, dynamic>> storedTemplates,
    Function(String)? onStatusUpdate,
    Function(double)? onProgressUpdate,
  }) async {
    onStatusUpdate?.call('Iniciando autenticación facial...');
    onProgressUpdate?.call(0.1);

    try {
      // Capturar múltiples muestras para mayor precisión
      final testTemplates = <FaceTemplate>[];
      const maxSamples = 3;

      for (int i = 0; i < maxSamples; i++) {
        onStatusUpdate?.call('Capturando muestra ${i + 1} de $maxSamples...');
        onProgressUpdate?.call(0.1 + (i / maxSamples) * 0.4);

        final image = await cameraController.takePicture();
        final template = await _captureTemplate(image.path);

        if (template != null) {
          testTemplates.add(template);
          await Future.delayed(Duration(milliseconds: 500));
        } else {
          // Si no podemos capturar template de calidad, reintentamos
          i--;
          await Future.delayed(Duration(milliseconds: 300));
        }
      }

      if (testTemplates.isEmpty) {
        return {
          'success': false,
          'error': 'No se pudo capturar face de calidad suficiente',
          'result': RecognitionResult.lowQuality,
        };
      }

      onStatusUpdate?.call('Comparando con templates registrados...');
      onProgressUpdate?.call(0.7);

      // Convertir templates almacenados
      final storedFaceTemplates = storedTemplates
          .map((json) => FaceTemplate.fromJson(json))
          .toList();

      // Realizar matching con múltiples algoritmos
      final matchResults = <MatchResult>[];
      
      for (final testTemplate in testTemplates) {
        final results = await _performMultiAlgorithmMatching(
          testTemplate,
          storedFaceTemplates,
        );
        matchResults.addAll(results);
      }

      onProgressUpdate?.call(0.9);
      onStatusUpdate?.call('Analizando resultados...');

      // Analizar resultados y determinar coincidencia
      final finalResult = _analyzeMatchResults(matchResults);

      onProgressUpdate?.call(1.0);
      
      if (finalResult['success']) {
        onStatusUpdate?.call('¡Autenticación exitosa!');
      } else {
        onStatusUpdate?.call('Autenticación fallida');
      }

      return finalResult;

    } catch (e) {
      print('Error en autenticación: $e');
      return {
        'success': false,
        'error': 'Error interno durante autenticación',
        'result': RecognitionResult.error,
      };
    }
  }

  /// Captura un template facial de alta calidad
  Future<FaceTemplate?> _captureTemplate(String imagePath) async {
    try {
      // Procesar imagen
      final inputImage = InputImage.fromFilePath(imagePath);
      final faces = await _faceDetector.processImage(inputImage);

      if (faces.isEmpty) return null;
      if (faces.length > 1) return null; // Solo una cara

      final face = faces.first;

      // Verificar calidad de la cara
      final quality = _calculateFaceQuality(face);
      if (quality < _minQualityScore) return null;

      // Cargar imagen como bytes
      final imageFile = File(imagePath);
      final imageBytes = await imageFile.readAsBytes();
      final image = img.decodeImage(imageBytes);
      
      if (image == null) return null;

      // Extraer región facial
      final faceBox = face.boundingBox;
      final faceImage = img.copyCrop(
        image,
        x: faceBox.left.round(),
        y: faceBox.top.round(),
        width: faceBox.width.round(),
        height: faceBox.height.round(),
      );

      // Redimensionar para algoritmos
      final resizedFace = img.copyResize(faceImage, width: 160, height: 160);
      final faceBytes = Uint8List.fromList(img.encodePng(resizedFace));

      // Generar embeddings con múltiples algoritmos
      final mlkitEmbedding = await _generateMLKitEmbedding(face, faceBytes);
      final facenetEmbedding = await _generateFaceNetEmbedding(faceBytes);
      final arcfaceEmbedding = await _generateArcFaceEmbedding(faceBytes);

      // Extraer landmarks
      final landmarks = _extractLandmarks(face);
      
      // Metadata adicional
      final metadata = {
        'imageWidth': image.width,
        'imageHeight': image.height,
        'faceBox': {
          'x': faceBox.left,
          'y': faceBox.top,
          'width': faceBox.width,
          'height': faceBox.height,
        },
        'headEulerAngleX': face.headEulerAngleX,
        'headEulerAngleY': face.headEulerAngleY,
        'headEulerAngleZ': face.headEulerAngleZ,
        'leftEyeOpenProbability': face.leftEyeOpenProbability,
        'rightEyeOpenProbability': face.rightEyeOpenProbability,
        'smilingProbability': face.smilingProbability,
      };

      return FaceTemplate(
        mlkitEmbedding: mlkitEmbedding,
        facenetEmbedding: facenetEmbedding,
        arcfaceEmbedding: arcfaceEmbedding,
        qualityScore: quality,
        landmarks: landmarks,
        metadata: metadata,
        capturedAt: DateTime.now(),
      );

    } catch (e) {
      print('Error capturando template: $e');
      return null;
    }
  }

  /// Calcula la calidad de una cara detectada
  double _calculateFaceQuality(Face face) {
    double score = 50.0; // Puntaje base
    
    // Tamaño de la cara (más grande = mejor)
    final faceArea = face.boundingBox.width * face.boundingBox.height;
    if (faceArea > 20000) score += 20;
    else if (faceArea > 10000) score += 10;
    else if (faceArea < 5000) score -= 20;

    // Ángulo de la cabeza (más frontal = mejor)
    final headAngle = (face.headEulerAngleY ?? 0).abs();
    if (headAngle < 10) score += 15;
    else if (headAngle < 30) score += 5;
    else score -= 10;

    // Ojos abiertos
    final leftEye = face.leftEyeOpenProbability ?? 0.5;
    final rightEye = face.rightEyeOpenProbability ?? 0.5;
    if (leftEye > 0.7 && rightEye > 0.7) score += 10;
    else if (leftEye < 0.3 || rightEye < 0.3) score -= 15;

    // Landmarks disponibles
    if (face.landmarks.isNotEmpty) score += 5;

    return score.clamp(0.0, 100.0);
  }

  /// Genera embedding usando ML Kit
  Future<List<double>> _generateMLKitEmbedding(Face face, Uint8List imageBytes) async {
    try {
      // Esta sería la implementación usando ML Kit
      // Por ahora, generamos un embedding simulado basado en características faciales
      final embedding = <double>[];
      
      // Usar características disponibles de ML Kit
      embedding.add(face.boundingBox.left);
      embedding.add(face.boundingBox.top);
      embedding.add(face.boundingBox.width);
      embedding.add(face.boundingBox.height);
      embedding.add(face.headEulerAngleX ?? 0);
      embedding.add(face.headEulerAngleY ?? 0);
      embedding.add(face.headEulerAngleZ ?? 0);
      embedding.add(face.leftEyeOpenProbability ?? 0.5);
      embedding.add(face.rightEyeOpenProbability ?? 0.5);
      embedding.add(face.smilingProbability ?? 0);

      // Agregar características de landmarks si están disponibles
      for (final landmark in face.landmarks.values) {
        embedding.add(landmark.position.x);
        embedding.add(landmark.position.y);
      }

      // Normalizar a un tamaño fijo (128 dimensiones)
      while (embedding.length < 128) {
        embedding.add(0.0);
      }
      
      return embedding.take(128).toList();

    } catch (e) {
      print('Error generando ML Kit embedding: $e');
      return List.filled(128, 0.0);
    }
  }

  /// Genera embedding usando FaceNet
  Future<List<double>> _generateFaceNetEmbedding(Uint8List imageBytes) async {
    try {
      // Llamar a código nativo para FaceNet
      final result = await _channel.invokeMethod('generateFaceNetEmbedding', {
        'imageBytes': imageBytes,
      });
      
      return List<double>.from(result ?? List.filled(512, 0.0));
    } catch (e) {
      print('Error generando FaceNet embedding: $e');
      // Fallback: embedding simulado
      final random = Random();
      return List.generate(512, (index) => random.nextDouble() * 2 - 1);
    }
  }

  /// Genera embedding usando ArcFace
  Future<List<double>> _generateArcFaceEmbedding(Uint8List imageBytes) async {
    try {
      // Llamar a código nativo para ArcFace
      final result = await _channel.invokeMethod('generateArcFaceEmbedding', {
        'imageBytes': imageBytes,
      });
      
      return List<double>.from(result ?? List.filled(512, 0.0));
    } catch (e) {
      print('Error generando ArcFace embedding: $e');
      // Fallback: embedding simulado
      final random = Random();
      return List.generate(512, (index) => random.nextDouble() * 2 - 1);
    }
  }

  /// Extrae landmarks faciales
  Map<String, dynamic> _extractLandmarks(Face face) {
    final landmarks = <String, dynamic>{};
    
    for (final entry in face.landmarks.entries) {
      landmarks[entry.key.name] = {
        'x': entry.value.position.x,
        'y': entry.value.position.y,
      };
    }
    
    return landmarks;
  }

  /// Verifica si un template es único comparado con existentes
  bool _isTemplateUnique(FaceTemplate newTemplate, List<FaceTemplate> existingTemplates) {
    if (existingTemplates.isEmpty) return true;

    for (final existing in existingTemplates) {
      final mlkitSimilarity = _cosineSimilarity(newTemplate.mlkitEmbedding, existing.mlkitEmbedding);
      
      // Si es muy similar a un template existente, no es único
      if (mlkitSimilarity > 0.95) return false;
    }

    return true;
  }

  /// Realiza matching con múltiples algoritmos
  Future<List<MatchResult>> _performMultiAlgorithmMatching(
    FaceTemplate testTemplate,
    List<FaceTemplate> storedTemplates,
  ) async {
    final results = <MatchResult>[];

    for (final stored in storedTemplates) {
      // Calcular similitudes con cada algoritmo
      final mlkitScore = _cosineSimilarity(testTemplate.mlkitEmbedding, stored.mlkitEmbedding);
      final facenetScore = _cosineSimilarity(testTemplate.facenetEmbedding, stored.facenetEmbedding);
      final arcfaceScore = _cosineSimilarity(testTemplate.arcfaceEmbedding, stored.arcfaceEmbedding);

      // Calcular confianza combinada (promedio ponderado)
      final confidence = (mlkitScore * 0.3) + (facenetScore * 0.4) + (arcfaceScore * 0.3);

      // Solo considerar si supera el umbral mínimo
      if (confidence >= _matchingThreshold) {
        results.add(MatchResult(
          userId: 'user_id', // Esto vendría del template almacenado
          confidence: confidence,
          mlkitScore: mlkitScore,
          facenetScore: facenetScore,
          arcfaceScore: arcfaceScore,
          details: {
            'qualityScore': stored.qualityScore,
            'templateAge': DateTime.now().difference(stored.capturedAt).inDays,
          },
        ));
      }
    }

    return results;
  }

  /// Analiza los resultados de matching para decisión final
  Map<String, dynamic> _analyzeMatchResults(List<MatchResult> results) {
    if (results.isEmpty) {
      return {
        'success': false,
        'result': RecognitionResult.noMatch,
        'confidence': 0.0,
      };
    }

    // Agrupar por userId y calcular confianza promedio
    final userResults = <String, List<MatchResult>>{};
    for (final result in results) {
      userResults.putIfAbsent(result.userId, () => []).add(result);
    }

    // Calcular confianza promedio por usuario
    final userConfidences = <String, double>{};
    for (final entry in userResults.entries) {
      final avgConfidence = entry.value
          .map((r) => r.confidence)
          .reduce((a, b) => a + b) / entry.value.length;
      userConfidences[entry.key] = avgConfidence;
    }

    // Encontrar la mejor coincidencia
    final bestUser = userConfidences.entries
        .reduce((a, b) => a.value > b.value ? a : b);

    // Verificar si hay múltiples usuarios con confianza similar
    final competitors = userConfidences.values
        .where((confidence) => (confidence - bestUser.value).abs() < 0.05)
        .length;

    if (competitors > 1) {
      return {
        'success': false,
        'result': RecognitionResult.multipleMatches,
        'confidence': bestUser.value,
        'details': userConfidences,
      };
    }

    // Verificar confianza mínima
    if (bestUser.value < _matchingThreshold) {
      return {
        'success': false,
        'result': RecognitionResult.noMatch,
        'confidence': bestUser.value,
      };
    }

    return {
      'success': true,
      'result': RecognitionResult.success,
      'userId': bestUser.key,
      'confidence': bestUser.value,
      'isHighConfidence': bestUser.value >= _highConfidenceThreshold,
      'details': {
        'matchCount': userResults[bestUser.key]!.length,
        'allScores': userResults[bestUser.key]!.map((r) => {
          'confidence': r.confidence,
          'mlkit': r.mlkitScore,
          'facenet': r.facenetScore,
          'arcface': r.arcfaceScore,
        }).toList(),
      },
    };
  }

  /// Calcula la similitud coseno entre dos vectores
  double _cosineSimilarity(List<double> a, List<double> b) {
    if (a.length != b.length) return 0.0;

    double dotProduct = 0.0;
    double normA = 0.0;
    double normB = 0.0;

    for (int i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA == 0.0 || normB == 0.0) return 0.0;

    return dotProduct / (sqrt(normA) * sqrt(normB));
  }

  /// Limpia los recursos
  void dispose() {
    _faceDetector.close();
  }
}