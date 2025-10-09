import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/enhanced_auth_provider.dart';
import '../../widgets/common/loading_overlay.dart';

class PhotoRequestScreen extends StatefulWidget {
  final String certificateId;

  PhotoRequestScreen({required this.certificateId});

  @override
  _PhotoRequestScreenState createState() => _PhotoRequestScreenState();
}

class _PhotoRequestScreenState extends State<PhotoRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final _bodyPartController = TextEditingController();
  final _bodyPartDetailController = TextEditingController();
  final _reasonController = TextEditingController();
  final _instructionsController = TextEditingController();

  String _selectedPhotoType = 'injury';
  bool _isRequired = true;
  bool _isLoading = false;

  final List<Map<String, dynamic>> _photoTypes = [
    {'value': 'injury', 'label': 'Lesión', 'icon': Icons.healing},
    {'value': 'lesion', 'label': 'Lesión cutánea', 'icon': Icons.local_hospital},
    {'value': 'swelling', 'label': 'Inflamación', 'icon': Icons.bubble_chart},
    {'value': 'rash', 'label': 'Erupción/Sarpullido', 'icon': Icons.scatter_plot},
    {'value': 'wound', 'label': 'Herida', 'icon': Icons.local_pharmacy},
    {'value': 'other', 'label': 'Otro', 'icon': Icons.camera_alt},
  ];

  final List<String> _commonBodyParts = [
    'Mano derecha', 'Mano izquierda', 'Brazo derecho', 'Brazo izquierdo',
    'Pierna derecha', 'Pierna izquierda', 'Pie derecho', 'Pie izquierdo',
    'Rodilla derecha', 'Rodilla izquierda', 'Tobillo derecho', 'Tobillo izquierdo',
    'Espalda', 'Cuello', 'Cabeza', 'Cara', 'Abdomen', 'Pecho', 'Otro'
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Solicitar Foto Médica'),
        backgroundColor: Colors.orange[700],
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
                Card(
                  color: Colors.orange[50],
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.info, color: Colors.orange[700]),
                            SizedBox(width: 8),
                            Text(
                              'Solicitud de Foto Médica',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.orange[700],
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 12),
                        Text(
                          'Complete los siguientes campos para solicitar una foto médica al empleado. '
                          'Esta solicitud será enviada inmediatamente y el empleado recibirá una notificación.',
                          style: TextStyle(
                            color: Colors.orange[800],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 16),

                // Tipo de foto
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tipo de Foto Requerida *',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _photoTypes.map((type) {
                            final isSelected = _selectedPhotoType == type['value'];
                            return FilterChip(
                              selected: isSelected,
                              onSelected: (selected) {
                                setState(() {
                                  _selectedPhotoType = type['value'];
                                });
                              },
                              label: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    type['icon'],
                                    size: 16,
                                    color: isSelected ? Colors.white : Colors.grey[700],
                                  ),
                                  SizedBox(width: 4),
                                  Text(type['label']),
                                ],
                              ),
                              selectedColor: Colors.orange[600],
                              checkmarkColor: Colors.white,
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 16),

                // Parte del cuerpo
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Parte del Cuerpo *',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 12),
                        
                        DropdownButtonFormField<String>(
                          value: _commonBodyParts.contains(_bodyPartController.text) 
                              ? _bodyPartController.text 
                              : null,
                          decoration: InputDecoration(
                            labelText: 'Seleccione la parte del cuerpo',
                            border: OutlineInputBorder(),
                          ),
                          items: _commonBodyParts.map((part) {
                            return DropdownMenuItem<String>(
                              value: part,
                              child: Text(part),
                            );
                          }).toList(),
                          onChanged: (value) {
                            if (value != null) {
                              _bodyPartController.text = value;
                            }
                          },
                          validator: (value) {
                            if (_bodyPartController.text.isEmpty) {
                              return 'Este campo es obligatorio';
                            }
                            return null;
                          },
                        ),
                        
                        if (_bodyPartController.text == 'Otro') ...[
                          SizedBox(height: 12),
                          TextFormField(
                            controller: _bodyPartController,
                            decoration: InputDecoration(
                              labelText: 'Especifique la parte del cuerpo *',
                              border: OutlineInputBorder(),
                            ),
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Este campo es obligatorio';
                              }
                              return null;
                            },
                          ),
                        ],
                        
                        SizedBox(height: 12),
                        TextFormField(
                          controller: _bodyPartDetailController,
                          decoration: InputDecoration(
                            labelText: 'Detalle específico (opcional)',
                            border: OutlineInputBorder(),
                            hintText: 'Ej: lado izquierdo, zona superior, etc.',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 16),

                // Motivo de la solicitud
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Justificación Médica *',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 12),
                        TextFormField(
                          controller: _reasonController,
                          maxLines: 3,
                          decoration: InputDecoration(
                            labelText: 'Motivo por el cual solicita la foto',
                            border: OutlineInputBorder(),
                            hintText: 'Explique por qué necesita esta foto para el diagnóstico o evaluación médica...',
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Debe explicar el motivo de la solicitud';
                            }
                            if (value.trim().length < 20) {
                              return 'La explicación debe ser más detallada';
                            }
                            return null;
                          },
                        ),
                        SizedBox(height: 12),
                        TextFormField(
                          controller: _instructionsController,
                          maxLines: 2,
                          decoration: InputDecoration(
                            labelText: 'Instrucciones específicas (opcional)',
                            border: OutlineInputBorder(),
                            hintText: 'Ej: Tomar la foto con buena iluminación, mostrar comparación con la otra mano, etc.',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 16),

                // Configuración
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Configuración',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SwitchListTile(
                          title: Text('Foto obligatoria'),
                          subtitle: Text(
                            'Si está activado, el empleado debe subir la foto para continuar el proceso',
                          ),
                          value: _isRequired,
                          onChanged: (value) {
                            setState(() {
                              _isRequired = value;
                            });
                          },
                          activeColor: Colors.orange[600],
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 24),

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
                        onPressed: _submitPhotoRequest,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange[600],
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: Text('Enviar Solicitud'),
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

  Future<void> _submitPhotoRequest() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      
      final requestData = {
        'certificateId': widget.certificateId,
        'bodyPart': _bodyPartController.text,
        'bodyPartDetail': _bodyPartDetailController.text.isNotEmpty 
            ? _bodyPartDetailController.text 
            : null,
        'photoType': _selectedPhotoType,
        'requestReason': _reasonController.text,
        'requestInstructions': _instructionsController.text.isNotEmpty 
            ? _instructionsController.text 
            : null,
        'isRequired': _isRequired,
      };

      final response = await authProvider.apiService.post('/medical/photos/request', requestData);
      
      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Solicitud de foto enviada correctamente'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      } else {
        throw Exception(response.error ?? 'Error enviando solicitud');
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
    _bodyPartController.dispose();
    _bodyPartDetailController.dispose();
    _reasonController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }
}