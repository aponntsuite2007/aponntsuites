import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'screens/kiosk_setup_screen.dart';
import 'screens/biometric_selector_screen.dart';
import 'services/config_service.dart';
import 'services/hardware_profile_service.dart';
import 'services/offline_queue_service.dart';

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
        title: 'Kiosko Biométrico - Aponnt',
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
  String? _companyName;
  String? _kioskId;
  String? _kioskName;

  KioskProvider(this._prefs) {
    _loadKioskConfig();
  }

  String? get companyId => _companyId;
  String? get companyName => _companyName;
  String? get kioskId => _kioskId;
  String? get kioskName => _kioskName;
  String get serverUrl => ConfigService.BACKEND_URL;

  void _loadKioskConfig() {
    _companyId = _prefs.getString('kiosk_company_id');
    _companyName = _prefs.getString('kiosk_company_name');
    _kioskId = _prefs.getString('kiosk_id');
    _kioskName = _prefs.getString('kiosk_name');
    notifyListeners();
  }

  Future<void> setKioskConfig({
    required String companyId,
    required String companyName,
    required String kioskId,
    required String kioskName,
  }) async {
    await _prefs.setString('kiosk_company_id', companyId);
    await _prefs.setString('kiosk_company_name', companyName);
    await _prefs.setString('kiosk_id', kioskId);
    await _prefs.setString('kiosk_name', kioskName);
    await _prefs.setBool('kiosk_is_configured', true);

    _companyId = companyId;
    _companyName = companyName;
    _kioskId = kioskId;
    _kioskName = kioskName;

    notifyListeners();
  }

  Future<void> clearConfig() async {
    await ConfigService.resetKioskConfig();
    _companyId = null;
    _companyName = null;
    _kioskId = null;
    _kioskName = null;
    notifyListeners();
  }

  bool get isConfigured {
    return _companyId != null && _kioskId != null;
  }
}

/// 🚀 PANTALLA DE INICIO - Decide si mostrar configuración o kiosk
///
/// FLUJO SIMPLIFICADO:
/// - Si NO está configurado → KioskSetupScreen (empresa + kiosko + GPS)
/// - Si SÍ está configurado → BiometricSelectorScreen (directo)
///
/// URL del servidor está HARDCODEADA - No se pide al usuario
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
    // Mostrar splash por 1.5 segundos
    await Future.delayed(const Duration(milliseconds: 1500));

    try {
      final prefs = await SharedPreferences.getInstance();

      // 🖥️ PASO 1: Detectar hardware profile del dispositivo (una sola vez)
      final hasHardwareProfile = prefs.getString('hardware_profile_id') != null;

      if (!hasHardwareProfile) {
        print('🔍 [STARTUP] Detectando perfil de hardware del dispositivo...');
        final hardwareService = HardwareProfileService();
        final profileResult = await hardwareService.detectHardwareProfile();

        if (profileResult.success && profileResult.profile != null) {
          final profile = profileResult.profile!;

          await prefs.setString('hardware_profile_id', profile.id);
          await prefs.setString('hardware_profile_name', profile.name);
          await prefs.setString('hardware_profile_brand', profile.brand);
          await prefs.setInt('hardware_performance_score', profile.performanceScore);
          await prefs.setString('hardware_profile_json', jsonEncode(profile.toJson()));

          print('✅ [STARTUP] Hardware: ${profile.name} (${profile.performanceScore}/100)');
        } else {
          print('⚠️ [STARTUP] No se pudo detectar hardware: ${profileResult.message}');
        }
      } else {
        final profileName = prefs.getString('hardware_profile_name');
        print('✅ [STARTUP] Hardware ya detectado: $profileName');
      }

      // 💾 PASO 2: Inicializar cola offline
      final offlineQueue = OfflineQueueService();
      final stats = await offlineQueue.getStats();
      print('💾 [STARTUP] Cola offline: ${stats.pending} pendientes');

      // 🔧 PASO 3: Verificar si el KIOSKO está configurado
      final isKioskConfigured = await ConfigService.isKioskConfigured();

      if (!isKioskConfigured) {
        // Primera vez - Mostrar pantalla de configuración
        print('🔧 [STARTUP] Kiosko no configurado → KioskSetupScreen');
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const KioskSetupScreen()),
          );
        }
        return;
      }

      // ✅ PASO 4: Kiosko configurado - Ir directo al selector biométrico
      final kioskConfig = await ConfigService.getKioskConfig();
      print('✅ [STARTUP] Kiosko configurado: ${kioskConfig['kioskName']} (${kioskConfig['companyName']})');
      print('📡 [STARTUP] Servidor: ${ConfigService.BACKEND_URL}');

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
      backgroundColor: Colors.blue[700],
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(30),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    spreadRadius: 5,
                    blurRadius: 15,
                  ),
                ],
              ),
              child: Icon(
                Icons.fingerprint,
                size: 60,
                color: Colors.blue[700],
              ),
            ),

            const SizedBox(height: 30),

            // App name
            const Text(
              'Kiosko Biométrico',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              'Aponnt Suite',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w300,
                color: Colors.white.withOpacity(0.9),
              ),
            ),

            const SizedBox(height: 50),

            // Loading indicator
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              strokeWidth: 3,
            ),

            const SizedBox(height: 20),

            Text(
              'Iniciando sistema...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withOpacity(0.8),
              ),
            ),

            const SizedBox(height: 100),

            Text(
              'v2.1.0',
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
