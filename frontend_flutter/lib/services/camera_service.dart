import 'dart:async';
// import 'dart:html' as html;  // Solo para web - deshabilitado para móvil
// import 'dart:js_util' as js_util;  // Solo para web - deshabilitado para móvil
import 'dart:typed_data';
import 'package:flutter/foundation.dart';

class CameraService {
  static final CameraService _instance = CameraService._internal();
  factory CameraService() => _instance;
  CameraService._internal();

  bool get isSupported => false; // Deshabilitado para móvil

  Future<bool> initialize() async {
    print('📱 CameraService.initialize() - Funcionalidad web deshabilitada para móvil');
    return false;
  }

  Future<bool> requestPermission() async {
    print('📱 CameraService.requestPermission() - No necesario en móvil');
    return false;
  }

  Future<Uint8List?> captureImage() async {
    print('📱 CameraService.captureImage() - Funcionalidad web deshabilitada');
    return null;
  }

  void startStream() {
    print('📱 CameraService.startStream() - Funcionalidad web deshabilitada');
  }

  void stopStream() {
    print('📱 CameraService.stopStream() - Funcionalidad web deshabilitada');
  }

  void dispose() {
    print('📱 CameraService.dispose() - Limpieza móvil completada');
  }

  // Método para detectar si estamos en web
  static bool get isWeb => kIsWeb;
  
  // Método para detectar si estamos en móvil
  static bool get isMobile => !kIsWeb;
}