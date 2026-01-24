import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'kiosk_screen.dart';
import 'fingerprint_kiosk_screen.dart';
import 'fingerprint_enrollment_screen.dart';
import 'kiosk_setup_screen.dart';
import '../services/config_service.dart';

/// 🔐 SELECTOR DE MÉTODO BIOMÉTRICO
/// =================================
/// Pantalla inicial del kiosk que permite seleccionar:
/// - Reconocimiento facial (predeterminado)
/// - Huella dactilar
/// - Código QR (futuro)
/// - Contraseña (futuro)

class BiometricSelectorScreen extends StatefulWidget {
  @override
  _BiometricSelectorScreenState createState() => _BiometricSelectorScreenState();
}

class _BiometricSelectorScreenState extends State<BiometricSelectorScreen> with SingleTickerProviderStateMixin {
  final LocalAuthentication _localAuth = LocalAuthentication();
  final FlutterTts _tts = FlutterTts();

  bool _hasFingerprintSensor = false;
  bool _isCheckingCapabilities = true;

  // Info del kiosko configurado
  String? _kioskName;
  String? _companyName;

  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _initializeTts();
    _checkBiometricCapabilities();
    _initializeAnimations();
    _loadKioskInfo();
  }

  Future<void> _loadKioskInfo() async {
    final config = await ConfigService.getKioskConfig();
    if (mounted) {
      setState(() {
        _kioskName = config['kioskName'];
        _companyName = config['companyName'];
      });
    }
  }

  void _initializeAnimations() {
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeIn),
    );

    _animationController.forward();
  }

  Future<void> _initializeTts() async {
    await _tts.setLanguage('es-ES');
    await _tts.setSpeechRate(0.8);
    await _tts.setVolume(1.0);
  }

  Future<void> _speak(String message) async {
    await _tts.speak(message);
  }

  Future<void> _checkBiometricCapabilities() async {
    try {
      final canCheckBiometrics = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      final availableBiometrics = await _localAuth.getAvailableBiometrics();

      print('🔍 [SELECTOR] canCheck: $canCheckBiometrics, deviceSupported: $isDeviceSupported, available: $availableBiometrics');

      setState(() {
        // Android moderno reporta BiometricType.strong/weak en lugar de .fingerprint
        _hasFingerprintSensor = (canCheckBiometrics || isDeviceSupported) &&
            (availableBiometrics.contains(BiometricType.fingerprint) ||
             availableBiometrics.contains(BiometricType.strong) ||
             availableBiometrics.contains(BiometricType.weak));
        _isCheckingCapabilities = false;
      });

      await Future.delayed(Duration(milliseconds: 500));
      await _speak('Seleccione su método de autenticación biométrica preferido');

    } catch (e) {
      print('❌ [SELECTOR] Error verificando capacidades: $e');
      setState(() {
        _hasFingerprintSensor = false;
        _isCheckingCapabilities = false;
      });
    }
  }

  void _navigateToFacialRecognition() {
    _speak('Reconocimiento facial seleccionado');
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => KioskScreen()),
    );
  }

  void _navigateToFingerprint() async {
    await _speak('Autenticación por huella dactilar seleccionada');
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => FingerprintKioskScreen()),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    _tts.stop();
    super.dispose();
  }

  // Mostrar diálogo de login de admin para acceder a configuración
  void _showAdminLoginDialog() {
    final usernameController = TextEditingController();
    final passwordController = TextEditingController();
    bool isLoading = false;
    String? errorMessage;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Row(
            children: [
              Icon(Icons.admin_panel_settings, color: Colors.blue[700]),
              const SizedBox(width: 8),
              const Text('Acceso Administrador'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Ingrese credenciales de administrador para modificar la configuración del kiosko.',
                style: TextStyle(color: Colors.grey[600], fontSize: 14),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: usernameController,
                decoration: const InputDecoration(
                  labelText: 'Usuario',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Contraseña',
                  prefixIcon: Icon(Icons.lock),
                  border: OutlineInputBorder(),
                ),
              ),
              if (errorMessage != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error, color: Colors.red[700], size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          errorMessage!,
                          style: TextStyle(color: Colors.red[700], fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: isLoading
                  ? null
                  : () async {
                      if (usernameController.text.isEmpty || passwordController.text.isEmpty) {
                        setDialogState(() => errorMessage = 'Complete todos los campos');
                        return;
                      }

                      setDialogState(() {
                        isLoading = true;
                        errorMessage = null;
                      });

                      // Obtener company_id actual
                      final config = await ConfigService.getKioskConfig();
                      final companyId = config['companyId'];

                      if (companyId == null) {
                        setDialogState(() {
                          isLoading = false;
                          errorMessage = 'No hay empresa configurada';
                        });
                        return;
                      }

                      // Validar credenciales de admin
                      final result = await ConfigService.validateAdminCredentials(
                        companyId: companyId,
                        username: usernameController.text,
                        password: passwordController.text,
                      );

                      if (result?['success'] == true) {
                        Navigator.pop(context);
                        // Navegar a pantalla de configuración en modo edición
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const KioskSetupScreen(isEditMode: true),
                          ),
                        );
                      } else {
                        setDialogState(() {
                          isLoading = false;
                          errorMessage = result?['error'] ?? 'Error de autenticación';
                        });
                      }
                    },
              child: isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Ingresar'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF0D47A1),
              Color(0xFF1976D2),
              Color(0xFF2196F3),
            ],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              _isCheckingCapabilities
                  ? _buildLoadingScreen()
                  : _buildSelectorScreen(),

              // Botón de configuración (esquina superior derecha)
              Positioned(
                top: 8,
                right: 8,
                child: IconButton(
                  icon: const Icon(Icons.settings, color: Colors.white70, size: 28),
                  onPressed: _showAdminLoginDialog,
                  tooltip: 'Configuración (Admin)',
                ),
              ),

              // Info del kiosko (esquina superior izquierda)
              if (_kioskName != null || _companyName != null)
                Positioned(
                  top: 12,
                  left: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.storefront, color: Colors.white70, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          _kioskName ?? 'Kiosko',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (_companyName != null) ...[
                          const Text(' | ', style: TextStyle(color: Colors.white54)),
                          Text(
                            _companyName!,
                            style: const TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            strokeWidth: 3,
          ),
          SizedBox(height: 24),
          Text(
            'Verificando capacidades biométricas...',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelectorScreen() {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          children: [
            SizedBox(height: 40),

            // Logo y título
            Icon(
              Icons.security,
              size: 80,
              color: Colors.white,
            ),
            SizedBox(height: 24),
            Text(
              'Sistema de Asistencia',
              style: TextStyle(
                color: Colors.white,
                fontSize: 32,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Seleccione su método de autenticación',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 18,
              ),
            ),

            SizedBox(height: 60),

            // Opciones de autenticación
            Expanded(
              child: ListView(
                children: [
                  // Reconocimiento Facial
                  _buildBiometricOption(
                    icon: Icons.face,
                    title: 'Reconocimiento Facial',
                    subtitle: 'Autenticación rápida con cámara',
                    color: Colors.blue,
                    onTap: _navigateToFacialRecognition,
                    available: true,
                  ),

                  SizedBox(height: 20),

                  // Huella Dactilar
                  _buildBiometricOption(
                    icon: Icons.fingerprint,
                    title: 'Huella Dactilar',
                    subtitle: _hasFingerprintSensor
                        ? 'Autenticación con sensor de huella'
                        : 'Sensor no disponible en este dispositivo',
                    color: Colors.green,
                    onTap: _hasFingerprintSensor ? _navigateToFingerprint : null,
                    available: _hasFingerprintSensor,
                  ),

                  SizedBox(height: 20),

                  // Código QR (deshabilitado por ahora)
                  _buildBiometricOption(
                    icon: Icons.qr_code_scanner,
                    title: 'Código QR',
                    subtitle: 'Próximamente disponible',
                    color: Colors.orange,
                    onTap: null,
                    available: false,
                  ),

                  SizedBox(height: 20),

                  // Contraseña (deshabilitado por ahora)
                  _buildBiometricOption(
                    icon: Icons.password,
                    title: 'Contraseña',
                    subtitle: 'Próximamente disponible',
                    color: Colors.purple,
                    onTap: null,
                    available: false,
                  ),
                ],
              ),
            ),

            SizedBox(height: 20),

            // Footer
            Text(
              'v2.0.0 - Sistema Biométrico Avanzado',
              style: TextStyle(
                color: Colors.white54,
                fontSize: 14,
              ),
            ),
            SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildBiometricOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback? onTap,
    required bool available,
  }) {
    return InkWell(
      onTap: available ? onTap : null,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: available ? Colors.white : Colors.white24,
          borderRadius: BorderRadius.circular(20),
          boxShadow: available
              ? [
                  BoxShadow(
                    color: color.withOpacity(0.3),
                    blurRadius: 15,
                    offset: Offset(0, 5),
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(
                color: available ? color.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 40,
                color: available ? color : Colors.grey,
              ),
            ),
            SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: available ? Colors.black87 : Colors.grey,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: available ? Colors.black54 : Colors.grey,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            if (available)
              Icon(
                Icons.arrow_forward_ios,
                color: color,
                size: 24,
              ),
          ],
        ),
      ),
    );
  }
}
