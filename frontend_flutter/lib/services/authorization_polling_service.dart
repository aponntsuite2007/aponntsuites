import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'websocket_service.dart';

/// 🔄 AUTHORIZATION POLLING SERVICE
/// ================================
/// Servicio para manejar autorizaciones de llegadas tardías
/// - Polling HTTP cuando WebSocket está caído
/// - Escucha WebSocket para respuestas en tiempo real
/// - Cache local de autorizaciones pendientes
///
/// CREADO: 2025-11-29
class AuthorizationPollingService {
  static final AuthorizationPollingService _instance =
      AuthorizationPollingService._internal();
  factory AuthorizationPollingService() => _instance;
  AuthorizationPollingService._internal();

  // Configuration
  String? _serverUrl;
  String? _authToken;
  String? _kioskId;
  Timer? _pollingTimer;
  bool _isPolling = false;

  static const Duration _pollingInterval = Duration(seconds: 10);
  static const Duration _httpTimeout = Duration(seconds: 5);

  // State
  final List<PendingAuthorization> _pendingAuthorizations = [];
  final Map<String, AuthorizationResponse> _authorizationResponses = {};

  // Stream controllers for reactive updates
  final StreamController<List<PendingAuthorization>> _pendingController =
      StreamController<List<PendingAuthorization>>.broadcast();
  final StreamController<AuthorizationResponse> _responseController =
      StreamController<AuthorizationResponse>.broadcast();

  // Public streams
  Stream<List<PendingAuthorization>> get pendingAuthorizations =>
      _pendingController.stream;
  Stream<AuthorizationResponse> get authorizationResponses =>
      _responseController.stream;
  List<PendingAuthorization> get currentPending => List.from(_pendingAuthorizations);

  /// 🚀 Initialize service
  Future<void> initialize({
    required String serverUrl,
    String? authToken,
    String? kioskId,
  }) async {
    print('🔄 [AUTH-POLLING] Initializing authorization polling service...');

    _serverUrl = serverUrl;
    _authToken = authToken;
    _kioskId = kioskId;

    // Load from preferences if not provided
    if (_authToken == null || _kioskId == null) {
      final prefs = await SharedPreferences.getInstance();
      _authToken ??= prefs.getString('auth_token');
      _kioskId ??= prefs.getString('kiosk_id');
    }

    // Setup WebSocket listener
    _setupWebSocketListener();

    // Initial fetch
    await fetchPendingAuthorizations();

    // Start polling (as fallback when WebSocket is down)
    _startPolling();

    print('✅ [AUTH-POLLING] Service initialized');
  }

  /// 📡 Setup WebSocket listener for real-time updates
  void _setupWebSocketListener() {
    final wsService = WebSocketService();

    // Listen for authorization responses
    wsService.authorizationRequests.listen((data) {
      print('📨 [AUTH-POLLING] WebSocket authorization event: ${data['type']}');

      if (data['type'] == 'response') {
        _handleAuthorizationResponse(data);
      } else {
        // New authorization request (shouldn't happen on kiosk, but handle anyway)
        _handleNewAuthorizationRequest(data);
      }
    });

    // Adjust polling based on connection state
    wsService.connectionState.listen((state) {
      if (state == ConnectionState.authenticated) {
        // WebSocket connected - reduce polling frequency
        _adjustPollingInterval(const Duration(seconds: 30));
        print('🔄 [AUTH-POLLING] WebSocket connected - reduced polling');
      } else if (state == ConnectionState.disconnected ||
          state == ConnectionState.error) {
        // WebSocket down - increase polling frequency
        _adjustPollingInterval(const Duration(seconds: 5));
        print('🔄 [AUTH-POLLING] WebSocket down - increased polling');
      }
    });
  }

  /// 🔄 Start polling timer
  void _startPolling() {
    _stopPolling();
    _isPolling = true;

    _pollingTimer = Timer.periodic(_pollingInterval, (_) async {
      if (_isPolling) {
        await fetchPendingAuthorizations();
      }
    });

    print('🔄 [AUTH-POLLING] Polling started (interval: ${_pollingInterval.inSeconds}s)');
  }

  /// ⏹️ Stop polling
  void _stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _isPolling = false;
  }

  /// 🔧 Adjust polling interval dynamically
  void _adjustPollingInterval(Duration newInterval) {
    _stopPolling();
    _pollingTimer = Timer.periodic(newInterval, (_) async {
      if (_isPolling) {
        await fetchPendingAuthorizations();
      }
    });
    _isPolling = true;
  }

  /// 📥 Fetch pending authorizations from server
  Future<List<PendingAuthorization>> fetchPendingAuthorizations() async {
    if (_serverUrl == null || _kioskId == null) {
      print('⚠️ [AUTH-POLLING] Not configured, skipping fetch');
      return [];
    }

    try {
      final url = '$_serverUrl/api/v1/authorization/pending?kioskId=$_kioskId';

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $_authToken',
          'Content-Type': 'application/json',
        },
      ).timeout(_httpTimeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List<dynamic> authorizationsJson = data['authorizations'] ?? [];

        _pendingAuthorizations.clear();
        for (final json in authorizationsJson) {
          _pendingAuthorizations.add(PendingAuthorization.fromJson(json));
        }

        _pendingController.add(List.from(_pendingAuthorizations));

        if (_pendingAuthorizations.isNotEmpty) {
          print('📋 [AUTH-POLLING] Found ${_pendingAuthorizations.length} pending authorizations');
        }

        return _pendingAuthorizations;
      } else {
        print('❌ [AUTH-POLLING] HTTP error: ${response.statusCode}');
        return [];
      }
    } catch (e) {
      print('❌ [AUTH-POLLING] Fetch error: $e');
      return [];
    }
  }

  /// 📤 Request late arrival authorization
  Future<AuthorizationRequestResult> requestAuthorization({
    required String attendanceId,
    required String employeeId,
    required String employeeName,
    required int lateMinutes,
    String? reason,
  }) async {
    if (_serverUrl == null) {
      return AuthorizationRequestResult(
        success: false,
        error: 'Service not configured',
      );
    }

    try {
      print('📤 [AUTH-POLLING] Requesting authorization for $employeeName ($lateMinutes min late)');

      final response = await http.post(
        Uri.parse('$_serverUrl/api/v1/authorization/request'),
        headers: {
          'Authorization': 'Bearer $_authToken',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'attendanceId': attendanceId,
          'employeeId': employeeId,
          'employeeName': employeeName,
          'lateMinutes': lateMinutes,
          'reason': reason,
          'kioskId': _kioskId,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);

        // Add to pending list
        final pending = PendingAuthorization(
          id: data['authorizationId'] ?? attendanceId,
          attendanceId: attendanceId,
          employeeId: employeeId,
          employeeName: employeeName,
          lateMinutes: lateMinutes,
          requestedAt: DateTime.now(),
          status: AuthorizationStatus.pending,
          token: data['authorizationToken'],
        );

        _pendingAuthorizations.add(pending);
        _pendingController.add(List.from(_pendingAuthorizations));

        print('✅ [AUTH-POLLING] Authorization requested successfully');

        return AuthorizationRequestResult(
          success: true,
          authorizationId: pending.id,
          authorizationToken: pending.token,
        );
      } else {
        final error = json.decode(response.body)['error'] ?? 'Unknown error';
        print('❌ [AUTH-POLLING] Request failed: $error');
        return AuthorizationRequestResult(
          success: false,
          error: error,
        );
      }
    } catch (e) {
      print('❌ [AUTH-POLLING] Request error: $e');
      return AuthorizationRequestResult(
        success: false,
        error: e.toString(),
      );
    }
  }

  /// 📥 Handle authorization response from WebSocket
  void _handleAuthorizationResponse(Map<String, dynamic> data) {
    final authResponse = AuthorizationResponse(
      authorizationId: data['authorizationId'] ?? data['attendanceId'],
      attendanceId: data['attendanceId'],
      approved: data['approved'] == true,
      approvedBy: data['approvedBy'],
      approverName: data['approverName'],
      reason: data['reason'],
      respondedAt: DateTime.tryParse(data['timestamp'] ?? '') ?? DateTime.now(),
    );

    // Store response
    _authorizationResponses[authResponse.authorizationId] = authResponse;

    // Remove from pending
    _pendingAuthorizations.removeWhere(
        (p) => p.id == authResponse.authorizationId || p.attendanceId == authResponse.attendanceId);
    _pendingController.add(List.from(_pendingAuthorizations));

    // Emit response
    _responseController.add(authResponse);

    print('📨 [AUTH-POLLING] Authorization ${authResponse.approved ? 'APPROVED' : 'REJECTED'} by ${authResponse.approverName}');
  }

  /// 📥 Handle new authorization request (for supervisors, not kiosk)
  void _handleNewAuthorizationRequest(Map<String, dynamic> data) {
    // This is mainly for supervisor apps, but log it
    print('📋 [AUTH-POLLING] New authorization request received (ignoring on kiosk)');
  }

  /// 🔍 Check status of specific authorization
  Future<AuthorizationResponse?> checkAuthorizationStatus(String authorizationId) async {
    // Check cache first
    if (_authorizationResponses.containsKey(authorizationId)) {
      return _authorizationResponses[authorizationId];
    }

    // Check pending
    final pending = _pendingAuthorizations.firstWhere(
      (p) => p.id == authorizationId,
      orElse: () => PendingAuthorization.empty(),
    );

    if (pending.id.isNotEmpty) {
      return null; // Still pending
    }

    // Fetch from server
    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/v1/authorization/$authorizationId/status'),
        headers: {
          'Authorization': 'Bearer $_authToken',
        },
      ).timeout(_httpTimeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);

        if (data['status'] == 'approved' || data['status'] == 'rejected') {
          final authResponse = AuthorizationResponse(
            authorizationId: authorizationId,
            attendanceId: data['attendanceId'],
            approved: data['status'] == 'approved',
            approvedBy: data['approvedBy'],
            approverName: data['approverName'],
            reason: data['reason'],
            respondedAt: DateTime.tryParse(data['respondedAt'] ?? '') ?? DateTime.now(),
          );

          _authorizationResponses[authorizationId] = authResponse;
          return authResponse;
        }
      }
    } catch (e) {
      print('❌ [AUTH-POLLING] Status check error: $e');
    }

    return null;
  }

  /// ⏳ Wait for authorization with timeout
  Future<AuthorizationResponse?> waitForAuthorization(
    String authorizationId, {
    Duration timeout = const Duration(minutes: 5),
  }) async {
    print('⏳ [AUTH-POLLING] Waiting for authorization $authorizationId (timeout: ${timeout.inSeconds}s)');

    final completer = Completer<AuthorizationResponse?>();
    Timer? timeoutTimer;
    StreamSubscription? subscription;

    // Setup timeout
    timeoutTimer = Timer(timeout, () {
      if (!completer.isCompleted) {
        print('⏰ [AUTH-POLLING] Authorization timeout');
        subscription?.cancel();
        completer.complete(null);
      }
    });

    // Listen for response
    subscription = _responseController.stream.listen((response) {
      if (response.authorizationId == authorizationId ||
          response.attendanceId == authorizationId) {
        timeoutTimer?.cancel();
        subscription?.cancel();
        if (!completer.isCompleted) {
          completer.complete(response);
        }
      }
    });

    // Also poll periodically while waiting
    Timer.periodic(const Duration(seconds: 3), (timer) async {
      if (completer.isCompleted) {
        timer.cancel();
        return;
      }

      final status = await checkAuthorizationStatus(authorizationId);
      if (status != null && !completer.isCompleted) {
        timer.cancel();
        timeoutTimer?.cancel();
        subscription?.cancel();
        completer.complete(status);
      }
    });

    return completer.future;
  }

  /// 🧹 Clear all data
  void clear() {
    _pendingAuthorizations.clear();
    _authorizationResponses.clear();
    _pendingController.add([]);
  }

  /// 🧹 Dispose service
  void dispose() {
    _stopPolling();
    _pendingController.close();
    _responseController.close();
    print('🧹 [AUTH-POLLING] Service disposed');
  }
}

/// 📋 Pending authorization model
class PendingAuthorization {
  final String id;
  final String attendanceId;
  final String employeeId;
  final String employeeName;
  final int lateMinutes;
  final DateTime requestedAt;
  final AuthorizationStatus status;
  final String? token;
  final String? reason;

  PendingAuthorization({
    required this.id,
    required this.attendanceId,
    required this.employeeId,
    required this.employeeName,
    required this.lateMinutes,
    required this.requestedAt,
    required this.status,
    this.token,
    this.reason,
  });

  factory PendingAuthorization.fromJson(Map<String, dynamic> json) {
    return PendingAuthorization(
      id: json['id'] ?? json['authorizationId'] ?? '',
      attendanceId: json['attendanceId'] ?? '',
      employeeId: json['employeeId'] ?? '',
      employeeName: json['employeeName'] ?? '',
      lateMinutes: json['lateMinutes'] ?? 0,
      requestedAt: DateTime.tryParse(json['requestedAt'] ?? '') ?? DateTime.now(),
      status: AuthorizationStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => AuthorizationStatus.pending,
      ),
      token: json['token'],
      reason: json['reason'],
    );
  }

  factory PendingAuthorization.empty() {
    return PendingAuthorization(
      id: '',
      attendanceId: '',
      employeeId: '',
      employeeName: '',
      lateMinutes: 0,
      requestedAt: DateTime.now(),
      status: AuthorizationStatus.pending,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'attendanceId': attendanceId,
        'employeeId': employeeId,
        'employeeName': employeeName,
        'lateMinutes': lateMinutes,
        'requestedAt': requestedAt.toIso8601String(),
        'status': status.name,
        'token': token,
        'reason': reason,
      };
}

/// 📨 Authorization response model
class AuthorizationResponse {
  final String authorizationId;
  final String? attendanceId;
  final bool approved;
  final String? approvedBy;
  final String? approverName;
  final String? reason;
  final DateTime respondedAt;

  AuthorizationResponse({
    required this.authorizationId,
    this.attendanceId,
    required this.approved,
    this.approvedBy,
    this.approverName,
    this.reason,
    required this.respondedAt,
  });

  Map<String, dynamic> toJson() => {
        'authorizationId': authorizationId,
        'attendanceId': attendanceId,
        'approved': approved,
        'approvedBy': approvedBy,
        'approverName': approverName,
        'reason': reason,
        'respondedAt': respondedAt.toIso8601String(),
      };
}

/// 📤 Authorization request result
class AuthorizationRequestResult {
  final bool success;
  final String? authorizationId;
  final String? authorizationToken;
  final String? error;

  AuthorizationRequestResult({
    required this.success,
    this.authorizationId,
    this.authorizationToken,
    this.error,
  });
}

/// 📊 Authorization status enum
enum AuthorizationStatus {
  pending,
  approved,
  rejected,
  expired,
  cancelled,
}
