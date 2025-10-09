import 'dart:async';
// import 'dart:html' as html;  // Solo para web - deshabilitado para móvil
// import 'dart:js' as js;  // Solo para web - deshabilitado para móvil
import 'package:flutter/material.dart';

class BrowserCamera {
  static Future<bool> requestCameraAccess() async {
    print('🎥 BrowserCamera.requestCameraAccess() - Funcionalidad web deshabilitada');
    // Funcionalidad web comentada para compilación móvil
    return false;
  }

  static bool isCameraSupported() {
    // En móvil usaremos otros plugins de cámara
    return false;
  }

  static Widget buildCameraWidget({
    required double width,
    required double height,
    VoidCallback? onCapture,
    VoidCallback? onClose,
  }) {
    return Container(
      width: width,
      height: height,
      color: Colors.black54,
      child: const Center(
        child: Text(
          'Cámara no disponible en móvil\n(Funcionalidad web deshabilitada)',
          style: TextStyle(color: Colors.white),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  static void cleanup() {
    // Limpieza para móvil - sin implementación necesaria
  }
}