import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../models/medical_questionnaire.dart';

class MedicalQuestionnaireWidget extends StatefulWidget {
  final MedicalQuestionnaire questionnaire;
  final Map<String, dynamic> answers;
  final Function(String questionId, dynamic answer) onAnswerChanged;

  MedicalQuestionnaireWidget({
    required this.questionnaire,
    required this.answers,
    required this.onAnswerChanged,
  });

  @override
  _MedicalQuestionnaireWidgetState createState() => _MedicalQuestionnaireWidgetState();
}

class _MedicalQuestionnaireWidgetState extends State<MedicalQuestionnaireWidget> {
  Map<String, TextEditingController> _textControllers = {};
  Map<String, String?> _validationErrors = {};

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  void _initializeControllers() {
    for (var question in widget.questionnaire.questions) {
      if (question.isText || question.isNumber) {
        final controller = TextEditingController();
        final currentAnswer = widget.answers[question.id];
        if (currentAnswer != null) {
          controller.text = currentAnswer.toString();
        }
        _textControllers[question.id] = controller;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
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
                  Row(
                    children: [
                      Icon(Icons.quiz, color: Colors.red[700]),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          widget.questionnaire.name,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.red[700],
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (widget.questionnaire.description != null) ...[
                    SizedBox(height: 8),
                    Text(
                      widget.questionnaire.description!,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                  ],
                  SizedBox(height: 16),
                  
                  // Preguntas ordenadas
                  ...widget.questionnaire.questions
                      .where((q) => _shouldShowQuestion(q))
                      .map((question) => _buildQuestion(question))
                      .toList(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  bool _shouldShowQuestion(QuestionnaireQuestion question) {
    // Lógica condicional - mostrar pregunta basada en respuestas anteriores
    if (question.conditionalLogic == null) return true;
    
    final condition = question.conditionalLogic!;
    final dependsOn = condition['dependsOn'] as String?;
    final expectedValue = condition['expectedValue'];
    
    if (dependsOn != null) {
      final dependencyAnswer = widget.answers[dependsOn];
      return dependencyAnswer == expectedValue;
    }
    
    return true;
  }

  Widget _buildQuestion(QuestionnaireQuestion question) {
    return Container(
      margin: EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Título de la pregunta
          RichText(
            text: TextSpan(
              style: TextStyle(
                fontSize: 16,
                color: Colors.black87,
              ),
              children: [
                TextSpan(text: question.text),
                if (question.required)
                  TextSpan(
                    text: ' *',
                    style: TextStyle(color: Colors.red),
                  ),
              ],
            ),
          ),
          
          if (question.helpText != null) ...[
            SizedBox(height: 4),
            Text(
              question.helpText!,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey[600],
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          
          SizedBox(height: 8),
          
          // Widget específico para cada tipo de pregunta
          _buildQuestionWidget(question),
          
          // Error de validación
          if (_validationErrors[question.id] != null)
            Padding(
              padding: EdgeInsets.only(top: 4),
              child: Text(
                _validationErrors[question.id]!,
                style: TextStyle(
                  color: Colors.red,
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildQuestionWidget(QuestionnaireQuestion question) {
    switch (question.type) {
      case 'boolean':
        return _buildBooleanQuestion(question);
      case 'text':
        return _buildTextQuestion(question);
      case 'number':
        return _buildNumberQuestion(question);
      case 'select':
        return _buildSelectQuestion(question);
      case 'multiselect':
        return _buildMultiSelectQuestion(question);
      case 'date':
        return _buildDateQuestion(question);
      default:
        return Text('Tipo de pregunta no soportado: ${question.type}');
    }
  }

  Widget _buildBooleanQuestion(QuestionnaireQuestion question) {
    final currentValue = widget.answers[question.id] as bool?;
    
    return Column(
      children: [
        RadioListTile<bool>(
          title: Text('Sí'),
          value: true,
          groupValue: currentValue,
          onChanged: (value) => _updateAnswer(question.id, value),
          activeColor: Colors.red[700],
        ),
        RadioListTile<bool>(
          title: Text('No'),
          value: false,
          groupValue: currentValue,
          onChanged: (value) => _updateAnswer(question.id, value),
          activeColor: Colors.red[700],
        ),
      ],
    );
  }

  Widget _buildTextQuestion(QuestionnaireQuestion question) {
    final controller = _textControllers[question.id]!;
    
    return TextFormField(
      controller: controller,
      maxLines: question.validation?['multiline'] == true ? 3 : 1,
      decoration: InputDecoration(
        border: OutlineInputBorder(),
        hintText: 'Escriba su respuesta...',
      ),
      onChanged: (value) => _updateAnswer(question.id, value),
      validator: (value) => _validateAnswer(question, value),
    );
  }

  Widget _buildNumberQuestion(QuestionnaireQuestion question) {
    final controller = _textControllers[question.id]!;
    
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.numberWithOptions(decimal: true),
      decoration: InputDecoration(
        border: OutlineInputBorder(),
        hintText: 'Ingrese un número...',
        suffixText: question.validation?['unit'] as String?,
      ),
      onChanged: (value) {
        final numValue = double.tryParse(value);
        _updateAnswer(question.id, numValue);
      },
      validator: (value) => _validateAnswer(question, value),
    );
  }

  Widget _buildSelectQuestion(QuestionnaireQuestion question) {
    final currentValue = widget.answers[question.id] as String?;
    
    return DropdownButtonFormField<String>(
      value: currentValue,
      decoration: InputDecoration(
        border: OutlineInputBorder(),
      ),
      hint: Text('Seleccione una opción'),
      items: question.options?.map((option) {
        return DropdownMenuItem<String>(
          value: option,
          child: Text(option),
        );
      }).toList(),
      onChanged: (value) => _updateAnswer(question.id, value),
      validator: (value) => _validateAnswer(question, value),
    );
  }

  Widget _buildMultiSelectQuestion(QuestionnaireQuestion question) {
    final currentValues = widget.answers[question.id] as List<String>? ?? [];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: question.options?.map((option) {
        final isSelected = currentValues.contains(option);
        
        return CheckboxListTile(
          title: Text(option),
          value: isSelected,
          onChanged: (checked) {
            List<String> newValues = List<String>.from(currentValues);
            if (checked == true && !newValues.contains(option)) {
              newValues.add(option);
            } else if (checked == false) {
              newValues.remove(option);
            }
            _updateAnswer(question.id, newValues);
          },
          activeColor: Colors.red[700],
        );
      }).toList() ?? [],
    );
  }

  Widget _buildDateQuestion(QuestionnaireQuestion question) {
    final currentValue = widget.answers[question.id];
    DateTime? selectedDate;
    
    if (currentValue != null) {
      if (currentValue is DateTime) {
        selectedDate = currentValue;
      } else if (currentValue is String) {
        selectedDate = DateTime.tryParse(currentValue);
      }
    }
    
    return InkWell(
      onTap: () => _selectDate(question),
      child: Container(
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              selectedDate != null 
                  ? DateFormat('dd/MM/yyyy').format(selectedDate)
                  : 'Seleccionar fecha',
              style: TextStyle(
                fontSize: 16,
                color: selectedDate != null ? Colors.black87 : Colors.grey[600],
              ),
            ),
            Icon(Icons.calendar_today, color: Colors.red[700]),
          ],
        ),
      ),
    );
  }

  Future<void> _selectDate(QuestionnaireQuestion question) async {
    final currentValue = widget.answers[question.id];
    DateTime initialDate = DateTime.now();
    
    if (currentValue != null) {
      if (currentValue is DateTime) {
        initialDate = currentValue;
      } else if (currentValue is String) {
        initialDate = DateTime.tryParse(currentValue) ?? DateTime.now();
      }
    }
    
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime(1900),
      lastDate: DateTime.now().add(Duration(days: 365)),
      locale: Locale('es', 'ES'),
    );
    
    if (picked != null) {
      _updateAnswer(question.id, picked.toIso8601String());
    }
  }

  void _updateAnswer(String questionId, dynamic answer) {
    // Limpiar error de validación
    setState(() {
      _validationErrors.remove(questionId);
    });
    
    widget.onAnswerChanged(questionId, answer);
    
    // Re-evaluar preguntas condicionales
    setState(() {});
  }

  String? _validateAnswer(QuestionnaireQuestion question, dynamic value) {
    if (!question.validateAnswer(value)) {
      final error = question.getValidationError(value);
      _validationErrors[question.id] = error;
      return error;
    }
    
    _validationErrors.remove(question.id);
    return null;
  }

  @override
  void dispose() {
    _textControllers.values.forEach((controller) => controller.dispose());
    super.dispose();
  }
}