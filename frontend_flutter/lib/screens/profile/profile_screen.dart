import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../providers/auth_provider.dart';
import '../../models/user.dart';
import '../../config/theme.dart';
import '../../config/app_config.dart';
import '../../services/api_service.dart';
import '../../services/medical_notification_service.dart';

class ProfileScreen extends StatefulWidget {
  @override
  _ProfileScreenState createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _emergencyContactController = TextEditingController();
  final _emergencyPhoneController = TextEditingController();
  
  bool _isLoading = false;
  bool _isEditing = false;
  File? _selectedImage;
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  void _loadUserData() {
    final user = Provider.of<AuthProvider>(context, listen: false).currentUser;
    if (user != null) {
      _firstNameController.text = user.firstName;
      _lastNameController.text = user.lastName;
      _emailController.text = user.email;
      _phoneController.text = user.phone ?? '';
      _addressController.text = user.address ?? '';
      _emergencyContactController.text = user.emergencyContact ?? '';
      _emergencyPhoneController.text = user.emergencyPhone ?? '';
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _emergencyContactController.dispose();
    _emergencyPhoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Mi Perfil'),
        actions: [
          if (!_isEditing)
            IconButton(
              icon: Icon(Icons.edit),
              onPressed: () => setState(() => _isEditing = true),
            ),
          if (_isEditing) ...[
            IconButton(
              icon: Icon(Icons.check),
              onPressed: _saveProfile,
            ),
            IconButton(
              icon: Icon(Icons.close),
              onPressed: () {
                _loadUserData();
                setState(() => _isEditing = false);
              },
            ),
          ],
        ],
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          final user = authProvider.currentUser;
          if (user == null) {
            return Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            padding: EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _buildProfileHeader(user),
                  SizedBox(height: 24),
                  _buildPersonalInfoSection(),
                  SizedBox(height: 16),
                  _buildContactInfoSection(),
                  SizedBox(height: 16),
                  _buildEmergencyContactSection(),
                  SizedBox(height: 16),
                  _buildWorkInfoSection(user),
                  SizedBox(height: 16),
                  _buildDebugSection(),
                  if (_isLoading) ...[
                    SizedBox(height: 16),
                    Center(child: CircularProgressIndicator()),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildProfileHeader(User user) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          children: [
            Stack(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                  backgroundImage: _selectedImage != null
                      ? FileImage(_selectedImage!)
                      : (user.profilePhoto != null
                          ? NetworkImage(user.profilePhoto!)
                          : null) as ImageProvider?,
                  child: _selectedImage == null && user.profilePhoto == null
                      ? Icon(
                          Icons.person,
                          size: 50,
                          color: AppTheme.primaryColor,
                        )
                      : null,
                ),
                if (_isEditing)
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: CircleAvatar(
                      radius: 18,
                      backgroundColor: AppTheme.primaryColor,
                      child: IconButton(
                        icon: Icon(Icons.camera_alt, size: 16, color: Colors.white),
                        onPressed: _pickImage,
                      ),
                    ),
                  ),
              ],
            ),
            SizedBox(height: 16),
            Text(
              user.fullName,
              style: AppTheme.headingStyle.copyWith(fontSize: 24),
            ),
            Text(
              user.displayRole,
              style: AppTheme.subtitleStyle.copyWith(
                color: AppTheme.primaryColor,
              ),
            ),
            SizedBox(height: 8),
            Container(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: user.isActive ? AppTheme.successColor : AppTheme.errorColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                user.isActive ? 'Activo' : 'Inactivo',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPersonalInfoSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información Personal',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _firstNameController,
                    decoration: InputDecoration(
                      labelText: 'Nombre',
                      prefixIcon: Icon(Icons.person),
                    ),
                    enabled: _isEditing,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'El nombre es requerido';
                      }
                      return null;
                    },
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _lastNameController,
                    decoration: InputDecoration(
                      labelText: 'Apellido',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    enabled: _isEditing,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'El apellido es requerido';
                      }
                      return null;
                    },
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _emailController,
              decoration: InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email),
              ),
              enabled: false, // Email no se puede cambiar
              keyboardType: TextInputType.emailAddress,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactInfoSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información de Contacto',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _phoneController,
              decoration: InputDecoration(
                labelText: 'Teléfono',
                prefixIcon: Icon(Icons.phone),
              ),
              enabled: _isEditing,
              keyboardType: TextInputType.phone,
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _addressController,
              decoration: InputDecoration(
                labelText: 'Dirección',
                prefixIcon: Icon(Icons.location_on),
              ),
              enabled: _isEditing,
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmergencyContactSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Contacto de Emergencia',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _emergencyContactController,
              decoration: InputDecoration(
                labelText: 'Nombre del Contacto',
                prefixIcon: Icon(Icons.contact_emergency),
              ),
              enabled: _isEditing,
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _emergencyPhoneController,
              decoration: InputDecoration(
                labelText: 'Teléfono de Emergencia',
                prefixIcon: Icon(Icons.phone_in_talk),
              ),
              enabled: _isEditing,
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkInfoSection(User user) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información Laboral',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            _buildInfoRow('Legajo', user.legajo),
            _buildInfoRow('DNI', user.dni),
            _buildInfoRow('Empresa', user.company ?? 'No especificada'),
            _buildInfoRow('Posición', user.position ?? 'No especificada'),
            _buildInfoRow('Departamento', user.department ?? 'No especificado'),
            if (user.hireDate != null)
              _buildInfoRow('Fecha de Ingreso', '${user.hireDate!.day}/${user.hireDate!.month}/${user.hireDate!.year}'),
            if (user.lastLogin != null)
              _buildInfoRow('Último Acceso', '${user.lastLogin!.day}/${user.lastLogin!.month}/${user.lastLogin!.year}'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: AppTheme.bodyStyle.copyWith(
                fontWeight: FontWeight.w500,
                color: AppTheme.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTheme.bodyStyle,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDebugSection() {
    return Card(
      color: Colors.orange[50],
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.bug_report, color: Colors.orange[700]),
                SizedBox(width: 8),
                Text(
                  'Pruebas y Debug',
                  style: AppTheme.titleStyle.copyWith(
                    fontSize: 18,
                    color: Colors.orange[700],
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            Text(
              'Funciones de prueba para el sistema de notificaciones médicas',
              style: AppTheme.bodyStyle.copyWith(
                color: Colors.orange[600],
                fontSize: 12,
              ),
            ),
            SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ElevatedButton.icon(
                  onPressed: _testNotificationSound,
                  icon: Icon(Icons.volume_up, size: 16),
                  label: Text('Probar Sonido'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[600],
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    textStyle: TextStyle(fontSize: 12),
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _testMedicalNotification,
                  icon: Icon(Icons.medical_services, size: 16),
                  label: Text('Notif. Médica'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green[600],
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    textStyle: TextStyle(fontSize: 12),
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _testUrgentNotification,
                  icon: Icon(Icons.warning, size: 16),
                  label: Text('Notif. Urgente'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[600],
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    textStyle: TextStyle(fontSize: 12),
                  ),
                ),
                ElevatedButton.icon(
                  onPressed: _checkForNewRequests,
                  icon: Icon(Icons.refresh, size: 16),
                  label: Text('Verificar API'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple[600],
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    textStyle: TextStyle(fontSize: 12),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _testNotificationSound() async {
    final service = MedicalNotificationService();
    await service.testSounds();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('🔊 Prueba de sonido ejecutada'),
        backgroundColor: Colors.blue,
      ),
    );
  }

  Future<void> _testMedicalNotification() async {
    final service = MedicalNotificationService();
    await service.testNotification();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('📋 Notificación médica de prueba enviada'),
        backgroundColor: Colors.green,
      ),
    );
  }

  Future<void> _testUrgentNotification() async {
    final service = MedicalNotificationService();
    await service.testUrgentNotification();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('🚨 Notificación urgente de prueba enviada'),
        backgroundColor: Colors.red,
      ),
    );
  }

  Future<void> _checkForNewRequests() async {
    final service = MedicalNotificationService();
    await service.checkNow();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('🔄 Verificación manual de API ejecutada'),
        backgroundColor: Colors.purple,
      ),
    );
  }

  Future<void> _pickImage() async {
    final XFile? image = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 800,
      maxHeight: 800,
      imageQuality: 80,
    );

    if (image != null) {
      setState(() {
        _selectedImage = File(image.path);
      });
    }
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final apiService = Provider.of<ApiService>(context, listen: false);
      final currentUser = authProvider.currentUser!;

      // Subir imagen si se seleccionó una nueva
      String? newProfilePhoto;
      if (_selectedImage != null) {
        final uploadResponse = await apiService.uploadProfilePhoto(
          currentUser.id,
          _selectedImage!,
        );
        
        if (uploadResponse.isSuccess) {
          newProfilePhoto = uploadResponse.data;
        }
      }

      // Actualizar usuario
      final updatedUser = currentUser.copyWith(
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phone: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
        address: _addressController.text.trim().isNotEmpty ? _addressController.text.trim() : null,
        emergencyContact: _emergencyContactController.text.trim().isNotEmpty ? _emergencyContactController.text.trim() : null,
        emergencyPhone: _emergencyPhoneController.text.trim().isNotEmpty ? _emergencyPhoneController.text.trim() : null,
        profilePhoto: newProfilePhoto ?? currentUser.profilePhoto,
      );

      authProvider.updateUser(updatedUser);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Perfil actualizado correctamente'),
          backgroundColor: AppTheme.successColor,
        ),
      );

      setState(() {
        _isEditing = false;
        _selectedImage = null;
      });

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error actualizando perfil: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
}