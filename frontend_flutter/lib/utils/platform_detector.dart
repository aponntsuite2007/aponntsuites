import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

class PlatformDetector {
  /// Detectar si es un dispositivo móvil
  static bool get isMobile => Platform.isAndroid || Platform.isIOS;
  
  /// Detectar si es web
  static bool get isWeb => kIsWeb;
  
  /// Detectar si es desktop
  static bool get isDesktop => Platform.isWindows || Platform.isLinux || Platform.isMacOS;
  
  /// Detectar si es una tablet basado en el tamaño de pantalla
  static bool isTablet(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final diagonal = (size.width * size.width + size.height * size.height);
    
    // Consideramos tablet si la diagonal es mayor a 7 pulgadas (aproximadamente 700 píxeles de diagonal)
    return diagonal > (700 * 700) && isMobile;
  }
  
  /// Detectar si debería usar modo kiosko
  static bool shouldUseKioskMode(BuildContext context) {
    // Usar kiosko si:
    // 1. Es móvil (Android/iOS)
    // 2. Es una tablet
    // 3. El ancho de pantalla sugiere uso en orientación landscape para kiosko
    
    if (!isMobile) return false;
    
    final size = MediaQuery.of(context).size;
    final isLandscape = size.width > size.height;
    final isLargeScreen = size.width > 600;
    
    return isTablet(context) || (isLandscape && isLargeScreen);
  }
  
  /// Obtener el tipo de dispositivo
  static DeviceType getDeviceType(BuildContext context) {
    if (isWeb) return DeviceType.web;
    if (isDesktop) return DeviceType.desktop;
    if (isTablet(context)) return DeviceType.tablet;
    if (isMobile) return DeviceType.mobile;
    
    return DeviceType.unknown;
  }
  
  /// Obtener configuración de UI basada en el dispositivo
  static UIConfig getUIConfig(BuildContext context) {
    final deviceType = getDeviceType(context);
    final size = MediaQuery.of(context).size;
    
    switch (deviceType) {
      case DeviceType.web:
      case DeviceType.desktop:
        return UIConfig(
          showFullNavigation: true,
          useDrawer: false,
          columnsCount: size.width > 1200 ? 4 : size.width > 800 ? 3 : 2,
          cardPadding: 16.0,
          useBottomNavigation: false,
          showFloatingActionButton: true,
        );
        
      case DeviceType.tablet:
        return UIConfig(
          showFullNavigation: true,
          useDrawer: true,
          columnsCount: size.width > 800 ? 3 : 2,
          cardPadding: 12.0,
          useBottomNavigation: false,
          showFloatingActionButton: true,
        );
        
      case DeviceType.mobile:
        return UIConfig(
          showFullNavigation: false,
          useDrawer: true,
          columnsCount: size.width > 400 ? 2 : 1,
          cardPadding: 8.0,
          useBottomNavigation: true,
          showFloatingActionButton: true,
        );
        
      case DeviceType.unknown:
      default:
        return UIConfig(
          showFullNavigation: true,
          useDrawer: true,
          columnsCount: 2,
          cardPadding: 12.0,
          useBottomNavigation: false,
          showFloatingActionButton: true,
        );
    }
  }
  
  /// Detectar orientación preferida para kiosko
  static Orientation getPreferredKioskOrientation(BuildContext context) {
    final size = MediaQuery.of(context).size;
    
    // Para tablets grandes, preferir landscape
    if (isTablet(context) && size.width > 900) {
      return Orientation.landscape;
    }
    
    // Para móviles, preferir portrait
    return Orientation.portrait;
  }
  
  /// Verificar si debería mostrar el modo administrador
  static bool shouldShowAdminMode(BuildContext context) {
    // Mostrar admin en:
    // - Desktop siempre
    // - Web siempre  
    // - Tablets en ciertas condiciones
    
    if (isDesktop || isWeb) return true;
    
    // En tablets, mostrar admin si está en landscape y es grande
    if (isTablet(context)) {
      final size = MediaQuery.of(context).size;
      return size.width > 800;
    }
    
    return false;
  }
}

enum DeviceType {
  mobile,
  tablet,
  desktop,
  web,
  unknown,
}

class UIConfig {
  final bool showFullNavigation;
  final bool useDrawer;
  final int columnsCount;
  final double cardPadding;
  final bool useBottomNavigation;
  final bool showFloatingActionButton;
  
  const UIConfig({
    required this.showFullNavigation,
    required this.useDrawer,
    required this.columnsCount,
    required this.cardPadding,
    required this.useBottomNavigation,
    required this.showFloatingActionButton,
  });
}

/// Extensiones para facilitar el uso
extension BuildContextPlatform on BuildContext {
  bool get isMobile => PlatformDetector.isMobile;
  bool get isWeb => PlatformDetector.isWeb;
  bool get isDesktop => PlatformDetector.isDesktop;
  bool get isTablet => PlatformDetector.isTablet(this);
  bool get shouldUseKioskMode => PlatformDetector.shouldUseKioskMode(this);
  DeviceType get deviceType => PlatformDetector.getDeviceType(this);
  UIConfig get uiConfig => PlatformDetector.getUIConfig(this);
  bool get shouldShowAdminMode => PlatformDetector.shouldShowAdminMode(this);
}