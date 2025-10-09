import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../models/user.dart';
import '../../providers/users_provider.dart';
import '../../config/theme.dart';

class AddUserScreen extends StatefulWidget {
  final User? user; // null para crear, user para editar

  const AddUserScreen({Key? key, this.user}) : super(key: key);

  @override
  _AddUserScreenState createState() => _AddUserScreenState();
}

class _AddUserScreenState extends State<AddUserScreen> {
  final _formKey = GlobalKey<FormState>();
  final _scrollController = ScrollController();
  
  // Controladores de texto
  final _legajoController = TextEditingController();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _dniController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _companyController = TextEditingController();
  final _positionController = TextEditingController();
  final _departmentController = TextEditingController();
  final _addressController = TextEditingController();
  final _emergencyContactController = TextEditingController();
  final _emergencyPhoneController = TextEditingController();
  final _salaryController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // Variables de estado
  String _selectedRole = 'employee';
  bool _isActive = true;
  DateTime? _hireDate;
  File? _selectedImage;
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  
  final ImagePicker _imagePicker = ImagePicker();

  bool get isEditing => widget.user != null;

  @override
  void initState() {
    super.initState();
    if (isEditing) {
      _loadUserData();
    }
  }

  void _loadUserData() {
    final user = widget.user!;
    _legajoController.text = user.legajo;
    _firstNameController.text = user.firstName;
    _lastNameController.text = user.lastName;
    _dniController.text = user.dni;
    _emailController.text = user.email;
    _phoneController.text = user.phone ?? '';
    _companyController.text = user.company ?? '';
    _positionController.text = user.position ?? '';
    _departmentController.text = user.department ?? '';
    _addressController.text = user.address ?? '';
    _emergencyContactController.text = user.emergencyContact ?? '';
    _emergencyPhoneController.text = user.emergencyPhone ?? '';
    _salaryController.text = user.salary?.toString() ?? '';
    _selectedRole = user.role;
    _isActive = user.isActive;
    _hireDate = user.hireDate;
  }

  @override
  void dispose() {
    _legajoController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _dniController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _companyController.dispose();
    _positionController.dispose();
    _departmentController.dispose();
    _addressController.dispose();
    _emergencyContactController.dispose();
    _emergencyPhoneController.dispose();
    _salaryController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Editar Usuario' : 'Nuevo Usuario'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _saveUser,
            child: Text(
              'GUARDAR',
              style: TextStyle(
                color: _isLoading ? Colors.grey : Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          controller: _scrollController,
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildPhotoSection(),
              SizedBox(height: 16),
              _buildBasicInfoSection(),
              SizedBox(height: 16),
              _buildContactSection(),
              SizedBox(height: 16),
              _buildWorkSection(),
              SizedBox(height: 16),
              _buildSecuritySection(),
              SizedBox(height: 16),
              _buildEmergencyContactSection(),
              if (_isLoading) ...[
                SizedBox(height: 16),
                Center(child: CircularProgressIndicator()),
              ],
              SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          children: [
            Text(
              'Foto de Perfil',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            Stack(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                  backgroundImage: _selectedImage != null
                      ? FileImage(_selectedImage!)
                      : (isEditing && widget.user!.profilePhoto != null
                          ? NetworkImage(widget.user!.profilePhoto!)
                          : null) as ImageProvider?,
                  child: _selectedImage == null && 
                         (!isEditing || widget.user!.profilePhoto == null)
                      ? Icon(
                          Icons.person,
                          size: 50,
                          color: AppTheme.primaryColor,
                        )
                      : null,
                ),
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
            if (_selectedImage != null) ...[
              SizedBox(height: 8),
              TextButton(
                onPressed: () => setState(() => _selectedImage = null),
                child: Text('Eliminar foto'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBasicInfoSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información Básica',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _firstNameController,
                    decoration: InputDecoration(
                      labelText: 'Nombre *',
                      prefixIcon: Icon(Icons.person),
                    ),
                    validator: (value) => value?.trim().isEmpty ?? true
                        ? 'El nombre es requerido'
                        : null,
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _lastNameController,
                    decoration: InputDecoration(
                      labelText: 'Apellido *',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    validator: (value) => value?.trim().isEmpty ?? true
                        ? 'El apellido es requerido'
                        : null,
                  ),
                ),
              ],
            ),
            
            SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _legajoController,
                    decoration: InputDecoration(
                      labelText: 'Legajo *',
                      prefixIcon: Icon(Icons.badge),
                    ),
                    validator: (value) => value?.trim().isEmpty ?? true
                        ? 'El legajo es requerido'
                        : null,
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _dniController,
                    decoration: InputDecoration(
                      labelText: 'DNI *',
                      prefixIcon: Icon(Icons.credit_card),
                    ),
                    keyboardType: TextInputType.number,
                    validator: (value) => value?.trim().isEmpty ?? true
                        ? 'El DNI es requerido'
                        : null,
                  ),
                ),
              ],
            ),

            SizedBox(height: 16),

            DropdownButtonFormField<String>(
              value: _selectedRole,
              decoration: InputDecoration(
                labelText: 'Rol *',
                prefixIcon: Icon(Icons.admin_panel_settings),
              ),
              items: [
                DropdownMenuItem(
                  value: 'employee',
                  child: Text('Empleado'),
                ),
                DropdownMenuItem(
                  value: 'supervisor',
                  child: Text('Supervisor'),
                ),
                DropdownMenuItem(
                  value: 'admin',
                  child: Text('Administrador'),
                ),
              ],
              onChanged: (value) => setState(() => _selectedRole = value!),
            ),

            SizedBox(height: 16),

            SwitchListTile(
              title: Text('Usuario Activo'),
              subtitle: Text('El usuario puede acceder al sistema'),
              value: _isActive,
              onChanged: (value) => setState(() => _isActive = value),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContactSection() {
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
              controller: _emailController,
              decoration: InputDecoration(
                labelText: 'Email *',
                prefixIcon: Icon(Icons.email),
              ),
              keyboardType: TextInputType.emailAddress,
              enabled: !isEditing, // No permitir cambiar email al editar
              validator: (value) {
                if (value?.trim().isEmpty ?? true) {
                  return 'El email es requerido';
                }
                if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(value!)) {
                  return 'Ingrese un email válido';
                }
                return null;
              },
            ),

            SizedBox(height: 16),

            TextFormField(
              controller: _phoneController,
              decoration: InputDecoration(
                labelText: 'Teléfono',
                prefixIcon: Icon(Icons.phone),
              ),
              keyboardType: TextInputType.phone,
            ),

            SizedBox(height: 16),

            TextFormField(
              controller: _addressController,
              decoration: InputDecoration(
                labelText: 'Dirección',
                prefixIcon: Icon(Icons.location_on),
              ),
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkSection() {
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
            
            TextFormField(
              controller: _companyController,
              decoration: InputDecoration(
                labelText: 'Empresa',
                prefixIcon: Icon(Icons.business),
              ),
            ),

            SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _positionController,
                    decoration: InputDecoration(
                      labelText: 'Posición',
                      prefixIcon: Icon(Icons.work),
                    ),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    controller: _departmentController,
                    decoration: InputDecoration(
                      labelText: 'Departamento',
                      prefixIcon: Icon(Icons.groups),
                    ),
                  ),
                ),
              ],
            ),

            SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _salaryController,
                    decoration: InputDecoration(
                      labelText: 'Salario',
                      prefixIcon: Icon(Icons.attach_money),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: InkWell(
                    onTap: _selectHireDate,
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: 'Fecha de Ingreso',
                        prefixIcon: Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        _hireDate != null
                            ? '${_hireDate!.day}/${_hireDate!.month}/${_hireDate!.year}'
                            : 'Seleccionar fecha',
                        style: _hireDate != null
                            ? null
                            : TextStyle(color: Colors.grey[600]),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecuritySection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Seguridad',
              style: AppTheme.titleStyle.copyWith(fontSize: 18),
            ),
            SizedBox(height: 16),
            
            if (!isEditing) ...[
              TextFormField(
                controller: _passwordController,
                decoration: InputDecoration(
                  labelText: 'Contraseña *',
                  prefixIcon: Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
                obscureText: _obscurePassword,
                validator: (value) {
                  if (value?.isEmpty ?? true) {
                    return 'La contraseña es requerida';
                  }
                  if (value!.length < 6) {
                    return 'La contraseña debe tener al menos 6 caracteres';
                  }
                  return null;
                },
              ),

              SizedBox(height: 16),

              TextFormField(
                controller: _confirmPasswordController,
                decoration: InputDecoration(
                  labelText: 'Confirmar Contraseña *',
                  prefixIcon: Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(_obscureConfirmPassword ? Icons.visibility : Icons.visibility_off),
                    onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                  ),
                ),
                obscureText: _obscureConfirmPassword,
                validator: (value) {
                  if (value != _passwordController.text) {
                    return 'Las contraseñas no coinciden';
                  }
                  return null;
                },
              ),
            ] else ...[
              ListTile(
                leading: Icon(Icons.vpn_key),
                title: Text('Restablecer Contraseña'),
                subtitle: Text('Enviar email de restablecimiento'),
                trailing: Icon(Icons.arrow_forward_ios),
                onTap: _sendPasswordReset,
              ),
            ],
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
            ),

            SizedBox(height: 16),

            TextFormField(
              controller: _emergencyPhoneController,
              decoration: InputDecoration(
                labelText: 'Teléfono de Emergencia',
                prefixIcon: Icon(Icons.phone_in_talk),
              ),
              keyboardType: TextInputType.phone,
            ),
          ],
        ),
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

  Future<void> _selectHireDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _hireDate ?? DateTime.now(),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
    );

    if (picked != null && picked != _hireDate) {
      setState(() {
        _hireDate = picked;
      });
    }
  }

  void _sendPasswordReset() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Restablecer Contraseña'),
        content: Text(
          '¿Deseas enviar un email de restablecimiento de contraseña a ${_emailController.text}?',
        ),
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
                  content: Text('Email de restablecimiento enviado'),
                  backgroundColor: AppTheme.successColor,
                ),
              );
            },
            child: Text('Enviar'),
          ),
        ],
      ),
    );
  }

  Future<void> _saveUser() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      final usersProvider = Provider.of<UsersProvider>(context, listen: false);
      
      // Crear mapa de datos del usuario
      final userData = {
        'legajo': _legajoController.text.trim(),
        'firstName': _firstNameController.text.trim(),
        'lastName': _lastNameController.text.trim(),
        'dni': _dniController.text.trim(),
        'email': _emailController.text.trim(),
        'phone': _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
        'company': _companyController.text.trim().isEmpty ? null : _companyController.text.trim(),
        'position': _positionController.text.trim().isEmpty ? null : _positionController.text.trim(),
        'department': _departmentController.text.trim().isEmpty ? null : _departmentController.text.trim(),
        'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
        'emergencyContact': _emergencyContactController.text.trim().isEmpty ? null : _emergencyContactController.text.trim(),
        'emergencyPhone': _emergencyPhoneController.text.trim().isEmpty ? null : _emergencyPhoneController.text.trim(),
        'salary': _salaryController.text.trim().isEmpty ? null : double.tryParse(_salaryController.text.trim()),
        'role': _selectedRole,
        'isActive': _isActive,
        'hireDate': _hireDate,
      };

      // Agregar contraseña solo si es un nuevo usuario
      if (!isEditing) {
        userData['password'] = _passwordController.text;
      }

      bool success;
      if (isEditing) {
        success = await usersProvider.updateUser(widget.user!.id, userData);
      } else {
        success = await usersProvider.createUser(userData);
      }

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isEditing 
                ? 'Usuario actualizado correctamente'
                : 'Usuario creado correctamente'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(usersProvider.error ?? 'Error guardando usuario'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error inesperado: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }
}