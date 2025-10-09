import 'dart:async';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:permission_handler/permission_handler.dart';

/// 🎯 NATIVE DEVICE DETECTION SERVICE
/// Servicio de detección real de dispositivos biométricos para Flutter
/// Versión: 1.0.0 - Native Mobile & Desktop Support
class NativeDeviceDetectionService {
  static final NativeDeviceDetectionService _instance = NativeDeviceDetectionService._internal();
  factory NativeDeviceDetectionService() => _instance;
  NativeDeviceDetectionService._internal();

  final LocalAuthentication _localAuth = LocalAuthentication();
  final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  DetectedDevices? _devices;
  bool _isInitialized = false;

  /// Obtener dispositivos detectados
  DetectedDevices? get devices => _devices;

  /// Verificar si el servicio está inicializado
  bool get isInitialized => _isInitialized;

  /// 🚀 Inicializar detección completa de dispositivos
  Future<DeviceDetectionResult> initializeDeviceDetection() async {
    try {
      debugPrint('🔍 [NATIVE-DETECTION] Iniciando detección completa de dispositivos...');

      // Verificar permisos necesarios
      await _requestPermissions();

      // Detectar información del dispositivo
      final deviceInfo = await _getDeviceInfo();

      // Detectar cámaras disponibles
      final cameras = await _detectCameras();

      // Detectar capacidades biométricas nativas
      final biometricCapabilities = await _detectBiometricCapabilities();

      // Detectar sensores del dispositivo
      final sensors = await _detectDeviceSensors();

      // Crear objeto de dispositivos detectados
      _devices = DetectedDevices(
        cameras: cameras,
        biometricCapabilities: biometricCapabilities,
        deviceInfo: deviceInfo,
        sensors: sensors,
        detectionTimestamp: DateTime.now(),
      );

      _isInitialized = true;

      debugPrint('✅ [NATIVE-DETECTION] Detección completada exitosamente');
      debugPrint('📊 [NATIVE-DETECTION] Detectados: ${cameras.length} cámaras, biometría: ${biometricCapabilities.isAvailable}');

      return DeviceDetectionResult(
        success: true,
        devicesDetected: _devices!,
        message: 'Dispositivos detectados exitosamente',
      );

    } catch (error) {
      debugPrint('❌ [NATIVE-DETECTION] Error en detección: $error');

      return DeviceDetectionResult(
        success: false,
        devicesDetected: null,
        message: 'Error al detectar dispositivos: $error',
        error: error.toString(),
      );
    }
  }

  /// 📱 Obtener información detallada del dispositivo
  Future<DeviceInformation> _getDeviceInfo() async {
    try {
      if (Platform.isAndroid) {
        final androidInfo = await _deviceInfo.androidInfo;
        return DeviceInformation(
          platform: 'Android',
          model: androidInfo.model,
          manufacturer: androidInfo.manufacturer,
          version: androidInfo.version.release,
          brand: androidInfo.brand,
          device: androidInfo.device,
          hardware: androidInfo.hardware,
          isPhysicalDevice: androidInfo.isPhysicalDevice,
          supportedAbis: androidInfo.supportedAbis,
          systemFeatures: androidInfo.systemFeatures,
        );
      } else if (Platform.isIOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        return DeviceInformation(
          platform: 'iOS',
          model: iosInfo.model,
          manufacturer: 'Apple',
          version: iosInfo.systemVersion,
          brand: 'Apple',
          device: iosInfo.name,
          hardware: iosInfo.utsname.machine,
          isPhysicalDevice: iosInfo.isPhysicalDevice,
          supportedAbis: [],
          systemFeatures: [],
        );
      } else {
        // Otros platforms (Windows, macOS, Linux)
        return DeviceInformation(
          platform: Platform.operatingSystem,
          model: 'Unknown',
          manufacturer: 'Unknown',
          version: Platform.operatingSystemVersion,
          brand: 'Unknown',
          device: 'Desktop',
          hardware: 'Unknown',
          isPhysicalDevice: true,
          supportedAbis: [],
          systemFeatures: [],
        );
      }
    } catch (error) {
      debugPrint('⚠️ [DEVICE-INFO] Error obteniendo información del dispositivo: $error');
      rethrow;
    }
  }

  /// 📹 Detectar cámaras disponibles con análisis de calidad
  Future<List<DetectedCamera>> _detectCameras() async {
    try {
      debugPrint('📹 [CAMERA-DETECTION] Detectando cámaras disponibles...');

      final cameras = await availableCameras();
      final detectedCameras = <DetectedCamera>[];

      for (int i = 0; i < cameras.length; i++) {
        final camera = cameras[i];

        // Analizar calidad de la cámara
        final quality = _analyzeCameraQuality(camera);

        detectedCameras.add(DetectedCamera(
          id: i.toString(),
          name: camera.name,
          lensDirection: camera.lensDirection.toString(),
          sensorOrientation: camera.sensorOrientation,
          resolutionPreset: ResolutionPreset.high,
          quality: quality,
          isAvailable: true,
          camera: camera, // Referencia al objeto Camera nativo
        ));
      }

      debugPrint('✅ [CAMERA-DETECTION] ${detectedCameras.length} cámaras detectadas');
      return detectedCameras;

    } catch (error) {
      debugPrint('❌ [CAMERA-DETECTION] Error detectando cámaras: $error');
      return [];
    }
  }

  /// 🔒 Detectar capacidades biométricas nativas
  Future<BiometricCapabilities> _detectBiometricCapabilities() async {
    try {
      debugPrint('🔒 [BIOMETRIC-DETECTION] Detectando capacidades biométricas...');

      // Verificar si el dispositivo soporta biometría
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      final canCheckBiometrics = await _localAuth.canCheckBiometrics;

      List<BiometricType> availableTypes = [];
      if (canCheckBiometrics && isDeviceSupported) {
        availableTypes = await _localAuth.getAvailableBiometrics();
      }

      final capabilities = BiometricCapabilities(
        isAvailable: canCheckBiometrics && isDeviceSupported,
        isDeviceSupported: isDeviceSupported,
        canCheckBiometrics: canCheckBiometrics,
        availableTypes: availableTypes,
        hasFingerprint: availableTypes.contains(BiometricType.fingerprint),
        hasFaceRecognition: availableTypes.contains(BiometricType.face),
        hasIris: availableTypes.contains(BiometricType.iris),
        hasVoice: availableTypes.contains(BiometricType.voice),
        strongBiometricsAvailable: availableTypes.contains(BiometricType.strong),
        weakBiometricsAvailable: availableTypes.contains(BiometricType.weak),
      );

      debugPrint('✅ [BIOMETRIC-DETECTION] Biometría disponible: ${capabilities.isAvailable}');
      debugPrint('📊 [BIOMETRIC-DETECTION] Tipos: ${availableTypes.map((t) => t.toString()).join(', ')}');

      return capabilities;

    } catch (error) {
      debugPrint('❌ [BIOMETRIC-DETECTION] Error detectando biometría: $error');

      return BiometricCapabilities(
        isAvailable: false,
        isDeviceSupported: false,
        canCheckBiometrics: false,
        availableTypes: [],
        hasFingerprint: false,
        hasFaceRecognition: false,
        hasIris: false,
        hasVoice: false,
        strongBiometricsAvailable: false,
        weakBiometricsAvailable: false,
      );
    }
  }

  /// 🔧 Detectar sensores del dispositivo
  Future<DeviceSensors> _detectDeviceSensors() async {
    try {
      debugPrint('🔧 [SENSOR-DETECTION] Detectando sensores del dispositivo...');

      // En Flutter móvil, estos sensores están disponibles a través de packages específicos
      // Por ahora, determinamos disponibilidad basada en la plataforma
      final isPhysicalDevice = _devices?.deviceInfo.isPhysicalDevice ?? true;

      return DeviceSensors(
        hasAccelerometer: Platform.isAndroid || Platform.isIOS,
        hasGyroscope: Platform.isAndroid || Platform.isIOS,
        hasMagnetometer: Platform.isAndroid || Platform.isIOS,
        hasAmbientLightSensor: Platform.isAndroid || Platform.isIOS,
        hasProximitySensor: Platform.isAndroid || Platform.isIOS,
        hasBarometer: Platform.isAndroid || Platform.isIOS,
        hasGPS: Platform.isAndroid || Platform.isIOS,
        isPhysicalDevice: isPhysicalDevice,
      );

    } catch (error) {
      debugPrint('❌ [SENSOR-DETECTION] Error detectando sensores: $error');

      return DeviceSensors(
        hasAccelerometer: false,
        hasGyroscope: false,
        hasMagnetometer: false,
        hasAmbientLightSensor: false,
        hasProximitySensor: false,
        hasBarometer: false,
        hasGPS: false,
        isPhysicalDevice: true,
      );
    }
  }

  /// 📋 Solicitar permisos necesarios
  Future<void> _requestPermissions() async {
    try {
      debugPrint('📋 [PERMISSIONS] Solicitando permisos necesarios...');

      await [
        Permission.camera,
        Permission.microphone,
        Permission.location,
      ].request();

    } catch (error) {
      debugPrint('⚠️ [PERMISSIONS] Error solicitando permisos: $error');
    }
  }

  /// 📊 Analizar calidad de cámara
  CameraQuality _analyzeCameraQuality(CameraDescription camera) {
    // Análisis básico basado en las características de la cámara
    double qualityScore = 0.5; // Base score

    // Incrementar score basado en características
    if (camera.lensDirection == CameraLensDirection.back) {
      qualityScore += 0.2; // Cámaras traseras suelen ser mejores
    }

    // Análisis por orientación del sensor
    if (camera.sensorOrientation == 90 || camera.sensorOrientation == 270) {
      qualityScore += 0.1; // Orientación estándar
    }

    // Normalizar score
    qualityScore = qualityScore.clamp(0.0, 1.0);

    return CameraQuality(
      overallScore: qualityScore,
      resolution: qualityScore > 0.7 ? 'High' : qualityScore > 0.4 ? 'Medium' : 'Low',
      lighting: 'Unknown', // Requiere análisis en tiempo real
      stability: qualityScore > 0.6 ? 'Stable' : 'Needs improvement',
      recommendation: qualityScore > 0.7
          ? 'Excelente para biometría'
          : qualityScore > 0.4
              ? 'Aceptable para biometría'
              : 'Calidad insuficiente',
    );
  }

  /// 🔄 Re-detectar dispositivos
  Future<DeviceDetectionResult> refreshDeviceDetection() async {
    _isInitialized = false;
    return await initializeDeviceDetection();
  }

  /// 🧹 Limpiar recursos
  void dispose() {
    debugPrint('🧹 [NATIVE-DETECTION] Limpiando recursos...');
    _devices = null;
    _isInitialized = false;
  }
}

// ==================== MODELOS DE DATOS ====================

/// Resultado de la detección de dispositivos
class DeviceDetectionResult {
  final bool success;
  final DetectedDevices? devicesDetected;
  final String message;
  final String? error;

  DeviceDetectionResult({
    required this.success,
    required this.devicesDetected,
    required this.message,
    this.error,
  });
}

/// Dispositivos detectados
class DetectedDevices {
  final List<DetectedCamera> cameras;
  final BiometricCapabilities biometricCapabilities;
  final DeviceInformation deviceInfo;
  final DeviceSensors sensors;
  final DateTime detectionTimestamp;

  DetectedDevices({
    required this.cameras,
    required this.biometricCapabilities,
    required this.deviceInfo,
    required this.sensors,
    required this.detectionTimestamp,
  });
}

/// Cámara detectada
class DetectedCamera {
  final String id;
  final String name;
  final String lensDirection;
  final int sensorOrientation;
  final ResolutionPreset resolutionPreset;
  final CameraQuality quality;
  final bool isAvailable;
  final CameraDescription camera;

  DetectedCamera({
    required this.id,
    required this.name,
    required this.lensDirection,
    required this.sensorOrientation,
    required this.resolutionPreset,
    required this.quality,
    required this.isAvailable,
    required this.camera,
  });
}

/// Calidad de cámara
class CameraQuality {
  final double overallScore;
  final String resolution;
  final String lighting;
  final String stability;
  final String recommendation;

  CameraQuality({
    required this.overallScore,
    required this.resolution,
    required this.lighting,
    required this.stability,
    required this.recommendation,
  });
}

/// Capacidades biométricas
class BiometricCapabilities {
  final bool isAvailable;
  final bool isDeviceSupported;
  final bool canCheckBiometrics;
  final List<BiometricType> availableTypes;
  final bool hasFingerprint;
  final bool hasFaceRecognition;
  final bool hasIris;
  final bool hasVoice;
  final bool strongBiometricsAvailable;
  final bool weakBiometricsAvailable;

  BiometricCapabilities({
    required this.isAvailable,
    required this.isDeviceSupported,
    required this.canCheckBiometrics,
    required this.availableTypes,
    required this.hasFingerprint,
    required this.hasFaceRecognition,
    required this.hasIris,
    required this.hasVoice,
    required this.strongBiometricsAvailable,
    required this.weakBiometricsAvailable,
  });
}

/// Información del dispositivo
class DeviceInformation {
  final String platform;
  final String model;
  final String manufacturer;
  final String version;
  final String brand;
  final String device;
  final String hardware;
  final bool isPhysicalDevice;
  final List<String> supportedAbis;
  final List<String> systemFeatures;

  DeviceInformation({
    required this.platform,
    required this.model,
    required this.manufacturer,
    required this.version,
    required this.brand,
    required this.device,
    required this.hardware,
    required this.isPhysicalDevice,
    required this.supportedAbis,
    required this.systemFeatures,
  });
}

/// Sensores del dispositivo
class DeviceSensors {
  final bool hasAccelerometer;
  final bool hasGyroscope;
  final bool hasMagnetometer;
  final bool hasAmbientLightSensor;
  final bool hasProximitySensor;
  final bool hasBarometer;
  final bool hasGPS;
  final bool isPhysicalDevice;

  DeviceSensors({
    required this.hasAccelerometer,
    required this.hasGyroscope,
    required this.hasMagnetometer,
    required this.hasAmbientLightSensor,
    required this.hasProximitySensor,
    required this.hasBarometer,
    required this.hasGPS,
    required this.isPhysicalDevice,
  });
}