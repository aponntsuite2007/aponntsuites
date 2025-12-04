import 'dart:async';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:flutter/services.dart';

/// 🔊 KIOSK AUDIO FEEDBACK SERVICE
/// ================================
/// Servicio de feedback auditivo para el kiosk biométrico
/// - TTS para todos los estados del semáforo
/// - Sonidos de sistema (beeps) para eventos
/// - Configuración de idioma y velocidad
/// - Cola de mensajes para evitar solapamiento
///
/// CREADO: 2025-11-29
class KioskAudioFeedbackService {
  static final KioskAudioFeedbackService _instance =
      KioskAudioFeedbackService._internal();
  factory KioskAudioFeedbackService() => _instance;
  KioskAudioFeedbackService._internal();

  FlutterTts? _flutterTts;
  bool _isInitialized = false;
  bool _isSpeaking = false;
  bool _isEnabled = true;

  // Message queue
  final List<_QueuedMessage> _messageQueue = [];
  Timer? _queueTimer;

  // Configuration
  String _language = 'es-ES';
  double _speechRate = 0.5;
  double _volume = 1.0;
  double _pitch = 1.0;

  // Predefined messages for each state
  static const Map<KioskAudioState, String> _stateMessages = {
    KioskAudioState.standby: 'Acérquese a la cámara para fichar',
    KioskAudioState.scanning: 'Escaneando rostro',
    KioskAudioState.recognized: 'Bienvenido. Fichaje registrado correctamente',
    KioskAudioState.notRecognized: 'Rostro no reconocido. Intente nuevamente',
    KioskAudioState.lateArrival: 'Llegada tardía detectada. Aguarde autorización',
    KioskAudioState.unauthorized: 'Acceso no autorizado',
    KioskAudioState.authorizationPending: 'Solicitud de autorización enviada. Por favor espere',
    KioskAudioState.authorizationApproved: 'Autorización aprobada. Puede continuar',
    KioskAudioState.authorizationRejected: 'Autorización rechazada',
    KioskAudioState.error: 'Error en el sistema. Contacte al administrador',
    KioskAudioState.offline: 'Sistema sin conexión. Fichaje almacenado localmente',
    KioskAudioState.cameraError: 'Error de cámara. Por favor avise al personal',
    KioskAudioState.livenessCheck: 'Verificando que está frente a la cámara',
    KioskAudioState.spoofingDetected: 'Verificación fallida. Por favor mire directamente a la cámara',
  };

  // Personalized messages with employee name
  static const Map<KioskAudioState, String> _personalizedMessages = {
    KioskAudioState.recognized: 'Bienvenido {name}. Fichaje registrado',
    KioskAudioState.lateArrival: '{name}, llegada tardía de {minutes} minutos. Aguarde autorización',
    KioskAudioState.authorizationApproved: '{name}, autorización aprobada por {approver}',
  };

  /// 🚀 Initialize TTS service
  Future<void> initialize({
    String language = 'es-ES',
    double speechRate = 0.5,
    double volume = 1.0,
    double pitch = 1.0,
  }) async {
    if (_isInitialized) return;

    print('🔊 [AUDIO-FEEDBACK] Initializing TTS service...');

    _language = language;
    _speechRate = speechRate;
    _volume = volume;
    _pitch = pitch;

    try {
      _flutterTts = FlutterTts();

      // Configure TTS
      await _flutterTts!.setLanguage(_language);
      await _flutterTts!.setSpeechRate(_speechRate);
      await _flutterTts!.setVolume(_volume);
      await _flutterTts!.setPitch(_pitch);

      // Set handlers
      _flutterTts!.setStartHandler(() {
        _isSpeaking = true;
        print('🔊 [AUDIO-FEEDBACK] Speaking started');
      });

      _flutterTts!.setCompletionHandler(() {
        _isSpeaking = false;
        print('🔊 [AUDIO-FEEDBACK] Speaking completed');
        _processQueue();
      });

      _flutterTts!.setErrorHandler((error) {
        _isSpeaking = false;
        print('❌ [AUDIO-FEEDBACK] TTS error: $error');
        _processQueue();
      });

      _flutterTts!.setCancelHandler(() {
        _isSpeaking = false;
        print('⏹️ [AUDIO-FEEDBACK] Speaking cancelled');
      });

      _isInitialized = true;
      print('✅ [AUDIO-FEEDBACK] TTS initialized successfully');

    } catch (e) {
      print('❌ [AUDIO-FEEDBACK] Failed to initialize TTS: $e');
      _isInitialized = false;
    }
  }

  /// 🔊 Speak message for kiosk audio state
  Future<void> speakState(
    KioskAudioState state, {
    String? employeeName,
    int? lateMinutes,
    String? approverName,
    bool interrupt = true,
  }) async {
    if (!_isEnabled || !_isInitialized) return;

    String message;

    // Use personalized message if we have employee name
    if (employeeName != null && _personalizedMessages.containsKey(state)) {
      message = _personalizedMessages[state]!
          .replaceAll('{name}', employeeName)
          .replaceAll('{minutes}', lateMinutes?.toString() ?? '?')
          .replaceAll('{approver}', approverName ?? 'supervisor');
    } else {
      message = _stateMessages[state] ?? 'Estado desconocido';
    }

    await speak(message, interrupt: interrupt);
  }

  /// 🔊 Speak custom message
  Future<void> speak(String message, {bool interrupt = true}) async {
    if (!_isEnabled) return;

    if (!_isInitialized) {
      await initialize();
    }

    print('🔊 [AUDIO-FEEDBACK] Queuing: "$message" (interrupt: $interrupt)');

    if (interrupt) {
      // Clear queue and stop current speech
      _messageQueue.clear();
      await stop();
    }

    // Add to queue
    _messageQueue.add(_QueuedMessage(message, DateTime.now()));

    // Process queue
    _processQueue();
  }

  /// 📋 Process message queue
  void _processQueue() {
    if (_isSpeaking || _messageQueue.isEmpty || _flutterTts == null) {
      return;
    }

    final message = _messageQueue.removeAt(0);

    // Check if message is not too old (max 5 seconds)
    if (DateTime.now().difference(message.timestamp).inSeconds > 5) {
      print('⏭️ [AUDIO-FEEDBACK] Skipping old message: "${message.text}"');
      _processQueue();
      return;
    }

    print('🔊 [AUDIO-FEEDBACK] Speaking: "${message.text}"');
    _flutterTts!.speak(message.text);
  }

  /// ⏹️ Stop current speech
  Future<void> stop() async {
    if (_flutterTts != null) {
      await _flutterTts!.stop();
      _isSpeaking = false;
    }
  }

  /// 🔔 Play system beep for event
  Future<void> playBeep(BeepType type) async {
    if (!_isEnabled) return;

    try {
      switch (type) {
        case BeepType.success:
          // Play success sound
          await SystemSound.play(SystemSoundType.click);
          await Future.delayed(const Duration(milliseconds: 100));
          await SystemSound.play(SystemSoundType.click);
          break;

        case BeepType.error:
          // Play error sound (longer vibration pattern)
          await HapticFeedback.heavyImpact();
          await Future.delayed(const Duration(milliseconds: 200));
          await HapticFeedback.heavyImpact();
          break;

        case BeepType.warning:
          await HapticFeedback.mediumImpact();
          break;

        case BeepType.attention:
          await HapticFeedback.lightImpact();
          await SystemSound.play(SystemSoundType.click);
          break;
      }
    } catch (e) {
      print('⚠️ [AUDIO-FEEDBACK] Could not play beep: $e');
    }
  }

  /// 🎭 Provide combined feedback (beep + speech)
  Future<void> provideFeedback(
    KioskAudioState state, {
    String? employeeName,
    int? lateMinutes,
    String? approverName,
  }) async {
    // Determine beep type based on state
    BeepType beepType;
    switch (state) {
      case KioskAudioState.recognized:
      case KioskAudioState.authorizationApproved:
        beepType = BeepType.success;
        break;
      case KioskAudioState.notRecognized:
      case KioskAudioState.unauthorized:
      case KioskAudioState.authorizationRejected:
      case KioskAudioState.error:
      case KioskAudioState.spoofingDetected:
      case KioskAudioState.cameraError:
        beepType = BeepType.error;
        break;
      case KioskAudioState.lateArrival:
      case KioskAudioState.authorizationPending:
      case KioskAudioState.offline:
        beepType = BeepType.warning;
        break;
      case KioskAudioState.livenessCheck:
      case KioskAudioState.standby:
      case KioskAudioState.scanning:
        beepType = BeepType.attention;
        break;
    }

    // Play beep first
    await playBeep(beepType);

    // Then speak
    await speakState(
      state,
      employeeName: employeeName,
      lateMinutes: lateMinutes,
      approverName: approverName,
    );
  }

  /// 🔧 Update configuration
  Future<void> updateConfig({
    String? language,
    double? speechRate,
    double? volume,
    double? pitch,
  }) async {
    if (language != null) {
      _language = language;
      await _flutterTts?.setLanguage(language);
    }
    if (speechRate != null) {
      _speechRate = speechRate;
      await _flutterTts?.setSpeechRate(speechRate);
    }
    if (volume != null) {
      _volume = volume;
      await _flutterTts?.setVolume(volume);
    }
    if (pitch != null) {
      _pitch = pitch;
      await _flutterTts?.setPitch(pitch);
    }

    print('⚙️ [AUDIO-FEEDBACK] Config updated: lang=$_language, rate=$_speechRate, vol=$_volume');
  }

  /// 🔇 Enable/disable audio feedback
  void setEnabled(bool enabled) {
    _isEnabled = enabled;
    if (!enabled) {
      stop();
      _messageQueue.clear();
    }
    print('${enabled ? '🔊' : '🔇'} [AUDIO-FEEDBACK] Audio ${enabled ? 'enabled' : 'disabled'}');
  }

  /// 📊 Get available languages
  Future<List<dynamic>> getAvailableLanguages() async {
    if (_flutterTts == null) return [];
    return await _flutterTts!.getLanguages;
  }

  /// 📊 Get available voices
  Future<List<dynamic>> getAvailableVoices() async {
    if (_flutterTts == null) return [];
    return await _flutterTts!.getVoices;
  }

  /// 🧹 Dispose service
  void dispose() {
    _queueTimer?.cancel();
    _messageQueue.clear();
    _flutterTts?.stop();
    _isInitialized = false;
    print('🧹 [AUDIO-FEEDBACK] Service disposed');
  }

  // Getters
  bool get isInitialized => _isInitialized;
  bool get isEnabled => _isEnabled;
  bool get isSpeaking => _isSpeaking;
}

/// Internal queued message class
class _QueuedMessage {
  final String text;
  final DateTime timestamp;

  _QueuedMessage(this.text, this.timestamp);
}

/// 🚦 Kiosk states for audio feedback (distinct from TrafficLightState in kiosk_screen)
enum KioskAudioState {
  standby,           // Yellow - waiting for employee
  scanning,          // Yellow blinking - face detection in progress
  recognized,        // Green - employee recognized, attendance recorded
  notRecognized,     // Red - face not recognized
  lateArrival,       // Orange - late arrival, needs authorization
  unauthorized,      // Red - employee not authorized for this area
  authorizationPending,  // Orange blinking - waiting for supervisor
  authorizationApproved, // Green - authorization granted
  authorizationRejected, // Red - authorization denied
  error,             // Red blinking - system error
  offline,           // Yellow with icon - offline mode
  cameraError,       // Red - camera not working
  livenessCheck,     // Yellow - performing liveness check
  spoofingDetected,  // Red - possible spoofing attempt detected
}

/// 🔔 Beep types
enum BeepType {
  success,
  error,
  warning,
  attention,
}
