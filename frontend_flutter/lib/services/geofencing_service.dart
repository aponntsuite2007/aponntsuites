import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class GeofencingService {
  static final GeofencingService _instance = GeofencingService._internal();
  factory GeofencingService() => _instance;
  GeofencingService._internal();

  SharedPreferences? _prefs;
  StreamController<GeofenceEvent>? _eventController;
  Timer? _monitoringTimer;
  Position? _lastPosition;
  
  List<GeofenceZone> _zones = [];
  Map<String, GeofenceStatus> _zoneStatuses = {};
  bool _isMonitoring = false;
  LocationSettings? _locationSettings;

  // Configuraciones
  double _monitoringIntervalSeconds = 30;
  double _minimumDistanceFilter = 10; // metros
  double _locationAccuracyThreshold = 20; // metros

  List<GeofenceZone> get zones => List.unmodifiable(_zones);
  bool get isMonitoring => _isMonitoring;
  Stream<GeofenceEvent>? get eventStream => _eventController?.stream;

  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    _eventController = StreamController<GeofenceEvent>.broadcast();
    
    _locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: _minimumDistanceFilter.toInt(),
    );
    
    await _loadZones();
    _loadSettings();
  }

  /// Agregar una nueva zona de geofencing
  Future<void> addZone(GeofenceZone zone) async {
    _zones.add(zone);
    _zoneStatuses[zone.id] = GeofenceStatus.outside;
    await _saveZones();
    
    if (_isMonitoring) {
      await _checkCurrentLocation();
    }
  }

  /// Actualizar una zona existente
  Future<void> updateZone(GeofenceZone updatedZone) async {
    final index = _zones.indexWhere((z) => z.id == updatedZone.id);
    if (index >= 0) {
      _zones[index] = updatedZone;
      await _saveZones();
      
      if (_isMonitoring) {
        await _checkCurrentLocation();
      }
    }
  }

  /// Eliminar una zona
  Future<void> removeZone(String zoneId) async {
    _zones.removeWhere((z) => z.id == zoneId);
    _zoneStatuses.remove(zoneId);
    await _saveZones();
  }

  /// Obtener zona por ID
  GeofenceZone? getZone(String zoneId) {
    try {
      return _zones.firstWhere((z) => z.id == zoneId);
    } catch (e) {
      return null;
    }
  }

  /// Iniciar monitoreo de geofencing
  Future<bool> startMonitoring() async {
    if (_isMonitoring) return true;

    // Verificar permisos
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      final requested = await Geolocator.requestPermission();
      if (requested == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    try {
      // Verificar que el servicio de ubicación esté habilitado
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return false;
      }

      _isMonitoring = true;
      
      // Obtener ubicación actual
      await _checkCurrentLocation();
      
      // Iniciar monitoreo periódico
      _startPeriodicMonitoring();
      
      return true;
    } catch (e) {
      print('Error iniciando monitoreo de geofencing: $e');
      return false;
    }
  }

  /// Detener monitoreo
  void stopMonitoring() {
    _isMonitoring = false;
    _monitoringTimer?.cancel();
    _monitoringTimer = null;
  }

  /// Verificar si una posición está dentro de una zona
  bool isInsideZone(Position position, GeofenceZone zone) {
    final distance = _calculateDistance(
      position.latitude,
      position.longitude,
      zone.center.latitude,
      zone.center.longitude,
    );
    
    return distance <= zone.radius;
  }

  /// Obtener la distancia a una zona específica
  double getDistanceToZone(Position position, GeofenceZone zone) {
    final distance = _calculateDistance(
      position.latitude,
      position.longitude,
      zone.center.latitude,
      zone.center.longitude,
    );
    
    return math.max(0, distance - zone.radius);
  }

  /// Obtener todas las zonas cercanas (dentro de un radio específico)
  List<GeofenceZone> getNearbyZones(Position position, {double maxDistance = 1000}) {
    return _zones.where((zone) {
      final distance = _calculateDistance(
        position.latitude,
        position.longitude,
        zone.center.latitude,
        zone.center.longitude,
      );
      return distance <= (zone.radius + maxDistance);
    }).toList();
  }

  /// Verificar ubicación actual contra todas las zonas
  Future<void> _checkCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      // Verificar precisión
      if (position.accuracy > _locationAccuracyThreshold) {
        print('Ubicación con baja precisión: ${position.accuracy}m');
        return;
      }

      // Verificar si hay cambio significativo de posición
      if (_lastPosition != null) {
        final distance = _calculateDistance(
          _lastPosition!.latitude,
          _lastPosition!.longitude,
          position.latitude,
          position.longitude,
        );
        
        if (distance < _minimumDistanceFilter) {
          return; // No hay cambio significativo
        }
      }

      _lastPosition = position;
      await _processLocationUpdate(position);
      
    } catch (e) {
      print('Error obteniendo ubicación: $e');
    }
  }

  /// Procesar actualización de ubicación
  Future<void> _processLocationUpdate(Position position) async {
    for (final zone in _zones) {
      final currentStatus = _zoneStatuses[zone.id] ?? GeofenceStatus.outside;
      final isInside = isInsideZone(position, zone);
      final newStatus = isInside ? GeofenceStatus.inside : GeofenceStatus.outside;

      if (currentStatus != newStatus) {
        _zoneStatuses[zone.id] = newStatus;
        
        final event = GeofenceEvent(
          zoneId: zone.id,
          zoneName: zone.name,
          position: position,
          eventType: isInside ? GeofenceEventType.enter : GeofenceEventType.exit,
          timestamp: DateTime.now(),
          distance: getDistanceToZone(position, zone),
        );

        _eventController?.add(event);
        
        // Disparar callbacks específicos de la zona
        if (isInside && zone.onEnter != null) {
          zone.onEnter!(event);
        } else if (!isInside && zone.onExit != null) {
          zone.onExit!(event);
        }
      }
    }
  }

  /// Iniciar monitoreo periódico
  void _startPeriodicMonitoring() {
    _monitoringTimer?.cancel();
    _monitoringTimer = Timer.periodic(
      Duration(seconds: _monitoringIntervalSeconds.toInt()),
      (_) => _checkCurrentLocation(),
    );
  }

  /// Calcular distancia entre dos puntos usando fórmula Haversine
  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }

  // Configuraciones
  Future<void> setMonitoringInterval(double seconds) async {
    _monitoringIntervalSeconds = seconds;
    await _prefs?.setDouble('monitoring_interval', seconds);
    
    if (_isMonitoring) {
      _startPeriodicMonitoring();
    }
  }

  Future<void> setMinimumDistanceFilter(double meters) async {
    _minimumDistanceFilter = meters;
    await _prefs?.setDouble('minimum_distance_filter', meters);
    
    _locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: meters.toInt(),
    );
  }

  Future<void> setLocationAccuracyThreshold(double meters) async {
    _locationAccuracyThreshold = meters;
    await _prefs?.setDouble('accuracy_threshold', meters);
  }

  // Métodos de persistencia
  Future<void> _saveZones() async {
    final zonesJson = _zones.map((z) => z.toJson()).toList();
    await _prefs?.setString('geofence_zones', json.encode(zonesJson));
  }

  Future<void> _loadZones() async {
    final zonesString = _prefs?.getString('geofence_zones');
    if (zonesString != null) {
      try {
        final List<dynamic> zonesJson = json.decode(zonesString);
        _zones = zonesJson.map((json) => GeofenceZone.fromJson(json)).toList();
        
        // Inicializar estados
        for (final zone in _zones) {
          _zoneStatuses[zone.id] = GeofenceStatus.outside;
        }
      } catch (e) {
        print('Error cargando zonas: $e');
        _zones = [];
      }
    }
  }

  void _loadSettings() {
    _monitoringIntervalSeconds = _prefs?.getDouble('monitoring_interval') ?? 30;
    _minimumDistanceFilter = _prefs?.getDouble('minimum_distance_filter') ?? 10;
    _locationAccuracyThreshold = _prefs?.getDouble('accuracy_threshold') ?? 20;
  }

  /// Limpiar recursos
  void dispose() {
    stopMonitoring();
    _eventController?.close();
  }
}

class GeofenceZone {
  final String id;
  final String name;
  final String description;
  final LatLng center;
  final double radius; // metros
  final GeofenceZoneType type;
  final bool isActive;
  final Map<String, dynamic> metadata;
  final Function(GeofenceEvent)? onEnter;
  final Function(GeofenceEvent)? onExit;

  GeofenceZone({
    required this.id,
    required this.name,
    required this.description,
    required this.center,
    required this.radius,
    this.type = GeofenceZoneType.workplace,
    this.isActive = true,
    this.metadata = const {},
    this.onEnter,
    this.onExit,
  });

  factory GeofenceZone.fromJson(Map<String, dynamic> json) {
    return GeofenceZone(
      id: json['id'],
      name: json['name'],
      description: json['description'] ?? '',
      center: LatLng(json['latitude'], json['longitude']),
      radius: json['radius'].toDouble(),
      type: GeofenceZoneType.values.firstWhere(
        (t) => t.toString() == 'GeofenceZoneType.${json['type']}',
        orElse: () => GeofenceZoneType.workplace,
      ),
      isActive: json['isActive'] ?? true,
      metadata: json['metadata'] ?? {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'latitude': center.latitude,
      'longitude': center.longitude,
      'radius': radius,
      'type': type.toString().split('.').last,
      'isActive': isActive,
      'metadata': metadata,
    };
  }

  GeofenceZone copyWith({
    String? id,
    String? name,
    String? description,
    LatLng? center,
    double? radius,
    GeofenceZoneType? type,
    bool? isActive,
    Map<String, dynamic>? metadata,
    Function(GeofenceEvent)? onEnter,
    Function(GeofenceEvent)? onExit,
  }) {
    return GeofenceZone(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      center: center ?? this.center,
      radius: radius ?? this.radius,
      type: type ?? this.type,
      isActive: isActive ?? this.isActive,
      metadata: metadata ?? this.metadata,
      onEnter: onEnter ?? this.onEnter,
      onExit: onExit ?? this.onExit,
    );
  }
}

class LatLng {
  final double latitude;
  final double longitude;

  const LatLng(this.latitude, this.longitude);

  @override
  String toString() => 'LatLng($latitude, $longitude)';

  @override
  bool operator ==(Object other) {
    return other is LatLng &&
        other.latitude == latitude &&
        other.longitude == longitude;
  }

  @override
  int get hashCode => latitude.hashCode ^ longitude.hashCode;
}

class GeofenceEvent {
  final String zoneId;
  final String zoneName;
  final Position position;
  final GeofenceEventType eventType;
  final DateTime timestamp;
  final double distance;

  GeofenceEvent({
    required this.zoneId,
    required this.zoneName,
    required this.position,
    required this.eventType,
    required this.timestamp,
    required this.distance,
  });

  @override
  String toString() {
    return 'GeofenceEvent(zone: $zoneName, type: $eventType, distance: ${distance.toStringAsFixed(1)}m)';
  }
}

enum GeofenceZoneType {
  workplace,
  branch,
  client,
  restricted,
  custom,
}

enum GeofenceEventType {
  enter,
  exit,
}

enum GeofenceStatus {
  inside,
  outside,
  unknown,
}