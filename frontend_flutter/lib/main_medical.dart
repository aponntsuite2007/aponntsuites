/*
 * 🏥 MEDICAL APP - MAIN ENTRY POINT
 * ==================================
 * Entry point para la APK del PROFESIONAL MÉDICO
 *
 * Compilar con:
 *   flutter build apk --target=lib/main_medical.dart
 *
 * Fecha: 2025-12-08
 * Versión: 2.0.0
 */

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'services/config_service.dart';
import 'screens/medical/medical_panel_screen.dart';
import 'screens/login_screen.dart';
import 'screens/config_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Configurar orientación preferida (permitir landscape para tablets)
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  final prefs = await SharedPreferences.getInstance();
  runApp(MedicalApp(prefs: prefs));
}

class MedicalApp extends StatelessWidget {
  final SharedPreferences prefs;

  const MedicalApp({Key? key, required this.prefs}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => MedicalAppProvider(prefs),
      child: MaterialApp(
        title: 'Panel Médico - Sistema de Asistencia',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.teal,
          primaryColor: const Color(0xFF00796B),
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF00796B),
            brightness: Brightness.light,
          ),
          visualDensity: VisualDensity.adaptivePlatformDensity,
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF00796B),
            foregroundColor: Colors.white,
            elevation: 2,
          ),
          cardTheme: const CardThemeData(
            elevation: 2,
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          tabBarTheme: const TabBarThemeData(
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white70,
            indicatorColor: Colors.white,
          ),
        ),
        home: MedicalStartupScreen(),
      ),
    );
  }
}

/// Provider específico para la App Médica
class MedicalAppProvider with ChangeNotifier {
  final SharedPreferences _prefs;

  String? _serverUrl;
  String? _companyId;
  String? _authToken;
  String? _doctorId;
  String? _doctorName;
  String? _specialty;

  MedicalAppProvider(this._prefs) {
    _loadConfig();
  }

  String? get serverUrl => _serverUrl;
  String? get companyId => _companyId;
  String? get authToken => _authToken;
  String? get doctorId => _doctorId;
  String? get doctorName => _doctorName;
  String? get specialty => _specialty;

  bool get isConfigured => _prefs.getBool('config_is_configured') ?? false;
  bool get isAuthenticated => _authToken != null && _companyId != null;

  void _loadConfig() {
    _serverUrl = _prefs.getString('server_url');
    _companyId = _prefs.getString('config_company_id');
    _authToken = _prefs.getString('auth_token');
    _doctorId = _prefs.getString('doctor_id');
    _doctorName = _prefs.getString('doctor_name');
    _specialty = _prefs.getString('doctor_specialty');
    notifyListeners();
  }

  Future<void> setDoctorData({
    required String doctorId,
    required String doctorName,
    String? specialty,
  }) async {
    await _prefs.setString('doctor_id', doctorId);
    await _prefs.setString('doctor_name', doctorName);
    if (specialty != null) {
      await _prefs.setString('doctor_specialty', specialty);
    }
    _doctorId = doctorId;
    _doctorName = doctorName;
    _specialty = specialty;
    notifyListeners();
  }

  Future<void> logout() async {
    await _prefs.remove('auth_token');
    await _prefs.remove('doctor_id');
    await _prefs.remove('doctor_name');
    await _prefs.remove('doctor_specialty');
    _authToken = null;
    _doctorId = null;
    _doctorName = null;
    _specialty = null;
    notifyListeners();
  }
}

/// Pantalla de inicio - Decide si mostrar configuración, login o panel médico
class MedicalStartupScreen extends StatefulWidget {
  @override
  _MedicalStartupScreenState createState() => _MedicalStartupScreenState();
}

class _MedicalStartupScreenState extends State<MedicalStartupScreen> {
  @override
  void initState() {
    super.initState();
    _checkConfigurationAndNavigate();
  }

  Future<void> _checkConfigurationAndNavigate() async {
    await Future.delayed(const Duration(milliseconds: 1500));

    try {
      final prefs = await SharedPreferences.getInstance();

      // 1. Verificar si hay servidor configurado
      final isConfigured = await ConfigService.isConfigured();

      if (!isConfigured) {
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
        if (mounted) {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => NewLoginScreen()),
          );
        }
        return;
      }

      // 3. Si tiene todo, ir al panel médico
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => MedicalPanelScreen()),
        );
      }

    } catch (e) {
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
      backgroundColor: const Color(0xFF00796B),
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
                    color: Colors.black.withValues(alpha: 0.1),
                    spreadRadius: 5,
                    blurRadius: 15,
                  ),
                ],
              ),
              child: const Icon(
                Icons.local_hospital_outlined,
                size: 60,
                color: Color(0xFF00796B),
              ),
            ),

            const SizedBox(height: 30),

            // App name
            const Text(
              'Panel Médico',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              'Sistema de Salud Ocupacional',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w300,
                color: Colors.white.withValues(alpha: 0.9),
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
              'Iniciando...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withValues(alpha: 0.8),
              ),
            ),

            const SizedBox(height: 100),

            Text(
              'v2.0.0 - Medical Pro',
              style: TextStyle(
                fontSize: 12,
                color: Colors.white.withValues(alpha: 0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
