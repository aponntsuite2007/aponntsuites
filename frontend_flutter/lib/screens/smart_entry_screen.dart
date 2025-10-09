import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/platform_detector.dart';
import 'attendance/attendance_kiosk_screen.dart';
import 'auth/login_screen.dart';
import '../config/theme.dart';

/// Pantalla inteligente que decide automáticamente entre modo kiosko o login admin
class SmartEntryScreen extends StatefulWidget {
  @override
  _SmartEntryScreenState createState() => _SmartEntryScreenState();
}

class _SmartEntryScreenState extends State<SmartEntryScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  bool _showModeSelection = false;
  String _detectedDevice = '';
  
  @override
  void initState() {
    super.initState();
    _initializeAnimation();
    _detectDeviceAndNavigate();
  }
  
  void _initializeAnimation() {
    _animationController = AnimationController(
      duration: Duration(milliseconds: 1500),
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
  
  void _detectDeviceAndNavigate() {
    // Dar tiempo para que se establezca el contexto
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _performDetection();
    });
  }
  
  void _performDetection() {
    final deviceType = context.deviceType;
    final shouldUseKiosk = context.shouldUseKioskMode;
    final shouldShowAdmin = context.shouldShowAdminMode;
    
    setState(() {
      _detectedDevice = _getDeviceDescription(deviceType);
    });
    
    // Auto-navegar después de 2 segundos, o mostrar selección manual
    Future.delayed(Duration(seconds: 2), () {
      if (mounted) {
        if (shouldUseKiosk && !shouldShowAdmin) {
          // Ir directo al kiosko
          _navigateToKiosk();
        } else if (shouldShowAdmin && !shouldUseKiosk) {
          // Ir directo al login admin
          _navigateToAdmin();
        } else {
          // Mostrar selección manual
          _showModeSelectionDialog();
        }
      }
    });
  }
  
  String _getDeviceDescription(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.mobile:
        return 'Móvil detectado';
      case DeviceType.tablet:
        return 'Tablet detectado';
      case DeviceType.desktop:
        return 'Escritorio detectado';
      case DeviceType.web:
        return 'Navegador web detectado';
      case DeviceType.unknown:
      default:
        return 'Dispositivo detectado';
    }
  }
  
  void _navigateToKiosk() {
    Navigator.of(context).pushReplacementNamed('/kiosk');
  }
  
  void _navigateToAdmin() {
    Navigator.of(context).pushReplacementNamed('/login');
  }
  
  void _showModeSelectionDialog() {
    setState(() {
      _showModeSelection = true;
    });
  }
  
  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: AnimatedBuilder(
        animation: _fadeAnimation,
        builder: (context, child) {
          return Opacity(
            opacity: _fadeAnimation.value,
            child: _showModeSelection
                ? _buildModeSelection()
                : _buildDetectionScreen(),
          );
        },
      ),
    );
  }
  
  Widget _buildDetectionScreen() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primaryColor, AppTheme.accentColor],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.3),
                    blurRadius: 20,
                    offset: Offset(0, 10),
                  ),
                ],
              ),
              child: Icon(
                Icons.fingerprint,
                size: 60,
                color: AppTheme.primaryColor,
              ),
            ),
            
            SizedBox(height: 40),
            
            // Título
            Text(
              'APONNT',
              style: TextStyle(
                fontSize: 48,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 2,
              ),
            ),
            
            SizedBox(height: 8),
            
            Text(
              'Sistema de Asistencia Biométrico',
              style: TextStyle(
                fontSize: 18,
                color: Colors.white70,
                letterSpacing: 1,
              ),
            ),
            
            SizedBox(height: 60),
            
            // Indicador de carga
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
              strokeWidth: 3,
            ),
            
            SizedBox(height: 24),
            
            // Estado de detección
            Text(
              _detectedDevice,
              style: TextStyle(
                fontSize: 16,
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
            
            SizedBox(height: 8),
            
            Text(
              'Configurando interfaz...',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white70,
              ),
            ),
            
            SizedBox(height: 40),
            
            // Botón manual (aparece después de 3 segundos)
            FutureBuilder(
              future: Future.delayed(Duration(seconds: 3)),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.done) {
                  return TextButton(
                    onPressed: _showModeSelectionDialog,
                    child: Text(
                      'Seleccionar modo manualmente',
                      style: TextStyle(
                        color: Colors.white70,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  );
                }
                return SizedBox.shrink();
              },
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildModeSelection() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.backgroundLight, AppTheme.surfaceLight],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Column(
            children: [
              // Header
              Text(
                'Seleccionar Modo',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textPrimary,
                ),
              ),
              
              SizedBox(height: 8),
              
              Text(
                'Elige cómo deseas usar la aplicación',
                style: TextStyle(
                  fontSize: 16,
                  color: AppTheme.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              
              SizedBox(height: 40),
              
              // Opciones
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildModeCard(
                      title: 'Modo Kiosko',
                      subtitle: 'Para marcar asistencia de empleados',
                      description: 'Pantalla simplificada para registro de entrada y salida',
                      icon: Icons.access_time,
                      color: AppTheme.primaryColor,
                      onTap: _navigateToKiosk,
                      features: [
                        'Autenticación biométrica',
                        'Escaneo de código QR',
                        'Entrada con PIN',
                        'Interfaz simplificada',
                      ],
                    ),
                    
                    SizedBox(height: 24),
                    
                    _buildModeCard(
                      title: 'Modo Administrador',
                      subtitle: 'Para gestión y configuración',
                      description: 'Panel completo de administración del sistema',
                      icon: Icons.admin_panel_settings,
                      color: AppTheme.accentColor,
                      onTap: _navigateToAdmin,
                      features: [
                        'Gestión de usuarios',
                        'Reportes y estadísticas',
                        'Configuración del sistema',
                        'Panel de administración',
                      ],
                    ),
                  ],
                ),
              ),
              
              // Footer con info del dispositivo
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.surfaceLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: AppTheme.primaryColor.withOpacity(0.2),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _getDeviceIcon(context.deviceType),
                      color: AppTheme.primaryColor,
                      size: 24,
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _detectedDevice,
                            style: TextStyle(
                              fontWeight: FontWeight.w500,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          Text(
                            'Puedes cambiar de modo en cualquier momento',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildModeCard({
    required String title,
    required String subtitle,
    required String description,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required List<String> features,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.2),
              blurRadius: 10,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    icon,
                    size: 30,
                    color: color,
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            
            SizedBox(height: 16),
            
            Text(
              description,
              style: TextStyle(
                fontSize: 16,
                color: AppTheme.textPrimary,
              ),
            ),
            
            SizedBox(height: 12),
            
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: features.map((feature) => Container(
                padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  feature,
                  style: TextStyle(
                    fontSize: 12,
                    color: color,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              )).toList(),
            ),
          ],
        ),
      ),
    );
  }
  
  IconData _getDeviceIcon(DeviceType deviceType) {
    switch (deviceType) {
      case DeviceType.mobile:
        return Icons.smartphone;
      case DeviceType.tablet:
        return Icons.tablet_android;
      case DeviceType.desktop:
        return Icons.computer;
      case DeviceType.web:
        return Icons.web;
      case DeviceType.unknown:
      default:
        return Icons.device_unknown;
    }
  }
}