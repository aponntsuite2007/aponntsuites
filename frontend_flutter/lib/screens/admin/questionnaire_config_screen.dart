import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/enhanced_auth_provider.dart';
import '../../models/medical_questionnaire.dart';
import '../../widgets/common/loading_overlay.dart';

class QuestionnaireConfigScreen extends StatefulWidget {
  @override
  _QuestionnaireConfigScreenState createState() => _QuestionnaireConfigScreenState();
}

class _QuestionnaireConfigScreenState extends State<QuestionnaireConfigScreen> {
  List<MedicalQuestionnaire> _questionnaires = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadQuestionnaires();
  }

  Future<void> _loadQuestionnaires() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.get('/admin/questionnaires');
      
      if (response.isSuccess) {
        setState(() {
          _questionnaires = (response.data as List)
              .map((json) => MedicalQuestionnaire.fromJson(json))
              .toList();
        });
      } else {
        throw Exception(response.error ?? 'Error cargando cuestionarios');
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
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Configurar Cuestionarios Médicos'),
        backgroundColor: Colors.purple[700],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadQuestionnaires,
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: _isLoading,
        child: _questionnaires.isEmpty
            ? _buildEmptyState()
            : _buildQuestionnairesList(),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showQuestionnaireForm(null),
        backgroundColor: Colors.purple[700],
        child: Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.quiz,
            size: 64,
            color: Colors.grey[400],
          ),
          SizedBox(height: 16),
          Text(
            'No hay cuestionarios configurados',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Toca el botón + para crear uno nuevo',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionnairesList() {
    return ListView.builder(
      padding: EdgeInsets.all(16),
      itemCount: _questionnaires.length,
      itemBuilder: (context, index) {
        final questionnaire = _questionnaires[index];
        return _buildQuestionnaireCard(questionnaire);
      },
    );
  }

  Widget _buildQuestionnaireCard(MedicalQuestionnaire questionnaire) {
    return Card(
      margin: EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        questionnaire.name,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (questionnaire.description != null) ...[
                        SizedBox(height: 4),
                        Text(
                          questionnaire.description!,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                _buildStatusChip(questionnaire),
              ],
            ),
            SizedBox(height: 12),
            
            Row(
              children: [
                Icon(Icons.quiz, size: 16, color: Colors.grey[600]),
                SizedBox(width: 4),
                Text(
                  '${questionnaire.questions?.length ?? 0} preguntas',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                SizedBox(width: 16),
                Icon(Icons.business, size: 16, color: Colors.grey[600]),
                SizedBox(width: 4),
                Text(
                  questionnaire.companyId != null ? 'Empresa específica' : 'Todas las empresas',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () => _showQuestionnaireForm(questionnaire),
                  icon: Icon(Icons.edit, size: 16),
                  label: Text('Editar'),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.blue[600],
                  ),
                ),
                SizedBox(width: 8),
                TextButton.icon(
                  onPressed: () => _toggleQuestionnaireStatus(questionnaire),
                  icon: Icon(
                    questionnaire.isActive ? Icons.pause : Icons.play_arrow,
                    size: 16,
                  ),
                  label: Text(questionnaire.isActive ? 'Desactivar' : 'Activar'),
                  style: TextButton.styleFrom(
                    foregroundColor: questionnaire.isActive ? Colors.orange[600] : Colors.green[600],
                  ),
                ),
                SizedBox(width: 8),
                TextButton.icon(
                  onPressed: () => _deleteQuestionnaire(questionnaire),
                  icon: Icon(Icons.delete, size: 16),
                  label: Text('Eliminar'),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.red[600],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip(MedicalQuestionnaire questionnaire) {
    final isActive = questionnaire.isActive;
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive ? Colors.green.withOpacity(0.1) : Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isActive ? Colors.green.withOpacity(0.3) : Colors.grey.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isActive ? Icons.check_circle : Icons.pause_circle,
            size: 16,
            color: isActive ? Colors.green[700] : Colors.grey[700],
          ),
          SizedBox(width: 4),
          Text(
            isActive ? 'Activo' : 'Inactivo',
            style: TextStyle(
              color: isActive ? Colors.green[700] : Colors.grey[700],
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  void _showQuestionnaireForm(MedicalQuestionnaire? questionnaire) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => QuestionnaireFormScreen(
          questionnaire: questionnaire,
        ),
      ),
    ).then((result) {
      if (result == true) {
        _loadQuestionnaires();
      }
    });
  }

  Future<void> _toggleQuestionnaireStatus(MedicalQuestionnaire questionnaire) async {
    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      final response = await authProvider.apiService.put(
        '/admin/questionnaires/${questionnaire.id}/toggle',
        {},
      );
      
      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              questionnaire.isActive 
                  ? 'Cuestionario desactivado' 
                  : 'Cuestionario activado'
            ),
            backgroundColor: Colors.green,
          ),
        );
        _loadQuestionnaires();
      } else {
        throw Exception(response.error ?? 'Error cambiando estado');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _deleteQuestionnaire(MedicalQuestionnaire questionnaire) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Eliminar Cuestionario'),
        content: Text(
          '¿Estás seguro de que quieres eliminar el cuestionario "${questionnaire.name}"?\n\n'
          'Esta acción no se puede deshacer.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
        final response = await authProvider.apiService.delete('/admin/questionnaires/${questionnaire.id}');
        
        if (response.isSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Cuestionario eliminado'),
              backgroundColor: Colors.green,
            ),
          );
          _loadQuestionnaires();
        } else {
          throw Exception(response.error ?? 'Error eliminando cuestionario');
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

class QuestionnaireFormScreen extends StatefulWidget {
  final MedicalQuestionnaire? questionnaire;

  QuestionnaireFormScreen({this.questionnaire});

  @override
  _QuestionnaireFormScreenState createState() => _QuestionnaireFormScreenState();
}

class _QuestionnaireFormScreenState extends State<QuestionnaireFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  
  List<Map<String, dynamic>> _questions = [];
  bool _isActive = true;
  String? _selectedCompanyId;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.questionnaire != null) {
      _loadQuestionnaireData();
    } else {
      _addDefaultQuestion();
    }
  }

  void _loadQuestionnaireData() {
    final q = widget.questionnaire!;
    _nameController.text = q.name;
    _descriptionController.text = q.description ?? '';
    _isActive = q.isActive;
    _selectedCompanyId = q.companyId;
    _questions = List<Map<String, dynamic>>.from(q.questions ?? []);
    
    if (_questions.isEmpty) {
      _addDefaultQuestion();
    }
  }

  void _addDefaultQuestion() {
    _questions.add({
      'text': '',
      'type': 'text',
      'required': true,
      'options': null,
    });
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.questionnaire != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Editar Cuestionario' : 'Nuevo Cuestionario'),
        backgroundColor: Colors.purple[700],
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(Icons.save),
            onPressed: _saveQuestionnaire,
          ),
        ],
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
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Información General',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(height: 16),
                        TextFormField(
                          controller: _nameController,
                          decoration: InputDecoration(
                            labelText: 'Nombre del cuestionario *',
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'El nombre es obligatorio';
                            }
                            return null;
                          },
                        ),
                        SizedBox(height: 12),
                        TextFormField(
                          controller: _descriptionController,
                          decoration: InputDecoration(
                            labelText: 'Descripción (opcional)',
                            border: OutlineInputBorder(),
                          ),
                          maxLines: 2,
                        ),
                        SizedBox(height: 16),
                        SwitchListTile(
                          title: Text('Cuestionario activo'),
                          subtitle: Text('Los usuarios podrán usar este cuestionario'),
                          value: _isActive,
                          onChanged: (value) {
                            setState(() {
                              _isActive = value;
                            });
                          },
                          activeColor: Colors.purple[600],
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(height: 16),
                
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Preguntas',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            ElevatedButton.icon(
                              onPressed: _addQuestion,
                              icon: Icon(Icons.add, size: 16),
                              label: Text('Agregar'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.purple[600],
                                foregroundColor: Colors.white,
                              ),
                            ),
                          ],
                        ),
                        SizedBox(height: 16),
                        ..._questions.asMap().entries.map((entry) {
                          final index = entry.key;
                          final question = entry.value;
                          return _buildQuestionCard(index, question);
                        }).toList(),
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

  Widget _buildQuestionCard(int index, Map<String, dynamic> question) {
    return Card(
      margin: EdgeInsets.only(bottom: 12),
      color: Colors.grey[50],
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Pregunta ${index + 1}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.purple[700],
                    ),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _removeQuestion(index),
                  constraints: BoxConstraints(),
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
            SizedBox(height: 12),
            TextFormField(
              initialValue: question['text'],
              decoration: InputDecoration(
                labelText: 'Texto de la pregunta *',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              onChanged: (value) {
                question['text'] = value;
              },
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'La pregunta es obligatoria';
                }
                return null;
              },
            ),
            SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: question['type'],
                    decoration: InputDecoration(
                      labelText: 'Tipo de respuesta',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    items: [
                      DropdownMenuItem(value: 'text', child: Text('Texto libre')),
                      DropdownMenuItem(value: 'number', child: Text('Número')),
                      DropdownMenuItem(value: 'boolean', child: Text('Sí/No')),
                      DropdownMenuItem(value: 'scale', child: Text('Escala 1-10')),
                      DropdownMenuItem(value: 'multiple_choice', child: Text('Opción múltiple')),
                    ],
                    onChanged: (value) {
                      setState(() {
                        question['type'] = value;
                        if (value != 'multiple_choice') {
                          question['options'] = null;
                        }
                      });
                    },
                  ),
                ),
                SizedBox(width: 12),
                SizedBox(
                  width: 120,
                  child: SwitchListTile(
                    title: Text('Obligatoria', style: TextStyle(fontSize: 12)),
                    value: question['required'] ?? true,
                    onChanged: (value) {
                      setState(() {
                        question['required'] = value;
                      });
                    },
                    activeColor: Colors.purple[600],
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
            if (question['type'] == 'multiple_choice') ...[
              SizedBox(height: 12),
              _buildOptionsField(question),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOptionsField(Map<String, dynamic> question) {
    final options = question['options'] as List? ?? [];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              'Opciones de respuesta:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(width: 8),
            TextButton.icon(
              onPressed: () {
                setState(() {
                  if (question['options'] == null) {
                    question['options'] = [];
                  }
                  question['options'].add('');
                });
              },
              icon: Icon(Icons.add, size: 16),
              label: Text('Agregar'),
              style: TextButton.styleFrom(
                foregroundColor: Colors.purple[600],
              ),
            ),
          ],
        ),
        ...options.asMap().entries.map((entry) {
          final optionIndex = entry.key;
          final option = entry.value;
          
          return Padding(
            padding: EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: option,
                    decoration: InputDecoration(
                      labelText: 'Opción ${optionIndex + 1}',
                      border: OutlineInputBorder(),
                      isDense: true,
                    ),
                    onChanged: (value) {
                      options[optionIndex] = value;
                    },
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.remove_circle, color: Colors.red),
                  onPressed: () {
                    setState(() {
                      options.removeAt(optionIndex);
                    });
                  },
                ),
              ],
            ),
          );
        }).toList(),
      ],
    );
  }

  void _addQuestion() {
    setState(() {
      _questions.add({
        'text': '',
        'type': 'text',
        'required': true,
        'options': null,
      });
    });
  }

  void _removeQuestion(int index) {
    if (_questions.length > 1) {
      setState(() {
        _questions.removeAt(index);
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Debe haber al menos una pregunta'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  Future<void> _saveQuestionnaire() async {
    if (!_formKey.currentState!.validate()) return;

    final validQuestions = _questions.where((q) => 
        q['text'] != null && q['text'].toString().trim().isNotEmpty
    ).toList();

    if (validQuestions.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Debe haber al menos una pregunta válida'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<EnhancedAuthProvider>(context, listen: false);
      
      final data = {
        'name': _nameController.text.trim(),
        'description': _descriptionController.text.trim().isNotEmpty 
            ? _descriptionController.text.trim() 
            : null,
        'questions': validQuestions,
        'isActive': _isActive,
        'companyId': _selectedCompanyId,
      };

      final response = widget.questionnaire != null
          ? await authProvider.apiService.put('/admin/questionnaires/${widget.questionnaire!.id}', data)
          : await authProvider.apiService.post('/admin/questionnaires', data);
      
      if (response.isSuccess) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              widget.questionnaire != null 
                  ? 'Cuestionario actualizado' 
                  : 'Cuestionario creado'
            ),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context, true);
      } else {
        throw Exception(response.error ?? 'Error guardando cuestionario');
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
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
}