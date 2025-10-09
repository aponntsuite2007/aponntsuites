import 'dart:async';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import '../models/document_request_model.dart';

class MedicalNotificationService {
  static final MedicalNotificationService _instance = MedicalNotificationService._internal();
  factory MedicalNotificationService() => _instance;
  MedicalNotificationService._internal();

  Timer? _pollTimer;
  late ApiService _apiService;
  late NotificationService _notificationService;
  
  List<String> _knownRequestIds = [];
  bool _isPolling = false;
  static const Duration _pollInterval = Duration(minutes: 2); // Poll every 2 minutes
  
  // Initialize the service
  Future<void> initialize({ApiService? apiService, NotificationService? notificationService}) async {
    _apiService = apiService ?? ApiService();
    _notificationService = notificationService ?? NotificationService();
    
    // Initialize API service if not already initialized
    await _apiService.initialize();
    
    await _loadKnownRequests();
    startPolling();
  }

  // Start polling for new medical requests
  void startPolling() {
    if (_isPolling) return;
    
    _isPolling = true;
    print('🔄 Iniciando polling de solicitudes médicas cada ${_pollInterval.inMinutes} minutos');
    
    _pollTimer = Timer.periodic(_pollInterval, (timer) async {
      await _checkForNewRequests();
    });
    
    // Check immediately
    _checkForNewRequests();
  }

  // Stop polling
  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _isPolling = false;
    print('⏹️ Polling de solicitudes médicas detenido');
  }

  // Check for new medical requests from the API
  Future<void> _checkForNewRequests() async {
    try {
      print('🔍 Verificando nuevas solicitudes médicas...');
      
      // Get pending requests from API
      final pendingRequests = await _apiService.getPendingDocumentRequests();
      
      if (pendingRequests.isEmpty) {
        print('✅ No hay solicitudes pendientes');
        return;
      }
      
      // Check for new requests
      List<Map<String, dynamic>> newRequests = [];
      
      for (final request in pendingRequests) {
        final requestId = request['id'].toString();
        if (!_knownRequestIds.contains(requestId)) {
          newRequests.add(request);
          _knownRequestIds.add(requestId);
        }
      }
      
      if (newRequests.isNotEmpty) {
        print('🆕 Encontradas ${newRequests.length} nueva(s) solicitud(es) médica(s)');
        await _saveKnownRequests();
        
        // Process each new request
        for (final request in newRequests) {
          await _processNewRequest(request);
        }
      } else {
        print('✅ No hay solicitudes nuevas');
      }
      
    } catch (e) {
      print('❌ Error verificando solicitudes médicas: $e');
    }
  }

  // Process a new medical request and trigger notifications
  Future<void> _processNewRequest(Map<String, dynamic> request) async {
    try {
      final documentType = request['documentType'] ?? 'document';
      final requestedBy = request['requestedBy'] ?? 'Área médica';
      final dueDate = request['dueDate'];
      final urgency = request['urgency'] ?? 'normal';
      
      // Determine notification type based on urgency and due date
      if (urgency == 'critical' || urgency == 'high') {
        await _triggerUrgentNotification(request);
        // Play urgent sound for critical requests
        await _playUrgentNotificationSound();
      } else {
        await _triggerStandardNotification(request);
        // Play standard sound for normal requests
        await _playNotificationSound();
      }
      
    } catch (e) {
      print('❌ Error procesando nueva solicitud: $e');
    }
  }

  // Trigger standard medical request notification
  Future<void> _triggerStandardNotification(Map<String, dynamic> request) async {
    final documentType = request['documentType'] ?? 'documento';
    final requestedBy = request['requestedBy'] ?? 'Área médica';
    final description = request['description'] ?? 'Solicitud médica';
    
    String title = '📋 Nueva Solicitud Médica';
    String body = '';
    
    switch (documentType) {
      case 'certificates':
        title = '📋 Certificado Médico Solicitado';
        body = '$requestedBy solicita que subas tu certificado médico';
        break;
      case 'studies':
        title = '🔬 Estudios Médicos Solicitados';
        body = '$requestedBy solicita que subas tus estudios médicos';
        break;
      case 'recipes':
        title = '💊 Receta Médica Solicitada';
        body = '$requestedBy solicita que subas tu receta médica';
        break;
      case 'photos':
        title = '📷 Fotos Médicas Solicitadas';
        body = '$requestedBy solicita que subas fotos médicas';
        break;
      default:
        body = '$requestedBy solicita que subas un $documentType';
    }
    
    await _notificationService.showMedicalRequestNotification(
      title: title,
      body: body,
      documentType: documentType,
      data: {
        'requestId': request['id'],
        'requestedBy': requestedBy,
        'description': description,
      },
    );
  }

  // Trigger urgent medical request notification
  Future<void> _triggerUrgentNotification(Map<String, dynamic> request) async {
    final documentType = request['documentType'] ?? 'documento';
    final requestedBy = request['requestedBy'] ?? 'Área médica';
    final urgency = request['urgency'] ?? 'normal';
    
    String title = '';
    String body = '';
    
    if (urgency == 'critical') {
      title = '🚨 URGENTE: Solicitud Médica Crítica';
      body = '$requestedBy requiere $documentType INMEDIATAMENTE';
    } else {
      title = '⚡ Solicitud Médica Urgente';
      body = '$requestedBy requiere $documentType con alta prioridad';
    }
    
    int? daysUntilDue;
    if (request['dueDate'] != null) {
      final dueDate = DateTime.parse(request['dueDate']);
      daysUntilDue = dueDate.difference(DateTime.now()).inDays;
    }
    
    await _notificationService.showUrgentDocumentNotification(
      title: title,
      body: body,
      documentType: documentType,
      daysUntilDue: daysUntilDue,
      data: {
        'requestId': request['id'],
        'requestedBy': requestedBy,
        'urgency': urgency,
      },
    );
  }

  // Play notification sound if enabled
  Future<void> _playNotificationSound() async {
    try {
      if (_notificationService.soundEnabled) {
        // Play system notification sound - try different sound types for medical urgency
        await SystemSound.play(SystemSoundType.alert);
        
        // For urgent notifications, play sound multiple times
        await Future.delayed(Duration(milliseconds: 200));
        await SystemSound.play(SystemSoundType.alert);
        
        print('🔊 Sonido de notificación médica reproducido');
      } else {
        print('🔇 Sonido de notificación deshabilitado');
      }
    } catch (e) {
      print('❌ Error reproduciendo sonido de notificación: $e');
      // Fallback: try click sound if alert fails
      try {
        await SystemSound.play(SystemSoundType.click);
      } catch (fallbackError) {
        print('❌ Error en sonido de respaldo: $fallbackError');
      }
    }
  }

  // Play urgent notification sound (louder/repeated)
  Future<void> _playUrgentNotificationSound() async {
    try {
      if (_notificationService.soundEnabled) {
        // Play multiple alert sounds for urgent notifications
        for (int i = 0; i < 3; i++) {
          await SystemSound.play(SystemSoundType.alert);
          if (i < 2) await Future.delayed(Duration(milliseconds: 300));
        }
        print('🚨 Sonido de notificación urgente reproducido');
      } else {
        print('🔇 Sonido de notificación urgente deshabilitado');
      }
    } catch (e) {
      print('❌ Error reproduciendo sonido urgente: $e');
    }
  }

  // Save known request IDs to prevent duplicate notifications
  Future<void> _saveKnownRequests() async {
    try {
      final prefs = await _getSharedPreferences();
      await prefs.setStringList('known_medical_requests', _knownRequestIds);
    } catch (e) {
      print('❌ Error guardando solicitudes conocidas: $e');
    }
  }

  // Load known request IDs
  Future<void> _loadKnownRequests() async {
    try {
      final prefs = await _getSharedPreferences();
      _knownRequestIds = prefs.getStringList('known_medical_requests') ?? [];
      print('📱 Cargadas ${_knownRequestIds.length} solicitudes conocidas');
    } catch (e) {
      print('❌ Error cargando solicitudes conocidas: $e');
      _knownRequestIds = [];
    }
  }

  // Get SharedPreferences instance
  Future<SharedPreferences> _getSharedPreferences() async {
    return await SharedPreferences.getInstance();
  }

  // Manual check for new requests (useful for testing or manual refresh)
  Future<void> checkNow() async {
    print('🔄 Verificación manual de solicitudes médicas');
    await _checkForNewRequests();
  }

  // Clear known requests (useful for testing)
  Future<void> clearKnownRequests() async {
    _knownRequestIds.clear();
    await _saveKnownRequests();
    print('🗑️ Solicitudes conocidas limpiadas');
  }

  // Test notification
  Future<void> testNotification() async {
    print('🧪 Enviando notificación de prueba');
    
    final mockRequest = {
      'id': 'test-${DateTime.now().millisecondsSinceEpoch}',
      'documentType': 'certificates',
      'requestedBy': 'Dr. Prueba',
      'description': 'Certificado médico de prueba',
      'urgency': 'normal',
      'dueDate': DateTime.now().add(Duration(days: 7)).toIso8601String(),
    };
    
    await _processNewRequest(mockRequest);
  }

  // Test urgent notification
  Future<void> testUrgentNotification() async {
    print('🧪 Enviando notificación urgente de prueba');
    
    final mockRequest = {
      'id': 'urgent-test-${DateTime.now().millisecondsSinceEpoch}',
      'documentType': 'studies',
      'requestedBy': 'Dr. Urgente',
      'description': 'Estudios médicos urgentes',
      'urgency': 'critical',
      'dueDate': DateTime.now().add(Duration(hours: 24)).toIso8601String(),
    };
    
    await _processNewRequest(mockRequest);
  }

  // Test sound notifications independently
  Future<void> testSounds() async {
    print('🧪 Probando sonidos de notificación');
    
    print('🔊 Reproduciendo sonido normal...');
    await _playNotificationSound();
    
    await Future.delayed(Duration(seconds: 2));
    
    print('🚨 Reproduciendo sonido urgente...');
    await _playUrgentNotificationSound();
  }

  // Cleanup when service is disposed
  void dispose() {
    stopPolling();
  }
}

