import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/enhanced_auth_provider.dart';
import '../../widgets/common/loading_overlay.dart';

class MedicalAbsenceExtendedScreen extends StatefulWidget {
  @override
  _MedicalAbsenceExtendedScreenState createState() => _MedicalAbsenceExtendedScreenState();
}

class _MedicalAbsenceExtendedScreenState extends State<MedicalAbsenceExtendedScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Controladores para datos del médico tratante
  final _treatingPhysicianController = TextEditingController();
  final _physicianLicenseController = TextEditingController();
  final _medicalInstitutionController = TextEditingController();
  
  // Controladores para medicación actual
  final _currentMedicationController = TextEditingController();
  final _chronicDiseasesController = TextEditingController();
  final _allergiesController = TextEditingController();
  
  // Controladores para medicación del episodio
  final _episodeMedicationController = TextEditingController();
  final _dosageController = TextEditingController();
  final _frequencyController = TextEditingController();
  final _durationController = TextEditingController();
  
  List<Map<String, String>> _currentMedications = [];
  List<Map<String, String>> _episodeMedications = [];
  List<String> _chronicDiseases = [];
  List<String> _allergies = [];
  
  bool _hasVisitedDoctor = false;
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Información Médica Completa'),
        backgroundColor: Colors.teal[700],
        foregroundColor: Colors.white,
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Información del médico tratante
                _buildDoctorInfoSection(),
                SizedBox(height: 20),
                
                // Medicación regular actual
                _buildCurrentMedicationSection(),
                SizedBox(height: 20),
                
                // Enfermedades crónicas y alergias
                _buildMedicalHistorySection(),
                SizedBox(height: 20),
                
                // Medicación para este episodio
                _buildEpisodeMedicationSection(),
                SizedBox(height: 30),
                
                // Botones
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        child: Text('Cancelar'),
                      ),
                    ),
                    SizedBox(width: 16),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _submitExtendedInfo,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.teal[600],
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: Text('Guardar Información'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDoctorInfoSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.medical_services, color: Colors.teal[600]),
                SizedBox(width: 8),
                Text(
                  'Información del Médico Tratante',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.teal[700],
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            
            SwitchListTile(
              title: Text('¿Fue atendido por un profesional médico?'),
              subtitle: Text('Marque si fue atendido por un médico, hospital o clínica'),
              value: _hasVisitedDoctor,
              onChanged: (value) {
                setState(() {
                  _hasVisitedDoctor = value;
                });
              },
              activeColor: Colors.teal[600],
            ),
            
            if (_hasVisitedDoctor) ...[
              SizedBox(height: 16),
              TextFormField(
                controller: _treatingPhysicianController,
                decoration: InputDecoration(
                  labelText: 'Nombre del médico tratante *',
                  border: OutlineInputBorder(),
                  hintText: 'Ej: Dr. Juan Pérez',
                ),
                validator: _hasVisitedDoctor ? (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Este campo es obligatorio';
                  }
                  return null;
                } : null,
              ),
              SizedBox(height: 12),
              
              TextFormField(
                controller: _physicianLicenseController,
                decoration: InputDecoration(
                  labelText: 'Matrícula profesional *',
                  border: OutlineInputBorder(),
                  hintText: 'Número que figura en el sello del certificado',
                ),
                validator: _hasVisitedDoctor ? (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Este campo es obligatorio';
                  }
                  return null;
                } : null,
              ),
              SizedBox(height: 12),
              
              TextFormField(
                controller: _medicalInstitutionController,
                decoration: InputDecoration(
                  labelText: 'Institución médica *',
                  border: OutlineInputBorder(),
                  hintText: 'Hospital, clínica o consultorio',
                ),
                validator: _hasVisitedDoctor ? (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Este campo es obligatorio';
                  }
                  return null;
                } : null,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCurrentMedicationSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.medication, color: Colors.orange[600]),
                SizedBox(width: 8),
                Text(
                  'Medicación Regular Actual',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.orange[700],
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),
            Text(
              'Medicamentos que toma regularmente (no relacionados con esta ausencia)',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _currentMedicationController,
                    decoration: InputDecoration(
                      labelText: 'Nombre del medicamento',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _addCurrentMedication,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange[600],
                    foregroundColor: Colors.white,
                  ),
                  child: Icon(Icons.add),
                ),
              ],
            ),
            SizedBox(height: 12),
            
            // Lista de medicación actual
            ..._currentMedications.map((medication) => Card(
              color: Colors.orange[50],
              margin: EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(medication['name']!),
                trailing: IconButton(
                  icon: Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _removeCurrentMedication(medication),
                ),
              ),
            )).toList(),
            
            if (_currentMedications.isEmpty)
              Container(
                width: double.infinity,
                padding: EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'No hay medicación regular registrada',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMedicalHistorySection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.history, color: Colors.red[600]),
                SizedBox(width: 8),
                Text(
                  'Historial Médico',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.red[700],
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            
            // Enfermedades crónicas
            Text(
              'Enfermedades Crónicas',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _chronicDiseasesController,
                    decoration: InputDecoration(
                      labelText: 'Enfermedad crónica',
                      border: OutlineInputBorder(),
                      hintText: 'Ej: Diabetes, Hipertensión',
                    ),
                  ),
                ),
                SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _addChronicDisease,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[600],
                    foregroundColor: Colors.white,
                  ),
                  child: Icon(Icons.add),
                ),
              ],
            ),
            SizedBox(height: 12),
            
            ..._chronicDiseases.map((disease) => Chip(
              label: Text(disease),
              onDeleted: () => _removeChronicDisease(disease),
              backgroundColor: Colors.red[100],
            )).toList(),
            
            SizedBox(height: 20),
            
            // Alergias
            Text(
              'Alergias',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _allergiesController,
                    decoration: InputDecoration(
                      labelText: 'Alergia',
                      border: OutlineInputBorder(),
                      hintText: 'Ej: Penicilina, Aspirina',
                    ),
                  ),
                ),
                SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _addAllergy,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[600],
                    foregroundColor: Colors.white,
                  ),
                  child: Icon(Icons.add),
                ),
              ],
            ),
            SizedBox(height: 12),
            
            ..._allergies.map((allergy) => Chip(
              label: Text(allergy),
              onDeleted: () => _removeAllergy(allergy),
              backgroundColor: Colors.red[100],
            )).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildEpisodeMedicationSection() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.local_pharmacy, color: Colors.blue[600]),
                SizedBox(width: 8),
                Text(
                  'Medicación para este Episodio',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue[700],
                  ),
                ),
              ],
            ),
            SizedBox(height: 8),
            Text(
              'Medicamentos recetados específicamente para esta enfermedad/lesión',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            SizedBox(height: 16),
            
            TextFormField(
              controller: _episodeMedicationController,
              decoration: InputDecoration(
                labelText: 'Nombre del medicamento',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _dosageController,
                    decoration: InputDecoration(
                      labelText: 'Dosis',
                      border: OutlineInputBorder(),
                      hintText: 'Ej: 500mg',
                    ),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _frequencyController,
                    decoration: InputDecoration(
                      labelText: 'Frecuencia',
                      border: OutlineInputBorder(),
                      hintText: 'Ej: Cada 8 horas',
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _durationController,
                    decoration: InputDecoration(
                      labelText: 'Duración',
                      border: OutlineInputBorder(),
                      hintText: 'Ej: 7 días',
                    ),
                  ),
                ),
                SizedBox(width: 16),
                ElevatedButton(
                  onPressed: _addEpisodeMedication,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[600],
                    foregroundColor: Colors.white,
                  ),
                  child: Text('Agregar'),
                ),
              ],
            ),
            SizedBox(height: 12),
            
            // Lista de medicación del episodio
            ..._episodeMedications.map((medication) => Card(
              color: Colors.blue[50],
              margin: EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(medication['name']!),
                subtitle: Text(
                  'Dosis: ${medication['dosage']} - '
                  'Frecuencia: ${medication['frequency']} - '
                  'Duración: ${medication['duration']}'
                ),
                trailing: IconButton(
                  icon: Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _removeEpisodeMedication(medication),
                ),
              ),
            )).toList(),
          ],
        ),
      ),
    );
  }

  void _addCurrentMedication() {
    if (_currentMedicationController.text.trim().isNotEmpty) {
      setState(() {
        _currentMedications.add({
          'name': _currentMedicationController.text.trim(),
        });
        _currentMedicationController.clear();
      });
    }
  }

  void _removeCurrentMedication(Map<String, String> medication) {
    setState(() {
      _currentMedications.remove(medication);
    });
  }

  void _addChronicDisease() {
    if (_chronicDiseasesController.text.trim().isNotEmpty) {
      setState(() {
        _chronicDiseases.add(_chronicDiseasesController.text.trim());
        _chronicDiseasesController.clear();
      });
    }
  }

  void _removeChronicDisease(String disease) {
    setState(() {
      _chronicDiseases.remove(disease);
    });
  }

  void _addAllergy() {
    if (_allergiesController.text.trim().isNotEmpty) {
      setState(() {
        _allergies.add(_allergiesController.text.trim());
        _allergiesController.clear();
      });
    }
  }

  void _removeAllergy(String allergy) {
    setState(() {
      _allergies.remove(allergy);
    });
  }

  void _addEpisodeMedication() {
    if (_episodeMedicationController.text.trim().isNotEmpty) {
      setState(() {
        _episodeMedications.add({
          'name': _episodeMedicationController.text.trim(),
          'dosage': _dosageController.text.trim().isNotEmpty 
              ? _dosageController.text.trim() 
              : 'No especificado',
          'frequency': _frequencyController.text.trim().isNotEmpty 
              ? _frequencyController.text.trim() 
              : 'No especificado',
          'duration': _durationController.text.trim().isNotEmpty 
              ? _durationController.text.trim() 
              : 'No especificado',
        });
        _episodeMedicationController.clear();
        _dosageController.clear();
        _frequencyController.clear();
        _durationController.clear();
      });
    }
  }

  void _removeEpisodeMedication(Map<String, String> medication) {
    setState(() {
      _episodeMedications.remove(medication);
    });
  }

  Future<void> _submitExtendedInfo() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      
      final extendedData = {
        // Información del médico tratante
        'hasVisitedDoctor': _hasVisitedDoctor,
        'treatingPhysician': _hasVisitedDoctor ? _treatingPhysicianController.text.trim() : null,
        'treatingPhysicianLicense': _hasVisitedDoctor ? _physicianLicenseController.text.trim() : null,
        'medicalInstitution': _hasVisitedDoctor ? _medicalInstitutionController.text.trim() : null,
        
        // Medicación regular
        'currentMedications': _currentMedications,
        
        // Historial médico
        'chronicDiseases': _chronicDiseases,
        'allergies': _allergies,
        
        // Medicación del episodio
        'episodeMedications': _episodeMedications,
      };

      final response = await authProvider.apiService.post('/medical/extended-info', extendedData);
      
      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Información médica guardada correctamente'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, extendedData);
      } else {
        throw Exception(response.error ?? 'Error guardando información');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _treatingPhysicianController.dispose();
    _physicianLicenseController.dispose();
    _medicalInstitutionController.dispose();
    _currentMedicationController.dispose();
    _chronicDiseasesController.dispose();
    _allergiesController.dispose();
    _episodeMedicationController.dispose();
    _dosageController.dispose();
    _frequencyController.dispose();
    _durationController.dispose();
    super.dispose();
  }
}