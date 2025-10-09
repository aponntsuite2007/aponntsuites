import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:record/record.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'multi_tenant_security_service.dart';

/// 🎙️ Servicio de Accesibilidad por Voz
/// Sistema avanzado de interacción por voz para usuarios con discapacidad visual
/// Incluye compresión de voz y navegación completa por voz
class VoiceAccessibilityService {
  final SpeechToText _speechToText = SpeechToText();
  final FlutterTts _flutterTts = FlutterTts();
  final AudioRecorder _audioRecorder = AudioRecorder();
  final AudioPlayer _audioPlayer = AudioPlayer();
  final FlutterSoundRecorder _soundRecorder = FlutterSoundRecorder();
  final FlutterSoundPlayer _soundPlayer = FlutterSoundPlayer();
  final MultiTenantSecurityService _securityService;

  bool _speechEnabled = false;
  bool _isListening = false;
  bool _isRecording = false;
  String _currentLanguage = 'es-ES';
  double _speechRate = 0.8;
  double _compressionLevel = 0.7;

  VoiceAccessibilityService(this._securityService);

  /// 🚀 Inicializa el servicio de accesibilidad por voz
  Future<bool> initialize() async {
    try {
      print('🎙️ [VOICE-ACCESS] Inicializando servicio de accesibilidad...');

      // Inicializar TTS con configuración para accesibilidad
      await _initializeTts();

      // Inicializar reconocimiento de voz
      _speechEnabled = await _speechToText.initialize(
        onError: (error) => _handleSpeechError(error),
        onStatus: (status) => _handleSpeechStatus(status),
      );

      // Inicializar grabación de audio
      await _soundRecorder.openRecorder();
      await _soundPlayer.openPlayer();

      print('✅ [VOICE-ACCESS] Servicio inicializado correctamente');
      await speak('Sistema de voz accesible activado. Puede navegar por comandos de voz.');

      return true;
    } catch (e) {
      print('❌ [VOICE-ACCESS] Error inicializando: $e');
      return false;
    }
  }

  /// 🔧 Configura TTS optimizado para accesibilidad
  Future<void> _initializeTts() async {
    await _flutterTts.setLanguage(_currentLanguage);
    await _flutterTts.setSpeechRate(_speechRate);
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.0);

    // Configurar eventos TTS
    _flutterTts.setStartHandler(() {
      print('🔊 [TTS] Iniciando síntesis de voz');
    });

    _flutterTts.setCompletionHandler(() {
      print('✅ [TTS] Síntesis completada');
    });

    _flutterTts.setErrorHandler((msg) {
      print('❌ [TTS] Error: $msg');
    });
  }

  /// 🔊 Reproduce mensaje con compresión inteligente
  Future<void> speak(String message, {bool priority = false, bool compress = true}) async {
    try {
      String processedMessage = message;

      if (compress) {
        processedMessage = await _compressMessage(message);
      }

      if (priority) {
        await _flutterTts.stop();
      }

      await _flutterTts.speak(processedMessage);
      print('🔊 [VOICE] Reproduciendo: $processedMessage');
    } catch (e) {
      print('❌ [VOICE] Error reproduciendo: $e');
    }
  }

  /// 📝 Comprime mensaje para mayor eficiencia
  Future<String> _compressMessage(String message) async {
    try {
      // Aplicar reglas de compresión inteligente
      String compressed = message;

      // Eliminar palabras de relleno
      compressed = compressed.replaceAll(RegExp(r'\b(el|la|los|las|un|una|de|del|en|con|por|para)\b'), '');

      // Abreviar números comunes
      compressed = compressed.replaceAll('uno', '1');
      compressed = compressed.replaceAll('dos', '2');
      compressed = compressed.replaceAll('tres', '3');
      compressed = compressed.replaceAll('cuatro', '4');
      compressed = compressed.replaceAll('cinco', '5');

      // Abreviar palabras técnicas comunes
      compressed = compressed.replaceAll('administración', 'admin');
      compressed = compressed.replaceAll('configuración', 'config');
      compressed = compressed.replaceAll('información', 'info');
      compressed = compressed.replaceAll('autenticación', 'auth');

      // Limpiar espacios múltiples
      compressed = compressed.replaceAll(RegExp(r'\s+'), ' ').trim();

      // Aplicar nivel de compresión configurado
      if (_compressionLevel > 0.5) {
        compressed = _applyAdvancedCompression(compressed);
      }

      return compressed;
    } catch (e) {
      print('❌ [COMPRESSION] Error comprimiendo mensaje: $e');
      return message;
    }
  }

  /// 🗜️ Aplica compresión avanzada
  String _applyAdvancedCompression(String message) {
    // Usar solo primeras letras de palabras largas
    return message.replaceAllMapped(RegExp(r'\b\w{6,}\b'), (match) {
      final word = match.group(0)!;
      return '${word.substring(0, 3)}...';
    });
  }

  /// 🎤 Escucha comando de voz con reconocimiento continuo
  Future<String?> listenForCommand({
    Duration? timeout,
    bool continuous = false,
  }) async {
    try {
      if (!_speechEnabled) {
        await speak('Reconocimiento de voz no disponible', priority: true);
        return null;
      }

      await speak('Escuchando comando...', compress: false);

      String recognizedText = '';
      bool hasResult = false;

      await _speechToText.listen(
        onResult: (result) {
          recognizedText = result.recognizedWords;
          hasResult = result.finalResult;
          print('🎤 [LISTEN] Reconocido: $recognizedText (final: $hasResult)');
        },
        listenFor: timeout ?? const Duration(seconds: 5),
        pauseFor: const Duration(seconds: 1),
        cancelOnError: false,
        continuesListening: continuous,
      );

      // Esperar resultado final
      int attempts = 0;
      while (!hasResult && attempts < 50) {
        await Future.delayed(const Duration(milliseconds: 100));
        attempts++;
      }

      if (recognizedText.isNotEmpty) {
        await speak('Comando recibido: $recognizedText', compress: true);
        return recognizedText.toLowerCase();
      } else {
        await speak('No se detectó comando. Intente nuevamente.', priority: true);
        return null;
      }
    } catch (e) {
      print('❌ [LISTEN] Error escuchando: $e');
      await speak('Error en reconocimiento. Intente nuevamente.', priority: true);
      return null;
    }
  }

  /// 🗣️ Procesa comando de navegación por voz
  Future<VoiceCommand?> processNavigationCommand(String command) async {
    try {
      final cleanCommand = command.toLowerCase().trim();

      // Comandos de navegación
      if (cleanCommand.contains('inicio') || cleanCommand.contains('home')) {
        return VoiceCommand('navigate', 'home', 'Navegando al inicio');
      }
      if (cleanCommand.contains('usuarios') || cleanCommand.contains('empleados')) {
        return VoiceCommand('navigate', 'users', 'Abriendo gestión de usuarios');
      }
      if (cleanCommand.contains('asistencia') || cleanCommand.contains('fichajes')) {
        return VoiceCommand('navigate', 'attendance', 'Abriendo control de asistencia');
      }
      if (cleanCommand.contains('departamentos')) {
        return VoiceCommand('navigate', 'departments', 'Abriendo departamentos');
      }
      if (cleanCommand.contains('turnos') || cleanCommand.contains('horarios')) {
        return VoiceCommand('navigate', 'shifts', 'Abriendo gestión de turnos');
      }

      // Comandos de acción
      if (cleanCommand.contains('agregar') || cleanCommand.contains('nuevo')) {
        return VoiceCommand('action', 'add', 'Modo agregar activado');
      }
      if (cleanCommand.contains('buscar') || cleanCommand.contains('filtrar')) {
        return VoiceCommand('action', 'search', 'Modo búsqueda activado');
      }
      if (cleanCommand.contains('guardar') || cleanCommand.contains('confirmar')) {
        return VoiceCommand('action', 'save', 'Guardando datos');
      }
      if (cleanCommand.contains('cancelar') || cleanCommand.contains('salir')) {
        return VoiceCommand('action', 'cancel', 'Operación cancelada');
      }

      // Comandos de autenticación
      if (cleanCommand.contains('huella') || cleanCommand.contains('dactilar')) {
        return VoiceCommand('auth', 'fingerprint', 'Activando autenticación por huella');
      }
      if (cleanCommand.contains('rostro') || cleanCommand.contains('facial')) {
        return VoiceCommand('auth', 'face', 'Activando reconocimiento facial');
      }
      if (cleanCommand.contains('código') || cleanCommand.contains('qr')) {
        return VoiceCommand('auth', 'qr', 'Activando scanner QR');
      }
      if (cleanCommand.contains('patrón')) {
        return VoiceCommand('auth', 'pattern', 'Activando patrón de seguridad');
      }

      // Comandos de configuración
      if (cleanCommand.contains('configuración') || cleanCommand.contains('ajustes')) {
        return VoiceCommand('navigate', 'settings', 'Abriendo configuración');
      }
      if (cleanCommand.contains('velocidad') && cleanCommand.contains('voz')) {
        return VoiceCommand('config', 'speech_rate', 'Configurando velocidad de voz');
      }
      if (cleanCommand.contains('idioma')) {
        return VoiceCommand('config', 'language', 'Configurando idioma');
      }

      // Comando de ayuda
      if (cleanCommand.contains('ayuda') || cleanCommand.contains('comandos')) {
        return VoiceCommand('help', 'commands', 'Mostrando comandos disponibles');
      }

      return null;
    } catch (e) {
      print('❌ [COMMAND] Error procesando comando: $e');
      return null;
    }
  }

  /// 📋 Proporciona lista de comandos disponibles
  Future<void> provideVoiceHelp() async {
    const helpMessage = '''
Comandos disponibles:
Navegación: inicio, usuarios, asistencia, departamentos, turnos
Acciones: agregar, buscar, guardar, cancelar
Autenticación: huella, rostro, código QR, patrón
Configuración: ajustes, velocidad voz, idioma
Ayuda: comandos disponibles
''';

    await speak(helpMessage, priority: true, compress: false);
  }

  /// 🎚️ Ajusta configuración de voz
  Future<void> configureSpeech({
    double? speechRate,
    String? language,
    double? compressionLevel,
  }) async {
    try {
      if (speechRate != null) {
        _speechRate = speechRate.clamp(0.1, 2.0);
        await _flutterTts.setSpeechRate(_speechRate);
        await speak('Velocidad de voz ajustada');
      }

      if (language != null) {
        _currentLanguage = language;
        await _flutterTts.setLanguage(_currentLanguage);
        await speak('Idioma cambiado');
      }

      if (compressionLevel != null) {
        _compressionLevel = compressionLevel.clamp(0.0, 1.0);
        await speak('Nivel de compresión ajustado');
      }
    } catch (e) {
      print('❌ [CONFIG] Error configurando voz: $e');
    }
  }

  /// 🎙️ Graba muestra de voz para autenticación
  Future<Uint8List?> recordVoiceSample(Duration duration) async {
    try {
      await speak('Iniciando grabación de voz', priority: true);

      if (await _audioRecorder.hasPermission()) {
        await _soundRecorder.startRecorder(
          toFile: 'voice_sample.aac',
          codec: Codec.aacADTS,
        );

        _isRecording = true;
        await speak('Grabando... Diga su frase de seguridad ahora');

        await Future.delayed(duration);

        final path = await _soundRecorder.stopRecorder();
        _isRecording = false;

        if (path != null) {
          await speak('Grabación completada');
          // En una implementación real, cargaríamos el archivo
          return Uint8List(0); // Placeholder
        }
      } else {
        await speak('Permisos de micrófono requeridos', priority: true);
      }

      return null;
    } catch (e) {
      print('❌ [RECORD] Error grabando voz: $e');
      await speak('Error en grabación de voz', priority: true);
      return null;
    }
  }

  /// 🔄 Gestiona errores de reconocimiento de voz
  void _handleSpeechError(SpeechRecognitionError error) {
    print('❌ [SPEECH-ERROR] ${error.errorMsg}');
    speak('Error de reconocimiento: ${error.errorMsg}', priority: true);
  }

  /// 📊 Gestiona estados de reconocimiento de voz
  void _handleSpeechStatus(String status) {
    print('🎤 [SPEECH-STATUS] $status');

    switch (status) {
      case 'listening':
        _isListening = true;
        break;
      case 'notListening':
        _isListening = false;
        break;
      case 'done':
        _isListening = false;
        break;
    }
  }

  /// 🔇 Detiene todas las operaciones de voz
  Future<void> stopAll() async {
    try {
      await _flutterTts.stop();
      if (_isListening) {
        await _speechToText.stop();
      }
      if (_isRecording) {
        await _soundRecorder.stopRecorder();
      }
      await _audioPlayer.stop();
    } catch (e) {
      print('❌ [STOP] Error deteniendo servicios: $e');
    }
  }

  /// 🧹 Limpia recursos
  Future<void> dispose() async {
    try {
      await stopAll();
      await _soundRecorder.closeRecorder();
      await _soundPlayer.closePlayer();
    } catch (e) {
      print('❌ [DISPOSE] Error limpiando recursos: $e');
    }
  }

  /// 📊 Estado del servicio
  VoiceServiceStatus get status => VoiceServiceStatus(
    speechEnabled: _speechEnabled,
    isListening: _isListening,
    isRecording: _isRecording,
    currentLanguage: _currentLanguage,
    speechRate: _speechRate,
    compressionLevel: _compressionLevel,
  );
}

/// 🎤 Comando de voz procesado
class VoiceCommand {
  final String category;
  final String action;
  final String confirmation;

  VoiceCommand(this.category, this.action, this.confirmation);

  @override
  String toString() => 'VoiceCommand($category: $action)';
}

/// 📊 Estado del servicio de voz
class VoiceServiceStatus {
  final bool speechEnabled;
  final bool isListening;
  final bool isRecording;
  final String currentLanguage;
  final double speechRate;
  final double compressionLevel;

  VoiceServiceStatus({
    required this.speechEnabled,
    required this.isListening,
    required this.isRecording,
    required this.currentLanguage,
    required this.speechRate,
    required this.compressionLevel,
  });

  @override
  String toString() {
    return 'VoiceServiceStatus(enabled: $speechEnabled, listening: $isListening, recording: $isRecording, lang: $currentLanguage, rate: $speechRate, compression: $compressionLevel)';
  }
}