import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import '../config/app_config.dart';

class LocationService {
  /// Verificar si los servicios de ubicación están habilitados
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }

  /// Obtener permisos de ubicación
  Future<LocationPermission> getLocationPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    
    return permission;
  }

  /// Verificar si tenemos permisos de ubicación válidos
  Future<bool> hasLocationPermission() async {
    final permission = await getLocationPermission();
    return permission == LocationPermission.whileInUse || 
           permission == LocationPermission.always;
  }

  /// Obtener ubicación actual
  Future<LocationResult> getCurrentLocation() async {
    try {
      // Verificar servicios de ubicación
      if (!await isLocationServiceEnabled()) {
        return LocationResult.error(
          'Los servicios de ubicación están deshabilitados',
          LocationErrorType.serviceDisabled,
        );
      }

      // Verificar permisos
      if (!await hasLocationPermission()) {
        return LocationResult.error(
          ErrorMessages.permissionError,
          LocationErrorType.permissionDenied,
        );
      }

      // Obtener posición
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: AppConfig.locationTimeout),
      );

      // Convertir a objeto de ubicación
      final location = UserLocation(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        timestamp: position.timestamp ?? DateTime.now(),
      );

      return LocationResult.success(location);
    } catch (e) {
      return LocationResult.error(
        ErrorMessages.locationError,
        LocationErrorType.unknown,
      );
    }
  }

  /// Obtener dirección desde coordenadas
  Future<String?> getAddressFromCoordinates(double latitude, double longitude) async {
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(latitude, longitude);
      
      if (placemarks.isNotEmpty) {
        final placemark = placemarks.first;
        return '${placemark.street}, ${placemark.locality}, ${placemark.country}';
      }
    } catch (e) {
      print('Error getting address: $e');
    }
    return null;
  }

  /// Calcular distancia entre dos puntos en metros
  double calculateDistance(
    double lat1, double lon1,
    double lat2, double lon2,
  ) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }

  /// Verificar si está dentro del radio permitido
  bool isWithinRadius(
    double currentLat, double currentLon,
    double targetLat, double targetLon,
    double radiusMeters,
  ) {
    final distance = calculateDistance(currentLat, currentLon, targetLat, targetLon);
    return distance <= radiusMeters;
  }

  /// Obtener configuración de ubicación para asistencia
  Future<LocationConfig> getLocationConfig() async {
    return LocationConfig(
      accuracy: LocationAccuracy.high,
      timeoutSeconds: AppConfig.locationTimeout,
      distanceFilterMeters: 10,
    );
  }

  /// Iniciar seguimiento de ubicación en tiempo real
  Stream<UserLocation> watchPosition() {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,
    );

    return Geolocator.getPositionStream(locationSettings: locationSettings)
        .map((position) => UserLocation(
              latitude: position.latitude,
              longitude: position.longitude,
              accuracy: position.accuracy,
              altitude: position.altitude,
              timestamp: position.timestamp ?? DateTime.now(),
            ));
  }

  /// Abrir configuración de ubicación del sistema
  Future<bool> openLocationSettings() async {
    return await Geolocator.openLocationSettings();
  }

  /// Abrir configuración de permisos de la app
  Future<bool> openAppSettings() async {
    return await Geolocator.openAppSettings();
  }
}

class UserLocation {
  final double latitude;
  final double longitude;
  final double accuracy;
  final double? altitude;
  final DateTime timestamp;
  String? address;

  UserLocation({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    this.altitude,
    required this.timestamp,
    this.address,
  });

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'altitude': altitude,
      'timestamp': timestamp.toIso8601String(),
      'address': address,
    };
  }

  factory UserLocation.fromJson(Map<String, dynamic> json) {
    return UserLocation(
      latitude: json['latitude'].toDouble(),
      longitude: json['longitude'].toDouble(),
      accuracy: json['accuracy'].toDouble(),
      altitude: json['altitude']?.toDouble(),
      timestamp: DateTime.parse(json['timestamp']),
      address: json['address'],
    );
  }

  @override
  String toString() {
    return 'UserLocation{lat: $latitude, lon: $longitude, accuracy: $accuracy}';
  }
}

class LocationResult {
  final UserLocation? location;
  final String? error;
  final LocationErrorType? errorType;
  final bool isSuccess;

  LocationResult.success(this.location)
      : error = null,
        errorType = null,
        isSuccess = true;

  LocationResult.error(this.error, this.errorType)
      : location = null,
        isSuccess = false;

  @override
  String toString() {
    return isSuccess
        ? 'LocationResult.success(location: $location)'
        : 'LocationResult.error(error: $error, type: $errorType)';
  }
}

enum LocationErrorType {
  serviceDisabled,
  permissionDenied,
  permissionDeniedForever,
  timeout,
  unknown,
}

class LocationConfig {
  final LocationAccuracy accuracy;
  final int timeoutSeconds;
  final int distanceFilterMeters;

  LocationConfig({
    required this.accuracy,
    required this.timeoutSeconds,
    required this.distanceFilterMeters,
  });
}