import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class MedicalCenterForm extends StatefulWidget {
  final bool hasVisitedDoctor;
  final Function(bool) onHasVisitedDoctorChanged;
  final Map<String, dynamic> formData;
  final Function(String key, dynamic value) onFormDataChanged;
  final Function(Map<String, dynamic>) onAddPrescription;
  final Function(int) onRemovePrescription;
  final List<File> attachedFiles;
  final Function(File) onAddAttachment;
  final Function(int) onRemoveAttachment;

  MedicalCenterForm({
    required this.hasVisitedDoctor,
    required this.onHasVisitedDoctorChanged,
    required this.formData,
    required this.onFormDataChanged,
    required this.onAddPrescription,
    required this.onRemovePrescription,
    required this.attachedFiles,
    required this.onAddAttachment,
    required this.onRemoveAttachment,
  });

  @override
  _MedicalCenterFormState createState() => _MedicalCenterFormState();
}

class _MedicalCenterFormState extends State<MedicalCenterForm> {
  final _medicalCenterController = TextEditingController();
  final _physicianController = TextEditingController();
  final _prescriptionController = TextEditingController();
  final _diagnosisCodeController = TextEditingController();
  final _diagnosisController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() {
    _medicalCenterController.text = widget.formData['medicalCenter']?.toString() ?? '';
    _physicianController.text = widget.formData['attendingPhysician']?.toString() ?? '';
    _prescriptionController.text = widget.formData['medicalPrescription']?.toString() ?? '';
    _diagnosisCodeController.text = widget.formData['diagnosisCode']?.toString() ?? '';
    _diagnosisController.text = widget.formData['diagnosis']?.toString() ?? '';
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Pregunta principal
          Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.local_hospital, color: Colors.red[700]),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Atención Médica',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.red[700],
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 16),
                  
                  Text(
                    '¿Ha consultado con un médico por estos síntomas?',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  SizedBox(height: 8),
                  
                  Row(
                    children: [
                      Expanded(
                        child: RadioListTile<bool>(
                          title: Text('Sí'),
                          value: true,
                          groupValue: widget.hasVisitedDoctor,
                          onChanged: (value) {
                            widget.onHasVisitedDoctorChanged(value ?? false);
                          },
                          activeColor: Colors.red[700],
                        ),
                      ),
                      Expanded(
                        child: RadioListTile<bool>(
                          title: Text('No'),
                          value: false,
                          groupValue: widget.hasVisitedDoctor,
                          onChanged: (value) {
                            widget.onHasVisitedDoctorChanged(value ?? false);
                          },
                          activeColor: Colors.red[700],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          // Formulario de atención médica (si visitó médico)
          if (widget.hasVisitedDoctor) ...[
            SizedBox(height: 16),
            _buildMedicalAttentionForm(),
          ],
          
          // Sección de archivos adjuntos
          SizedBox(height: 16),
          _buildAttachmentsSection(),
        ],
      ),
    );
  }

  Widget _buildMedicalAttentionForm() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Información de la Consulta Médica',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
            ),
            SizedBox(height: 16),
            
            // Centro médico
            TextFormField(
              controller: _medicalCenterController,
              decoration: InputDecoration(
                labelText: 'Centro médico o clínica *',
                prefixIcon: Icon(Icons.business, color: Colors.red[700]),
                border: OutlineInputBorder(),
                hintText: 'Hospital Central, Clínica San José, etc.',
              ),
              onChanged: (value) {
                widget.onFormDataChanged('medicalCenter', value);
              },
              validator: (value) {
                if (widget.hasVisitedDoctor && (value == null || value.trim().isEmpty)) {
                  return 'Este campo es obligatorio';
                }
                return null;
              },
            ),
            SizedBox(height: 16),
            
            // Médico tratante
            TextFormField(
              controller: _physicianController,
              decoration: InputDecoration(
                labelText: 'Médico que lo atendió *',
                prefixIcon: Icon(Icons.person, color: Colors.red[700]),
                border: OutlineInputBorder(),
                hintText: 'Dr. Juan Pérez, Dra. María García, etc.',
              ),
              onChanged: (value) {
                widget.onFormDataChanged('attendingPhysician', value);
              },
              validator: (value) {
                if (widget.hasVisitedDoctor && (value == null || value.trim().isEmpty)) {
                  return 'Este campo es obligatorio';
                }
                return null;
              },
            ),
            SizedBox(height: 16),
            
            // Código de diagnóstico
            TextFormField(
              controller: _diagnosisCodeController,
              decoration: InputDecoration(
                labelText: 'Código de diagnóstico (CIE-10)',
                prefixIcon: Icon(Icons.medical_information, color: Colors.red[700]),
                border: OutlineInputBorder(),
                hintText: 'J06.9, K59.1, etc. (opcional)',
              ),
              onChanged: (value) {
                widget.onFormDataChanged('diagnosisCode', value);
              },
            ),
            SizedBox(height: 16),
            
            // Diagnóstico médico
            TextFormField(
              controller: _diagnosisController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Diagnóstico médico',
                prefixIcon: Icon(Icons.diagnosis, color: Colors.red[700]),
                border: OutlineInputBorder(),
                hintText: 'Describa el diagnóstico recibido del médico...',
              ),
              onChanged: (value) {
                widget.onFormDataChanged('diagnosis', value);
              },
            ),
            SizedBox(height: 16),
            
            // Prescripción médica general
            TextFormField(
              controller: _prescriptionController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Indicaciones médicas generales',
                prefixIcon: Icon(Icons.receipt_long, color: Colors.red[700]),
                border: OutlineInputBorder(),
                hintText: 'Reposo, medicación, etc...',
              ),
              onChanged: (value) {
                widget.onFormDataChanged('medicalPrescription', value);
              },
            ),
            SizedBox(height: 16),
            
            // Sección de recetas médicas
            _buildPrescriptionsSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildPrescriptionsSection() {
    final prescriptions = List<Map<String, dynamic>>.from(
      widget.formData['prescriptions'] ?? []
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recetas Médicas',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.grey[800],
              ),
            ),
            ElevatedButton.icon(
              onPressed: _showAddPrescriptionDialog,
              icon: Icon(Icons.add),
              label: Text('Agregar Receta'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green[600],
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
        SizedBox(height: 8),
        
        if (prescriptions.isEmpty)
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey[300]!),
            ),
            child: Row(
              children: [
                Icon(Icons.info, color: Colors.grey[600]),
                SizedBox(width: 8),
                Text(
                  'No hay recetas agregadas',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ],
            ),
          )
        else
          ...prescriptions.asMap().entries.map((entry) {
            int index = entry.key;
            Map<String, dynamic> prescription = entry.value;
            
            return Card(
              margin: EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Icon(Icons.medical_services, color: Colors.blue[600]),
                title: Text(prescription['physicianName'] ?? 'Sin médico'),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (prescription['medicalCenter'] != null)
                      Text('Centro: ${prescription['medicalCenter']}'),
                    if (prescription['medications'] != null)
                      Text('Medicamentos: ${(prescription['medications'] as List).length}'),
                  ],
                ),
                trailing: IconButton(
                  icon: Icon(Icons.delete, color: Colors.red),
                  onPressed: () => widget.onRemovePrescription(index),
                ),
                isThreeLine: true,
              ),
            );
          }).toList(),
      ],
    );
  }

  Widget _buildAttachmentsSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.attach_file, color: Colors.red[700]),
                SizedBox(width: 8),
                Text(
                  'Archivos Adjuntos',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.red[700],
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),
            Text(
              'Adjunte certificados médicos, recetas o estudios',
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
            ),
            SizedBox(height: 16),
            
            // Botones para agregar archivos
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _addAttachment(ImageSource.camera),
                    icon: Icon(Icons.camera_alt),
                    label: Text('Tomar Foto'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue[600],
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _addAttachment(ImageSource.gallery),
                    icon: Icon(Icons.photo_library),
                    label: Text('Galería'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green[600],
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            
            // Lista de archivos adjuntos
            if (widget.attachedFiles.isEmpty)
              Container(
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info, color: Colors.grey[600]),
                    SizedBox(width: 8),
                    Text(
                      'No hay archivos adjuntos',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              )
            else
              ...widget.attachedFiles.asMap().entries.map((entry) {
                int index = entry.key;
                File file = entry.value;
                
                return Card(
                  margin: EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Icon(Icons.image, color: Colors.blue[600]),
                    title: Text(file.path.split('/').last),
                    subtitle: Text('Imagen adjunta'),
                    trailing: IconButton(
                      icon: Icon(Icons.delete, color: Colors.red),
                      onPressed: () => widget.onRemoveAttachment(index),
                    ),
                  ),
                );
              }).toList(),
          ],
        ),
      ),
    );
  }

  Future<void> _addAttachment(ImageSource source) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(source: source);
      
      if (image != null) {
        final File file = File(image.path);
        widget.onAddAttachment(file);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al agregar archivo: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showAddPrescriptionDialog() {
    showDialog(
      context: context,
      builder: (context) => PrescriptionDialog(
        onAdd: widget.onAddPrescription,
      ),
    );
  }

  @override
  void dispose() {
    _medicalCenterController.dispose();
    _physicianController.dispose();
    _prescriptionController.dispose();
    _diagnosisCodeController.dispose();
    _diagnosisController.dispose();
    super.dispose();
  }
}

class PrescriptionDialog extends StatefulWidget {
  final Function(Map<String, dynamic>) onAdd;

  PrescriptionDialog({required this.onAdd});

  @override
  _PrescriptionDialogState createState() => _PrescriptionDialogState();
}

class _PrescriptionDialogState extends State<PrescriptionDialog> {
  final _formKey = GlobalKey<FormState>();
  final _physicianController = TextEditingController();
  final _licenseController = TextEditingController();
  final _centerController = TextEditingController();
  final _instructionsController = TextEditingController();
  
  List<Map<String, dynamic>> _medications = [];

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Nueva Receta Médica'),
      content: Container(
        width: double.maxFinite,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _physicianController,
                  decoration: InputDecoration(
                    labelText: 'Médico prescriptor *',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Este campo es obligatorio';
                    }
                    return null;
                  },
                ),
                SizedBox(height: 16),
                
                TextFormField(
                  controller: _licenseController,
                  decoration: InputDecoration(
                    labelText: 'Matrícula médica',
                    border: OutlineInputBorder(),
                  ),
                ),
                SizedBox(height: 16),
                
                TextFormField(
                  controller: _centerController,
                  decoration: InputDecoration(
                    labelText: 'Centro médico',
                    border: OutlineInputBorder(),
                  ),
                ),
                SizedBox(height: 16),
                
                TextFormField(
                  controller: _instructionsController,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: 'Instrucciones generales',
                    border: OutlineInputBorder(),
                  ),
                ),
                SizedBox(height: 16),
                
                // Medicamentos
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Medicamentos'),
                    TextButton.icon(
                      onPressed: _addMedication,
                      icon: Icon(Icons.add),
                      label: Text('Agregar'),
                    ),
                  ],
                ),
                
                if (_medications.isNotEmpty)
                  ..._medications.asMap().entries.map((entry) {
                    int index = entry.key;
                    var med = entry.value;
                    
                    return Card(
                      child: ListTile(
                        title: Text(med['name'] ?? ''),
                        subtitle: Text('${med['dosage']} - ${med['frequency']}'),
                        trailing: IconButton(
                          icon: Icon(Icons.delete, color: Colors.red),
                          onPressed: () => _removeMedication(index),
                        ),
                      ),
                    );
                  }).toList(),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancelar'),
        ),
        ElevatedButton(
          onPressed: _savePrescription,
          child: Text('Guardar'),
        ),
      ],
    );
  }

  void _addMedication() {
    showDialog(
      context: context,
      builder: (context) => MedicationDialog(
        onAdd: (medication) {
          setState(() {
            _medications.add(medication);
          });
        },
      ),
    );
  }

  void _removeMedication(int index) {
    setState(() {
      _medications.removeAt(index);
    });
  }

  void _savePrescription() {
    if (!_formKey.currentState!.validate()) return;
    
    final prescription = {
      'physicianName': _physicianController.text,
      'physicianLicense': _licenseController.text,
      'medicalCenter': _centerController.text,
      'generalInstructions': _instructionsController.text,
      'medications': _medications,
      'issueDate': DateTime.now().toIso8601String(),
      'status': 'active',
    };
    
    widget.onAdd(prescription);
    Navigator.pop(context);
  }

  @override
  void dispose() {
    _physicianController.dispose();
    _licenseController.dispose();
    _centerController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }
}

class MedicationDialog extends StatefulWidget {
  final Function(Map<String, dynamic>) onAdd;

  MedicationDialog({required this.onAdd});

  @override
  _MedicationDialogState createState() => _MedicationDialogState();
}

class _MedicationDialogState extends State<MedicationDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _brandController = TextEditingController();
  final _dosageController = TextEditingController();
  final _frequencyController = TextEditingController();
  final _durationController = TextEditingController();
  final _instructionsController = TextEditingController();
  final _quantityController = TextEditingController(text: '1');

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Agregar Medicamento'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Nombre del medicamento *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Este campo es obligatorio';
                  }
                  return null;
                },
              ),
              SizedBox(height: 12),
              
              TextFormField(
                controller: _brandController,
                decoration: InputDecoration(
                  labelText: 'Marca comercial',
                  border: OutlineInputBorder(),
                ),
              ),
              SizedBox(height: 12),
              
              TextFormField(
                controller: _dosageController,
                decoration: InputDecoration(
                  labelText: 'Dosis *',
                  border: OutlineInputBorder(),
                  hintText: '500mg, 10ml, etc.',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Este campo es obligatorio';
                  }
                  return null;
                },
              ),
              SizedBox(height: 12),
              
              TextFormField(
                controller: _frequencyController,
                decoration: InputDecoration(
                  labelText: 'Frecuencia *',
                  border: OutlineInputBorder(),
                  hintText: 'Cada 8 horas, 2 veces al día, etc.',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Este campo es obligatorio';
                  }
                  return null;
                },
              ),
              SizedBox(height: 12),
              
              TextFormField(
                controller: _durationController,
                decoration: InputDecoration(
                  labelText: 'Duración *',
                  border: OutlineInputBorder(),
                  hintText: '7 días, 2 semanas, etc.',
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Este campo es obligatorio';
                  }
                  return null;
                },
              ),
              SizedBox(height: 12),
              
              TextFormField(
                controller: _quantityController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Cantidad *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Este campo es obligatorio';
                  }
                  if (int.tryParse(value) == null || int.parse(value) < 1) {
                    return 'Debe ser un número mayor a 0';
                  }
                  return null;
                },
              ),
              SizedBox(height: 12),
              
              TextFormField(
                controller: _instructionsController,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Instrucciones especiales',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Cancelar'),
        ),
        ElevatedButton(
          onPressed: _saveMedication,
          child: Text('Agregar'),
        ),
      ],
    );
  }

  void _saveMedication() {
    if (!_formKey.currentState!.validate()) return;
    
    final medication = {
      'name': _nameController.text,
      'brand': _brandController.text.isEmpty ? null : _brandController.text,
      'dosage': _dosageController.text,
      'frequency': _frequencyController.text,
      'duration': _durationController.text,
      'instructions': _instructionsController.text.isEmpty ? null : _instructionsController.text,
      'quantity': int.parse(_quantityController.text),
    };
    
    widget.onAdd(medication);
    Navigator.pop(context);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _brandController.dispose();
    _dosageController.dispose();
    _frequencyController.dispose();
    _durationController.dispose();
    _instructionsController.dispose();
    _quantityController.dispose();
    super.dispose();
  }
}