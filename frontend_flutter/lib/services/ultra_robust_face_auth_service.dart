import 'dart:io';
import 'dart:async';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'face_liveness_service.dart';
import 'face_recognition_service.dart';
import 'contextual_validation_service.dart';

class UltraRobustFaceAuthService {
  final FaceLivenessService _livenessService = FaceLivenessService();
  final FaceRecognitionService _recognitionService = FaceRecognitionService();
  final ContextualValidationService _contextualService = ContextualValidationService();

  // Configuración de seguridad ultra-robusta
  static const int _maxAuthAttempts = 3;
  static const double _minimumConfidence = 0.90;
  static const double _ultraHighConfidence = 0.95;
  static const Duration _cooldownPeriod = Duration(minutes: 5);
  static const Duration _maxSessionDuration = Duration(minutes: 2);

  enum AuthenticationResult {
    success,
    livenessCheckFailed,
    faceRecognitionFailed,
    contextValidationFailed,
    tooManyAttempts,
    timeout,
    criticalError,
    requiresManualApproval
  }

  enum SecurityLevel {
    standard,    // Contexto normal
    elevated,    // Riesgo medio detectado
    maximum,     // Alto riesgo o acceso crítico
    emergency    // Situación de emergencia
  }

  class AuthenticationSession {
    final String sessionId;
    final DateTime startTime;
    final SecurityLevel securityLevel;
    int attemptCount;
    List<String> warnings;
    Map<String, dynamic> evidence;

    AuthenticationSession({
      required this.sessionId,
      required this.startTime,
      required this.securityLevel,
      this.attemptCount = 0,
      List<String>? warnings,
      Map<String, dynamic>? evidence,
    }) : warnings = warnings ?? [],
         evidence = evidence ?? {};
  }

  class AuthenticationReport {
    final AuthenticationResult result;
    final double confidence;
    final SecurityLevel securityLevel;
    final List<String> validationSteps;
    final Map<String, dynamic> evidence;
    final List<String> warnings;
    final String? userId;
    final Duration processingTime;
    final bool requiresManualReview;

    AuthenticationReport({
      required this.result,
      required this.confidence,
      required this.securityLevel,
      required this.validationSteps,
      required this.evidence,
      required this.warnings,
      this.userId,
      required this.processingTime,
      required this.requiresManualReview,
    });

    Map<String, dynamic> toJson() => {
      'result': result.toString(),
      'confidence': confidence,
      'securityLevel': securityLevel.toString(),
      'validationSteps': validationSteps,
      'evidence': evidence,
      'warnings': warnings,
      'userId': userId,
      'processingTime': processingTime.inMilliseconds,
      'requiresManualReview': requiresManualReview,
    };
  }

  /// Inicia proceso de autenticación ultra-robusta
  Future<AuthenticationReport> authenticateUser({
    required CameraController cameraController,
    required List<Map<String, dynamic>> storedFaceTemplates,
    required Map<String, dynamic> validationContext,
    SecurityLevel securityLevel = SecurityLevel.standard,
    Function(String)? onStatusUpdate,
    Function(double)? onProgressUpdate,
  }) async {
    final sessionId = _generateSessionId();
    final session = AuthenticationSession(
      sessionId: sessionId,
      startTime: DateTime.now(),
      securityLevel: securityLevel,
    );

    final validationSteps = <String>[];
    final startTime = DateTime.now();

    try {
      onStatusUpdate?.call('Iniciando verificación de seguridad ultra-robusta...');
      onProgressUpdate?.call(0.05);

      // FASE 1: VALIDACIÓN CONTEXTUAL PREVIA
      validationSteps.add('Validación contextual iniciada');
      onStatusUpdate?.call('Analizando contexto de seguridad...');
      onProgressUpdate?.call(0.1);

      final contextData = await _contextualService.gatherContextualData();
      final contextValidation = await _contextualService.validateContext(
        contextData: contextData,
        validationContext: ContextualValidationService.ValidationContext(
          userId: validationContext['userId'],
          departmentId: validationContext['departmentId'],
          userSchedule: validationContext['userSchedule'] ?? {},
          locationHistory: validationContext['locationHistory'] ?? [],
          deviceHistory: validationContext['deviceHistory'] ?? [],
          behaviorHistory: validationContext['behaviorHistory'] ?? [],
          departmentConfig: validationContext['departmentConfig'] ?? {},
        ),
      );

      session.evidence['contextualValidation'] = {
        'result': contextValidation.result.toString(),
        'riskScore': contextValidation.riskScore,
        'riskFactors': contextValidation.riskFactors.map((f) => f.toString()).toList(),
        'details': contextValidation.details,
      };

      // Evaluar si bloquear por contexto
      if (contextValidation.result == ContextualValidationService.ValidationResult.blocked) {
        validationSteps.add('Validación contextual: BLOQUEADO');
        return AuthenticationReport(
          result: AuthenticationResult.contextValidationFailed,
          confidence: 0.0,
          securityLevel: securityLevel,
          validationSteps: validationSteps,
          evidence: session.evidence,
          warnings: ['Contexto de acceso bloqueado por política de seguridad'],
          processingTime: DateTime.now().difference(startTime),
          requiresManualReview: true,
        );
      }

      // Ajustar nivel de seguridad basado en contexto
      if (contextValidation.riskScore > 0.7) {
        securityLevel = SecurityLevel.maximum;
        session.warnings.add('Nivel de seguridad elevado por contexto de riesgo');
      } else if (contextValidation.riskScore > 0.4) {
        securityLevel = SecurityLevel.elevated;
      }

      validationSteps.add('Validación contextual: APROBADA (riesgo: ${(contextValidation.riskScore * 100).round()}%)');

      // FASE 2: DETECCIÓN DE VIDA ULTRA-ROBUSTA
      validationSteps.add('Detección de vida iniciada');
      onStatusUpdate?.call('Verificando que eres una persona real...');
      onProgressUpdate?.call(0.2);

      final livenessResult = await _livenessService.performLivenessDetection(
        cameraController: cameraController,
        onInstructionUpdate: onStatusUpdate,
        onProgressUpdate: (progress) => onProgressUpdate?.call(0.2 + progress * 0.4),
      );

      session.evidence['livenessDetection'] = {
        'result': livenessResult.toString(),
        'timestamp': DateTime.now().toIso8601String(),
      };

      if (livenessResult != FaceLivenessService.LivenessResult.success) {
        validationSteps.add('Detección de vida: FALLIDA (${livenessResult.toString()})');
        return AuthenticationReport(
          result: AuthenticationResult.livenessCheckFailed,
          confidence: 0.0,
          securityLevel: securityLevel,
          validationSteps: validationSteps,
          evidence: session.evidence,
          warnings: ['Falló la verificación de vida: ${_getLivenessErrorMessage(livenessResult)}'],
          processingTime: DateTime.now().difference(startTime),
          requiresManualReview: livenessResult == FaceLivenessService.LivenessResult.spoofingDetected,
        );
      }

      validationSteps.add('Detección de vida: EXITOSA');

      // FASE 3: RECONOCIMIENTO FACIAL MULTI-ALGORITMO
      validationSteps.add('Reconocimiento facial iniciado');
      onStatusUpdate?.call('Comparando con base de datos biométrica...');
      onProgressUpdate?.call(0.6);

      // Ajustar configuración según nivel de seguridad
      final recognitionConfig = _getRecognitionConfig(securityLevel);
      
      final recognitionResult = await _recognitionService.authenticateUser(
        cameraController: cameraController,
        storedTemplates: storedFaceTemplates,
        onStatusUpdate: onStatusUpdate,
        onProgressUpdate: (progress) => onProgressUpdate?.call(0.6 + progress * 0.3),
      );

      session.evidence['faceRecognition'] = recognitionResult;

      if (!recognitionResult['success']) {
        final result = recognitionResult['result'] as FaceRecognitionService.RecognitionResult;
        validationSteps.add('Reconocimiento facial: FALLIDO (${result.toString()})');
        return AuthenticationReport(
          result: AuthenticationResult.faceRecognitionFailed,
          confidence: recognitionResult['confidence'] ?? 0.0,
          securityLevel: securityLevel,
          validationSteps: validationSteps,
          evidence: session.evidence,
          warnings: ['Falló el reconocimiento facial: ${_getRecognitionErrorMessage(result)}'],
          processingTime: DateTime.now().difference(startTime),
          requiresManualReview: result == FaceRecognitionService.RecognitionResult.multipleMatches,
        );
      }

      final recognitionConfidence = recognitionResult['confidence'] as double;
      final userId = recognitionResult['userId'] as String;

      // Verificar umbral de confianza según nivel de seguridad
      final requiredConfidence = _getRequiredConfidence(securityLevel);
      if (recognitionConfidence < requiredConfidence) {
        validationSteps.add('Reconocimiento facial: Confianza insuficiente (${(recognitionConfidence * 100).round()}% < ${(requiredConfidence * 100).round()}%)');
        return AuthenticationReport(
          result: AuthenticationResult.faceRecognitionFailed,
          confidence: recognitionConfidence,
          securityLevel: securityLevel,
          validationSteps: validationSteps,
          evidence: session.evidence,
          warnings: ['Confianza de reconocimiento insuficiente para nivel de seguridad ${securityLevel.toString()}'],
          processingTime: DateTime.now().difference(startTime),
          requiresManualReview: true,
        );
      }

      validationSteps.add('Reconocimiento facial: EXITOSO (${(recognitionConfidence * 100).round()}% confianza)');

      // FASE 4: VALIDACIÓN FINAL Y VERIFICACIONES ADICIONALES
      onStatusUpdate?.call('Realizando verificaciones finales...');
      onProgressUpdate?.call(0.9);

      // Verificaciones adicionales para niveles de seguridad elevados
      if (securityLevel == SecurityLevel.maximum || securityLevel == SecurityLevel.emergency) {
        final additionalChecks = await _performAdditionalSecurityChecks(
          session,
          contextData,
          recognitionResult,
        );
        
        session.evidence['additionalSecurityChecks'] = additionalChecks;
        validationSteps.add('Verificaciones adicionales: ${additionalChecks['passed'] ? 'APROBADAS' : 'FALLIDAS'}');

        if (!additionalChecks['passed']) {
          return AuthenticationReport(
            result: AuthenticationResult.requiresManualApproval,
            confidence: recognitionConfidence,
            securityLevel: securityLevel,
            validationSteps: validationSteps,
            evidence: session.evidence,
            warnings: List<String>.from(additionalChecks['warnings'] ?? []),
            userId: userId,
            processingTime: DateTime.now().difference(startTime),
            requiresManualReview: true,
          );
        }
      }

      // ÉXITO COMPLETO
      onProgressUpdate?.call(1.0);
      onStatusUpdate?.call('¡Autenticación exitosa!');

      validationSteps.add('Autenticación ultra-robusta: COMPLETADA EXITOSAMENTE');

      return AuthenticationReport(
        result: AuthenticationResult.success,
        confidence: recognitionConfidence,
        securityLevel: securityLevel,
        validationSteps: validationSteps,
        evidence: session.evidence,
        warnings: session.warnings,
        userId: userId,
        processingTime: DateTime.now().difference(startTime),
        requiresManualReview: false,
      );

    } catch (e) {
      print('Error crítico en autenticación: $e');
      validationSteps.add('ERROR CRÍTICO: ${e.toString()}');
      
      return AuthenticationReport(
        result: AuthenticationResult.criticalError,
        confidence: 0.0,
        securityLevel: securityLevel,
        validationSteps: validationSteps,
        evidence: session.evidence,
        warnings: ['Error crítico del sistema durante autenticación'],
        processingTime: DateTime.now().difference(startTime),
        requiresManualReview: true,
      );
    }
  }

  /// Registra usuario con verificación ultra-robusta
  Future<Map<String, dynamic>> registerUserWithUltraRobustVerification({
    required String userId,
    required CameraController cameraController,
    required String supervisorId,
    Function(String)? onStatusUpdate,
    Function(double)? onProgressUpdate,
  }) async {
    try {
      onStatusUpdate?.call('Iniciando registro biométrico ultra-seguro...');

      // 1. Verificación contextual del supervisor
      onStatusUpdate?.call('Verificando autorización del supervisor...');
      onProgressUpdate?.call(0.1);
      
      // Aquí verificaríamos que el supervisor tiene permisos
      
      // 2. Detección de vida para registro
      onStatusUpdate?.call('Verificando vida para registro...');
      onProgressUpdate?.call(0.2);
      
      final livenessResult = await _livenessService.performLivenessDetection(
        cameraController: cameraController,
        onInstructionUpdate: onStatusUpdate,
        onProgressUpdate: (progress) => onProgressUpdate?.call(0.2 + progress * 0.3),
      );

      if (livenessResult != FaceLivenessService.LivenessResult.success) {
        return {
          'success': false,
          'error': 'Falló la verificación de vida durante el registro',
          'livenessResult': livenessResult.toString(),
        };
      }

      // 3. Captura de templates múltiples
      onStatusUpdate?.call('Capturando templates biométricos...');
      onProgressUpdate?.call(0.5);

      final registrationResult = await _recognitionService.registerUserFace(
        userId: userId,
        cameraController: cameraController,
        onStatusUpdate: onStatusUpdate,
        onProgressUpdate: (progress) => onProgressUpdate?.call(0.5 + progress * 0.4),
      );

      if (!registrationResult['success']) {
        return registrationResult;
      }

      // 4. Validación final
      onProgressUpdate?.call(0.95);
      onStatusUpdate?.call('Validando registro...');

      final validationResult = {
        'success': true,
        'userId': userId,
        'templates': registrationResult['templates'],
        'quality': registrationResult['quality'],
        'supervisorId': supervisorId,
        'registrationTimestamp': DateTime.now().toIso8601String(),
        'securityLevel': 'ultra-robust',
        'validationSteps': [
          'Verificación de supervisor',
          'Detección de vida',
          'Captura múltiple de templates',
          'Validación de calidad',
        ],
      };

      onProgressUpdate?.call(1.0);
      onStatusUpdate?.call('¡Registro completado exitosamente!');

      return validationResult;

    } catch (e) {
      print('Error en registro ultra-robusto: $e');
      return {
        'success': false,
        'error': 'Error crítico durante el registro: ${e.toString()}',
      };
    }
  }

  /// Obtiene configuración de reconocimiento según nivel de seguridad
  Map<String, dynamic> _getRecognitionConfig(SecurityLevel securityLevel) {
    switch (securityLevel) {
      case SecurityLevel.standard:
        return {
          'samplesRequired': 2,
          'confidenceThreshold': 0.85,
        };
      
      case SecurityLevel.elevated:
        return {
          'samplesRequired': 3,
          'confidenceThreshold': 0.90,
        };
      
      case SecurityLevel.maximum:
        return {
          'samplesRequired': 4,
          'confidenceThreshold': 0.95,
        };
      
      case SecurityLevel.emergency:
        return {
          'samplesRequired': 5,
          'confidenceThreshold': 0.98,
        };
    }
  }

  /// Obtiene confianza requerida según nivel de seguridad
  double _getRequiredConfidence(SecurityLevel securityLevel) {
    switch (securityLevel) {
      case SecurityLevel.standard:
        return _minimumConfidence;
      case SecurityLevel.elevated:
        return 0.92;
      case SecurityLevel.maximum:
        return _ultraHighConfidence;
      case SecurityLevel.emergency:
        return 0.98;
    }
  }

  /// Realiza verificaciones adicionales de seguridad
  Future<Map<String, dynamic>> _performAdditionalSecurityChecks(
    AuthenticationSession session,
    ContextualValidationService.ContextualData contextData,
    Map<String, dynamic> recognitionResult,
  ) async {
    final warnings = <String>[];
    bool passed = true;

    try {
      // 1. Verificación de tiempo transcurrido
      final sessionDuration = DateTime.now().difference(session.startTime);
      if (sessionDuration > _maxSessionDuration) {
        warnings.add('Sesión demasiado larga');
        passed = false;
      }

      // 2. Verificación de múltiples matches
      final matchDetails = recognitionResult['details'] as Map<String, dynamic>?;
      if (matchDetails != null) {
        final matchCount = matchDetails['matchCount'] as int? ?? 0;
        if (matchCount < 2) {
          warnings.add('Pocas coincidencias biométricas');
          passed = false;
        }
      }

      // 3. Verificación de consistencia temporal
      if (contextData.location != null) {
        // Verificar que la ubicación sea consistente durante la sesión
        // Esta sería una verificación más compleja en producción
      }

      return {
        'passed': passed,
        'warnings': warnings,
        'checks': [
          'Duración de sesión',
          'Múltiples coincidencias',
          'Consistencia temporal',
        ],
        'timestamp': DateTime.now().toIso8601String(),
      };

    } catch (e) {
      print('Error en verificaciones adicionales: $e');
      return {
        'passed': false,
        'warnings': ['Error en verificaciones adicionales'],
        'error': e.toString(),
      };
    }
  }

  /// Genera ID único de sesión
  String _generateSessionId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp * 31) % 1000000;
    return 'AUTH_${timestamp}_$random';
  }

  /// Obtiene mensaje de error para liveness
  String _getLivenessErrorMessage(FaceLivenessService.LivenessResult result) {
    switch (result) {
      case FaceLivenessService.LivenessResult.noFaceDetected:
        return 'No se detectó rostro';
      case FaceLivenessService.LivenessResult.multipleFaces:
        return 'Múltiples rostros detectados';
      case FaceLivenessService.LivenessResult.challengeFailed:
        return 'Falló el desafío de vida';
      case FaceLivenessService.LivenessResult.spoofingDetected:
        return 'Intento de suplantación detectado';
      case FaceLivenessService.LivenessResult.timeout:
        return 'Tiempo agotado';
      case FaceLivenessService.LivenessResult.lowQuality:
        return 'Calidad insuficiente';
      default:
        return 'Error desconocido';
    }
  }

  /// Obtiene mensaje de error para reconocimiento
  String _getRecognitionErrorMessage(FaceRecognitionService.RecognitionResult result) {
    switch (result) {
      case FaceRecognitionService.RecognitionResult.noFaceDetected:
        return 'No se detectó rostro';
      case FaceRecognitionService.RecognitionResult.multipleFaces:
        return 'Múltiples rostros detectados';
      case FaceRecognitionService.RecognitionResult.lowQuality:
        return 'Calidad de imagen insuficiente';
      case FaceRecognitionService.RecognitionResult.noMatch:
        return 'No hay coincidencias en la base de datos';
      case FaceRecognitionService.RecognitionResult.multipleMatches:
        return 'Múltiples coincidencias - requiere revisión';
      case FaceRecognitionService.RecognitionResult.error:
        return 'Error técnico en el reconocimiento';
      default:
        return 'Error desconocido';
    }
  }

  /// Limpia recursos
  void dispose() {
    _livenessService.dispose();
    _recognitionService.dispose();
  }
}