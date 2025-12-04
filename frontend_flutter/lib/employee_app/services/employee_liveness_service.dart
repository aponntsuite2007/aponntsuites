/*
 * 🛡️ EMPLOYEE LIVENESS SERVICE
 * ==============================
 * Servicio de detección de vida (anti-spoofing) para APP DEL EMPLEADO
 * Basado en la tecnología del kiosk
 *
 * Detecta y previene:
 * - Fotos estáticas
 * - Videos reproduciéndose
 * - Máscaras 3D
 * - Intentos de suplantación
 *
 * Fecha: 2025-11-29
 * Versión: 1.0.0
 *
 * ⚠️ ESTE ARCHIVO ES INDEPENDIENTE - NO MODIFICA NADA DEL KIOSK
 */

import 'dart:async';
import 'dart:math';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// 🎯 Tipos de desafíos de liveness
enum EmployeeLivenessChallenge {
  blink,
  smile,
  turnLeft,
  turnRight,
  openMouth,
  nod,
}

/// 🔍 Resultados de liveness detection
enum EmployeeLivenessResult {
  success,
  noFaceDetected,
  multipleFaces,
  challengeFailed,
  spoofingDetected,
  timeout,
  lowQuality,
}

/// 📋 Sesión de liveness
class EmployeeLivenessSession {
  final List<EmployeeLivenessChallenge> challenges;
  final Map<EmployeeLivenessChallenge, bool> completedChallenges;
  final List<Face> faceHistory;
  final DateTime startTime;
  int currentChallengeIndex;

  EmployeeLivenessSession(this.challenges)
      : completedChallenges = {},
        faceHistory = [],
        startTime = DateTime.now(),
        currentChallengeIndex = 0;

  bool get isCompleted => completedChallenges.length == challenges.length;

  EmployeeLivenessChallenge? get currentChallenge =>
      currentChallengeIndex < challenges.length
          ? challenges[currentChallengeIndex]
          : null;
}

/// 🛡️ EMPLOYEE LIVENESS SERVICE
class EmployeeLivenessService {
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

  // Configuración anti-spoofing (mismos valores del kiosk)
  static const double _minSmileProbability = 0.7;
  static const double _minHeadRotation = 15.0;
  static const int _minFramesForChallenge = 10;

  /// 🚀 QUICK LIVENESS CHECK - Para modo empleado (rápido)
  /// Similar al del kiosk pero adaptado para verificación individual
  Future<EmployeeLivenessResult> performQuickLivenessCheck({
    required CameraController cameraController,
    int framesToCapture = 15,
    Duration captureInterval = const Duration(milliseconds: 80),
  }) async {
    debugPrint('🛡️ [EMPLOYEE-LIVENESS] Iniciando verificación rápida...');

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
              debugPrint('❌ [EMPLOYEE-LIVENESS] Demasiados frames sin rostro');
              return EmployeeLivenessResult.noFaceDetected;
            }
          } else if (faces.length > 1) {
            debugPrint('❌ [EMPLOYEE-LIVENESS] Múltiples rostros detectados');
            return EmployeeLivenessResult.multipleFaces;
          } else {
            capturedFaces.add(faces.first);
          }

          await Future.delayed(captureInterval);
        } catch (e) {
          debugPrint('⚠️ [EMPLOYEE-LIVENESS] Error capturando frame: $e');
        }
      }

      if (capturedFaces.length < 8) {
        debugPrint(
            '❌ [EMPLOYEE-LIVENESS] Frames insuficientes: ${capturedFaces.length}');
        return EmployeeLivenessResult.lowQuality;
      }

      // Análisis 1: Parpadeo natural
      final hasNaturalBlink = _detectNaturalBlink(capturedFaces);
      debugPrint('🔍 [EMPLOYEE-LIVENESS] Parpadeo natural: $hasNaturalBlink');

      // Análisis 2: Consistencia de tracking
      final isConsistent = _checkTrackingConsistency(capturedFaces);
      debugPrint('🔍 [EMPLOYEE-LIVENESS] Consistencia: $isConsistent');

      // Análisis 3: Variación de profundidad
      final hasDepthVariation = _checkDepthVariation(capturedFaces);
      debugPrint(
          '🔍 [EMPLOYEE-LIVENESS] Variación profundidad: $hasDepthVariation');

      // Decisión: al menos 2 de 3 checks deben pasar
      int passedChecks = 0;
      if (hasNaturalBlink) passedChecks++;
      if (isConsistent) passedChecks++;
      if (hasDepthVariation) passedChecks++;

      if (passedChecks >= 2) {
        debugPrint(
            '✅ [EMPLOYEE-LIVENESS] Verificación PASÓ ($passedChecks/3)');
        return EmployeeLivenessResult.success;
      } else {
        debugPrint(
            '❌ [EMPLOYEE-LIVENESS] Verificación FALLÓ ($passedChecks/3) - posible spoofing');
        return EmployeeLivenessResult.spoofingDetected;
      }
    } catch (e) {
      debugPrint('❌ [EMPLOYEE-LIVENESS] Error: $e');
      return EmployeeLivenessResult.spoofingDetected;
    }
  }

  /// 🎯 LIVENESS DETECTION COMPLETO (con desafíos)
  /// Para cuando se requiere mayor seguridad
  Future<EmployeeLivenessResult> performFullLivenessDetection({
    required CameraController cameraController,
    Function(String)? onInstructionUpdate,
    Function(double)? onProgressUpdate,
    int numberOfChallenges = 2,
  }) async {
    debugPrint('🛡️ [EMPLOYEE-LIVENESS] Iniciando detección completa...');

    try {
      // Generar desafíos aleatorios
      final challenges = _generateRandomChallenges(numberOfChallenges);
      final session = EmployeeLivenessSession(challenges);

      onInstructionUpdate?.call('Preparando verificación...');

      // Ejecutar desafíos
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

        if (result != EmployeeLivenessResult.success) {
          return result;
        }

        // Pausa entre desafíos
        await Future.delayed(const Duration(milliseconds: 500));
      }

      // Análisis final anti-spoofing
      onProgressUpdate?.call(0.9);
      onInstructionUpdate?.call('Verificando autenticidad...');

      final antiSpoofResult = _performAntiSpoofingAnalysis(session);

      if (antiSpoofResult != EmployeeLivenessResult.success) {
        return antiSpoofResult;
      }

      onProgressUpdate?.call(1.0);
      onInstructionUpdate?.call('¡Verificación exitosa!');

      return EmployeeLivenessResult.success;
    } catch (e) {
      debugPrint('❌ [EMPLOYEE-LIVENESS] Error: $e');
      return EmployeeLivenessResult.spoofingDetected;
    }
  }

  /// 🎲 Generar desafíos aleatorios
  List<EmployeeLivenessChallenge> _generateRandomChallenges(int count) {
    final random = Random();
    final allChallenges = EmployeeLivenessChallenge.values;
    final selectedChallenges = <EmployeeLivenessChallenge>[];

    // Siempre incluir parpadeo
    selectedChallenges.add(EmployeeLivenessChallenge.blink);

    // Agregar desafíos adicionales aleatorios
    final remainingChallenges =
        allChallenges.where((c) => c != EmployeeLivenessChallenge.blink).toList();
    remainingChallenges.shuffle(random);

    selectedChallenges
        .addAll(remainingChallenges.take(max(0, count - 1)));

    return selectedChallenges;
  }

  /// ⚡ Ejecutar desafío individual
  Future<EmployeeLivenessResult> _performSingleChallenge(
    EmployeeLivenessChallenge challenge,
    EmployeeLivenessSession session,
    CameraController cameraController,
  ) async {
    final startTime = DateTime.now();
    final challengeFrames = <Face>[];
    int consecutiveNoFaceFrames = 0;
    bool challengeCompleted = false;

    while (!challengeCompleted) {
      // Timeout de 10 segundos por desafío
      if (DateTime.now().difference(startTime).inSeconds > 10) {
        return EmployeeLivenessResult.timeout;
      }

      try {
        final image = await cameraController.takePicture();
        final inputImage = InputImage.fromFilePath(image.path);
        final faces = await _faceDetector.processImage(inputImage);

        if (faces.isEmpty) {
          consecutiveNoFaceFrames++;
          if (consecutiveNoFaceFrames > 30) {
            return EmployeeLivenessResult.noFaceDetected;
          }
          await Future.delayed(const Duration(milliseconds: 100));
          continue;
        }

        if (faces.length > 1) {
          return EmployeeLivenessResult.multipleFaces;
        }

        consecutiveNoFaceFrames = 0;
        final face = faces.first;
        challengeFrames.add(face);
        session.faceHistory.add(face);

        // Verificar calidad
        if (!_isFaceQualityAcceptable(face)) {
          await Future.delayed(const Duration(milliseconds: 100));
          continue;
        }

        // Evaluar desafío
        challengeCompleted = _evaluateChallenge(challenge, challengeFrames);

        await Future.delayed(const Duration(milliseconds: 50));
      } catch (e) {
        debugPrint('⚠️ [EMPLOYEE-LIVENESS] Error en frame: $e');
        await Future.delayed(const Duration(milliseconds: 100));
      }
    }

    session.completedChallenges[challenge] = true;
    return EmployeeLivenessResult.success;
  }

  /// 📊 Evaluar si desafío fue completado
  bool _evaluateChallenge(
    EmployeeLivenessChallenge challenge,
    List<Face> frames,
  ) {
    if (frames.length < _minFramesForChallenge) return false;

    switch (challenge) {
      case EmployeeLivenessChallenge.blink:
        return _evaluateBlinkChallenge(frames);
      case EmployeeLivenessChallenge.smile:
        return _evaluateSmileChallenge(frames);
      case EmployeeLivenessChallenge.turnLeft:
        return _evaluateHeadTurnChallenge(frames, -1);
      case EmployeeLivenessChallenge.turnRight:
        return _evaluateHeadTurnChallenge(frames, 1);
      case EmployeeLivenessChallenge.openMouth:
        return _evaluateOpenMouthChallenge(frames);
      case EmployeeLivenessChallenge.nod:
        return _evaluateNodChallenge(frames);
    }
  }

  /// 👁️ Evaluar parpadeo
  bool _evaluateBlinkChallenge(List<Face> frames) {
    if (frames.length < 20) return false;

    final eyeOpenStates = frames.map((face) {
      final leftEye = face.leftEyeOpenProbability ?? 0.5;
      final rightEye = face.rightEyeOpenProbability ?? 0.5;
      return (leftEye + rightEye) / 2;
    }).toList();

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

  /// 😊 Evaluar sonrisa
  bool _evaluateSmileChallenge(List<Face> frames) {
    if (frames.isEmpty) return false;

    final maxSmile = frames
        .map((face) => face.smilingProbability ?? 0.0)
        .reduce((a, b) => a > b ? a : b);

    return maxSmile >= _minSmileProbability;
  }

  /// ↔️ Evaluar giro de cabeza
  bool _evaluateHeadTurnChallenge(List<Face> frames, int direction) {
    if (frames.length < 15) return false;

    final headAngles =
        frames.map((face) => face.headEulerAngleY ?? 0.0).toList();
    final maxAngle = headAngles.reduce((a, b) => a.abs() > b.abs() ? a : b);

    if (direction < 0) {
      return maxAngle <= -_minHeadRotation;
    } else {
      return maxAngle >= _minHeadRotation;
    }
  }

  /// 👄 Evaluar boca abierta
  bool _evaluateOpenMouthChallenge(List<Face> frames) {
    for (final face in frames) {
      final contours = face.contours;
      if (contours.containsKey(FaceContourType.lowerLipBottom) &&
          contours.containsKey(FaceContourType.upperLipTop)) {
        final lowerLip = contours[FaceContourType.lowerLipBottom]!;
        final upperLip = contours[FaceContourType.upperLipTop]!;

        if (lowerLip.points.isNotEmpty && upperLip.points.isNotEmpty) {
          final distance = _calculateDistance(
            lowerLip.points.first,
            upperLip.points.first,
          );

          if (distance > 15.0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /// 🔼🔽 Evaluar asentir
  bool _evaluateNodChallenge(List<Face> frames) {
    if (frames.length < 20) return false;

    final pitchAngles =
        frames.map((face) => face.headEulerAngleX ?? 0.0).toList();
    double maxUp = pitchAngles.reduce((a, b) => a < b ? a : b);
    double maxDown = pitchAngles.reduce((a, b) => a > b ? a : b);

    return (maxDown - maxUp) > 20.0;
  }

  /// 🔍 Análisis anti-spoofing final
  EmployeeLivenessResult _performAntiSpoofingAnalysis(
      EmployeeLivenessSession session) {
    if (session.faceHistory.length < 30) {
      return EmployeeLivenessResult.lowQuality;
    }

    // Consistencia facial
    if (!_analyzeFaceConsistency(session.faceHistory)) {
      return EmployeeLivenessResult.spoofingDetected;
    }

    // Profundidad
    if (!_analyzeDepthConsistency(session.faceHistory)) {
      return EmployeeLivenessResult.spoofingDetected;
    }

    return EmployeeLivenessResult.success;
  }

  // ====== MÉTODOS DE ANÁLISIS (copiados del kiosk) ======

  bool _detectNaturalBlink(List<Face> faces) {
    if (faces.length < 10) return false;

    final eyeStates = faces.map((face) {
      final leftEye = face.leftEyeOpenProbability ?? 0.5;
      final rightEye = face.rightEyeOpenProbability ?? 0.5;
      return (leftEye + rightEye) / 2;
    }).toList();

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

  bool _checkTrackingConsistency(List<Face> faces) {
    if (faces.isEmpty) return false;

    final trackingIds = faces
        .where((f) => f.trackingId != null)
        .map((f) => f.trackingId!)
        .toList();

    if (trackingIds.isEmpty) return true;

    final firstId = trackingIds.first;
    final matchingCount = trackingIds.where((id) => id == firstId).length;

    return matchingCount >= trackingIds.length * 0.8;
  }

  bool _checkDepthVariation(List<Face> faces) {
    if (faces.length < 5) return false;

    final sizes =
        faces.map((f) => f.boundingBox.width * f.boundingBox.height).toList();
    final mean = sizes.reduce((a, b) => a + b) / sizes.length;
    final variance =
        sizes.map((s) => pow(s - mean, 2)).reduce((a, b) => a + b) / sizes.length;
    final stdDev = sqrt(variance);
    final coeffOfVariation = stdDev / mean;

    return coeffOfVariation > 0.01;
  }

  bool _analyzeFaceConsistency(List<Face> faceHistory) {
    if (faceHistory.length < 10) return false;

    final firstFace = faceHistory.first;
    final lastFace = faceHistory.last;

    final sizeVariation =
        (lastFace.boundingBox.width - firstFace.boundingBox.width).abs() /
            firstFace.boundingBox.width;

    if (sizeVariation > 0.3) return false;

    if (firstFace.trackingId != null && lastFace.trackingId != null) {
      return firstFace.trackingId == lastFace.trackingId;
    }

    return true;
  }

  bool _analyzeDepthConsistency(List<Face> faceHistory) {
    if (faceHistory.length < 20) return true;

    final faceSizes = faceHistory
        .map((face) => face.boundingBox.width * face.boundingBox.height)
        .toList();

    for (int i = 1; i < faceSizes.length; i++) {
      final variation = (faceSizes[i] - faceSizes[i - 1]).abs() / faceSizes[i - 1];
      if (variation > 0.2) return false;
    }

    return true;
  }

  bool _isFaceQualityAcceptable(Face face) {
    final box = face.boundingBox;
    if (box.width < 100 || box.height < 100) return false;
    return true;
  }

  double _calculateDistance(Point<int> p1, Point<int> p2) {
    return sqrt(pow(p1.x - p2.x, 2) + pow(p1.y - p2.y, 2));
  }

  /// 📝 Obtener instrucción para desafío
  String _getChallengeInstruction(EmployeeLivenessChallenge challenge) {
    switch (challenge) {
      case EmployeeLivenessChallenge.blink:
        return 'Parpadea naturalmente';
      case EmployeeLivenessChallenge.smile:
        return 'Sonríe';
      case EmployeeLivenessChallenge.turnLeft:
        return 'Gira la cabeza hacia la izquierda';
      case EmployeeLivenessChallenge.turnRight:
        return 'Gira la cabeza hacia la derecha';
      case EmployeeLivenessChallenge.openMouth:
        return 'Abre la boca';
      case EmployeeLivenessChallenge.nod:
        return 'Asiente con la cabeza';
    }
  }

  /// 🧹 Dispose
  void dispose() {
    _faceDetector.close();
  }
}
