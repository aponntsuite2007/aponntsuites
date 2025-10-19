import 'dart:io';
import 'package:flutter/foundation.dart';
import 'native_device_detection_service.dart';

/// 🖥️ HARDWARE PROFILE SERVICE
/// Mapea el dispositivo Android/iOS detectado a los perfiles de hardware del backend
/// Se conecta con el módulo kiosks-professional.js del panel-empresa
class HardwareProfileService {
  static final HardwareProfileService _instance = HardwareProfileService._internal();
  factory HardwareProfileService() => _instance;
  HardwareProfileService._internal();

  final NativeDeviceDetectionService _deviceDetection = NativeDeviceDetectionService();

  HardwareProfile? _currentProfile;
  HardwareProfile? get currentProfile => _currentProfile;

  /// 🔍 Detectar perfil de hardware del dispositivo actual
  Future<HardwareProfileResult> detectHardwareProfile() async {
    try {
      debugPrint('🔍 [HARDWARE-PROFILE] Iniciando detección de perfil...');

      // Detectar dispositivos nativos
      final detectionResult = await _deviceDetection.initializeDeviceDetection();

      if (!detectionResult.success || detectionResult.devicesDetected == null) {
        throw Exception('Error al detectar dispositivos: ${detectionResult.message}');
      }

      final devices = detectionResult.devicesDetected!;
      final deviceInfo = devices.deviceInfo;

      debugPrint('📱 [HARDWARE-PROFILE] Dispositivo detectado:');
      debugPrint('   Platform: ${deviceInfo.platform}');
      debugPrint('   Brand: ${deviceInfo.brand}');
      debugPrint('   Model: ${deviceInfo.model}');
      debugPrint('   Manufacturer: ${deviceInfo.manufacturer}');

      // Mapear a perfil de hardware
      final profile = _mapDeviceToProfile(deviceInfo, devices);

      _currentProfile = profile;

      debugPrint('✅ [HARDWARE-PROFILE] Perfil detectado: ${profile.id}');
      debugPrint('   Name: ${profile.name}');
      debugPrint('   Category: ${profile.category}');
      debugPrint('   Performance: ${profile.performanceScore}/100');
      debugPrint('   Walk-through: ${profile.supportsWalkthrough}');
      debugPrint('   Liveness: ${profile.supportsLiveness}');

      return HardwareProfileResult(
        success: true,
        profile: profile,
        message: 'Perfil de hardware detectado exitosamente',
      );

    } catch (error) {
      debugPrint('❌ [HARDWARE-PROFILE] Error detectando perfil: $error');

      return HardwareProfileResult(
        success: false,
        profile: null,
        message: 'Error al detectar perfil de hardware',
        error: error.toString(),
      );
    }
  }

  /// 📋 Mapear información del dispositivo a perfil de hardware
  HardwareProfile _mapDeviceToProfile(
    DeviceInformation deviceInfo,
    DetectedDevices devices,
  ) {
    final brand = deviceInfo.brand.toLowerCase();
    final model = deviceInfo.model.toLowerCase();
    final manufacturer = deviceInfo.manufacturer.toLowerCase();

    // ======================================================================
    // TABLETS ANDROID - Samsung, Lenovo
    // ======================================================================

    // Samsung Galaxy Tab S9 Ultra
    if ((brand.contains('samsung') || manufacturer.contains('samsung')) &&
        (model.contains('sm-x910') || model.contains('tab s9 ultra'))) {
      return HardwareProfile(
        id: 'samsung_tab_s9_ultra',
        name: 'Samsung Galaxy Tab S9 Ultra',
        brand: 'Samsung',
        category: 'tablet_android_high',
        performanceScore: 92,
        detectionMethodFacial: 'Google ML Kit Face Detection',
        supportsWalkthrough: true,
        supportsLiveness: true,
        biometricModes: ['facial'],
        hardwareSpecs: {
          'processor': 'Snapdragon 8 Gen 2',
          'display': '14.6" AMOLED 120Hz',
          'camera': '12MP Ultra-Wide Front',
          'technology': 'ML Kit + TensorFlow Lite',
          'fps': '30-60',
          'latency': '<100ms',
          'precision': '95-97%',
        },
      );
    }

    // Samsung Galaxy Tab S9+
    if ((brand.contains('samsung') || manufacturer.contains('samsung')) &&
        (model.contains('sm-x810') || model.contains('tab s9+'))) {
      return HardwareProfile(
        id: 'samsung_tab_s9_plus',
        name: 'Samsung Galaxy Tab S9+',
        brand: 'Samsung',
        category: 'tablet_android_high',
        performanceScore: 91,
        detectionMethodFacial: 'Google ML Kit Face Detection',
        supportsWalkthrough: true,
        supportsLiveness: true,
        biometricModes: ['facial'],
        hardwareSpecs: {
          'processor': 'Snapdragon 8 Gen 2',
          'display': '12.4" AMOLED 120Hz',
          'camera': '12MP Ultra-Wide',
          'technology': 'ML Kit + TensorFlow Lite',
        },
      );
    }

    // Samsung Galaxy Tab S8+
    if ((brand.contains('samsung') || manufacturer.contains('samsung')) &&
        (model.contains('sm-x80') || model.contains('tab s8'))) {
      return HardwareProfile(
        id: 'samsung_tab_s8_plus',
        name: 'Samsung Galaxy Tab S8+',
        brand: 'Samsung',
        category: 'tablet_android_mid',
        performanceScore: 88,
        detectionMethodFacial: 'Google ML Kit Face Detection',
        supportsWalkthrough: false,
        supportsLiveness: true,
        biometricModes: ['facial'],
        hardwareSpecs: {
          'processor': 'Snapdragon 8 Gen 1',
          'display': '12.4" AMOLED',
          'camera': '12MP Front',
        },
      );
    }

    // Lenovo Tab P12 Pro
    if (manufacturer.contains('lenovo') &&
        (model.contains('tab p12') || model.contains('tb-q706'))) {
      return HardwareProfile(
        id: 'lenovo_tab_p12_pro',
        name: 'Lenovo Tab P12 Pro',
        brand: 'Lenovo',
        category: 'tablet_android_mid',
        performanceScore: 85,
        detectionMethodFacial: 'Google ML Kit + IR Camera',
        supportsWalkthrough: false,
        supportsLiveness: true,
        biometricModes: ['facial'],
        hardwareSpecs: {
          'processor': 'Snapdragon 870',
          'display': '12.6" AMOLED',
          'camera': '8MP + IR Camera',
        },
      );
    }

    // ======================================================================
    // TELÉFONOS ANDROID - Samsung, Xiaomi, Motorola
    // ======================================================================

    // Samsung Galaxy S24 Ultra
    if ((brand.contains('samsung') || manufacturer.contains('samsung')) &&
        (model.contains('sm-s928') || model.contains('s24 ultra'))) {
      return HardwareProfile(
        id: 'samsung_s24_ultra',
        name: 'Samsung Galaxy S24 Ultra',
        brand: 'Samsung',
        category: 'phone_android_high',
        performanceScore: 94,
        detectionMethodFacial: 'Google ML Kit Face Detection',
        supportsWalkthrough: true,
        supportsLiveness: true,
        biometricModes: ['facial', 'fingerprint'],
        hardwareSpecs: {
          'processor': 'Snapdragon 8 Gen 3',
          'display': '6.8" AMOLED 120Hz',
          'camera': '12MP Front',
          'technology': 'ML Kit + Ultrasonic Fingerprint',
        },
      );
    }

    // Samsung Galaxy S24
    if ((brand.contains('samsung') || manufacturer.contains('samsung')) &&
        (model.contains('sm-s921') || model.contains('s24'))) {
      return HardwareProfile(
        id: 'samsung_s24',
        name: 'Samsung Galaxy S24',
        brand: 'Samsung',
        category: 'phone_android_high',
        performanceScore: 92,
        detectionMethodFacial: 'Google ML Kit Face Detection',
        supportsWalkthrough: true,
        supportsLiveness: true,
        biometricModes: ['facial', 'fingerprint'],
        hardwareSpecs: {
          'processor': 'Snapdragon 8 Gen 3',
          'camera': '12MP Front',
        },
      );
    }

    // Samsung Galaxy S23
    if ((brand.contains('samsung') || manufacturer.contains('samsung')) &&
        (model.contains('sm-s91') || model.contains('s23'))) {
      return HardwareProfile(
        id: 'samsung_s23',
        name: 'Samsung Galaxy S23',
        brand: 'Samsung',
        category: 'phone_android_high',
        performanceScore: 89,
        detectionMethodFacial: 'Google ML Kit Face Detection',
        supportsWalkthrough: false,
        supportsLiveness: true,
        biometricModes: ['facial', 'fingerprint'],
        hardwareSpecs: {
          'processor': 'Snapdragon 8 Gen 2',
        },
      );
    }

    // Xiaomi 14 Pro
    if (manufacturer.contains('xiaomi') &&
        (model.contains('23116pn5bc') || model.contains('14 pro'))) {
      return HardwareProfile(
        id: 'xiaomi_14_pro',
        name: 'Xiaomi 14 Pro',
        brand: 'Xiaomi',
        category: 'phone_android_high',
        performanceScore: 90,
        detectionMethodFacial: 'Google ML Kit Face Detection',
        supportsWalkthrough: true,
        supportsLiveness: true,
        biometricModes: ['facial', 'fingerprint'],
        hardwareSpecs: {
          'processor': 'Snapdragon 8 Gen 3',
          'camera': '32MP Front',
        },
      );
    }

    // Xiaomi 13 Pro
    if (manufacturer.contains('xiaomi') &&
        (model.contains('2210132c') || model.contains('13 pro'))) {
      return HardwareProfile(
        id: 'xiaomi_13_pro',
        name: 'Xiaomi 13 Pro',
        brand: 'Xiaomi',
        category: 'phone_android_high',
        performanceScore: 87,
        detectionMethodFacial: 'Google ML Kit Face Detection',
        supportsWalkthrough: false,
        supportsLiveness: true,
        biometricModes: ['facial', 'fingerprint'],
        hardwareSpecs: {
          'processor': 'Snapdragon 8 Gen 2',
          'camera': '32MP Front',
        },
      );
    }

    // Motorola Edge 40 Pro
    if (manufacturer.contains('motorola') &&
        (model.contains('edge 40 pro') || model.contains('rtwo'))) {
      return HardwareProfile(
        id: 'motorola_edge_40_pro',
        name: 'Motorola Edge 40 Pro',
        brand: 'Motorola',
        category: 'phone_android_mid',
        performanceScore: 84,
        detectionMethodFacial: 'Google ML Kit Face Detection',
        supportsWalkthrough: false,
        supportsLiveness: false,
        biometricModes: ['facial', 'fingerprint'],
        hardwareSpecs: {
          'processor': 'Snapdragon 8 Gen 2',
          'camera': '60MP Front',
        },
      );
    }

    // ======================================================================
    // iOS DEVICES - iPads and iPhones
    // ======================================================================

    if (Platform.isIOS) {
      final machine = deviceInfo.hardware.toLowerCase();

      // iPad Pro 11" M2
      if (machine.contains('ipad14,3') || machine.contains('ipad14,4')) {
        return HardwareProfile(
          id: 'ipad_pro_11_m2',
          name: 'iPad Pro 11" (M2 - 2022)',
          brand: 'Apple',
          category: 'tablet_ios_high',
          performanceScore: 95,
          detectionMethodFacial: 'Core ML + Vision Framework + Face ID',
          supportsWalkthrough: true,
          supportsLiveness: true,
          biometricModes: ['facial'],
          hardwareSpecs: {
            'processor': 'Apple M2 (8-core CPU, 10-core GPU)',
            'ai_performance': '15.8 TOPS (Neural Engine)',
            'technology': 'Core ML + Face ID TrueDepth',
            'fps': '60',
            'latency': '<50ms',
            'precision': '98-99%',
          },
        );
      }

      // iPad Pro 12.9" M2
      if (machine.contains('ipad14,5') || machine.contains('ipad14,6')) {
        return HardwareProfile(
          id: 'ipad_pro_129_m2',
          name: 'iPad Pro 12.9" (M2 - 2022)',
          brand: 'Apple',
          category: 'tablet_ios_high',
          performanceScore: 95,
          detectionMethodFacial: 'Core ML + Vision Framework + Face ID',
          supportsWalkthrough: true,
          supportsLiveness: true,
          biometricModes: ['facial'],
          hardwareSpecs: {
            'processor': 'Apple M2',
            'ai_performance': '15.8 TOPS',
            'technology': 'Face ID TrueDepth',
          },
        );
      }

      // iPad Air M1
      if (machine.contains('ipad13,16') || machine.contains('ipad13,17')) {
        return HardwareProfile(
          id: 'ipad_air_m1',
          name: 'iPad Air (M1 - 2022)',
          brand: 'Apple',
          category: 'tablet_ios_mid',
          performanceScore: 90,
          detectionMethodFacial: 'Core ML + Vision Framework',
          supportsWalkthrough: false,
          supportsLiveness: false,
          biometricModes: ['facial'],
          hardwareSpecs: {
            'processor': 'Apple M1',
            'ai_performance': '11 TOPS',
          },
        );
      }

      // iPhone 15 Pro Max
      if (machine.contains('iphone16,2')) {
        return HardwareProfile(
          id: 'iphone_15_pro_max',
          name: 'iPhone 15 Pro Max',
          brand: 'Apple',
          category: 'phone_ios_high',
          performanceScore: 96,
          detectionMethodFacial: 'Core ML + Face ID TrueDepth',
          supportsWalkthrough: true,
          supportsLiveness: true,
          biometricModes: ['facial'],
          hardwareSpecs: {
            'processor': 'A17 Pro',
            'ai_performance': '35 TOPS',
          },
        );
      }

      // iPhone 14 Pro
      if (machine.contains('iphone15,2') || machine.contains('iphone15,3')) {
        return HardwareProfile(
          id: 'iphone_14_pro',
          name: 'iPhone 14 Pro',
          brand: 'Apple',
          category: 'phone_ios_high',
          performanceScore: 93,
          detectionMethodFacial: 'Core ML + Face ID TrueDepth',
          supportsWalkthrough: true,
          supportsLiveness: true,
          biometricModes: ['facial'],
          hardwareSpecs: {
            'processor': 'A16 Bionic',
          },
        );
      }
    }

    // ======================================================================
    // PERFIL GENÉRICO - Dispositivos no reconocidos
    // ======================================================================

    debugPrint('⚠️ [HARDWARE-PROFILE] Dispositivo no reconocido en base de datos');
    debugPrint('   Usando perfil genérico con capacidades detectadas');

    return HardwareProfile(
      id: 'generic_android',
      name: '${deviceInfo.brand} ${deviceInfo.model}',
      brand: deviceInfo.manufacturer,
      category: Platform.isAndroid ? 'phone_android_mid' : 'tablet_ios_mid',
      performanceScore: 70,
      detectionMethodFacial: Platform.isAndroid
          ? 'Google ML Kit Face Detection'
          : 'Core ML + Vision Framework',
      supportsWalkthrough: false,
      supportsLiveness: devices.biometricCapabilities.hasFaceRecognition,
      biometricModes: _detectBiometricModes(devices.biometricCapabilities),
      hardwareSpecs: {
        'processor': deviceInfo.hardware,
        'platform': deviceInfo.platform,
        'version': deviceInfo.version,
      },
    );
  }

  /// 🔒 Detectar modos biométricos disponibles
  List<String> _detectBiometricModes(BiometricCapabilities capabilities) {
    final List<String> modes = [];

    if (capabilities.hasFaceRecognition) {
      modes.add('facial');
    }

    if (capabilities.hasFingerprint) {
      modes.add('fingerprint');
    }

    return modes.isEmpty ? ['facial'] : modes;
  }

  /// 📤 Obtener datos para enviar al backend
  Map<String, dynamic> getProfileDataForBackend() {
    if (_currentProfile == null) {
      throw Exception('Perfil de hardware no detectado. Llama primero a detectHardwareProfile()');
    }

    return {
      'hardware_profile': _currentProfile!.id,
      'hardware_category': _currentProfile!.category,
      'detection_method_facial': _currentProfile!.detectionMethodFacial,
      'performance_score': _currentProfile!.performanceScore,
      'supports_walkthrough': _currentProfile!.supportsWalkthrough,
      'supports_liveness': _currentProfile!.supportsLiveness,
      'biometric_modes': _currentProfile!.biometricModes,
      'hardware_specs': _currentProfile!.hardwareSpecs,
    };
  }
}

// ==================== MODELOS DE DATOS ====================

/// Resultado de detección de perfil de hardware
class HardwareProfileResult {
  final bool success;
  final HardwareProfile? profile;
  final String message;
  final String? error;

  HardwareProfileResult({
    required this.success,
    required this.profile,
    required this.message,
    this.error,
  });
}

/// Perfil de hardware detectado
class HardwareProfile {
  final String id;
  final String name;
  final String brand;
  final String category;
  final int performanceScore;
  final String detectionMethodFacial;
  final bool supportsWalkthrough;
  final bool supportsLiveness;
  final List<String> biometricModes;
  final Map<String, dynamic> hardwareSpecs;

  HardwareProfile({
    required this.id,
    required this.name,
    required this.brand,
    required this.category,
    required this.performanceScore,
    required this.detectionMethodFacial,
    required this.supportsWalkthrough,
    required this.supportsLiveness,
    required this.biometricModes,
    required this.hardwareSpecs,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'brand': brand,
    'category': category,
    'performance_score': performanceScore,
    'detection_method_facial': detectionMethodFacial,
    'supports_walkthrough': supportsWalkthrough,
    'supports_liveness': supportsLiveness,
    'biometric_modes': biometricModes,
    'hardware_specs': hardwareSpecs,
  };
}
