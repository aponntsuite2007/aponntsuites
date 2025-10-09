import 'dart:async';
import 'package:flutter/foundation.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';
import '../services/notification_service.dart';
import '../models/attendance.dart';
import '../services/location_service.dart';

class AttendanceProvider extends ChangeNotifier {
  final ApiService _apiService;
  final WebSocketService _webSocketService = WebSocketService();
  final NotificationService _notificationService = NotificationService();
  
  List<Attendance> _attendances = [];
  Attendance? _todayAttendance;
  bool _isLoading = false;
  String? _error;
  
  // Estado para hoy
  bool _hasCheckedIn = false;
  bool _hasCheckedOut = false;
  bool _canCheckIn = true;
  bool _canCheckOut = false;
  
  // Estado de tiempo real
  bool _isRealTimeEnabled = true;
  StreamSubscription? _attendanceStreamSubscription;
  StreamSubscription? _connectionStreamSubscription;
  Timer? _statusUpdateTimer;
  
  AttendanceProvider(this._apiService) {
    _initializeRealTimeUpdates();
  }
  
  // Getters
  List<Attendance> get attendances => List.unmodifiable(_attendances);
  Attendance? get todayAttendance => _todayAttendance;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasCheckedIn => _hasCheckedIn;
  bool get hasCheckedOut => _hasCheckedOut;
  bool get canCheckIn => _canCheckIn;
  bool get canCheckOut => _canCheckOut;
  bool get isRealTimeEnabled => _isRealTimeEnabled;
  bool get isWebSocketConnected => _webSocketService.isConnected;
  
  /// Obtener estado de asistencia de hoy
  Future<void> loadTodayStatus() async {
    _setLoading(true);
    
    try {
      final response = await _apiService.getTodayStatus();
      
      if (response.isSuccess && response.data != null) {
        final data = response.data!;
        
        _hasCheckedIn = data['hasCheckedIn'] ?? false;
        _hasCheckedOut = data['hasCheckedOut'] ?? false;
        _canCheckIn = data['canCheckIn'] ?? true;
        _canCheckOut = data['canCheckOut'] ?? false;
        
        if (data['attendance'] != null) {
          _todayAttendance = Attendance.fromJson(data['attendance']);
        }
        
        _clearError();
      } else {
        _setError(response.error ?? 'Error cargando estado de hoy');
      }
    } catch (e) {
      _setError('Error inesperado: $e');
    } finally {
      _setLoading(false);
    }
  }
  
  /// Registrar entrada
  Future<bool> checkIn({
    String method = 'manual',
    String? branchId,
    String? notes,
    bool useLocation = true,
  }) async {
    _setLoading(true);
    
    try {
      Map<String, dynamic>? location;
      
      if (useLocation) {
        final locationService = LocationService();
        final locationResult = await locationService.getCurrentLocation();
        
        if (locationResult.isSuccess && locationResult.location != null) {
          location = locationResult.location!.toJson();
        }
      }
      
      final response = await _apiService.checkIn(
        method: method,
        location: location,
        branchId: branchId,
        notes: notes,
      );
      
      if (response.isSuccess && response.data != null) {
        _todayAttendance = response.data!;
        _hasCheckedIn = true;
        _canCheckOut = true;
        _canCheckIn = false;
        
        // Actualizar lista si existe
        final index = _attendances.indexWhere((a) => a.id == _todayAttendance!.id);
        if (index >= 0) {
          _attendances[index] = _todayAttendance!;
        } else {
          _attendances.insert(0, _todayAttendance!);
        }
        
        _clearError();
        _setLoading(false);
        return true;
      } else {
        _setError(response.error ?? 'Error registrando entrada');
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _setError('Error inesperado: $e');
      _setLoading(false);
      return false;
    }
  }
  
  /// Registrar salida
  Future<bool> checkOut({
    String method = 'manual',
    String? notes,
    bool useLocation = true,
  }) async {
    _setLoading(true);
    
    try {
      Map<String, dynamic>? location;
      
      if (useLocation) {
        final locationService = LocationService();
        final locationResult = await locationService.getCurrentLocation();
        
        if (locationResult.isSuccess && locationResult.location != null) {
          location = locationResult.location!.toJson();
        }
      }
      
      final response = await _apiService.checkOut(
        method: method,
        location: location,
        notes: notes,
      );
      
      if (response.isSuccess && response.data != null) {
        _todayAttendance = response.data!;
        _hasCheckedOut = true;
        _canCheckOut = false;
        
        // Actualizar lista si existe
        final index = _attendances.indexWhere((a) => a.id == _todayAttendance!.id);
        if (index >= 0) {
          _attendances[index] = _todayAttendance!;
        }
        
        _clearError();
        _setLoading(false);
        return true;
      } else {
        _setError(response.error ?? 'Error registrando salida');
        _setLoading(false);
        return false;
      }
    } catch (e) {
      _setError('Error inesperado: $e');
      _setLoading(false);
      return false;
    }
  }
  
  /// Cargar historial de asistencias
  Future<void> loadAttendances({
    int page = 1,
    int limit = 20,
    DateTime? startDate,
    DateTime? endDate,
    String? userId,
    String? status,
    bool append = false,
  }) async {
    if (!append) {
      _setLoading(true);
    }
    
    try {
      final response = await _apiService.getAttendances(
        page: page,
        limit: limit,
        startDate: startDate,
        endDate: endDate,
        userId: userId,
        status: status,
      );
      
      if (response.isSuccess && response.data != null) {
        if (append) {
          _attendances.addAll(response.data!);
        } else {
          _attendances = response.data!;
        }
        _clearError();
      } else {
        _setError(response.error ?? 'Error cargando asistencias');
      }
    } catch (e) {
      _setError('Error inesperado: $e');
    } finally {
      if (!append) {
        _setLoading(false);
      }
    }
  }
  
  /// Obtener asistencia por fecha
  Attendance? getAttendanceByDate(DateTime date) {
    final dateStr = date.toIso8601String().substring(0, 10);
    try {
      return _attendances.firstWhere(
        (attendance) => attendance.date.toIso8601String().substring(0, 10) == dateStr,
      );
    } catch (e) {
      return null;
    }
  }
  
  /// Filtrar asistencias por estado
  List<Attendance> getAttendancesByStatus(String status) {
    return _attendances.where((a) => a.status == status).toList();
  }
  
  /// Obtener estadísticas del período actual
  Map<String, dynamic> getCurrentPeriodStats() {
    if (_attendances.isEmpty) {
      return {
        'totalDays': 0,
        'presentDays': 0,
        'lateDays': 0,
        'absentDays': 0,
        'totalHours': 0.0,
        'overtimeHours': 0.0,
        'attendanceRate': 0.0,
      };
    }
    
    final presentDays = _attendances.where((a) => a.status == 'present').length;
    final lateDays = _attendances.where((a) => a.status == 'late').length;
    final absentDays = _attendances.where((a) => a.status == 'absent').length;
    final totalHours = _attendances.fold<double>(0.0, (sum, a) => sum + a.workingHours);
    final overtimeHours = _attendances.fold<double>(0.0, (sum, a) => sum + a.overtimeHours);
    
    return {
      'totalDays': _attendances.length,
      'presentDays': presentDays,
      'lateDays': lateDays,
      'absentDays': absentDays,
      'totalHours': totalHours,
      'overtimeHours': overtimeHours,
      'attendanceRate': _attendances.isNotEmpty 
          ? ((presentDays + lateDays) / _attendances.length * 100)
          : 0.0,
    };
  }
  
  /// Limpiar datos
  void clear() {
    _attendances.clear();
    _todayAttendance = null;
    _hasCheckedIn = false;
    _hasCheckedOut = false;
    _canCheckIn = true;
    _canCheckOut = false;
    _error = null;
    notifyListeners();
  }
  
  /// Refrescar datos
  Future<void> refresh() async {
    await Future.wait([
      loadTodayStatus(),
      loadAttendances(limit: 10),
    ]);
  }
  
  // Helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    if (loading) _error = null;
    notifyListeners();
  }
  
  void _setError(String error) {
    _error = error;
    _isLoading = false;
    notifyListeners();
  }
  
  void _clearError() {
    _error = null;
    notifyListeners();
  }
  
  // Real-time methods
  void _initializeRealTimeUpdates() {
    if (!_isRealTimeEnabled) return;

    // Escuchar actualizaciones de asistencia en tiempo real
    _attendanceStreamSubscription = _webSocketService.attendanceStream.listen(
      (attendance) {
        _handleRealTimeAttendanceUpdate(attendance);
      },
      onError: (error) {
        print('Error en stream de asistencia: $error');
      },
    );

    // Escuchar cambios de conexión
    _connectionStreamSubscription = _webSocketService.connectionStream.listen(
      (isConnected) {
        notifyListeners();
        if (isConnected) {
          _requestLiveUpdates();
        }
      },
    );

    // Timer para actualizar estado periódicamente
    _startStatusUpdateTimer();
  }

  void _handleRealTimeAttendanceUpdate(Attendance attendance) {
    // Actualizar la lista de asistencias
    final existingIndex = _attendances.indexWhere((a) => a.id == attendance.id);
    
    if (existingIndex >= 0) {
      _attendances[existingIndex] = attendance;
    } else {
      _attendances.insert(0, attendance);
    }

    // Si es la asistencia de hoy, actualizar el estado
    final today = DateTime.now();
    final attendanceDate = attendance.date;
    
    if (attendanceDate.year == today.year &&
        attendanceDate.month == today.month &&
        attendanceDate.day == today.day) {
      
      _todayAttendance = attendance;
      _hasCheckedIn = attendance.checkInTime != null;
      _hasCheckedOut = attendance.checkOutTime != null;
      _canCheckIn = !_hasCheckedIn;
      _canCheckOut = _hasCheckedIn && !_hasCheckedOut;

      // Mostrar notificación
      if (_hasCheckedIn && attendance.checkInTime != null) {
        _notificationService.showCheckInSuccess(attendance.location ?? 'Ubicación no disponible');
      }
      
      if (_hasCheckedOut && attendance.checkOutTime != null) {
        final workingHours = '${attendance.workingHours.toStringAsFixed(1)} horas';
        _notificationService.showCheckOutSuccess(workingHours);
      }
    }

    notifyListeners();
  }

  void _startStatusUpdateTimer() {
    _statusUpdateTimer?.cancel();
    _statusUpdateTimer = Timer.periodic(Duration(minutes: 5), (_) {
      if (_isRealTimeEnabled && _webSocketService.isConnected) {
        _updateLocationAndStatus();
      }
    });
  }

  Future<void> _updateLocationAndStatus() async {
    try {
      final locationResult = await LocationService().getCurrentLocation();
      if (locationResult.isSuccess && locationResult.location != null) {
        _webSocketService.sendLocationUpdate(
          locationResult.location!.latitude, 
          locationResult.location!.longitude
        );
      }
    } catch (e) {
      print('Error actualizando ubicación: $e');
    }
  }

  void _requestLiveUpdates() {
    if (_webSocketService.isConnected) {
      _webSocketService.requestLiveStats();
    }
  }

  Future<void> connectRealTime(String userId) async {
    if (_isRealTimeEnabled) {
      await _webSocketService.connect(userId);
    }
  }

  void disconnectRealTime() {
    _webSocketService.disconnect();
  }

  void setRealTimeEnabled(bool enabled) {
    _isRealTimeEnabled = enabled;
    
    if (enabled) {
      _initializeRealTimeUpdates();
    } else {
      _attendanceStreamSubscription?.cancel();
      _connectionStreamSubscription?.cancel();
      _statusUpdateTimer?.cancel();
      _webSocketService.disconnect();
    }
    
    notifyListeners();
  }

  // Enhanced check-in with real-time updates
  Future<bool> checkInEnhanced({
    String method = 'manual',
    String? branchId,
    String? notes,
    bool useLocation = true,
    Map<String, dynamic>? biometricData,
  }) async {
    final success = await checkIn(
      method: method,
      branchId: branchId,
      notes: notes,
      useLocation: useLocation,
    );

    if (success && _isRealTimeEnabled && _webSocketService.isConnected) {
      // Enviar actualización en tiempo real
      _webSocketService.sendAttendanceUpdate({
        'action': 'checkin',
        'method': method,
        'notes': notes,
        'timestamp': DateTime.now().toIso8601String(),
      });

      // Actualizar ubicación
      _updateLocationAndStatus();
    }

    return success;
  }

  // Enhanced check-out with real-time updates
  Future<bool> checkOutEnhanced({
    String method = 'manual',
    String? notes,
    bool useLocation = true,
  }) async {
    final success = await checkOut(
      method: method,
      notes: notes,
      useLocation: useLocation,
    );

    if (success && _isRealTimeEnabled && _webSocketService.isConnected) {
      // Enviar actualización en tiempo real
      _webSocketService.sendAttendanceUpdate({
        'action': 'checkout',
        'method': method,
        'notes': notes,
        'timestamp': DateTime.now().toIso8601String(),
      });

      // Actualizar ubicación
      _updateLocationAndStatus();
    }

    return success;
  }

  void sendEmergencyAlert(String message) {
    if (_webSocketService.isConnected) {
      LocationService().getCurrentLocation().then((locationResult) {
        Map<String, dynamic>? locationData;
        if (locationResult.isSuccess && locationResult.location != null) {
          locationData = {
            'latitude': locationResult.location!.latitude,
            'longitude': locationResult.location!.longitude,
          };
        }
        _webSocketService.sendEmergencyAlert(message, locationData);
      });
    }
  }

  @override
  void dispose() {
    _attendanceStreamSubscription?.cancel();
    _connectionStreamSubscription?.cancel();
    _statusUpdateTimer?.cancel();
    _webSocketService.disconnect();
    _attendances.clear();
    super.dispose();
  }
}