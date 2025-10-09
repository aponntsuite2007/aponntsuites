import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';

// Providers
import '../../providers/enhanced_auth_provider.dart';
import '../../services/api_service.dart';
import '../../services/notification_service.dart';
import '../../services/company_absence_config_service.dart';

class AbsenceNotificationScreen extends StatefulWidget {
  @override
  _AbsenceNotificationScreenState createState() => _AbsenceNotificationScreenState();
}

class _AbsenceNotificationScreenState extends State<AbsenceNotificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  final _notesController = TextEditingController();
  
  String _selectedAbsenceType = 'medical';
  DateTime? _startDate;
  DateTime? _endDate;
  File? _attachmentFile;
  bool _isSubmitting = false;
  bool _notifyDoctor = false;
  bool _notifyHR = false;
  String? _doctorEmail;
  
  // Company configuration
  CompanyAbsenceConfig? _companyConfig;
  ValidationResult? _validationResult;
  final CompanyAbsenceConfigService _configService = CompanyAbsenceConfigService();

  @override
  void initState() {
    super.initState();
    _loadCompanyConfig();
  }

  Future<void> _loadCompanyConfig() async {
    await _configService.initialize();
    final config = await _configService.loadConfig('default'); // Use company ID from auth
    setState(() {
      _companyConfig = config;
      _notifyHR = config.autoNotifyHR;
      _notifyDoctor = config.autoNotifyMedicalTeam;
    });
  }

  List<AbsenceType> get _absenceTypes => _companyConfig?.customAbsenceTypes ?? [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('📋 Notificar Inasistencia'),
        backgroundColor: Colors.red[700],
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.red[700]!, Colors.red[50]!],
            stops: [0.0, 0.3],
          ),
        ),
        child: SingleChildScrollView(
          padding: EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildInfoCard(),
                SizedBox(height: 20),
                _buildAbsenceTypeSection(),
                SizedBox(height: 20),
                _buildDateSection(),
                SizedBox(height: 20),
                _buildReasonSection(),
                SizedBox(height: 20),
                _buildAttachmentSection(),
                SizedBox(height: 20),
                _buildNotificationSection(),
                SizedBox(height: 30),
                _buildSubmitButton(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue, size: 24),
                SizedBox(width: 10),
                Text(
                  'Información Importante',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue[800],
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            Text(
              _companyConfig != null 
                ? '• Aviso mínimo requerido: ${_companyConfig!.advanceNoticeHours}h de anticipación\n'
                  '• Certificado médico requerido para más de ${_companyConfig!.maxAbsenceDaysWithoutCertificate} días\n'
                  '• Notificaciones automáticas: ${_getEnabledNotifications()}\n'
                  '• Recibirás confirmación de recepción'
                : '• Notifica tu inasistencia lo antes posible\n'
                  '• Para ausencias médicas, adjunta certificado si tienes\n'
                  '• Las notificaciones se envían automáticamente\n'
                  '• Recibirás confirmación de recepción',
              style: TextStyle(fontSize: 14, height: 1.5),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAbsenceTypeSection() {
    if (_companyConfig == null) {
      return Center(child: CircularProgressIndicator());
    }

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '📋 Tipo de Inasistencia',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            ..._absenceTypes.map((type) {
              final isSelected = _selectedAbsenceType == type.key;
              return Container(
                margin: EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isSelected ? Colors.red[400]! : Colors.grey[300]!,
                    width: isSelected ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(8),
                  color: isSelected ? Colors.red[50] : null,
                ),
                child: RadioListTile<String>(
                  title: Row(
                    children: [
                      Text(type.label),
                      if (type.requiresCertificate) ...[
                        SizedBox(width: 8),
                        Icon(Icons.attach_file, size: 16, color: Colors.orange),
                      ],
                      if (type.requiresManagerApproval) ...[
                        SizedBox(width: 4),
                        Icon(Icons.approval, size: 16, color: Colors.blue),
                      ],
                    ],
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(type.description, style: TextStyle(fontSize: 12)),
                      if (type.requiresCertificate || type.requiresManagerApproval)
                        Text(
                          '${type.requiresCertificate ? "• Requiere certificado" : ""}'
                          '${type.requiresCertificate && type.requiresManagerApproval ? "\n" : ""}'
                          '${type.requiresManagerApproval ? "• Requiere aprobación supervisor" : ""}',
                          style: TextStyle(fontSize: 10, color: Colors.grey[600]),
                        ),
                    ],
                  ),
                  value: type.key,
                  groupValue: _selectedAbsenceType,
                  onChanged: (value) {
                    setState(() {
                      _selectedAbsenceType = value!;
                      final selectedType = _absenceTypes.firstWhere((t) => t.key == value);
                      _notifyDoctor = selectedType.autoNotifyMedical && _companyConfig!.autoNotifyMedicalTeam;
                      _validateForm();
                    });
                  },
                ),
              );
            }).toList(),
            
            // Validation warnings/errors
            if (_validationResult != null) ...[
              SizedBox(height: 16),
              _buildValidationResults(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildValidationResults() {
    if (_validationResult == null) return Container();

    return Column(
      children: [
        // Errors
        ..._validationResult!.errors.map((error) => Container(
          margin: EdgeInsets.only(bottom: 8),
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.red[50],
            border: Border.all(color: Colors.red[200]!),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(Icons.error, color: Colors.red, size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  error,
                  style: TextStyle(color: Colors.red[800], fontSize: 12),
                ),
              ),
            ],
          ),
        )),
        
        // Warnings
        ..._validationResult!.warnings.map((warning) => Container(
          margin: EdgeInsets.only(bottom: 8),
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange[50],
            border: Border.all(color: Colors.orange[200]!),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(Icons.warning, color: Colors.orange, size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  warning,
                  style: TextStyle(color: Colors.orange[800], fontSize: 12),
                ),
              ),
            ],
          ),
        )),
      ],
    );
  }

  void _validateForm() {
    if (_companyConfig == null || _startDate == null) return;

    final result = _configService.validateAbsenceRequest(
      config: _companyConfig!,
      absenceType: _selectedAbsenceType,
      startDate: _startDate!,
      endDate: _endDate ?? _startDate!,
      reason: _reasonController.text,
      hasCertificate: _attachmentFile != null,
      hasManagerApproval: false, // This would come from the system
    );

    setState(() {
      _validationResult = result;
    });
  }

  Widget _buildDateSection() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '📅 Fechas de Inasistencia',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildDatePicker(
                    label: 'Fecha Inicio',
                    date: _startDate,
                    onTap: () => _selectStartDate(),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: _buildDatePicker(
                    label: 'Fecha Fin (opcional)',
                    date: _endDate,
                    onTap: () => _selectEndDate(),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDatePicker({required String label, DateTime? date, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
            SizedBox(height: 4),
            Text(
              date != null 
                ? '${date.day}/${date.month}/${date.year}'
                : 'Seleccionar fecha',
              style: TextStyle(
                fontSize: 16,
                color: date != null ? Colors.black : Colors.grey[400],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReasonSection() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '📝 Motivo Detallado',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _reasonController,
              decoration: InputDecoration(
                labelText: 'Descripción del motivo',
                hintText: 'Ej: Gripe, fiebre alta, consulta médica...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                prefixIcon: Icon(Icons.description),
              ),
              maxLines: 2,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'El motivo es obligatorio';
                }
                return null;
              },
            ),
            SizedBox(height: 16),
            TextFormField(
              controller: _notesController,
              decoration: InputDecoration(
                labelText: 'Observaciones adicionales (opcional)',
                hintText: 'Información extra que consideres relevante...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                prefixIcon: Icon(Icons.note_add),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttachmentSection() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '📎 Documentación',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            if (_attachmentFile != null)
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  border: Border.all(color: Colors.green[200]!),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Archivo adjunto: ${_attachmentFile!.path.split('/').last}',
                        style: TextStyle(color: Colors.green[800]),
                      ),
                    ),
                    IconButton(
                      onPressed: () => setState(() => _attachmentFile = null),
                      icon: Icon(Icons.close, color: Colors.red),
                    ),
                  ],
                ),
              )
            else
              Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _pickImageFromCamera,
                          icon: Icon(Icons.camera_alt),
                          label: Text('Tomar Foto'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blue,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                      SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _pickFile,
                          icon: Icon(Icons.upload_file),
                          label: Text('Subir Archivo'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Certificados médicos, fotos de recetas, etc.',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationSection() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '🔔 Notificaciones Automáticas',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            CheckboxListTile(
              title: Text('Notificar a Recursos Humanos'),
              subtitle: Text('Se enviará por WhatsApp, SMS y Email'),
              value: _notifyHR,
              onChanged: (value) => setState(() => _notifyHR = value!),
              controlAffinity: ListTileControlAffinity.leading,
            ),
            CheckboxListTile(
              title: Text('Notificar al Médico de la Empresa'),
              subtitle: Text('Solo para inasistencias médicas'),
              value: _notifyDoctor,
              onChanged: _selectedAbsenceType == 'medical' 
                ? (value) => setState(() => _notifyDoctor = value!) 
                : null,
              controlAffinity: ListTileControlAffinity.leading,
            ),
            if (_notifyDoctor && _selectedAbsenceType == 'medical')
              Padding(
                padding: EdgeInsets.only(left: 16, top: 8),
                child: TextFormField(
                  decoration: InputDecoration(
                    labelText: 'Email del médico (opcional)',
                    hintText: 'doctor@empresa.com',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    prefixIcon: Icon(Icons.email),
                  ),
                  onChanged: (value) => _doctorEmail = value,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSubmitButton() {
    return Container(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: _isSubmitting ? null : _submitAbsenceNotification,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.red[700],
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 4,
        ),
        child: _isSubmitting
          ? Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                ),
                SizedBox(width: 12),
                Text('Enviando...', style: TextStyle(fontSize: 16)),
              ],
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.send, size: 20),
                SizedBox(width: 8),
                Text('Enviar Notificación', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
      ),
    );
  }

  Future<void> _selectStartDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(Duration(days: 7)),
      lastDate: DateTime.now().add(Duration(days: 365)),
    );
    if (date != null) {
      setState(() {
        _startDate = date;
        if (_endDate != null && _endDate!.isBefore(date)) {
          _endDate = null;
        }
      });
    }
  }

  Future<void> _selectEndDate() async {
    if (_startDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Primero selecciona la fecha de inicio')),
      );
      return;
    }

    final date = await showDatePicker(
      context: context,
      initialDate: _startDate!,
      firstDate: _startDate!,
      lastDate: _startDate!.add(Duration(days: 365)),
    );
    if (date != null) {
      setState(() => _endDate = date);
    }
  }

  Future<void> _pickImageFromCamera() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.camera);
    if (image != null) {
      setState(() => _attachmentFile = File(image.path));
      _validateForm();
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    );
    if (result != null && result.files.single.path != null) {
      setState(() => _attachmentFile = File(result.files.single.path!));
      _validateForm();
    }
  }

  Future<void> _submitAbsenceNotification() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Selecciona la fecha de inicio de la inasistencia')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final apiService = ApiService();

      // Datos de la notificación
      final notificationData = {
        'absenceType': _selectedAbsenceType,
        'startDate': _startDate!.toIso8601String(),
        'endDate': _endDate?.toIso8601String(),
        'reason': _reasonController.text.trim(),
        'notes': _notesController.text.trim(),
        'notifyHR': _notifyHR,
        'notifyDoctor': _notifyDoctor,
        'doctorEmail': _doctorEmail,
        'employeeId': authProvider.user?.id,
        'employeeName': '${authProvider.user?.firstName} ${authProvider.user?.lastName}',
        'hasAttachment': _attachmentFile != null,
      };

      // Enviar notificación al backend
      final response = await apiService.submitAbsenceNotification(notificationData);
      
      if (response.isSuccess) {
        // Subir archivo si existe
        if (_attachmentFile != null) {
          await apiService.uploadAbsenceDocument(_attachmentFile!, response.data['notificationId']);
        }

        // Mostrar notificación local
        final notificationService = NotificationService();
        await notificationService.showAbsenceConfirmation(
          _getAbsenceTypeLabel(_selectedAbsenceType),
          '${_startDate!.day}/${_startDate!.month}/${_startDate!.year}',
        );

        // Mostrar éxito
        _showSuccessDialog();
      } else {
        throw Exception(response.error ?? 'Error enviando notificación');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 4),
        ),
      );
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          title: Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green, size: 28),
              SizedBox(width: 10),
              Text('¡Notificación Enviada!'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Tu notificación de inasistencia ha sido enviada exitosamente a:'),
              SizedBox(height: 12),
              if (_notifyHR) Text('• 👥 Recursos Humanos'),
              if (_notifyDoctor) Text('• 🏥 Médico de la empresa'),
              Text('• 📧 Panel administrativo'),
              SizedBox(height: 12),
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Recibirás confirmación por WhatsApp cuando sea procesada.',
                  style: TextStyle(fontSize: 14, color: Colors.blue[800]),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(); // Cerrar dialog
                Navigator.of(context).pop(); // Volver a pantalla anterior
              },
              child: Text('Aceptar', style: TextStyle(fontSize: 16)),
            ),
          ],
        );
      },
    );
  }

  String _getAbsenceTypeLabel(String type) {
    final found = _absenceTypes.firstWhere(
      (t) => t.key == type,
      orElse: () => AbsenceType(
        key: type,
        label: 'Inasistencia',
        description: '',
        requiresCertificate: false,
        requiresManagerApproval: false,
        autoNotifyMedical: false,
        maxDaysWithoutApproval: 1,
      ),
    );
    return found.label;
  }

  String _getEnabledNotifications() {
    if (_companyConfig == null) return 'Email';
    
    List<String> enabled = [];
    if (_companyConfig!.enableWhatsAppNotifications) enabled.add('WhatsApp');
    if (_companyConfig!.enableSMSNotifications) enabled.add('SMS');
    if (_companyConfig!.enableEmailNotifications) enabled.add('Email');
    
    return enabled.isEmpty ? 'Email' : enabled.join(', ');
  }

  @override
  void dispose() {
    _reasonController.dispose();
    _notesController.dispose();
    super.dispose();
  }
}