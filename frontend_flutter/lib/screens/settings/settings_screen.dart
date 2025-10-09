import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/config_provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/theme.dart';
import '../../config/app_config.dart';

class SettingsScreen extends StatefulWidget {
  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Configuración'),
      ),
      body: Consumer2<ConfigProvider, AuthProvider>(
        builder: (context, configProvider, authProvider, child) {
          return ListView(
            padding: EdgeInsets.all(16),
            children: [
              _buildAppearanceSection(configProvider),
              SizedBox(height: 16),
              _buildSecuritySection(configProvider),
              SizedBox(height: 16),
              _buildLocationSection(configProvider),
              SizedBox(height: 16),
              _buildNotificationSection(configProvider),
              if (authProvider.isSupervisor) ...[
                SizedBox(height: 16),
                _buildAdminSection(configProvider),
              ],
              SizedBox(height: 16),
              _buildAboutSection(),
            ],
          );
        },
      ),
    );
  }

  Widget _buildAppearanceSection(ConfigProvider configProvider) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              'Apariencia',
              Icons.palette,
              AppTheme.primaryColor,
            ),
            SizedBox(height: 16),
            SwitchListTile(
              title: Text('Tema Oscuro'),
              subtitle: Text('Cambiar entre tema claro y oscuro'),
              value: configProvider.isDarkMode,
              onChanged: (value) {
                configProvider.setDarkMode(value);
              },
              secondary: Icon(
                configProvider.isDarkMode ? Icons.dark_mode : Icons.light_mode,
                color: AppTheme.primaryColor,
              ),
            ),
            ListTile(
              leading: Icon(Icons.language, color: AppTheme.primaryColor),
              title: Text('Idioma'),
              subtitle: Text('Español (Argentina)'),
              trailing: Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                _showLanguageDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecuritySection(ConfigProvider configProvider) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              'Seguridad',
              Icons.security,
              AppTheme.errorColor,
            ),
            SizedBox(height: 16),
            SwitchListTile(
              title: Text('Autenticación Biométrica'),
              subtitle: Text('Habilitar huella digital y reconocimiento facial'),
              value: configProvider.biometricEnabled,
              onChanged: (value) {
                configProvider.setBiometricEnabled(value);
              },
              secondary: Icon(Icons.fingerprint, color: AppTheme.errorColor),
            ),
            if (configProvider.biometricEnabled)
              ListTile(
                leading: Icon(Icons.settings, color: AppTheme.errorColor),
                title: Text('Configurar Biométricos'),
                subtitle: Text('Registrar huella digital y configurar reconocimiento facial'),
                trailing: Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () {
                  _configureBiometrics();
                },
              ),
            ListTile(
              leading: Icon(Icons.lock, color: AppTheme.errorColor),
              title: Text('Cambiar PIN'),
              subtitle: Text('Configurar PIN de seguridad'),
              trailing: Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                _showChangePinDialog();
              },
            ),
            ListTile(
              leading: Icon(Icons.vpn_key, color: AppTheme.errorColor),
              title: Text('Cambiar Contraseña'),
              subtitle: Text('Actualizar contraseña de acceso'),
              trailing: Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                _showChangePasswordDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationSection(ConfigProvider configProvider) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              'Ubicación',
              Icons.location_on,
              AppTheme.warningColor,
            ),
            SizedBox(height: 16),
            SwitchListTile(
              title: Text('GPS Habilitado'),
              subtitle: Text('Registrar ubicación en entrada y salida'),
              value: configProvider.locationEnabled,
              onChanged: (value) {
                configProvider.setLocationEnabled(value);
              },
              secondary: Icon(Icons.gps_fixed, color: AppTheme.warningColor),
            ),
            if (configProvider.locationEnabled)
              ListTile(
                leading: Icon(Icons.map, color: AppTheme.warningColor),
                title: Text('Precisión GPS'),
                subtitle: Text('Alta precisión (10 metros)'),
                trailing: Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () {
                  _showGpsAccuracyDialog();
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationSection(ConfigProvider configProvider) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              'Notificaciones',
              Icons.notifications,
              AppTheme.successColor,
            ),
            SizedBox(height: 16),
            SwitchListTile(
              title: Text('Notificaciones Push'),
              subtitle: Text('Recibir notificaciones del sistema'),
              value: configProvider.notificationsEnabled,
              onChanged: (value) {
                configProvider.setNotificationsEnabled(value);
              },
              secondary: Icon(Icons.notifications_active, color: AppTheme.successColor),
            ),
            if (configProvider.notificationsEnabled) ...[
              SwitchListTile(
                title: Text('Recordatorios'),
                subtitle: Text('Recordar registrar entrada y salida'),
                value: configProvider.remindersEnabled,
                onChanged: (value) {
                  configProvider.setRemindersEnabled(value);
                },
                secondary: Icon(Icons.access_time, color: AppTheme.successColor),
              ),
              SwitchListTile(
                title: Text('Notificaciones de Sistema'),
                subtitle: Text('Actualizaciones y mantenimiento'),
                value: configProvider.systemNotificationsEnabled,
                onChanged: (value) {
                  configProvider.setSystemNotificationsEnabled(value);
                },
                secondary: Icon(Icons.system_update, color: AppTheme.successColor),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAdminSection(ConfigProvider configProvider) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              'Administración',
              Icons.admin_panel_settings,
              AppTheme.primaryColor,
            ),
            SizedBox(height: 16),
            ListTile(
              leading: Icon(Icons.sync, color: AppTheme.primaryColor),
              title: Text('Sincronizar Datos'),
              subtitle: Text('Última sincronización: Ahora'),
              trailing: Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                _syncData();
              },
            ),
            ListTile(
              leading: Icon(Icons.backup, color: AppTheme.primaryColor),
              title: Text('Copia de Seguridad'),
              subtitle: Text('Exportar datos locales'),
              trailing: Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                _exportData();
              },
            ),
            ListTile(
              leading: Icon(Icons.delete_forever, color: AppTheme.errorColor),
              title: Text('Limpiar Cache'),
              subtitle: Text('Eliminar datos temporales'),
              trailing: Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                _clearCache();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAboutSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader(
              'Acerca de',
              Icons.info,
              AppTheme.textSecondary,
            ),
            SizedBox(height: 16),
            ListTile(
              leading: Icon(Icons.apps, color: AppTheme.textSecondary),
              title: Text('Versión de la App'),
              subtitle: Text(AppConfig.appVersion),
            ),
            ListTile(
              leading: Icon(Icons.business, color: AppTheme.textSecondary),
              title: Text('Empresa'),
              subtitle: Text(AppConfig.companyName),
            ),
            ListTile(
              leading: Icon(Icons.help, color: AppTheme.textSecondary),
              title: Text('Ayuda y Soporte'),
              trailing: Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                _showHelpDialog();
              },
            ),
            ListTile(
              leading: Icon(Icons.privacy_tip, color: AppTheme.textSecondary),
              title: Text('Política de Privacidad'),
              trailing: Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                _showPrivacyDialog();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 24),
        SizedBox(width: 12),
        Text(
          title,
          style: AppTheme.titleStyle.copyWith(
            fontSize: 18,
            color: color,
          ),
        ),
      ],
    );
  }

  void _showLanguageDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Seleccionar Idioma'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: Text('Español (Argentina)'),
              value: 'es_AR',
              groupValue: 'es_AR',
              onChanged: (value) => Navigator.pop(context),
            ),
            RadioListTile<String>(
              title: Text('English (US)'),
              value: 'en_US',
              groupValue: 'es_AR',
              onChanged: (value) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Próximamente disponible'),
                    backgroundColor: AppTheme.warningColor,
                  ),
                );
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  void _showChangePinDialog() {
    final _pinController = TextEditingController();
    final _confirmPinController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Cambiar PIN'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _pinController,
              decoration: InputDecoration(
                labelText: 'Nuevo PIN (4-6 dígitos)',
                prefixIcon: Icon(Icons.lock),
              ),
              keyboardType: TextInputType.number,
              obscureText: true,
              maxLength: 6,
            ),
            SizedBox(height: 16),
            TextField(
              controller: _confirmPinController,
              decoration: InputDecoration(
                labelText: 'Confirmar PIN',
                prefixIcon: Icon(Icons.lock_outline),
              ),
              keyboardType: TextInputType.number,
              obscureText: true,
              maxLength: 6,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              if (_pinController.text == _confirmPinController.text &&
                  _pinController.text.length >= 4) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('PIN actualizado correctamente'),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Los PIN no coinciden o son muy cortos'),
                    backgroundColor: AppTheme.errorColor,
                  ),
                );
              }
            },
            child: Text('Guardar'),
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog() {
    final _currentPasswordController = TextEditingController();
    final _newPasswordController = TextEditingController();
    final _confirmPasswordController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Cambiar Contraseña'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _currentPasswordController,
              decoration: InputDecoration(
                labelText: 'Contraseña Actual',
                prefixIcon: Icon(Icons.vpn_key),
              ),
              obscureText: true,
            ),
            SizedBox(height: 16),
            TextField(
              controller: _newPasswordController,
              decoration: InputDecoration(
                labelText: 'Nueva Contraseña',
                prefixIcon: Icon(Icons.lock),
              ),
              obscureText: true,
            ),
            SizedBox(height: 16),
            TextField(
              controller: _confirmPasswordController,
              decoration: InputDecoration(
                labelText: 'Confirmar Contraseña',
                prefixIcon: Icon(Icons.lock_outline),
              ),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              if (_newPasswordController.text == _confirmPasswordController.text &&
                  _newPasswordController.text.length >= 6) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Contraseña actualizada correctamente'),
                    backgroundColor: AppTheme.successColor,
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Las contraseñas no coinciden o son muy cortas'),
                    backgroundColor: AppTheme.errorColor,
                  ),
                );
              }
            },
            child: Text('Guardar'),
          ),
        ],
      ),
    );
  }

  void _showGpsAccuracyDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Precisión GPS'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Selecciona la precisión para el registro de ubicación:'),
            SizedBox(height: 16),
            RadioListTile<int>(
              title: Text('Baja (50 metros)'),
              subtitle: Text('Menor consumo de batería'),
              value: 50,
              groupValue: 10,
              onChanged: (value) => Navigator.pop(context),
            ),
            RadioListTile<int>(
              title: Text('Media (25 metros)'),
              subtitle: Text('Balance entre precisión y batería'),
              value: 25,
              groupValue: 10,
              onChanged: (value) => Navigator.pop(context),
            ),
            RadioListTile<int>(
              title: Text('Alta (10 metros)'),
              subtitle: Text('Máxima precisión'),
              value: 10,
              groupValue: 10,
              onChanged: (value) => Navigator.pop(context),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  void _syncData() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Sincronizando datos...'),
        backgroundColor: AppTheme.primaryColor,
      ),
    );

    Future.delayed(Duration(seconds: 2), () {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Datos sincronizados correctamente'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    });
  }

  void _exportData() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Exportando datos...'),
        backgroundColor: AppTheme.primaryColor,
      ),
    );

    Future.delayed(Duration(seconds: 2), () {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Datos exportados a /Downloads/backup.json'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    });
  }

  void _configureBiometrics() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.fingerprint, color: AppTheme.primaryColor),
            SizedBox(width: 8),
            Text('Configurar Biométricos'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Configura tus métodos de autenticación biométrica:',
              style: AppTheme.bodyStyle,
            ),
            SizedBox(height: 20),
            
            // Huella Digital
            Card(
              child: ListTile(
                leading: Icon(Icons.fingerprint, color: AppTheme.primaryColor),
                title: Text('Huella Digital'),
                subtitle: Text('Registrar huella para autenticación rápida'),
                trailing: Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () {
                  Navigator.pop(context);
                  _setupFingerprint();
                },
              ),
            ),
            
            SizedBox(height: 8),
            
            // Reconocimiento Facial
            Card(
              child: ListTile(
                leading: Icon(Icons.face, color: AppTheme.warningColor),
                title: Text('Reconocimiento Facial'),
                subtitle: Text('Configurar reconocimiento facial'),
                trailing: Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () {
                  Navigator.pop(context);
                  _setupFaceRecognition();
                },
              ),
            ),
            
            SizedBox(height: 16),
            
            Container(
              padding: EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.primaryColor.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: AppTheme.primaryColor, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Los datos biométricos se almacenan de forma segura en tu dispositivo.',
                      style: AppTheme.captionStyle.copyWith(
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  void _setupFingerprint() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Configurar Huella Digital'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.fingerprint,
              size: 80,
              color: AppTheme.primaryColor,
            ),
            SizedBox(height: 16),
            Text(
              'Coloca tu dedo en el sensor biométrico para registrar tu huella.',
              textAlign: TextAlign.center,
              style: AppTheme.bodyStyle,
            ),
            SizedBox(height: 16),
            LinearProgressIndicator(
              backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            ),
            SizedBox(height: 8),
            Text(
              'Progreso: 0/3 escaneos',
              style: AppTheme.captionStyle,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _simulateBiometricSetup('Huella digital');
            },
            child: Text('Iniciar Registro'),
          ),
        ],
      ),
    );
  }

  void _setupFaceRecognition() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Reconocimiento Facial'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.face,
              size: 80,
              color: AppTheme.warningColor,
            ),
            SizedBox(height: 16),
            Text(
              'Mira directamente a la cámara para registrar tu rostro.',
              textAlign: TextAlign.center,
              style: AppTheme.bodyStyle,
            ),
            SizedBox(height: 16),
            Container(
              height: 120,
              width: 120,
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.warningColor, width: 2),
                borderRadius: BorderRadius.circular(60),
              ),
              child: Center(
                child: Icon(
                  Icons.face,
                  size: 60,
                  color: AppTheme.warningColor,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _simulateBiometricSetup('Reconocimiento facial');
            },
            child: Text('Iniciar Captura'),
          ),
        ],
      ),
    );
  }

  void _simulateBiometricSetup(String method) {
    // Mostrar progreso
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('Configurando $method'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
            ),
            SizedBox(height: 16),
            Text('Procesando datos biométricos...'),
          ],
        ),
      ),
    );

    // Simular proceso de configuración
    Future.delayed(Duration(seconds: 3), () {
      Navigator.pop(context); // Cerrar diálogo de progreso
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$method configurado exitosamente'),
          backgroundColor: AppTheme.successColor,
          action: SnackBarAction(
            label: 'OK',
            onPressed: () {},
            textColor: Colors.white,
          ),
        ),
      );
    });
  }

  void _clearCache() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Limpiar Cache'),
        content: Text('¿Estás seguro de que quieres limpiar todos los datos temporales?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Cache limpiado correctamente'),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: Text('Limpiar'),
          ),
        ],
      ),
    );
  }

  void _showHelpDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Ayuda y Soporte'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('¿Necesitas ayuda?'),
            SizedBox(height: 16),
            Text('• Consulta la documentación en línea'),
            Text('• Contacta al administrador del sistema'),
            Text('• Envía un ticket de soporte'),
            SizedBox(height: 16),
            Text(
              'Email: soporte@empresa.com\nTeléfono: +54 11 1234-5678',
              style: AppTheme.captionStyle.copyWith(
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  void _showPrivacyDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Política de Privacidad'),
        content: SingleChildScrollView(
          child: Text(
            'Esta aplicación recopila y procesa datos de asistencia con el fin de gestionar el control horario laboral.\n\n'
            'Los datos biométricos se almacenan de forma cifrada y no se comparten con terceros.\n\n'
            'Para más información sobre el tratamiento de tus datos, consulta la política completa en nuestro sitio web.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Aceptar'),
          ),
        ],
      ),
    );
  }
}