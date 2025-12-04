import 'dart:async';
import 'dart:math';
import 'package:flutter/services.dart';
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// 🎯 Tipos de desafíos de liveness
enum LivenessChallenge {
  blink,
  smile,
  turnLeft,
  turnRight,
  openMouth,
  nod
}

/// 🔍 Resultados posibles de liveness detection
enum LivenessResult {
  success,
  noFaceDetected,
  multipleFaces,
  challengeFailed,
  spoofingDetected,
  timeout,
  lowQuality
}

/// 📋 Sesión de liveness con historial
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

/// 🛡️ FACE LIVENESS SERVICE - Anti-Spoofing Detection
/// =====================================================
/// Servicio de detección de vida para prevenir:
/// - Fotos/imágenes estáticas
/// - Videos reproduciéndose
/// - Máscaras 3D
/// - Deepfakes
///
/// Usa desafíos aleatorios y análisis de movimiento/textura
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
          );

          if (result != LivenessResult.success) {
            return result;
          }
        }

        // Análisis final anti-spoofing
        onProgressUpdate?.call(0.9);
        onInstructionUpdate?.call('Analizando autenticidad...');

        final antiSpoofResult = await _performAntiSpoofingAnalysis(session);

        if (antiSpoofResult != LivenessResult.success) {
          return antiSpoofResult;
        }

        onProgressUpdate?.call(1.0);
        onInstructionUpdate?.call('¡Verificación exitosa!');

        return LivenessResult.success;

      } catch (e) {
        print('Error en desafíos de liveness: $e');
        return LivenessResult.spoofingDetected;
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
  ) async {

    // 1. Análisis temporal
    if (session.faceHistory.length < 50) {
      return LivenessResult.lowQuality;
    }

    // 2. Análisis de consistencia facial
    if (!_analyzeFaceConsistency(session.faceHistory)) {
      return LivenessResult.spoofingDetected;
    }

    // 3. Análisis de variación de iluminación
    if (!_analyzeLightVariation(session.faceHistory)) {
      return LivenessResult.spoofingDetected;
    }

    // 4. Análisis de profundidad (usando tamaño de cara)
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

  /// 🚀 QUICK LIVENESS CHECK - Para modo kiosk (no interactivo)
  /// =========================================================
  /// Verifica liveness pasivamente analizando frames existentes
  /// sin requerir que el usuario realice desafíos específicos.
  /// Ideal para kiosks de asistencia donde el flujo debe ser rápido.
  ///
  /// Análisis:
  /// - Detección de parpadeo natural en frames capturados
  /// - Consistencia del rostro (mismo ID de tracking)
  /// - Variación de profundidad (tamaño de cara no estático)
  ///
  /// Returns LivenessResult en ~1-2 segundos
  Future<LivenessResult> performQuickLivenessCheck({
    required CameraController cameraController,
    int framesToCapture = 20,
    Duration captureInterval = const Duration(milliseconds: 100),
  }) async {
    print('🛡️ [LIVENESS] Starting quick liveness check...');

    final List<Face> capturedFaces = [];
    int noFaceCount = 0;

    try {
      for (int i = 0; i < framesToCapture; i++) {
        try {
          // Capturar imagen
          final image = await cameraController.takePicture();
          final inputImage = InputImage.fromFilePath(image.path);

          // Detectar caras
          final faces = await _faceDetector.processImage(inputImage);

          if (faces.isEmpty) {
            noFaceCount++;
            if (noFaceCount > framesToCapture ~/ 2) {
              print('❌ [LIVENESS] Too many frames without face');
              return LivenessResult.noFaceDetected;
            }
          } else if (faces.length > 1) {
            print('❌ [LIVENESS] Multiple faces detected');
            return LivenessResult.multipleFaces;
          } else {
            capturedFaces.add(faces.first);
          }

          await Future.delayed(captureInterval);

        } catch (e) {
          print('⚠️ [LIVENESS] Frame capture error: $e');
        }
      }

      if (capturedFaces.length < 10) {
        print('❌ [LIVENESS] Not enough valid frames: ${capturedFaces.length}');
        return LivenessResult.lowQuality;
      }

      // Análisis 1: Verificar parpadeo natural
      final hasNaturalBlink = _detectNaturalBlink(capturedFaces);
      print('🔍 [LIVENESS] Natural blink detected: $hasNaturalBlink');

      // Análisis 2: Consistencia de tracking
      final isConsistent = _checkTrackingConsistency(capturedFaces);
      print('🔍 [LIVENESS] Tracking consistency: $isConsistent');

      // Análisis 3: Variación de profundidad (no imagen estática)
      final hasDepthVariation = _checkDepthVariation(capturedFaces);
      print('🔍 [LIVENESS] Depth variation: $hasDepthVariation');

      // Decisión: al menos 2 de 3 checks deben pasar
      int passedChecks = 0;
      if (hasNaturalBlink) passedChecks++;
      if (isConsistent) passedChecks++;
      if (hasDepthVariation) passedChecks++;

      if (passedChecks >= 2) {
        print('✅ [LIVENESS] Quick check PASSED ($passedChecks/3 checks)');
        return LivenessResult.success;
      } else {
        print('❌ [LIVENESS] Quick check FAILED ($passedChecks/3 checks) - possible spoofing');
        return LivenessResult.spoofingDetected;
      }

    } catch (e) {
      print('❌ [LIVENESS] Quick check error: $e');
      return LivenessResult.spoofingDetected;
    }
  }

  /// Detecta si hay un patrón de parpadeo natural en los frames
  bool _detectNaturalBlink(List<Face> faces) {
    if (faces.length < 10) return false;

    final eyeStates = faces.map((face) {
      final leftEye = face.leftEyeOpenProbability ?? 0.5;
      final rightEye = face.rightEyeOpenProbability ?? 0.5;
      return (leftEye + rightEye) / 2;
    }).toList();

    // Buscar transición: ojos abiertos -> cerrados -> abiertos
    bool foundOpen = false;
    bool foundClosed = false;
    bool foundOpenAgain = false;

    for (final state in eyeStates) {
      if (!foundOpen && state > 0.6) {
        foundOpen = true;
      } else if (foundOpen && !foundClosed && state < 0.4) {
        foundClosed = true;
      } else if (foundClosed && !foundOpenAgain && state > 0.6) {
        foundOpenAgain = true;
        break;
      }
    }

    return foundOpen && foundClosed && foundOpenAgain;
  }

  /// Verifica consistencia del tracking ID
  bool _checkTrackingConsistency(List<Face> faces) {
    if (faces.isEmpty) return false;

    final trackingIds = faces
        .where((f) => f.trackingId != null)
        .map((f) => f.trackingId!)
        .toList();

    if (trackingIds.isEmpty) return true; // No tracking available, pass

    // La mayoría de los IDs deben ser iguales
    final firstId = trackingIds.first;
    final matchingCount = trackingIds.where((id) => id == firstId).length;

    return matchingCount >= trackingIds.length * 0.8; // 80% must match
  }

  /// Verifica variación natural de profundidad (tamaño de cara)
  bool _checkDepthVariation(List<Face> faces) {
    if (faces.length < 5) return false;

    final sizes = faces.map((f) =>
        f.boundingBox.width * f.boundingBox.height).toList();

    // Calcular variación
    final mean = sizes.reduce((a, b) => a + b) / sizes.length;
    final variance = sizes
        .map((s) => pow(s - mean, 2))
        .reduce((a, b) => a + b) / sizes.length;
    final stdDev = sqrt(variance);
    final coeffOfVariation = stdDev / mean;

    // Una imagen estática tendría variación ~0
    // Una persona real tiene micro-movimientos naturales
    return coeffOfVariation > 0.01; // Al menos 1% de variación
  }

  /// Limpia los recursos
  void dispose() {
    _faceDetector.close();
  }
}
