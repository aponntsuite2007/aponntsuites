import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'screens/config_screen.dart';
import 'screens/login_screen.dart';
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
        title: 'Sistema de Asistencia Biométrico',
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
  String? _serverUrl;
  String? _authToken;

  KioskProvider(this._prefs) {
    _loadKioskConfig();
  }

  String? get companyId => _companyId;
  String? get kioskId => _kioskId;
  String? get serverUrl => _serverUrl;
  String? get authToken => _authToken;

  void _loadKioskConfig() {
    _companyId = _prefs.getString('config_company_id');
    _authToken = _prefs.getString('auth_token');
    _kioskId = _prefs.getString('kiosk_id');
    _serverUrl = _prefs.getString('server_url');
    notifyListeners();
  }

  Future<void> setKioskConfig({
    required String companyId,
    required String kioskId,
    required String serverUrl,
  }) async {
    await _prefs.setString('config_company_id', companyId);
    await _prefs.setString('kiosk_id', kioskId);
    await _prefs.setString('config_baseUrl', serverUrl.split(':')[0].replaceAll('http://', ''));
    await _prefs.setString('config_port', serverUrl.split(':').last);

    _companyId = companyId;
    _kioskId = kioskId;
    _serverUrl = serverUrl;

    notifyListeners();
  }

  bool get isConfigured {
    final hasToken = _prefs.getString('auth_token') != null;
    final hasCompany = _prefs.getString('config_company_id') != null;
    return hasToken && hasCompany;
  }

  bool get hasServerConfig {
    return _prefs.getBool('config_is_configured') ?? false;
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
    // Esperar un momento para mostrar la pantalla de splash
    await Future.delayed(const Duration(milliseconds: 1500));

    try {
      final prefs = await SharedPreferences.getInstance();

      // 🖥️ PASO 0: Detectar hardware profile del dispositivo (una sola vez)
      final hasHardwareProfile = prefs.getString('hardware_profile_id') != null;

      if (!hasHardwareProfile) {
        print('🔍 [STARTUP] Detectando perfil de hardware del dispositivo...');
        final hardwareService = HardwareProfileService();
        final profileResult = await hardwareService.detectHardwareProfile();

        if (profileResult.success && profileResult.profile != null) {
          final profile = profileResult.profile!;

          // Guardar perfil detectado
          await prefs.setString('hardware_profile_id', profile.id);
          await prefs.setString('hardware_profile_name', profile.name);
          await prefs.setString('hardware_profile_brand', profile.brand);
          await prefs.setInt('hardware_performance_score', profile.performanceScore);
          await prefs.setString('hardware_profile_json', jsonEncode(profile.toJson()));

          print('✅ [STARTUP] Hardware detectado: ${profile.name} (${profile.performanceScore}/100)');
          print('   Walk-through: ${profile.supportsWalkthrough}');
          print('   Liveness: ${profile.supportsLiveness}');
        } else {
          print('⚠️ [STARTUP] No se pudo detectar hardware: ${profileResult.message}');
        }
      } else {
        final profileName = prefs.getString('hardware_profile_name');
        print('✅ [STARTUP] Hardware ya detectado: $profileName');
      }

      // 💾 Inicializar servicio de cola offline
      final offlineQueue = OfflineQueueService();
      final stats = await offlineQueue.getStats();
      print('💾 [STARTUP] Cola offline: ${stats.pending} pendientes, ${stats.synced} sincronizados');

      // 1. Verificar si tiene servidor configurado
      final isConfigured = await ConfigService.isConfigured();

      if (!isConfigured) {
        print('🔧 [STARTUP] No hay configuración, ir a ConfigScreen');
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => ConfigScreen()),
          );
        }
        return;
      }

      // 2. Verificar si tiene token de autenticación
      final authToken = prefs.getString('auth_token');
      final companyId = prefs.getString('config_company_id');

      if (authToken == null || companyId == null) {
        print('🔐 [STARTUP] No hay sesión, ir a LoginScreen');
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => NewLoginScreen()),
          );
        }
        return;
      }

      // 3. Si tiene todo, ir directo al selector biométrico
      print('✅ [STARTUP] Sesión activa, ir a BiometricSelectorScreen');
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
          MaterialPageRoute(builder: (_) => ConfigScreen()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blue,
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
                    color: Colors.black.withOpacity(0.1),
                    spreadRadius: 5,
                    blurRadius: 15,
                  ),
                ],
              ),
              child: Icon(
                Icons.fingerprint,
                size: 60,
                color: Colors.blue,
              ),
            ),

            SizedBox(height: 30),

            // App name
            Text(
              'Sistema de Asistencia',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),

            SizedBox(height: 8),

            Text(
              'Kiosk Biométrico',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w300,
                color: Colors.white.withOpacity(0.9),
              ),
            ),

            SizedBox(height: 50),

            // Loading indicator
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
