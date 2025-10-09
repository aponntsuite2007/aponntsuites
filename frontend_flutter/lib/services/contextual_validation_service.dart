import 'dart:io';
import 'dart:math';
import 'package:geolocator/geolocator.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';

class ContextualValidationService {
  // Configuración de validación
  static const double _maxLocationRadius = 100.0; // metros
  static const int _maxTimeVariation = 30; // minutos
  static const int _behaviorHistoryDays = 30;
  static const double _suspiciousScoreThreshold = 0.7;

  enum ValidationResult {
    approved,
    warning,
    blocked,
    requiresManualReview
  }

  enum RiskFactor {
    locationOutOfRange,
    unusualTime,
    newDevice,
    abnormalBehavior,
    multipleDevices,
    velocityAnomaly,
    weekendAccess,
    holidayAccess
  }

  class ContextualData {
    final Position? location;
    final DateTime timestamp;
    final String deviceId;
    final String deviceModel;
    final String appVersion;
    final Map<String, dynamic> sensorData;
    final String networkInfo;

    ContextualData({
      required this.location,
      required this.timestamp,
      required this.deviceId,
      required this.deviceModel,
      required this.appVersion,
      required this.sensorData,
      required this.networkInfo,
    });

    Map<String, dynamic> toJson() => {
      'location': location != null ? {
        'latitude': location!.latitude,
        'longitude': location!.longitude,
        'accuracy': location!.accuracy,
      } : null,
      'timestamp': timestamp.toIso8601String(),
      'deviceId': deviceId,
      'deviceModel': deviceModel,
      'appVersion': appVersion,
      'sensorData': sensorData,
      'networkInfo': networkInfo,
    };
  }

  class ValidationContext {
    final String userId;
    final String departmentId;
    final Map<String, dynamic> userSchedule;
    final List<Map<String, dynamic>> locationHistory;
    final List<Map<String, dynamic>> deviceHistory;
    final List<Map<String, dynamic>> behaviorHistory;
    final Map<String, dynamic> departmentConfig;

    ValidationContext({
      required this.userId,
      required this.departmentId,
      required this.userSchedule,
      required this.locationHistory,
      required this.deviceHistory,
      required this.behaviorHistory,
      required this.departmentConfig,
    });
  }

  class ValidationReport {
    final ValidationResult result;
    final double riskScore;
    final List<RiskFactor> riskFactors;
    final Map<String, dynamic> details;
    final String recommendation;
    final bool requiresPhoto;

    ValidationReport({
      required this.result,
      required this.riskScore,
      required this.riskFactors,
      required this.details,
      required this.recommendation,
      required this.requiresPhoto,
    });
  }

  /// Recopila datos contextuales del dispositivo y entorno
  Future<ContextualData> gatherContextualData() async {
    try {
      // Información del dispositivo
      final deviceInfo = DeviceInfoPlugin();
      final packageInfo = await PackageInfo.fromPlatform();
      
      String deviceId = '';
      String deviceModel = '';
      
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        deviceId = androidInfo.id;
        deviceModel = '${androidInfo.brand} ${androidInfo.model}';
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor ?? '';
        deviceModel = '${iosInfo.name} ${iosInfo.model}';
      }

      // Ubicación
      Position? position;
      try {
        final hasPermission = await _checkLocationPermission();
        if (hasPermission) {
          position = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 10),
          );
        }
      } catch (e) {
        print('Error obteniendo ubicación: $e');
      }

      // Datos de sensores adicionales
      final sensorData = await _collectSensorData();

      // Información de red (simulada)
      final networkInfo = await _getNetworkInfo();

      return ContextualData(
        location: position,
        timestamp: DateTime.now(),
        deviceId: deviceId,
        deviceModel: deviceModel,
        appVersion: packageInfo.version,
        sensorData: sensorData,
        networkInfo: networkInfo,
      );

    } catch (e) {
      print('Error recopilando datos contextuales: $e');
      rethrow;
    }
  }

  /// Valida el contexto de una solicitud de autenticación
  Future<ValidationReport> validateContext({
    required ContextualData contextData,
    required ValidationContext validationContext,
  }) async {
    final riskFactors = <RiskFactor>[];
    final details = <String, dynamic>{};
    double riskScore = 0.0;

    try {
      // 1. Validación de ubicación
      final locationRisk = await _validateLocation(contextData, validationContext);
      riskScore += locationRisk.score;
      if (locationRisk.isRisky) riskFactors.addAll(locationRisk.factors);
      details['location'] = locationRisk.details;

      // 2. Validación de tiempo
      final timeRisk = await _validateTime(contextData, validationContext);
      riskScore += timeRisk.score;
      if (timeRisk.isRisky) riskFactors.addAll(timeRisk.factors);
      details['time'] = timeRisk.details;

      // 3. Validación de dispositivo
      final deviceRisk = await _validateDevice(contextData, validationContext);
      riskScore += deviceRisk.score;
      if (deviceRisk.isRisky) riskFactors.addAll(deviceRisk.factors);
      details['device'] = deviceRisk.details;

      // 4. Análisis de patrones de comportamiento
      final behaviorRisk = await _analyzeBehaviorPatterns(contextData, validationContext);
      riskScore += behaviorRisk.score;
      if (behaviorRisk.isRisky) riskFactors.addAll(behaviorRisk.factors);
      details['behavior'] = behaviorRisk.details;

      // 5. Análisis de velocidad (¿el usuario se movió demasiado rápido?)
      final velocityRisk = await _analyzeVelocity(contextData, validationContext);
      riskScore += velocityRisk.score;
      if (velocityRisk.isRisky) riskFactors.addAll(velocityRisk.factors);
      details['velocity'] = velocityRisk.details;

      // Normalizar score de riesgo
      riskScore = riskScore.clamp(0.0, 1.0);

      // Determinar resultado y recomendación
      final result = _determineValidationResult(riskScore, riskFactors);
      final recommendation = _generateRecommendation(result, riskFactors);
      final requiresPhoto = _shouldRequirePhoto(result, riskFactors);

      return ValidationReport(
        result: result,
        riskScore: riskScore,
        riskFactors: riskFactors,
        details: details,
        recommendation: recommendation,
        requiresPhoto: requiresPhoto,
      );

    } catch (e) {
      print('Error validando contexto: $e');
      return ValidationReport(
        result: ValidationResult.requiresManualReview,
        riskScore: 1.0,
        riskFactors: [RiskFactor.abnormalBehavior],
        details: {'error': e.toString()},
        recommendation: 'Error en validación - revisar manualmente',
        requiresPhoto: true,
      );
    }
  }

  /// Valida la ubicación geográfica
  Future<_RiskAssessment> _validateLocation(
    ContextualData contextData, 
    ValidationContext validationContext
  ) async {
    final factors = <RiskFactor>[];
    final details = <String, dynamic>{};
    double score = 0.0;

    if (contextData.location == null) {
      // Sin ubicación = riesgo medio
      score = 0.3;
      details['message'] = 'Ubicación no disponible';
      return _RiskAssessment(score, factors, false, details);
    }

    try {
      // Obtener ubicaciones permitidas del departamento
      final allowedLocations = validationContext.departmentConfig['locations'] as List<dynamic>? ?? [];
      
      bool isInAllowedLocation = false;
      double minDistance = double.infinity;

      for (final location in allowedLocations) {
        final distance = Geolocator.distanceBetween(
          contextData.location!.latitude,
          contextData.location!.longitude,
          location['latitude'],
          location['longitude'],
        );

        minDistance = min(minDistance, distance);

        if (distance <= _maxLocationRadius) {
          isInAllowedLocation = true;
          break;
        }
      }

      details['minDistance'] = minDistance;
      details['allowedRadius'] = _maxLocationRadius;
      details['isInAllowedLocation'] = isInAllowedLocation;

      if (!isInAllowedLocation) {
        factors.add(RiskFactor.locationOutOfRange);
        score = 0.6;
        
        // Si está muy lejos, es alto riesgo
        if (minDistance > 1000) {
          score = 0.9;
        }
      }

      return _RiskAssessment(score, factors, factors.isNotEmpty, details);

    } catch (e) {
      print('Error validando ubicación: $e');
      return _RiskAssessment(0.5, factors, false, {'error': e.toString()});
    }
  }

  /// Valida el horario de acceso
  Future<_RiskAssessment> _validateTime(
    ContextualData contextData, 
    ValidationContext validationContext
  ) async {
    final factors = <RiskFactor>[];
    final details = <String, dynamic>{};
    double score = 0.0;

    final now = contextData.timestamp;
    final hour = now.hour;
    final weekday = now.weekday;
    
    details['currentTime'] = now.toIso8601String();
    details['hour'] = hour;
    details['weekday'] = weekday;

    try {
      // Verificar horario laboral
      final schedule = validationContext.userSchedule;
      final workingHours = schedule['workingHours'] as Map<String, dynamic>? ?? {};
      
      final startHour = workingHours['start'] as int? ?? 8;
      final endHour = workingHours['end'] as int? ?? 18;
      final workingDays = List<int>.from(workingHours['days'] ?? [1, 2, 3, 4, 5]);

      details['expectedStartHour'] = startHour;
      details['expectedEndHour'] = endHour;
      details['workingDays'] = workingDays;

      // Verificar fin de semana
      if (!workingDays.contains(weekday)) {
        factors.add(RiskFactor.weekendAccess);
        score += 0.3;
      }

      // Verificar horario
      if (hour < startHour - 1 || hour > endHour + 1) {
        factors.add(RiskFactor.unusualTime);
        score += 0.4;

        // Horarios muy extraños (madrugada)
        if (hour < 6 || hour > 22) {
          score += 0.3;
        }
      }

      // Verificar días festivos (esto requeriría una API o base de datos)
      if (_isHoliday(now)) {
        factors.add(RiskFactor.holidayAccess);
        score += 0.2;
      }

      return _RiskAssessment(score, factors, factors.isNotEmpty, details);

    } catch (e) {
      print('Error validando tiempo: $e');
      return _RiskAssessment(0.2, factors, false, {'error': e.toString()});
    }
  }

  /// Valida el dispositivo utilizado
  Future<_RiskAssessment> _validateDevice(
    ContextualData contextData, 
    ValidationContext validationContext
  ) async {
    final factors = <RiskFactor>[];
    final details = <String, dynamic>{};
    double score = 0.0;

    try {
      final deviceHistory = validationContext.deviceHistory;
      
      // Buscar el dispositivo actual en el historial
      final knownDevice = deviceHistory.any((device) => 
          device['deviceId'] == contextData.deviceId);
      
      details['deviceId'] = contextData.deviceId;
      details['deviceModel'] = contextData.deviceModel;
      details['isKnownDevice'] = knownDevice;

      if (!knownDevice) {
        factors.add(RiskFactor.newDevice);
        score += 0.4;
      }

      // Verificar si hay múltiples dispositivos en uso reciente
      final recentDevices = deviceHistory.where((device) {
        final lastUsed = DateTime.parse(device['lastUsed']);
        return DateTime.now().difference(lastUsed).inHours < 24;
      }).length;

      details['recentDevicesCount'] = recentDevices;

      if (recentDevices > 2) {
        factors.add(RiskFactor.multipleDevices);
        score += 0.3;
      }

      return _RiskAssessment(score, factors, factors.isNotEmpty, details);

    } catch (e) {
      print('Error validando dispositivo: $e');
      return _RiskAssessment(0.2, factors, false, {'error': e.toString()});
    }
  }

  /// Analiza patrones de comportamiento
  Future<_RiskAssessment> _analyzeBehaviorPatterns(
    ContextualData contextData, 
    ValidationContext validationContext
  ) async {
    final factors = <RiskFactor>[];
    final details = <String, dynamic>{};
    double score = 0.0;

    try {
      final behaviorHistory = validationContext.behaviorHistory;
      
      if (behaviorHistory.isEmpty) {
        // Nuevo usuario, score neutral
        return _RiskAssessment(0.1, factors, false, {'message': 'No hay historial'});
      }

      // Analizar patrones de horarios
      final typicalHours = behaviorHistory
          .map((entry) => DateTime.parse(entry['timestamp']).hour)
          .toList();
      
      final currentHour = contextData.timestamp.hour;
      final hourDeviation = _calculateHourDeviation(currentHour, typicalHours);
      
      details['typicalHours'] = typicalHours;
      details['currentHour'] = currentHour;
      details['hourDeviation'] = hourDeviation;

      if (hourDeviation > 3) {
        factors.add(RiskFactor.abnormalBehavior);
        score += 0.3;
      }

      // Analizar frecuencia de acceso
      final recentAccess = behaviorHistory.where((entry) {
        final timestamp = DateTime.parse(entry['timestamp']);
        return DateTime.now().difference(timestamp).inDays < 7;
      }).length;

      details['recentAccessCount'] = recentAccess;

      // Si accede muy pocas veces, es sospechoso
      if (recentAccess < 3) {
        score += 0.2;
      }

      // Si accede demasiado frecuentemente, también es sospechoso
      if (recentAccess > 50) {
        factors.add(RiskFactor.abnormalBehavior);
        score += 0.3;
      }

      return _RiskAssessment(score, factors, factors.isNotEmpty, details);

    } catch (e) {
      print('Error analizando patrones: $e');
      return _RiskAssessment(0.2, factors, false, {'error': e.toString()});
    }
  }

  /// Analiza la velocidad de movimiento
  Future<_RiskAssessment> _analyzeVelocity(
    ContextualData contextData, 
    ValidationContext validationContext
  ) async {
    final factors = <RiskFactor>[];
    final details = <String, dynamic>{};
    double score = 0.0;

    try {
      if (contextData.location == null) {
        return _RiskAssessment(0.0, factors, false, {'message': 'Sin ubicación'});
      }

      final locationHistory = validationContext.locationHistory;
      
      if (locationHistory.isEmpty) {
        return _RiskAssessment(0.0, factors, false, {'message': 'Sin historial'});
      }

      // Obtener la ubicación más reciente del historial
      final lastLocation = locationHistory.first;
      final lastTimestamp = DateTime.parse(lastLocation['timestamp']);
      final timeDifference = contextData.timestamp.difference(lastTimestamp).inMinutes;

      if (timeDifference < 5) {
        // Muy poco tiempo entre ubicaciones
        final distance = Geolocator.distanceBetween(
          lastLocation['latitude'],
          lastLocation['longitude'],
          contextData.location!.latitude,
          contextData.location!.longitude,
        );

        final velocity = distance / (timeDifference * 60); // m/s
        final kmh = velocity * 3.6; // km/h

        details['distance'] = distance;
        details['timeDifference'] = timeDifference;
        details['velocity'] = kmh;

        // Si se movió demasiado rápido (más de 120 km/h), es sospechoso
        if (kmh > 120) {
          factors.add(RiskFactor.velocityAnomaly);
          score += 0.6;
        }
      }

      return _RiskAssessment(score, factors, factors.isNotEmpty, details);

    } catch (e) {
      print('Error analizando velocidad: $e');
      return _RiskAssessment(0.1, factors, false, {'error': e.toString()});
    }
  }

  /// Verifica permisos de ubicación
  Future<bool> _checkLocationPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }

    return permission != LocationPermission.deniedForever;
  }

  /// Recopila datos adicionales de sensores
  Future<Map<String, dynamic>> _collectSensorData() async {
    // Esto se implementaría con sensores específicos
    return {
      'timestamp': DateTime.now().toIso8601String(),
      'batteryLevel': 85, // Ejemplo
      'isCharging': false, // Ejemplo
      'networkType': 'WiFi', // Ejemplo
    };
  }

  /// Obtiene información de la red
  Future<String> _getNetworkInfo() async {
    // Implementar usando connectivity_plus o similar
    return 'WiFi-Corporate'; // Ejemplo
  }

  /// Calcula la desviación de horario
  double _calculateHourDeviation(int currentHour, List<int> typicalHours) {
    if (typicalHours.isEmpty) return 0.0;
    
    final average = typicalHours.reduce((a, b) => a + b) / typicalHours.length;
    return (currentHour - average).abs();
  }

  /// Verifica si es día festivo
  bool _isHoliday(DateTime date) {
    // Implementar lógica de días festivos
    // Por ahora, false
    return false;
  }

  /// Determina el resultado final de validación
  ValidationResult _determineValidationResult(double riskScore, List<RiskFactor> factors) {
    if (riskScore >= 0.8) {
      return ValidationResult.blocked;
    } else if (riskScore >= _suspiciousScoreThreshold) {
      return ValidationResult.requiresManualReview;
    } else if (riskScore >= 0.3) {
      return ValidationResult.warning;
    } else {
      return ValidationResult.approved;
    }
  }

  /// Genera recomendación basada en el resultado
  String _generateRecommendation(ValidationResult result, List<RiskFactor> factors) {
    switch (result) {
      case ValidationResult.approved:
        return 'Acceso autorizado - Sin anomalías detectadas';
      
      case ValidationResult.warning:
        final factorMessages = factors.map(_getRiskFactorMessage).join(', ');
        return 'Acceso autorizado con advertencia: $factorMessages';
      
      case ValidationResult.requiresManualReview:
        return 'Requiere revisión manual - Múltiples factores de riesgo detectados';
      
      case ValidationResult.blocked:
        return 'Acceso bloqueado - Riesgo alto detectado';
    }
  }

  /// Determina si se requiere foto adicional
  bool _shouldRequirePhoto(ValidationResult result, List<RiskFactor> factors) {
    return result == ValidationResult.requiresManualReview ||
           result == ValidationResult.blocked ||
           factors.contains(RiskFactor.newDevice) ||
           factors.contains(RiskFactor.locationOutOfRange);
  }

  /// Obtiene mensaje para factor de riesgo
  String _getRiskFactorMessage(RiskFactor factor) {
    switch (factor) {
      case RiskFactor.locationOutOfRange:
        return 'Ubicación fuera del rango permitido';
      case RiskFactor.unusualTime:
        return 'Horario inusual';
      case RiskFactor.newDevice:
        return 'Dispositivo no reconocido';
      case RiskFactor.abnormalBehavior:
        return 'Patrón de comportamiento anómalo';
      case RiskFactor.multipleDevices:
        return 'Múltiples dispositivos en uso';
      case RiskFactor.velocityAnomaly:
        return 'Movimiento demasiado rápido';
      case RiskFactor.weekendAccess:
        return 'Acceso en fin de semana';
      case RiskFactor.holidayAccess:
        return 'Acceso en día festivo';
    }
  }
}

/// Clase auxiliar para evaluación de riesgo
class _RiskAssessment {
  final double score;
  final List<RiskFactor> factors;
  final bool isRisky;
  final Map<String, dynamic> details;

  _RiskAssessment(this.score, this.factors, this.isRisky, this.details);
}