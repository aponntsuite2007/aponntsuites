import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:sensors_plus/sensors_plus.dart';

class FaceLivenessService {
  static const MethodChannel _channel = MethodChannel('face_liveness');
  
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      enableClassification: true,
      enableContours: true,
      enableLandmarks: true,
      enableTracking: true,
      minFaceSize: 0.15,
      performanceMode: FaceDetectorMode.accurate,
    ),
  );

  // Estado del desafío de vida
  enum LivenessChallenge {
    blink,
    smile,
    turnLeft,
    turnRight,
    openMouth,
    nod
  }

  enum LivenessResult {
    success,
    noFaceDetected,
    multipleFaces,
    challengeFailed,
    spoofingDetected,
    timeout,
    lowQuality
  }

  class LivenessSession {
    final List<LivenessChallenge> challenges;
    final Map<LivenessChallenge, bool> completedChallenges;
    final List<Face> faceHistory;
    final List<double> lightLevels;
    final DateTime startTime;
    int currentChallengeIndex;
    
    LivenessSession(this.challenges) 
        : completedChallenges = {},
          faceHistory = [],
          lightLevels = [],
          startTime = DateTime.now(),
          currentChallengeIndex = 0;

    bool get isCompleted => completedChallenges.length == challenges.length;
    LivenessChallenge? get currentChallenge => 
        currentChallengeIndex < challenges.length ? challenges[currentChallengeIndex] : null;
  }

  // Configuración anti-spoofing
  static const double _minBlinkDuration = 0.1; // segundos
  static const double _maxBlinkDuration = 0.8; // segundos
  static const double _minSmileProbability = 0.7;
  static const double _minHeadRotation = 15.0; // grados
  static const double _maxSessionTime = 30.0; // segundos
  static const double _minLightVariation = 0.15;
  static const int _minFramesForChallenge = 10;

  /// Inicia una sesión de detección de vida completa
  Future<LivenessResult> performLivenessDetection({
    required CameraController cameraController,
    Function(String)? onInstructionUpdate,
    Function(double)? onProgressUpdate,
  }) async {
    try {
      // Generar desafíos aleatorios
      final challenges = _generateRandomChallenges();
      final session = LivenessSession(challenges);
      
      onInstructionUpdate?.call('Preparándose para verificación...');
      
      // Configurar sensores
      late StreamSubscription<AccelerometerEvent> accelSubscription;
      final List<AccelerometerEvent> movementHistory = [];
      
      accelSubscription = accelerometerEvents.listen((AccelerometerEvent event) {
        movementHistory.add(event);
        if (movementHistory.length > 100) {
          movementHistory.removeAt(0);
        }
      });

      try {
        // Ejecutar desafíos secuencialmente
        for (int i = 0; i < challenges.length; i++) {
          session.currentChallengeIndex = i;
          final challenge = challenges[i];
          
          onProgressUpdate?.call((i / challenges.length) * 0.8);
          onInstructionUpdate?.call(_getChallengeInstruction(challenge));
          
          final result = await _performSingleChallenge(
            challenge, 
            session, 
            cameraController,
            movementHistory,
          );
          
          if (result != LivenessResult.success) {
            return result;
          }
        }

        // Análisis final anti-spoofing
        onProgressUpdate?.call(0.9);
        onInstructionUpdate?.call('Analizando autenticidad...');
        
        final antiSpoofResult = await _performAntiSpoofingAnalysis(session, movementHistory);
        
        if (antiSpoofResult != LivenessResult.success) {
          return antiSpoofResult;
        }

        onProgressUpdate?.call(1.0);
        onInstructionUpdate?.call('¡Verificación exitosa!');
        
        return LivenessResult.success;

      } finally {
        accelSubscription.cancel();
      }

    } catch (e) {
      print('Error en detección de vida: $e');
      return LivenessResult.spoofingDetected;
    }
  }

  /// Genera desafíos aleatorios para evitar patrones predecibles
  List<LivenessChallenge> _generateRandomChallenges() {
    final random = Random();
    final allChallenges = LivenessChallenge.values;
    final selectedChallenges = <LivenessChallenge>[];
    
    // Siempre incluir parpadeo como primer desafío
    selectedChallenges.add(LivenessChallenge.blink);
    
    // Agregar 2-3 desafíos adicionales aleatorios
    final remainingChallenges = allChallenges.where((c) => c != LivenessChallenge.blink).toList();
    remainingChallenges.shuffle(random);
    
    selectedChallenges.addAll(remainingChallenges.take(2 + random.nextInt(2)));
    
    return selectedChallenges;
  }

  /// Ejecuta un desafío individual
  Future<LivenessResult> _performSingleChallenge(
    LivenessChallenge challenge,
    LivenessSession session,
    CameraController cameraController,
    List<AccelerometerEvent> movementHistory,
  ) async {
    final startTime = DateTime.now();
    final challengeFrames = <Face>[];
    int consecutiveNoFaceFrames = 0;
    bool challengeCompleted = false;

    while (!challengeCompleted) {
      // Timeout de desafío individual
      if (DateTime.now().difference(startTime).inSeconds > 10) {
        return LivenessResult.timeout;
      }

      try {
        // Capturar frame
        final image = await cameraController.takePicture();
        final inputImage = InputImage.fromFilePath(image.path);
        
        // Detectar caras
        final faces = await _faceDetector.processImage(inputImage);
        
        if (faces.isEmpty) {
          consecutiveNoFaceFrames++;
          if (consecutiveNoFaceFrames > 30) {
            return LivenessResult.noFaceDetected;
          }
          await Future.delayed(Duration(milliseconds: 100));
          continue;
        }
        
        if (faces.length > 1) {
          return LivenessResult.multipleFaces;
        }
        
        consecutiveNoFaceFrames = 0;
        final face = faces.first;
        challengeFrames.add(face);
        session.faceHistory.add(face);
        
        // Verificar calidad de la cara
        if (!_isFaceQualityAcceptable(face)) {
          await Future.delayed(Duration(milliseconds: 100));
          continue;
        }

        // Evaluar desafío específico
        challengeCompleted = await _evaluateChallenge(
          challenge, 
          challengeFrames, 
          movementHistory
        );
        
        await Future.delayed(Duration(milliseconds: 50));
        
      } catch (e) {
        print('Error procesando frame: $e');
        await Future.delayed(Duration(milliseconds: 100));
      }
    }

    session.completedChallenges[challenge] = true;
    return LivenessResult.success;
  }

  /// Evalúa si un desafío específico fue completado correctamente
  Future<bool> _evaluateChallenge(
    LivenessChallenge challenge,
    List<Face> frames,
    List<AccelerometerEvent> movementHistory,
  ) async {
    if (frames.length < _minFramesForChallenge) return false;

    switch (challenge) {
      case LivenessChallenge.blink:
        return _evaluateBlinkChallenge(frames);
      
      case LivenessChallenge.smile:
        return _evaluateSmileChallenge(frames);
      
      case LivenessChallenge.turnLeft:
        return _evaluateHeadTurnChallenge(frames, -1);
      
      case LivenessChallenge.turnRight:
        return _evaluateHeadTurnChallenge(frames, 1);
      
      case LivenessChallenge.openMouth:
        return _evaluateOpenMouthChallenge(frames);
      
      case LivenessChallenge.nod:
        return _evaluateNodChallenge(frames);
    }
  }

  /// Evalúa el desafío de parpadeo
  bool _evaluateBlinkChallenge(List<Face> frames) {
    if (frames.length < 20) return false;
    
    final eyeOpenStates = frames.map((face) {
      final leftEye = face.leftEyeOpenProbability ?? 0.5;
      final rightEye = face.rightEyeOpenProbability ?? 0.5;
      return (leftEye + rightEye) / 2;
    }).toList();

    // Buscar patrón de parpadeo: ojos abiertos -> cerrados -> abiertos
    bool eyesWereOpen = false;
    bool eyesWereClosed = false;
    bool eyesOpenAgain = false;

    for (final eyeState in eyeOpenStates) {
      if (!eyesWereOpen && eyeState > 0.6) {
        eyesWereOpen = true;
      } else if (eyesWereOpen && !eyesWereClosed && eyeState < 0.3) {
        eyesWereClosed = true;
      } else if (eyesWereClosed && !eyesOpenAgain && eyeState > 0.6) {
        eyesOpenAgain = true;
        break;
      }
    }

    return eyesWereOpen && eyesWereClosed && eyesOpenAgain;
  }

  /// Evalúa el desafío de sonrisa
  bool _evaluateSmileChallenge(List<Face> frames) {
    if (frames.isEmpty) return false;
    
    final maxSmile = frames
        .map((face) => face.smilingProbability ?? 0.0)
        .reduce((a, b) => a > b ? a : b);
    
    return maxSmile >= _minSmileProbability;
  }

  /// Evalúa el desafío de giro de cabeza
  bool _evaluateHeadTurnChallenge(List<Face> frames, int direction) {
    if (frames.length < 15) return false;
    
    final headAngles = frames
        .map((face) => face.headEulerAngleY ?? 0.0)
        .toList();
    
    final maxAngle = headAngles.reduce((a, b) => a.abs() > b.abs() ? a : b);
    
    if (direction < 0) {
      return maxAngle <= -_minHeadRotation;
    } else {
      return maxAngle >= _minHeadRotation;
    }
  }

  /// Evalúa el desafío de abrir boca
  bool _evaluateOpenMouthChallenge(List<Face> frames) {
    // Implementar usando contornos de la boca
    for (final face in frames) {
      final contours = face.contours;
      if (contours.containsKey(FaceContourType.lowerLipBottom) &&
          contours.containsKey(FaceContourType.upperLipTop)) {
        
        final lowerLip = contours[FaceContourType.lowerLipBottom]!;
        final upperLip = contours[FaceContourType.upperLipTop]!;
        
        // Calcular distancia entre labios
        if (lowerLip.points.isNotEmpty && upperLip.points.isNotEmpty) {
          final distance = _calculateDistance(
            lowerLip.points.first,
            upperLip.points.first,
          );
          
          if (distance > 15.0) { // Ajustar umbral según necesidad
            return true;
          }
        }
      }
    }
    return false;
  }

  /// Evalúa el desafío de asentir
  bool _evaluateNodChallenge(List<Face> frames) {
    if (frames.length < 20) return false;
    
    final pitchAngles = frames
        .map((face) => face.headEulerAngleX ?? 0.0)
        .toList();
    
    // Buscar movimiento de cabeza arriba-abajo
    double maxUp = pitchAngles.reduce((a, b) => a < b ? a : b);
    double maxDown = pitchAngles.reduce((a, b) => a > b ? a : b);
    
    return (maxDown - maxUp) > 20.0;
  }

  /// Análisis anti-spoofing avanzado
  Future<LivenessResult> _performAntiSpoofingAnalysis(
    LivenessSession session,
    List<AccelerometerEvent> movementHistory,
  ) async {
    
    // 1. Análisis temporal
    if (session.faceHistory.length < 50) {
      return LivenessResult.lowQuality;
    }

    // 2. Análisis de consistencia facial
    if (!_analyzeFaceConsistency(session.faceHistory)) {
      return LivenessResult.spoofingDetected;
    }

    // 3. Análisis de movimiento del dispositivo
    if (!_analyzeDeviceMovement(movementHistory)) {
      return LivenessResult.spoofingDetected;
    }

    // 4. Análisis de variación de iluminación
    if (!_analyzeLightVariation(session.faceHistory)) {
      return LivenessResult.spoofingDetected;
    }

    // 5. Análisis de profundidad (usando tamaño de cara)
    if (!_analyzeDepthConsistency(session.faceHistory)) {
      return LivenessResult.spoofingDetected;
    }

    return LivenessResult.success;
  }

  /// Analiza la consistencia de las características faciales
  bool _analyzeFaceConsistency(List<Face> faceHistory) {
    if (faceHistory.length < 10) return false;

    // Verificar que las características faciales sean consistentes
    final firstFace = faceHistory.first;
    final lastFace = faceHistory.last;

    // Comparar tamaño de bounding box (no debería cambiar drásticamente)
    final sizeVariation = (lastFace.boundingBox.width - firstFace.boundingBox.width).abs() / 
                         firstFace.boundingBox.width;
    
    if (sizeVariation > 0.3) return false; // Máximo 30% de variación

    // Verificar tracking ID si está disponible
    if (firstFace.trackingId != null && lastFace.trackingId != null) {
      return firstFace.trackingId == lastFace.trackingId;
    }

    return true;
  }

  /// Analiza el movimiento natural del dispositivo
  bool _analyzeDeviceMovement(List<AccelerometerEvent> movementHistory) {
    if (movementHistory.length < 50) return true; // No hay suficientes datos

    // Calcular varianza del movimiento
    final movements = movementHistory.map((e) => 
        sqrt(e.x * e.x + e.y * e.y + e.z * e.z)).toList();
    
    final mean = movements.reduce((a, b) => a + b) / movements.length;
    final variance = movements
        .map((m) => pow(m - mean, 2))
        .reduce((a, b) => a + b) / movements.length;

    // Un dispositivo completamente estático es sospechoso
    return variance > 0.01;
  }

  /// Analiza la variación de iluminación
  bool _analyzeLightVariation(List<Face> faceHistory) {
    // Esta sería una implementación simplificada
    // En la realidad, analizaríamos los valores de píxeles
    return true; // Por ahora aceptamos todos
  }

  /// Analiza la consistencia de profundidad
  bool _analyzeDepthConsistency(List<Face> faceHistory) {
    if (faceHistory.length < 20) return true;

    final faceSizes = faceHistory.map((face) => 
        face.boundingBox.width * face.boundingBox.height).toList();

    // Verificar que el tamaño de la cara no tenga variaciones abruptas
    for (int i = 1; i < faceSizes.length; i++) {
      final variation = (faceSizes[i] - faceSizes[i-1]).abs() / faceSizes[i-1];
      if (variation > 0.2) return false; // Máximo 20% de variación entre frames
    }

    return true;
  }

  /// Verifica si la calidad de la cara es aceptable
  bool _isFaceQualityAcceptable(Face face) {
    final box = face.boundingBox;
    
    // Tamaño mínimo de cara
    if (box.width < 100 || box.height < 100) return false;
    
    // La cara debe estar relativamente centrada
    // Aquí podrías agregar más verificaciones de calidad
    
    return true;
  }

  /// Calcula la distancia entre dos puntos
  double _calculateDistance(Point<int> p1, Point<int> p2) {
    return sqrt(pow(p1.x - p2.x, 2) + pow(p1.y - p2.y, 2));
  }

  /// Obtiene la instrucción para mostrar al usuario
  String _getChallengeInstruction(LivenessChallenge challenge) {
    switch (challenge) {
      case LivenessChallenge.blink:
        return 'Parpadea naturalmente';
      case LivenessChallenge.smile:
        return 'Sonríe';
      case LivenessChallenge.turnLeft:
        return 'Gira la cabeza hacia la izquierda';
      case LivenessChallenge.turnRight:
        return 'Gira la cabeza hacia la derecha';
      case LivenessChallenge.openMouth:
        return 'Abre la boca';
      case LivenessChallenge.nod:
        return 'Asiente con la cabeza';
    }
  }

  /// Limpia los recursos
  void dispose() {
    _faceDetector.close();
  }
}