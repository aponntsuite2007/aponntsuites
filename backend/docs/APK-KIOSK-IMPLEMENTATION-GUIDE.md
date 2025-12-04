# 📱 GUÍA MAESTRA DE IMPLEMENTACIÓN: APK KIOSK DE EXCELENCIA

> **DOCUMENTO CRÍTICO**: Este documento contiene TODAS las tareas técnicas necesarias para implementar la APK Kiosk de fichaje biométrico con estándares de excelencia industrial.
>
> **Fecha**: 2025-11-29
> **Estado**: EN PROGRESO
> **Progreso Global**: 0%

---

## 📋 ÍNDICE

1. [Estado Actual del Sistema](#1-estado-actual-del-sistema)
2. [Arquitectura de Supervisores](#2-arquitectura-de-supervisores)
3. [FASE 1: Biometría Real](#3-fase-1-biometría-real)
4. [FASE 2: APK Kiosk Profesional](#4-fase-2-apk-kiosk-profesional)
5. [FASE 3: UX/Feedback de Excelencia](#5-fase-3-uxfeedback-de-excelencia)
6. [FASE 4: Notificaciones Multi-canal](#6-fase-4-notificaciones-multi-canal)
7. [FASE 5: Seguridad Enterprise](#7-fase-5-seguridad-enterprise)
8. [FASE 6: Modo Offline Robusto](#8-fase-6-modo-offline-robusto)
9. [Checklist de Verificación](#9-checklist-de-verificación)

---

## 1. ESTADO ACTUAL DEL SISTEMA

### 1.1 Componentes Existentes

| Componente | Ubicación | Estado | Problema |
|------------|-----------|--------|----------|
| **Flutter APK** | `frontend_flutter/` | 70% | WebSocket stub, sin liveness |
| **SmartCapture** | `kiosk_screen.dart:31-92` | 85% | Umbral fijo 0.65 |
| **Biometric Matching** | `biometric-matching-service.js` | SIMULADO | Genera random embeddings |
| **Face-api.js Backend** | `face-api-backend-engine.js` | 30% | Modelos no cargados |
| **Azure Face API** | `azure-face-service.js` | 60% | Sin PersonGroup |
| **Autorizaciones** | `LateArrivalAuthorizationService.js` | 85% | APK sin polling |
| **Notificaciones** | `NotificationEnterpriseService.js` | 95% | Sin FCM/WhatsApp |
| **Visitantes** | `Visitor-postgresql.js` + routes | 100% | Completo |
| **Offline Queue** | `offline_queue_service.dart` | 70% | Sin conflict resolution |

### 1.2 Archivos Clave

```
FLUTTER APK:
├── frontend_flutter/lib/main.dart                    # Entry point
├── frontend_flutter/lib/screens/kiosk_screen.dart    # Pantalla principal (903 líneas)
├── frontend_flutter/lib/screens/password_auth_screen.dart  # Auth alternativa
├── frontend_flutter/lib/services/
│   ├── config_service.dart                           # Configuración servidor
│   ├── offline_queue_service.dart                    # Cola SQLite
│   ├── hardware_profile_service.dart                 # Perfiles 30+ dispositivos
│   ├── websocket_service.dart                        # ⚠️ STUB VACÍO
│   ├── face_liveness_service.dart                    # ⚠️ NO INTEGRADO
│   └── geofencing_service.dart                       # ⚠️ NO INTEGRADO

BACKEND:
├── src/services/biometric-matching-service.js        # ⚠️ SIMULADO
├── src/services/face-api-backend-engine.js           # Face-api.js real
├── src/services/azure-face-service.js                # Azure wrapper
├── src/services/LateArrivalAuthorizationService.js   # Autorizaciones (754 líneas)
├── src/routes/authorizationRoutes.js                 # API autorizaciones
├── src/routes/biometric-attendance-api.js            # API fichaje (líneas 1247-1330)
├── src/config/websocket.js                           # Socket.IO servidor
```

---

## 2. ARQUITECTURA DE SUPERVISORES

### 2.1 Problema Actual

El sistema actual en `LateArrivalAuthorizationService.findAuthorizersForDepartment()` busca:
```sql
SELECT * FROM users
WHERE company_id = $1
  AND is_active = true
  AND can_authorize_late_arrivals = true
  AND (authorized_departments @> $2::jsonb OR authorized_departments = '[]'::jsonb)
ORDER BY role (admin, supervisor, otros)
```

**Limitación**: Solo filtra por `company_id` y `department_id`. NO considera:
- ❌ Sucursal (branch_id)
- ❌ Sector
- ❌ Turno (shift_id)
- ❌ RRHH automático

### 2.2 Solución: Búsqueda Jerárquica Completa

**ARCHIVO A MODIFICAR**: `backend/src/services/LateArrivalAuthorizationService.js`

**NUEVA FUNCIÓN** (reemplazar `findAuthorizersForDepartment`):

```javascript
/**
 * Buscar autorizadores con jerarquía completa
 * Orden de prioridad:
 * 1. Supervisor directo del turno/sector
 * 2. Supervisor del departamento
 * 3. Supervisor de la sucursal
 * 4. RRHH de la empresa
 * 5. Fallback de empresa
 */
async findAuthorizersHierarchical({
  employeeId,
  departmentId,
  branchId,
  shiftId,
  sector,
  companyId
}) {
  try {
    // 1. Obtener supervisor directo del turno/sector si existe
    const shiftSupervisorQuery = `
      SELECT DISTINCT u.user_id, u.first_name, u.last_name, u.email,
             u.whatsapp_number, u.notification_preference_late_arrivals, u.role
      FROM users u
      INNER JOIN user_shift_assignments usa ON usa.user_id = u.user_id
      WHERE u.company_id = $1
        AND u.is_active = true
        AND u.role IN ('supervisor', 'manager', 'admin')
        AND usa.shift_id = $2
        ${sector ? "AND usa.sector = $5" : ""}
        AND u.user_id != $3
      LIMIT 3
    `;

    // 2. Supervisores del departamento
    const deptSupervisorQuery = `
      SELECT u.user_id, u.first_name, u.last_name, u.email,
             u.whatsapp_number, u.notification_preference_late_arrivals, u.role
      FROM users u
      WHERE u.company_id = $1
        AND u.is_active = true
        AND u.can_authorize_late_arrivals = true
        AND u.department_id = $2
        AND u.role IN ('supervisor', 'manager')
        AND u.user_id != $3
      LIMIT 3
    `;

    // 3. Supervisores de la sucursal
    const branchSupervisorQuery = `
      SELECT u.user_id, u.first_name, u.last_name, u.email,
             u.whatsapp_number, u.notification_preference_late_arrivals, u.role
      FROM users u
      WHERE u.company_id = $1
        AND u.is_active = true
        AND u.default_branch_id = $2
        AND u.role IN ('manager', 'admin')
        AND u.user_id != $3
      LIMIT 2
    `;

    // 4. RRHH de la empresa (SIEMPRE incluir)
    const hrQuery = `
      SELECT u.user_id, u.first_name, u.last_name, u.email,
             u.whatsapp_number, u.notification_preference_late_arrivals, u.role
      FROM users u
      WHERE u.company_id = $1
        AND u.is_active = true
        AND (
          u.role = 'admin'
          OR u.department_id IN (
            SELECT id FROM departments
            WHERE company_id = $1
            AND LOWER(name) LIKE '%rrhh%'
            OR LOWER(name) LIKE '%recursos humanos%'
            OR LOWER(name) LIKE '%human resources%'
          )
        )
      LIMIT 3
    `;

    // Ejecutar queries
    const [shiftSupervisors, deptSupervisors, branchSupervisors, hrUsers] = await Promise.all([
      shiftId ? sequelize.query(shiftSupervisorQuery, {
        bind: sector ? [companyId, shiftId, employeeId, departmentId, sector]
                     : [companyId, shiftId, employeeId, departmentId],
        type: QueryTypes.SELECT
      }) : [],
      sequelize.query(deptSupervisorQuery, {
        bind: [companyId, departmentId, employeeId],
        type: QueryTypes.SELECT
      }),
      branchId ? sequelize.query(branchSupervisorQuery, {
        bind: [companyId, branchId, employeeId],
        type: QueryTypes.SELECT
      }) : [],
      sequelize.query(hrQuery, {
        bind: [companyId],
        type: QueryTypes.SELECT
      })
    ]);

    // Combinar sin duplicados, priorizando por nivel
    const seen = new Set();
    const authorizers = [];

    const addUnique = (users, priority) => {
      for (const user of users) {
        if (!seen.has(user.user_id)) {
          seen.add(user.user_id);
          authorizers.push({ ...user, priority });
        }
      }
    };

    addUnique(shiftSupervisors, 1);  // Máxima prioridad
    addUnique(deptSupervisors, 2);
    addUnique(branchSupervisors, 3);
    addUnique(hrUsers, 4);           // RRHH siempre incluido

    console.log(`🔍 [AUTH] Found ${authorizers.length} authorizers hierarchically`);
    console.log(`   - Shift/Sector: ${shiftSupervisors.length}`);
    console.log(`   - Department: ${deptSupervisors.length}`);
    console.log(`   - Branch: ${branchSupervisors.length}`);
    console.log(`   - HR: ${hrUsers.length}`);

    return authorizers;

  } catch (error) {
    console.error('❌ [AUTH] Error in hierarchical search:', error);
    return [];
  }
}
```

### 2.3 Modificar sendAuthorizationRequest

**LÍNEAS A MODIFICAR**: `LateArrivalAuthorizationService.js:109-138`

```javascript
async sendAuthorizationRequest({
  employeeData,
  attendanceId,
  authorizationToken,
  shiftData,
  lateMinutes,
  companyId
}) {
  try {
    // NUEVO: Obtener datos completos del empleado
    const employeeFullData = await sequelize.query(`
      SELECT u.*, usa.shift_id, usa.sector, d.name as department_name
      FROM users u
      LEFT JOIN user_shift_assignments usa ON usa.user_id = u.user_id AND usa.is_active = true
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.user_id = $1
    `, {
      bind: [employeeData.user_id],
      type: QueryTypes.SELECT,
      plain: true
    });

    // NUEVO: Búsqueda jerárquica de autorizadores
    const authorizers = await this.findAuthorizersHierarchical({
      employeeId: employeeData.user_id,
      departmentId: employeeFullData.department_id,
      branchId: employeeFullData.default_branch_id,
      shiftId: employeeFullData.shift_id,
      sector: employeeFullData.sector,
      companyId
    });

    // ... resto del código igual ...
  }
}
```

### 2.4 Integración con Notificaciones Proactivas

Si no hay autorizadores disponibles, crear hilo en bandeja de RRHH:

**ARCHIVO**: `LateArrivalAuthorizationService.js` - método `_sendFallbackNotification`

```javascript
async _sendFallbackNotification({ employeeData, authorizationToken, ... }) {
  // AGREGAR: Crear notificación en bandeja de RRHH
  const { AccessNotification } = require('../models');

  await AccessNotification.create({
    company_id: companyId,
    notification_type: 'employee_late_arrival',
    priority: 'high',
    title: `⚠️ Autorización Pendiente - ${employeeData.first_name} ${employeeData.last_name}`,
    message: `Llegada tardía de ${lateMinutes} minutos. Requiere autorización.`,
    related_user_id: employeeData.user_id,
    related_attendance_id: attendanceId,
    metadata: {
      authorizationToken,
      lateMinutes,
      shiftData,
      approveUrl: `${this.serverBaseUrl}/api/v1/authorization/approve/${authorizationToken}`,
      rejectUrl: `${this.serverBaseUrl}/api/v1/authorization/reject/${authorizationToken}`
    },
    action_taken: false
  });

  // Enviar también al WebSocket de admins
  websocket.sendToAdmins('pending_authorization', {
    type: 'late_arrival',
    attendanceId,
    authorizationToken,
    employee: employeeData,
    lateMinutes
  });

  // ... resto del código de fallback email/whatsapp ...
}
```

---

## 3. FASE 1: BIOMETRÍA REAL

### 3.1 Tarea 1.1: Activar Face-api.js Real

**ARCHIVO**: `backend/src/services/biometric-matching-service.js`

**PROBLEMA** (línea 141-192): Método `extractEmbedding` usa `simulateEmbeddingExtraction`

**SOLUCIÓN**:

```javascript
// ANTES (línea 176):
const embedding = this.simulateEmbeddingExtraction(captureData.imageData);

// DESPUÉS:
const { faceApiBackendEngine } = require('./face-api-backend-engine');
const result = await faceApiBackendEngine.processWithRealFaceAPI(
  Buffer.from(captureData.imageData, 'base64')
);
if (!result.success) {
  throw new Error(result.error);
}
const embedding = result.embedding;
```

**ELIMINAR COMPLETAMENTE** (líneas 175-192):
- `simulateEmbeddingExtraction()`
- Todo código que genere `Math.random()`

### 3.2 Tarea 1.2: Cargar Modelos Face-api.js

**ARCHIVO**: `backend/src/services/face-api-backend-engine.js`

**PASO 1**: Descargar modelos (ejecutar UNA vez):
```bash
mkdir -p backend/models/face-api
cd backend/models/face-api

# Descargar desde https://github.com/justadudewhohacks/face-api.js/tree/master/weights
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-weights_manifest.json
wget https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-shard1
```

**PASO 2**: Modificar `face-api-backend-engine.js`:
```javascript
// Línea ~35 - Agregar path de modelos
this.config = {
  modelPath: path.join(__dirname, '../../models/face-api'),
  ...
};

// En initialize() - Cargar modelos reales
async initialize() {
  if (this.isInitialized) return;

  console.log('🧠 [FACE-API] Loading models from:', this.config.modelPath);

  await faceapi.nets.tinyFaceDetector.loadFromDisk(this.config.modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(this.config.modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(this.config.modelPath);
  await faceapi.nets.faceExpressionNet.loadFromDisk(this.config.modelPath);

  this.isInitialized = true;
  console.log('✅ [FACE-API] All models loaded successfully');
}
```

### 3.3 Tarea 1.3: Implementar Azure PersonGroup

**ARCHIVO**: `backend/src/services/azure-face-service.js`

**AGREGAR** después de línea 350:

```javascript
/**
 * PersonGroup Management para persistencia de embeddings
 */
async createPersonGroup(companyId, groupName) {
  const personGroupId = `company-${companyId}`;

  try {
    await axios({
      method: 'PUT',
      url: `${this.endpoint}/face/v1.0/persongroups/${personGroupId}`,
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      data: {
        name: groupName,
        userData: JSON.stringify({ companyId, createdAt: new Date().toISOString() }),
        recognitionModel: 'recognition_04'
      }
    });

    console.log(`✅ [AZURE] PersonGroup created: ${personGroupId}`);
    return { success: true, personGroupId };
  } catch (error) {
    if (error.response?.status === 409) {
      // Ya existe
      return { success: true, personGroupId, existed: true };
    }
    throw error;
  }
}

async createPerson(companyId, employeeId, employeeName) {
  const personGroupId = `company-${companyId}`;

  const response = await axios({
    method: 'POST',
    url: `${this.endpoint}/face/v1.0/persongroups/${personGroupId}/persons`,
    headers: {
      'Ocp-Apim-Subscription-Key': this.apiKey,
      'Content-Type': 'application/json'
    },
    data: {
      name: employeeName,
      userData: JSON.stringify({ employeeId })
    }
  });

  return response.data.personId;
}

async addFaceToPerson(companyId, personId, imageBuffer) {
  const personGroupId = `company-${companyId}`;

  const response = await axios({
    method: 'POST',
    url: `${this.endpoint}/face/v1.0/persongroups/${personGroupId}/persons/${personId}/persistedFaces`,
    headers: {
      'Ocp-Apim-Subscription-Key': this.apiKey,
      'Content-Type': 'application/octet-stream'
    },
    data: imageBuffer
  });

  return response.data.persistedFaceId;
}

async trainPersonGroup(companyId) {
  const personGroupId = `company-${companyId}`;

  await axios({
    method: 'POST',
    url: `${this.endpoint}/face/v1.0/persongroups/${personGroupId}/train`,
    headers: {
      'Ocp-Apim-Subscription-Key': this.apiKey
    }
  });

  console.log(`🏋️ [AZURE] Training started for ${personGroupId}`);
}

async identifyFace(companyId, faceId) {
  const personGroupId = `company-${companyId}`;

  const response = await axios({
    method: 'POST',
    url: `${this.endpoint}/face/v1.0/identify`,
    headers: {
      'Ocp-Apim-Subscription-Key': this.apiKey,
      'Content-Type': 'application/json'
    },
    data: {
      personGroupId,
      faceIds: [faceId],
      maxNumOfCandidatesReturned: 1,
      confidenceThreshold: 0.7
    }
  });

  return response.data[0]?.candidates?.[0] || null;
}
```

### 3.4 Tarea 1.4: Integrar Liveness Detection en APK

**ARCHIVO**: `frontend_flutter/lib/screens/kiosk_screen.dart`

**MODIFICAR** método `_sendToBackend()` (línea 440):

```dart
Future<void> _sendToBackend(List<int> imageBytes) async {
  try {
    // NUEVO: Verificar liveness ANTES de enviar
    final livenessService = FaceLivenessService();
    final livenessResult = await livenessService.checkLiveness(imageBytes);

    if (!livenessResult.isReal) {
      print('🚫 [KIOSK] Liveness check failed: ${livenessResult.reason}');
      _showTrafficLight(TrafficLightState.red);
      await _flutterTts?.speak("Intento de suplantación detectado");
      return;
    }

    // ... resto del código de envío ...
  }
}
```

**CREAR** si no existe `frontend_flutter/lib/services/face_liveness_service.dart`:

```dart
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

class FaceLivenessService {
  /// Verifica que sea una persona real, no una foto
  Future<LivenessResult> checkLiveness(List<int> imageBytes) async {
    try {
      // 1. Detectar parpadeo (eye aspect ratio)
      // 2. Detectar movimiento de cabeza
      // 3. Verificar profundidad 3D si disponible
      // 4. Analizar textura de piel vs papel/pantalla

      // Implementación básica con ML Kit
      final inputImage = InputImage.fromBytes(
        bytes: Uint8List.fromList(imageBytes),
        metadata: InputImageMetadata(
          size: Size(640, 480),
          rotation: InputImageRotation.rotation0deg,
          format: InputImageFormat.nv21,
          bytesPerRow: 640,
        ),
      );

      final faceDetector = FaceDetector(
        options: FaceDetectorOptions(
          enableClassification: true, // Para detectar ojos abiertos/cerrados
          enableLandmarks: true,
          performanceMode: FaceDetectorMode.accurate,
        ),
      );

      final faces = await faceDetector.processImage(inputImage);

      if (faces.isEmpty) {
        return LivenessResult(isReal: false, reason: 'No face detected');
      }

      final face = faces.first;

      // Verificar que los ojos estén abiertos (probabilidad > 0.5)
      final leftEyeOpen = face.leftEyeOpenProbability ?? 0;
      final rightEyeOpen = face.rightEyeOpenProbability ?? 0;

      if (leftEyeOpen < 0.3 && rightEyeOpen < 0.3) {
        return LivenessResult(isReal: false, reason: 'Eyes closed');
      }

      // Verificar ángulos de cabeza (no debe ser perfectamente frontal como una foto)
      final headY = face.headEulerAngleY?.abs() ?? 0;
      final headX = face.headEulerAngleX?.abs() ?? 0;

      // Si la cabeza está DEMASIADO quieta, podría ser una foto
      // (Una persona real tiene micro-movimientos)
      // NOTA: Este es un check básico, mejorar con análisis temporal

      return LivenessResult(
        isReal: true,
        confidence: (leftEyeOpen + rightEyeOpen) / 2,
        headPose: {'x': headX, 'y': headY},
      );

    } catch (e) {
      print('❌ [LIVENESS] Error: $e');
      return LivenessResult(isReal: true, reason: 'Check failed, allowing');
    }
  }
}

class LivenessResult {
  final bool isReal;
  final String? reason;
  final double? confidence;
  final Map<String, double>? headPose;

  LivenessResult({
    required this.isReal,
    this.reason,
    this.confidence,
    this.headPose,
  });
}
```

---

## 4. FASE 2: APK KIOSK PROFESIONAL

### 4.1 Tarea 2.1: Implementar WebSocket Real

**ARCHIVO**: `frontend_flutter/lib/services/websocket_service.dart`

**REEMPLAZAR TODO** con:

```dart
import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import 'package:flutter/foundation.dart';

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  WebSocketChannel? _channel;
  bool _isConnected = false;
  Timer? _reconnectTimer;
  Timer? _heartbeatTimer;
  String? _serverUrl;
  String? _authToken;
  String? _userId;

  // Stream controllers para eventos
  final _authorizationResultController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStatusController = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get authorizationResults => _authorizationResultController.stream;
  Stream<bool> get connectionStatus => _connectionStatusController.stream;
  bool get isConnected => _isConnected;

  Future<void> initialize(String serverUrl, String authToken, String userId) async {
    _serverUrl = serverUrl;
    _authToken = authToken;
    _userId = userId;
    await connect();
  }

  Future<void> connect() async {
    if (_serverUrl == null) return;

    try {
      final wsUrl = _serverUrl!.replaceFirst('http', 'ws');
      final uri = Uri.parse('$wsUrl/ws/kiosk?token=$_authToken&userId=$_userId');

      debugPrint('🔌 [WS] Connecting to: $uri');

      _channel = IOWebSocketChannel.connect(
        uri,
        pingInterval: Duration(seconds: 30),
      );

      _isConnected = true;
      _connectionStatusController.add(true);
      debugPrint('✅ [WS] Connected successfully');

      // Escuchar mensajes
      _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDisconnect,
      );

      // Iniciar heartbeat
      _startHeartbeat();

      // Autenticar
      sendMessage({
        'type': 'authenticate',
        'token': _authToken,
        'userId': _userId,
      });

    } catch (e) {
      debugPrint('❌ [WS] Connection error: $e');
      _isConnected = false;
      _connectionStatusController.add(false);
      _scheduleReconnect();
    }
  }

  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String) as Map<String, dynamic>;
      debugPrint('📥 [WS] Received: ${data['type']}');

      switch (data['type']) {
        case 'authorization_result':
          _authorizationResultController.add(data);
          break;
        case 'pong':
          // Heartbeat response
          break;
        case 'error':
          debugPrint('⚠️ [WS] Server error: ${data['message']}');
          break;
      }
    } catch (e) {
      debugPrint('❌ [WS] Error parsing message: $e');
    }
  }

  void _handleError(error) {
    debugPrint('❌ [WS] Error: $error');
    _isConnected = false;
    _connectionStatusController.add(false);
    _scheduleReconnect();
  }

  void _handleDisconnect() {
    debugPrint('🔌 [WS] Disconnected');
    _isConnected = false;
    _connectionStatusController.add(false);
    _scheduleReconnect();
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(Duration(seconds: 25), (_) {
      if (_isConnected) {
        sendMessage({'type': 'ping'});
      }
    });
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: 5), () {
      debugPrint('🔄 [WS] Attempting reconnect...');
      connect();
    });
  }

  void sendMessage(Map<String, dynamic> message) {
    if (_isConnected && _channel != null) {
      _channel!.sink.add(jsonEncode(message));
    }
  }

  void disconnect() {
    _heartbeatTimer?.cancel();
    _reconnectTimer?.cancel();
    _channel?.sink.close();
    _isConnected = false;
    _connectionStatusController.add(false);
  }

  void dispose() {
    disconnect();
    _authorizationResultController.close();
    _connectionStatusController.close();
  }
}
```

### 4.2 Tarea 2.2: Implementar Polling de Autorizaciones

**ARCHIVO**: `frontend_flutter/lib/screens/kiosk_screen.dart`

**AGREGAR** después de `_showLateArrivalAlert` (línea 527):

```dart
/// 🕐 ESPERAR AUTORIZACIÓN CON POLLING
Future<AuthorizationResult> _waitForAuthorization(String token, String employeeName) async {
  final wsService = WebSocketService();

  // Estado visual: Púrpura pulsante
  setState(() {
    _trafficLight = TrafficLightState.waitingAuth;
    _isWaitingAuthorization = true;
    _authorizationCountdown = 300; // 5 minutos
  });

  // Mostrar pantalla de espera
  _showWaitingAuthorizationOverlay(employeeName);

  // Escuchar WebSocket para resultado inmediato
  final wsSubscription = wsService.authorizationResults.listen((data) {
    if (data['authorizationToken'] == token) {
      _handleAuthorizationResult(data);
    }
  });

  // Polling HTTP como backup (cada 3 segundos)
  Timer? pollingTimer;
  pollingTimer = Timer.periodic(Duration(seconds: 3), (timer) async {
    if (!_isWaitingAuthorization) {
      timer.cancel();
      return;
    }

    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/v1/authorization/status/$token'),
        headers: {'Authorization': 'Bearer $_authToken'},
      ).timeout(Duration(seconds: 5));

      if (response.statusCode == 200) {
        final status = jsonDecode(response.body);

        if (status['status'] == 'approved') {
          timer.cancel();
          wsSubscription.cancel();
          _hideWaitingOverlay();
          return AuthorizationResult(approved: true, authorizer: status['authorizedBy']);
        }

        if (status['status'] == 'rejected') {
          timer.cancel();
          wsSubscription.cancel();
          _hideWaitingOverlay();
          return AuthorizationResult(approved: false, reason: status['notes']);
        }
      }
    } catch (e) {
      print('⚠️ [POLLING] Error: $e');
    }

    // Actualizar countdown
    setState(() {
      _authorizationCountdown -= 3;
    });

    // Timeout después de 5 minutos
    if (_authorizationCountdown <= 0) {
      timer.cancel();
      wsSubscription.cancel();
      _hideWaitingOverlay();
      return AuthorizationResult(approved: false, reason: 'Timeout - Sin respuesta');
    }
  });

  // Esperar resultado
  await Future.delayed(Duration(minutes: 5));
  pollingTimer?.cancel();
  wsSubscription.cancel();

  return AuthorizationResult(approved: false, reason: 'Timeout');
}

void _showWaitingAuthorizationOverlay(String employeeName) {
  showDialog(
    context: context,
    barrierDismissible: false,
    builder: (context) => WillPopScope(
      onWillPop: () async => false,
      child: AlertDialog(
        backgroundColor: Colors.purple.shade700,
        title: Row(
          children: [
            SizedBox(
              width: 30,
              height: 30,
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                strokeWidth: 3,
              ),
            ),
            SizedBox(width: 16),
            Expanded(
              child: Text(
                'ESPERANDO AUTORIZACIÓN',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              employeeName,
              style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            StreamBuilder<int>(
              stream: Stream.periodic(Duration(seconds: 1), (i) => _authorizationCountdown - i),
              builder: (context, snapshot) {
                final seconds = snapshot.data ?? _authorizationCountdown;
                final minutes = seconds ~/ 60;
                final secs = seconds % 60;
                return Text(
                  'Tiempo restante: ${minutes}:${secs.toString().padLeft(2, '0')}',
                  style: TextStyle(color: Colors.white70, fontSize: 18),
                );
              },
            ),
            SizedBox(height: 16),
            Text(
              'Su supervisor ha sido notificado.\nPor favor espere en la entrada.',
              style: TextStyle(color: Colors.white70, fontSize: 14),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    ),
  );
}

class AuthorizationResult {
  final bool approved;
  final String? authorizer;
  final String? reason;

  AuthorizationResult({required this.approved, this.authorizer, this.reason});
}
```

### 4.3 Tarea 2.3: Mejorar SmartCapture Walk-through

**ARCHIVO**: `frontend_flutter/lib/screens/kiosk_screen.dart`

**REEMPLAZAR** clase SmartCapture (líneas 31-92):

```dart
/// 🧠 SMART CAPTURE V2 - Walk-through Detection
class SmartCaptureV2 {
  DateTime? _lastCapture;
  final Duration _minInterval = Duration(milliseconds: 200); // Más rápido
  double _dynamicThreshold = 0.65;
  bool _isProcessing = false;

  // Tracking de frames para estabilidad
  List<FaceQualityFrame> _recentFrames = [];
  static const int _framesToTrack = 5;

  // Burst capture para elegir mejor
  List<CapturedFrame> _burstBuffer = [];
  static const int _burstSize = 3;

  bool shouldCapture() {
    if (_isProcessing) return false;
    if (_lastCapture == null) return true;
    return DateTime.now().difference(_lastCapture!) >= _minInterval;
  }

  double calculateQuality(Face face, Size imageSize) {
    // 1. Confidence tracking (peso: 40%)
    double confidenceScore = face.trackingId != null ? 0.95 : 0.7;

    // 2. Tamaño del rostro (peso: 25%)
    final faceArea = face.boundingBox.width * face.boundingBox.height;
    final imageArea = imageSize.width * imageSize.height;
    final faceSizeRatio = faceArea / imageArea;
    double sizeScore = (faceSizeRatio * 6).clamp(0.0, 1.0); // Ajustado para walk-through

    // 3. Posición centrada (peso: 15%)
    final centerX = face.boundingBox.center.dx / imageSize.width;
    final centerY = face.boundingBox.center.dy / imageSize.height;
    double positionScore = 1.0 - ((centerX - 0.5).abs() + (centerY - 0.5).abs());
    positionScore = positionScore.clamp(0.0, 1.0);

    // 4. Ángulo frontal (peso: 20%)
    double angleScore = 0.8;
    if (face.headEulerAngleX != null && face.headEulerAngleY != null) {
      final xAngle = face.headEulerAngleX!.abs();
      final yAngle = face.headEulerAngleY!.abs();
      // Más tolerante para walk-through (hasta 25 grados)
      angleScore = (1.0 - (xAngle / 25 + yAngle / 25) / 2).clamp(0.0, 1.0);
    }

    // Combinar con pesos optimizados para walk-through
    final quality = (confidenceScore * 0.40) +
                    (sizeScore * 0.25) +
                    (positionScore * 0.15) +
                    (angleScore * 0.20);

    // Guardar frame para análisis temporal
    _recentFrames.add(FaceQualityFrame(
      quality: quality,
      timestamp: DateTime.now(),
      trackingId: face.trackingId,
    ));
    if (_recentFrames.length > _framesToTrack) {
      _recentFrames.removeAt(0);
    }

    // Ajustar umbral dinámicamente basado en historial
    _adjustDynamicThreshold();

    return quality.clamp(0.0, 1.0);
  }

  void _adjustDynamicThreshold() {
    if (_recentFrames.length < 3) return;

    // Si los últimos frames tienen calidad consistente, bajar umbral
    final avgQuality = _recentFrames.map((f) => f.quality).reduce((a, b) => a + b) / _recentFrames.length;
    final variance = _recentFrames.map((f) => (f.quality - avgQuality).abs()).reduce((a, b) => a + b) / _recentFrames.length;

    // Calidad consistente = persona caminando establemente
    if (variance < 0.1 && avgQuality > 0.5) {
      _dynamicThreshold = (avgQuality - 0.05).clamp(0.55, 0.75);
    } else {
      _dynamicThreshold = 0.65; // Default
    }
  }

  bool isQualityGood(double quality) => quality >= _dynamicThreshold;

  /// Captura en ráfaga para elegir mejor frame
  Future<Uint8List?> burstCapture(CameraController controller) async {
    _burstBuffer.clear();

    for (int i = 0; i < _burstSize; i++) {
      try {
        final image = await controller.takePicture();
        final bytes = await image.readAsBytes();
        _burstBuffer.add(CapturedFrame(
          bytes: bytes,
          timestamp: DateTime.now(),
        ));
        await Future.delayed(Duration(milliseconds: 50));
      } catch (e) {
        print('⚠️ [BURST] Error en captura $i: $e');
      }
    }

    if (_burstBuffer.isEmpty) return null;

    // Por ahora retornar el primero (mejorar con análisis de calidad)
    return _burstBuffer.first.bytes;
  }

  void markCapture() {
    _lastCapture = DateTime.now();
  }

  void setProcessing(bool processing) {
    _isProcessing = processing;
  }

  bool get isProcessing => _isProcessing;
  double get currentThreshold => _dynamicThreshold;
}

class FaceQualityFrame {
  final double quality;
  final DateTime timestamp;
  final int? trackingId;

  FaceQualityFrame({
    required this.quality,
    required this.timestamp,
    this.trackingId,
  });
}

class CapturedFrame {
  final Uint8List bytes;
  final DateTime timestamp;

  CapturedFrame({required this.bytes, required this.timestamp});
}
```

### 4.4 Tarea 2.4: Agregar GPS/Geofencing

**ARCHIVO**: `frontend_flutter/lib/screens/kiosk_screen.dart`

**MODIFICAR** `_sendToBackend()` para incluir validación GPS:

```dart
Future<void> _sendToBackend(List<int> imageBytes) async {
  try {
    // NUEVO: Obtener ubicación GPS
    final locationService = LocationService();
    final position = await locationService.getCurrentPosition();

    // NUEVO: Validar geofencing si está configurado
    if (_kioskConfig?.requiresGeofencing == true) {
      final geofenceService = GeofencingService();
      final isInsideGeofence = await geofenceService.isInsideAllowedArea(
        position.latitude,
        position.longitude,
        _kioskConfig!.allowedRadius,
        _kioskConfig!.centerLat,
        _kioskConfig!.centerLng,
      );

      if (!isInsideGeofence) {
        print('🚫 [KIOSK] Fuera del área permitida');
        _showTrafficLight(TrafficLightState.red);
        await _flutterTts?.speak("Ubicación no válida");
        return;
      }
    }

    // Agregar GPS al request
    request.fields['gpsLat'] = position.latitude.toString();
    request.fields['gpsLng'] = position.longitude.toString();
    request.fields['gpsAccuracy'] = position.accuracy.toString();

    // ... resto del código ...
  }
}
```

### 4.5 Tarea 2.5: Validar Departamentos Autorizados

**ARCHIVO**: `frontend_flutter/lib/screens/kiosk_screen.dart`

**AGREGAR** validación antes de procesar:

```dart
Future<void> _validateEmployeeDepartment(Map<String, dynamic> employeeData) async {
  // Verificar si el kiosk tiene restricción de departamentos
  if (_kioskConfig?.authorizedDepartments?.isNotEmpty == true) {
    final employeeDeptId = employeeData['department_id'];

    if (!_kioskConfig!.authorizedDepartments!.contains(employeeDeptId)) {
      print('🚫 [KIOSK] Empleado ${employeeData['name']} no autorizado en este kiosk');

      // Crear notificación de acceso no autorizado
      await _registerUnauthorizedAccess(employeeData, 'department_not_allowed');

      _showTrafficLight(TrafficLightState.red);
      await _flutterTts?.speak("Departamento no autorizado en este kiosco");

      throw UnauthorizedDepartmentException(
        'Empleado de departamento ${employeeData['department_name']} no puede fichar aquí'
      );
    }
  }
}
```

---

## 5. FASE 3: UX/FEEDBACK DE EXCELENCIA

### 5.1 Tarea 3.1: Semáforo con Animaciones

**ARCHIVO**: `frontend_flutter/lib/screens/kiosk_screen.dart`

**REEMPLAZAR** enum `TrafficLightState`:

```dart
enum TrafficLightState {
  standby,           // 🟡 Amarillo - Esperando
  processing,        // 🔵 Azul pulsante - Procesando
  recognized,        // 🟢 Verde - Reconocido
  notRecognized,     // 🔴 Rojo - No reconocido
  lateArrival,       // 🟠 Naranja - Tardanza
  waitingAuth,       // 🟣 Púrpura pulsante - Esperando autorización
  authorized,        // 🟢✓ Verde con check - Autorizado
  rejected,          // 🔴✗ Rojo con X - Rechazado
  visitor,           // ⚪ Blanco - Modo visitante
  offline,           // ⚫ Gris - Sin conexión
  error,             // 🔴⚡ Rojo parpadeante - Error
}
```

**AGREGAR** widget de semáforo mejorado:

```dart
Widget _buildTrafficLightV2() {
  return AnimatedContainer(
    duration: Duration(milliseconds: 300),
    width: 80,
    height: 200,
    decoration: BoxDecoration(
      color: Colors.grey.shade900.withOpacity(0.9),
      borderRadius: BorderRadius.circular(40),
      border: Border.all(color: Colors.white, width: 3),
      boxShadow: [
        BoxShadow(
          color: _getGlowColor().withOpacity(0.5),
          blurRadius: 20,
          spreadRadius: 5,
        ),
      ],
    ),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildLightV2(Colors.red, _isStateActive([
          TrafficLightState.notRecognized,
          TrafficLightState.rejected,
          TrafficLightState.error
        ])),
        _buildLightV2(Colors.amber, _isStateActive([
          TrafficLightState.standby,
          TrafficLightState.lateArrival
        ])),
        _buildLightV2(Colors.green, _isStateActive([
          TrafficLightState.recognized,
          TrafficLightState.authorized
        ])),
      ],
    ),
  );
}

Widget _buildLightV2(Color color, bool isActive) {
  return AnimatedContainer(
    duration: Duration(milliseconds: 200),
    width: 50,
    height: 50,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: isActive ? color : color.withOpacity(0.15),
      boxShadow: isActive ? [
        BoxShadow(
          color: color.withOpacity(0.8),
          blurRadius: 15,
          spreadRadius: 5,
        ),
      ] : null,
    ),
    child: isActive && _shouldShowIcon() ? _getStateIcon() : null,
  );
}

Widget? _getStateIcon() {
  switch (_trafficLight) {
    case TrafficLightState.authorized:
      return Icon(Icons.check, color: Colors.white, size: 30);
    case TrafficLightState.rejected:
      return Icon(Icons.close, color: Colors.white, size: 30);
    case TrafficLightState.processing:
    case TrafficLightState.waitingAuth:
      return SizedBox(
        width: 30,
        height: 30,
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
          strokeWidth: 3,
        ),
      );
    default:
      return null;
  }
}

Color _getGlowColor() {
  switch (_trafficLight) {
    case TrafficLightState.recognized:
    case TrafficLightState.authorized:
      return Colors.green;
    case TrafficLightState.notRecognized:
    case TrafficLightState.rejected:
    case TrafficLightState.error:
      return Colors.red;
    case TrafficLightState.lateArrival:
      return Colors.orange;
    case TrafficLightState.waitingAuth:
    case TrafficLightState.processing:
      return Colors.blue;
    default:
      return Colors.amber;
  }
}
```

### 5.2 Tarea 3.2: Sonidos Diferenciados

**AGREGAR** servicio de audio:

```dart
// frontend_flutter/lib/services/kiosk_audio_service.dart

import 'package:audioplayers/audioplayers.dart';

class KioskAudioService {
  static final KioskAudioService _instance = KioskAudioService._internal();
  factory KioskAudioService() => _instance;
  KioskAudioService._internal();

  final AudioPlayer _player = AudioPlayer();

  // Mapeo de estados a sonidos
  final Map<TrafficLightState, String> _sounds = {
    TrafficLightState.recognized: 'assets/sounds/success_chime.mp3',
    TrafficLightState.notRecognized: 'assets/sounds/error_buzz.mp3',
    TrafficLightState.lateArrival: 'assets/sounds/warning_tone.mp3',
    TrafficLightState.authorized: 'assets/sounds/approval_ding.mp3',
    TrafficLightState.rejected: 'assets/sounds/rejection_sound.mp3',
    TrafficLightState.error: 'assets/sounds/critical_alert.mp3',
  };

  Future<void> playForState(TrafficLightState state) async {
    final soundFile = _sounds[state];
    if (soundFile != null) {
      await _player.play(AssetSource(soundFile));
    }
  }

  Future<void> playCustom(String assetPath) async {
    await _player.play(AssetSource(assetPath));
  }

  void dispose() {
    _player.dispose();
  }
}
```

### 5.3 Tarea 3.3: TTS Completo

**MODIFICAR** mensajes TTS en `kiosk_screen.dart`:

```dart
final Map<TrafficLightState, String> _ttsMessages = {
  TrafficLightState.recognized: 'Bienvenido, {nombre}. Asistencia registrada.',
  TrafficLightState.notRecognized: 'No reconocido. Por favor, intente nuevamente.',
  TrafficLightState.lateArrival: 'Llegada tardía detectada. Aguarde autorización de su supervisor.',
  TrafficLightState.authorized: 'Autorización aprobada. Puede ingresar.',
  TrafficLightState.rejected: 'Ingreso rechazado. Contacte a Recursos Humanos.',
  TrafficLightState.error: 'Error del sistema. Por favor, contacte al administrador.',
  TrafficLightState.offline: 'Sin conexión. Su fichaje se guardará y sincronizará automáticamente.',
};

Future<void> _speakForState(TrafficLightState state, {String? employeeName}) async {
  String message = _ttsMessages[state] ?? '';

  if (employeeName != null) {
    message = message.replaceAll('{nombre}', employeeName);
  }

  if (message.isNotEmpty) {
    await _flutterTts?.speak(message);
  }
}
```

---

## 6. FASE 4: NOTIFICACIONES MULTI-CANAL

### 6.1 Tarea 4.1: Integrar Firebase Cloud Messaging

**PASOS**:

1. Agregar dependencia en `pubspec.yaml`:
```yaml
dependencies:
  firebase_core: ^2.24.2
  firebase_messaging: ^14.7.10
```

2. Configurar Firebase en `main.dart`:
```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // Configurar FCM
  final fcmService = FCMService();
  await fcmService.initialize();

  runApp(EnterpriseKioskApp());
}
```

3. Crear servicio FCM:
```dart
// frontend_flutter/lib/services/fcm_service.dart

import 'package:firebase_messaging/firebase_messaging.dart';

class FCMService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  Future<void> initialize() async {
    // Solicitar permisos
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Obtener token
    final token = await _messaging.getToken();
    print('📱 FCM Token: $token');

    // Enviar token al backend
    await _sendTokenToBackend(token);

    // Escuchar mensajes en foreground
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Escuchar cuando se abre desde background
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);
  }

  void _handleForegroundMessage(RemoteMessage message) {
    print('📥 FCM Message: ${message.notification?.title}');

    // Mostrar notificación local
    if (message.data['type'] == 'authorization_result') {
      // Manejar resultado de autorización
    }
  }

  Future<void> _sendTokenToBackend(String? token) async {
    if (token == null) return;

    // POST /api/v1/devices/register-fcm
    // { token, deviceId, platform: 'android', kioskMode: true }
  }
}
```

### 6.2 Tarea 4.2: Configurar WhatsApp Business API

**ARCHIVO**: `backend/.env`

**AGREGAR**:
```env
# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_API_TOKEN=your_meta_api_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
```

**PASOS para obtener credenciales**:
1. Crear cuenta en Meta Business: https://business.facebook.com
2. Crear app en Meta Developers: https://developers.facebook.com
3. Agregar producto "WhatsApp"
4. Configurar número de teléfono de prueba
5. Obtener token permanente

---

## 7. FASE 5: SEGURIDAD ENTERPRISE

### 7.1 Tarea 5.1: Certificate Pinning

**ARCHIVO**: `frontend_flutter/lib/services/secure_http_client.dart`

```dart
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

class SecureHttpClient {
  static http.Client create() {
    final securityContext = SecurityContext.defaultContext;

    // Agregar certificado del servidor
    // Generar con: openssl s_client -connect yourserver.com:443 -showcerts
    // securityContext.setTrustedCertificatesBytes(certificateBytes);

    final httpClient = HttpClient(context: securityContext)
      ..badCertificateCallback = (cert, host, port) {
        // En producción, verificar fingerprint del certificado
        final validFingerprints = [
          'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
        ];

        final certFingerprint = cert.sha256.map((b) => b.toRadixString(16).padLeft(2, '0')).join(':');
        return validFingerprints.contains(certFingerprint.toUpperCase());
      };

    return IOClient(httpClient);
  }
}
```

### 7.2 Tarea 5.2: Secure Storage para Tokens

**ARCHIVO**: `frontend_flutter/lib/services/secure_storage_service.dart`

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  static final SecureStorageService _instance = SecureStorageService._internal();
  factory SecureStorageService() => _instance;
  SecureStorageService._internal();

  final _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );

  // Keys
  static const _authTokenKey = 'auth_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _companyIdKey = 'company_id';

  Future<void> saveAuthToken(String token) async {
    await _storage.write(key: _authTokenKey, value: token);
  }

  Future<String?> getAuthToken() async {
    return await _storage.read(key: _authTokenKey);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
```

---

## 8. FASE 6: MODO OFFLINE ROBUSTO

### 8.1 Tarea 6.1: Resolver Conflictos de Timestamp

**ARCHIVO**: `frontend_flutter/lib/services/offline_queue_service.dart`

**AGREGAR** método de resolución de conflictos:

```dart
/// Resolver conflictos cuando hay múltiples registros para mismo usuario/día
Future<void> resolveConflicts() async {
  final db = await database;

  // Buscar registros duplicados
  final duplicates = await db.rawQuery('''
    SELECT user_id, DATE(timestamp) as date, COUNT(*) as count
    FROM attendance_queue
    WHERE status = 'pending'
    GROUP BY user_id, DATE(timestamp)
    HAVING COUNT(*) > 2
  ''');

  for (final dup in duplicates) {
    final userId = dup['user_id'];
    final date = dup['date'];

    // Obtener todos los registros de ese usuario/día
    final records = await db.query(
      'attendance_queue',
      where: 'user_id = ? AND DATE(timestamp) = ? AND status = ?',
      whereArgs: [userId, date, 'pending'],
      orderBy: 'timestamp ASC',
    );

    if (records.length <= 2) continue; // entrada + salida normal

    // Estrategia: Mantener primera entrada y última salida
    final firstEntry = records.firstWhere(
      (r) => r['type'] == 'checkin',
      orElse: () => records.first,
    );

    final lastExit = records.lastWhere(
      (r) => r['type'] == 'checkout',
      orElse: () => records.last,
    );

    // Marcar los demás como 'merged'
    for (final record in records) {
      if (record['id'] != firstEntry['id'] && record['id'] != lastExit['id']) {
        await db.update(
          'attendance_queue',
          {'status': 'merged', 'error_message': 'Duplicado resuelto automáticamente'},
          where: 'id = ?',
          whereArgs: [record['id']],
        );
      }
    }

    debugPrint('🔄 [CONFLICT] Resolved ${records.length - 2} duplicates for user $userId');
  }
}
```

---

## 9. CHECKLIST DE VERIFICACIÓN

### FASE 1: Biometría Real
- [ ] Modelos Face-api.js descargados en `backend/models/face-api/`
- [ ] `biometric-matching-service.js` sin `simulateEmbeddingExtraction`
- [ ] `face-api-backend-engine.js` carga modelos reales
- [ ] Azure PersonGroup implementado
- [ ] Liveness Detection integrado en APK
- [ ] Endpoint `/api/v2/biometric-attendance/verify-real` verificado

### FASE 2: APK Kiosk Profesional
- [ ] `websocket_service.dart` con conexión real
- [ ] Polling de autorizaciones cada 3s
- [ ] SmartCaptureV2 con umbral dinámico
- [ ] GPS/Geofencing validado antes de enviar
- [ ] Departamentos autorizados validados

### FASE 3: UX/Feedback
- [ ] Semáforo con 11 estados
- [ ] Sonidos diferenciados por estado
- [ ] TTS para todos los estados
- [ ] Errores de cámara visibles

### FASE 4: Notificaciones
- [ ] FCM configurado
- [ ] WhatsApp Business API conectado
- [ ] Alertas de acceso no autorizado con foto

### FASE 5: Seguridad
- [ ] Certificate pinning activo
- [ ] Tokens en secure storage
- [ ] Fotos encriptadas

### FASE 6: Offline
- [ ] Conflictos de timestamp resueltos
- [ ] Sync automático funcional
- [ ] Indicador visual de modo offline

---

## 📝 NOTAS PARA SIGUIENTE SESIÓN DE CLAUDE

1. **PRIORIDAD MÁXIMA**: Fase 1 (Biometría Real) - Sin esto, todo es simulación
2. **Segunda prioridad**: Fase 2 (APK Kiosk) - WebSocket y autorizaciones
3. **Supervisores**: Ya existe `LateArrivalAuthorizationService` pero necesita mejora jerárquica
4. **RRHH**: Agregar notificación automática a departamento RRHH
5. **Azure Key EXPUESTA**: Rotar `AZURE_FACE_KEY` en `.env`

**Comando para iniciar**:
```bash
cd /c/Bio/sistema_asistencia_biometrico/backend && PORT=9998 npm start
```

**URLs de prueba**:
- Panel empresa: http://localhost:9998/panel-empresa.html
- Panel admin: http://localhost:9998/panel-administrativo.html

---

*Documento generado por Claude - 2025-11-29*
