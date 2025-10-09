import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:local_auth/local_auth.dart';
import '../../providers/smart_auth_provider.dart';
import '../config/smart_server_config_screen.dart';
import '../../config/app_config.dart';

class SmartLoginScreen extends StatefulWidget {
  @override
  _SmartLoginScreenState createState() => _SmartLoginScreenState();
}

class _SmartLoginScreenState extends State<SmartLoginScreen>
    with SingleTickerProviderStateMixin {
  final LocalAuthentication _localAuth = LocalAuthentication();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: Duration(milliseconds: 1000),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
    
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SmartAuthProvider>(
      builder: (context, auth, _) => Scaffold(
        backgroundColor: Colors.grey[100],
        appBar: AppBar(
          title: Text(AppConfig.appName),
          actions: [
            IconButton(
              icon: Icon(Icons.settings),
              tooltip: 'Configuración del servidor',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => SmartServerConfigScreen(),
                  ),
                );
              },
            ),
          ],
        ),
        body: FadeTransition(
          opacity: _fadeAnimation,
          child: SingleChildScrollView(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(height: 40),
                
                // Logo y título
                Card(
                  child: Container(
                    padding: EdgeInsets.all(32),
                    child: Column(
                      children: [
                        Icon(
                          Icons.fingerprint,
                          size: 80,
                          color: Colors.blue,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'Sistema de Asistencia',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Biométrico Inteligente',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),

                SizedBox(height: 32),

                // Estado de conexión
                Card(
                  color: auth.isConnected ? Colors.green.shade50 : Colors.orange.shade50,
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(
                          auth.isConnected ? Icons.wifi : Icons.wifi_off,
                          color: auth.isConnected ? Colors.green : Colors.orange,
                        ),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                auth.isConnected ? 'Conectado al servidor' : 'Sin conexión al servidor',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: auth.isConnected ? Colors.green[800] : Colors.orange[800],
                                ),
                              ),
                              if (auth.isConnected) ...[
                                Text(
                                  auth.serverInfo,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.green[600],
                                  ),
                                ),
                              ] else ...[
                                Text(
                                  auth.lastConnectionError ?? 'Verifica la configuración',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.orange[600],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        if (!auth.isConnected)
                          IconButton(
                            icon: Icon(Icons.refresh),
                            onPressed: () => auth.autoDetectAndConfigureServer(),
                            tooltip: 'Intentar reconectar',
                          ),
                      ],
                    ),
                  ),
                ),

                SizedBox(height: 24),

                // Formulario de login
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Iniciar Sesión',
                          style: Theme.of(context).textTheme.titleLarge,
                          textAlign: TextAlign.center,
                        ),
                        SizedBox(height: 24),
                        
                        TextField(
                          controller: _usernameController,
                          decoration: InputDecoration(
                            labelText: 'Usuario',
                            hintText: 'Ingresa tu usuario',
                            prefixIcon: Icon(Icons.person),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          enabled: !_isLoading,
                        ),
                        SizedBox(height: 16),
                        
                        TextField(
                          controller: _passwordController,
                          decoration: InputDecoration(
                            labelText: 'Contraseña',
                            hintText: 'Ingresa tu contraseña',
                            prefixIcon: Icon(Icons.lock),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          obscureText: true,
                          enabled: !_isLoading,
                          onSubmitted: (_) => _handleLogin(),
                        ),
                        SizedBox(height: 24),
                        
                        ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                            padding: EdgeInsets.symmetric(vertical: 16),
                            minimumSize: Size(double.infinity, 50),
                          ),
                          child: _isLoading
                              ? Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                      ),
                                    ),
                                    SizedBox(width: 12),
                                    Text('Iniciando sesión...'),
                                  ],
                                )
                              : Text('Iniciar Sesión'),
                        ),
                        
                        SizedBox(height: 16),
                        
                        OutlinedButton.icon(
                          onPressed: _isLoading ? null : _handleBiometricLogin,
                          icon: Icon(Icons.fingerprint),
                          label: Text('Acceso Biométrico'),
                          style: OutlinedButton.styleFrom(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            minimumSize: Size(double.infinity, 50),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                SizedBox(height: 24),

                // Botones de configuración rápida
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Configuración Rápida',
                          style: Theme.of(context).textTheme.titleMedium,
                          textAlign: TextAlign.center,
                        ),
                        SizedBox(height: 12),
                        
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _buildQuickConfigButton(
                              'Localhost',
                              Icons.computer,
                              () => auth.configureForLocalhost(),
                            ),
                            _buildQuickConfigButton(
                              'Auto-detectar',
                              Icons.search,
                              () => auth.autoDetectAndConfigureServer(),
                            ),
                            _buildQuickConfigButton(
                              'Config. Avanzada',
                              Icons.settings,
                              () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => SmartServerConfigScreen(),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),

                SizedBox(height: 24),

                // Información de la app
                Card(
                  color: Colors.grey.shade50,
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Text(
                          '${AppConfig.appName} v${AppConfig.appVersion}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        SizedBox(height: 4),
                        Text(
                          AppConfig.companyName,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQuickConfigButton(String label, IconData icon, VoidCallback onPressed) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 16),
      label: Text(label, style: TextStyle(fontSize: 12)),
      style: ElevatedButton.styleFrom(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        minimumSize: Size(0, 0),
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (_usernameController.text.isEmpty || _passwordController.text.isEmpty) {
      _showError('Por favor completa todos los campos');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final auth = Provider.of<SmartAuthProvider>(context, listen: false);
      final result = await auth.login(
        _usernameController.text.trim(),
        _passwordController.text,
      );

      if (result.success) {
        _showSuccess(result.message);
      } else {
        _showError(result.message);
      }
    } catch (e) {
      _showError('Error inesperado: $e');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleBiometricLogin() async {
    setState(() {
      _isLoading = true;
    });

    try {
      // Verificar disponibilidad de biometría
      final isAvailable = await _localAuth.canCheckBiometrics;
      if (!isAvailable) {
        _showError('Biometría no disponible en este dispositivo');
        return;
      }

      // Realizar autenticación biométrica
      final result = await _localAuth.authenticate(
        localizedReason: 'Usa tu biometría para acceder al sistema',
        options: AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: false,
        ),
      );

      if (result) {
        final auth = Provider.of<SmartAuthProvider>(context, listen: false);
        final loginResult = await auth.biometricLogin();
        
        if (loginResult.success) {
          _showSuccess(loginResult.message);
        } else {
          _showError(loginResult.message);
        }
      } else {
        _showError('Autenticación biométrica cancelada');
      }
    } catch (e) {
      _showError('Error en autenticación biométrica: ${e.toString()}');
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.error, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text(message)),
            ],
          ),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 4),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  void _showSuccess(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text(message)),
            ],
          ),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}