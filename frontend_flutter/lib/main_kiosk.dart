/*
 * 🏢 KIOSK APP - MAIN ENTRY POINT
 * ================================
 * Entry point para la APK del KIOSCO BIOMÉTRICO
 *
 * APK PÚBLICA - Sin credenciales de inicio
 * Solo configura: Empresa, Kiosko, GPS
 * URL hardcodeada: https://www.aponnt.com
 *
 * Compilar con:
 *   flutter build apk --flavor kiosk --target=lib/main_kiosk.dart
 *
 * Fecha: 2026-01-22
 * Versión: 3.0.0
 */

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'screens/kiosk_setup_screen.dart';
import 'screens/biometric_selector_screen.dart';
import 'screens/kiosk_screen.dart';
import 'services/config_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(EnterpriseKioskApp(prefs: prefs));
}

class EnterpriseKioskApp extends StatelessWidget {
  final SharedPreferences prefs;

  EnterpriseKioskApp({required this.prefs});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => KioskProvider(prefs),
      child: MaterialApp(
        title: 'Aponnt Ecosistema Inteligente - Kiosco Biométrico',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
        ),
        home: StartupScreen(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

class KioskProvider with ChangeNotifier {
  final SharedPreferences _prefs;
  String? _companyId;
  String? _kioskId;
  String? _kioskName;

  KioskProvider(this._prefs) {
    _loadKioskConfig();
  }

  String? get companyId => _companyId;
  String? get kioskId => _kioskId;
  String? get kioskName => _kioskName;

  void _loadKioskConfig() {
    _companyId = _prefs.getString('kiosk_company_id');
    _kioskId = _prefs.getString('kiosk_id');
    _kioskName = _prefs.getString('kiosk_name');
    notifyListeners();
  }

  Future<void> setKioskConfig({
    required String companyId,
    required String kioskId,
    required String kioskName,
  }) async {
    await _prefs.setString('kiosk_company_id', companyId);
    await _prefs.setString('kiosk_id', kioskId);
    await _prefs.setString('kiosk_name', kioskName);

    _companyId = companyId;
    _kioskId = kioskId;
    _kioskName = kioskName;

    notifyListeners();
  }

  /// Kiosko está configurado cuando tiene empresa y kiosko seleccionados
  bool get isConfigured {
    return _prefs.getBool('kiosk_is_configured') ?? false;
  }

  Future<void> resetConfig() async {
    await ConfigService.resetKioskConfig();
    _companyId = null;
    _kioskId = null;
    _kioskName = null;
    notifyListeners();
  }
}

/// 🚀 PANTALLA DE INICIO - Decide si mostrar configuración, login o kiosk
class StartupScreen extends StatefulWidget {
  @override
  _StartupScreenState createState() => _StartupScreenState();
}

class _StartupScreenState extends State<StartupScreen> {
  @override
  void initState() {
    super.initState();
    _checkConfigurationAndNavigate();
  }

  Future<void> _checkConfigurationAndNavigate() async {
    await Future.delayed(const Duration(milliseconds: 1500));

    try {
      // Verificar si el kiosko ya está configurado (empresa + kiosko + GPS)
      final isConfigured = await ConfigService.isKioskConfigured();

      if (!isConfigured) {
        // Primera vez: ir a pantalla de setup
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const KioskSetupScreen()),
          );
        }
        return;
      }

      // Ya configurado: ir al selector biométrico (facial / huella / password)
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => BiometricSelectorScreen()),
        );
      }

    } catch (e) {
      print('❌ [STARTUP] Error: $e');
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const KioskSetupScreen()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Color(0xFF1976D2),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(30),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    spreadRadius: 5,
                    blurRadius: 15,
                  ),
                ],
              ),
              child: Icon(
                Icons.fingerprint,
                size: 60,
                color: Color(0xFF1976D2),
              ),
            ),

            SizedBox(height: 30),

            Text(
              'Aponnt Ecosistema Inteligente',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),

            SizedBox(height: 8),

            Text(
              'Kiosco Biométrico',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w300,
                color: Colors.white.withOpacity(0.9),
              ),
            ),

            SizedBox(height: 50),

            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              strokeWidth: 3,
            ),

            SizedBox(height: 20),

            Text(
              'Iniciando sistema...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withOpacity(0.8),
              ),
            ),

            SizedBox(height: 100),

            Text(
              'v2.0.0 - Kiosk Pro',
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withOpacity(0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
