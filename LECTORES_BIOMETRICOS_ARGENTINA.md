# 📱 LECTORES BIOMÉTRICOS DE HUELLA - ARGENTINA
**Integración con Sistema de Asistencia**

---

## 🏆 TOP 5 LECTORES MÁS VENDIDOS EN ARGENTINA

### 1. **ZKTeco U.are.U 4500**
**Precio:** $45,000 - $55,000 ARS
**SDK:** ZKFinger SDK (Windows/Linux/Android)
**Resolución:** 500 DPI
**Sensor:** Óptico
**Certificación:** FBI PIV, FCC, CE

**Ventajas:**
- ✅ Más popular en Argentina
- ✅ SDK gratuito con ejemplos en C#, Java, Python
- ✅ Soporte técnico local (ZKTeco Argentina)
- ✅ Velocidad de matching: < 1 segundo con 10,000 templates

**Integración:**
```dart
// Flutter FFI con ZKFinger SDK
class ZKTecoReader {
  static const String DLL_PATH = 'libzkfinger10.dll';

  Future<bool> initialize() {
    return _zkfp.Init();
  }

  Future<FingerprintTemplate> capture() {
    return _zkfp.AcquireFingerprint();
  }

  Future<MatchResult> match1N(List<FingerprintTemplate> templates) {
    return _zkfp.DBMatch(templates);
  }
}
```

**Uso recomendado:** Empresas medianas/grandes (50-500 empleados)

---

### 2. **Suprema BioMini Plus 2**
**Precio:** $65,000 - $80,000 ARS
**SDK:** Suprema UF SDK (Windows)
**Resolución:** 500 DPI
**Sensor:** Óptico anti-falsificación
**Certificación:** FBI PIV II, FBI Appendix F

**Ventajas:**
- ✅ Alta precisión (FAR: 0.0001%)
- ✅ Detección de dedos falsos/látex
- ✅ Ideal para alta seguridad
- ✅ SDK profesional con matching 1:N

**Integración:**
```dart
// Flutter FFI con Suprema UF SDK
class SupremaReader {
  static const String DLL_PATH = 'UFScanner.dll';

  Future<bool> detectLiveFinger() {
    return _uf.IsFingerPresent();
  }

  Future<Template> extractTemplate() {
    return _uf.ExtractTemplate();
  }

  Future<int> identify(List<Template> database) {
    return _uf.IdentifyTemplate(database); // Retorna ID del match
  }
}
```

**Uso recomendado:** Empresas con alta seguridad, bancos, hospitales

---

### 3. **Digital Persona U.are.U 5160**
**Precio:** $50,000 - $60,000 ARS
**SDK:** Digital Persona SDK (Windows/Linux)
**Resolución:** 512 DPI
**Sensor:** Óptico con LED
**Certificación:** FBI PIV

**Ventajas:**
- ✅ Marca reconocida mundialmente
- ✅ SDK bien documentado
- ✅ Compatible con Web API (plugin Chrome)
- ✅ Funciona con huellas secas/húmedas

**Integración:**
```dart
// Flutter FFI con DPFP SDK
class DigitalPersonaReader {
  static const String DLL_PATH = 'dpfpdd.dll';

  Future<FMD> captureFinger() {
    return _dpfp.CreateFmd();
  }

  Future<CompareResult> compare(FMD captured, FMD stored) {
    return _dpfp.CompareFmds(captured, stored);
  }

  Future<IdentifyResult> identify(List<FMD> database) {
    return _dpfp.IdentifyFmds(database);
  }
}
```

**Uso recomendado:** Empresas que necesitan integración web + mobile

---

### 4. **Nitgen Hamster Plus**
**Precio:** $30,000 - $40,000 ARS
**SDK:** Nitgen SDK (Windows)
**Resolución:** 500 DPI
**Sensor:** Óptico compacto
**Certificación:** FBI PIV

**Ventajas:**
- ✅ Más económico del mercado
- ✅ Tamaño compacto (ideal para tablets)
- ✅ Popular en Argentina por precio/calidad
- ✅ SDK incluido gratuitamente

**Integración:**
```dart
// Flutter FFI con NBio SDK
class NitgenReader {
  static const String DLL_PATH = 'NBioBSP.dll';

  Future<Template> enroll(int sampleCount) {
    return _nbio.Enroll(sampleCount); // 3 capturas
  }

  Future<VerifyResult> verify(Template template) {
    return _nbio.Verify(template);
  }

  Future<IdentifyResult> identify(List<Template> templates) {
    return _nbio.Identify(templates);
  }
}
```

**Uso recomendado:** PyMEs (10-50 empleados), comercios

---

### 5. **Futronic FS88**
**Precio:** $35,000 - $45,000 ARS
**SDK:** Futronic SDK (Windows/Linux/Android)
**Resolución:** 500 DPI
**Sensor:** Óptico plano
**Certificación:** CE

**Ventajas:**
- ✅ Distribuidor local en Argentina
- ✅ Soporte en español
- ✅ SDK multi-plataforma (incluye Android)
- ✅ Versión USB y Ethernet

**Integración:**
```dart
// Flutter FFI con Futronic SDK
class FutronicReader {
  static const String DLL_PATH = 'ftrScanAPI.dll';

  Future<Image> captureImage() {
    return _ftr.GetFrame();
  }

  Future<Template> extractFeatures() {
    return _ftr.CreateTemplate();
  }

  Future<MatchScore> matchTemplates(Template t1, Template t2) {
    return _ftr.MatchTemplates(t1, t2); // Score 0-100
  }
}
```

**Uso recomendado:** Empresas que necesitan versión Ethernet (lectura remota)

---

## 🔧 ARQUITECTURA DE INTEGRACIÓN

### Opción A: FFI Native (Recomendada)

```dart
// lib/services/external_fingerprint_service.dart

import 'dart:ffi' as ffi;
import 'package:ffi/ffi.dart';

class ExternalFingerprintService {
  late ffi.DynamicLibrary _lib;
  String _readerModel;

  ExternalFingerprintService(this._readerModel) {
    _loadSDK();
  }

  void _loadSDK() {
    switch (_readerModel) {
      case 'zktech_4500':
        _lib = ffi.DynamicLibrary.open('libzkfinger10.dll');
        break;
      case 'suprema_biomini':
        _lib = ffi.DynamicLibrary.open('UFScanner.dll');
        break;
      case 'digitalpersona_5160':
        _lib = ffi.DynamicLibrary.open('dpfpdd.dll');
        break;
      case 'nitgen_hamster':
        _lib = ffi.DynamicLibrary.open('NBioBSP.dll');
        break;
      case 'futronic_fs88':
        _lib = ffi.DynamicLibrary.open('ftrScanAPI.dll');
        break;
    }
  }

  Future<FingerprintTemplate> captureLive() async {
    // Llamada nativa al SDK
    final result = _lib.lookupFunction<...>('CaptureFunction')();
    return FingerprintTemplate.fromNative(result);
  }

  Future<MatchResult> identify1N(List<FingerprintTemplate> database) async {
    // Matching nativo 1:N
    final result = _lib.lookupFunction<...>('IdentifyFunction')(database);
    return MatchResult(
      matched: result.matched,
      employeeId: result.id,
      similarity: result.score / 100.0
    );
  }
}
```

### Opción B: Servidor Intermedio (Alternativa)

```javascript
// backend/src/services/fingerprint-bridge.js

const { exec } = require('child_process');
const net = require('net');

class FingerprintBridge {
  constructor(readerModel) {
    this.reader = readerModel;
  }

  async captureFingerprint() {
    // Ejecuta SDK nativo desde Node.js
    return new Promise((resolve, reject) => {
      exec(`fingerprint-cli capture --reader ${this.reader}`, (err, stdout) => {
        if (err) reject(err);
        resolve(JSON.parse(stdout));
      });
    });
  }

  async identify1N(template, database) {
    // Matching en backend
    const result = await this.nativeMatch(template, database);
    return result;
  }
}

module.exports = FingerprintBridge;
```

---

## 📦 INSTALACIÓN DE SDKs

### Windows (Para desarrollo)

```powershell
# 1. Descargar SDKs de fabricantes

# ZKTeco
https://www.zkteco.com/en/download/zkteco-bio-sdk

# Suprema
https://www.supremainc.com/en/support/download-center

# Digital Persona
https://www.digitalpersona.com/support/downloads/

# Nitgen
http://www.nitgen.com/eng/product/sdk.html

# Futronic
http://www.futronic-tech.com/sdk.html

# 2. Instalar drivers USB
# Cada fabricante provee drivers

# 3. Copiar DLLs a proyecto
Copy-Item -Path "C:\SDK\ZKTeco\*.dll" -Destination "frontend_flutter\windows\runner\"
```

### Android (Para APK)

```bash
# Los lectores USB externos usan USB Host API
# Agregar a AndroidManifest.xml:

<uses-feature android:name="android.hardware.usb.host" />
<uses-permission android:name="android.permission.USB_PERMISSION" />

# Copiar libraries nativas (.so) del SDK a:
android/app/src/main/jniLibs/arm64-v8a/libfingerprint.so
```

---

## 💰 COMPARACIÓN COSTO-BENEFICIO

| Modelo | Precio | Precisión | Velocidad | Soporte AR | Recomendación |
|--------|--------|-----------|-----------|------------|---------------|
| ZKTeco 4500 | $$$ | ⭐⭐⭐⭐ | Rápido | ✅ Excelente | **#1 General** |
| Suprema BioMini | $$$$ | ⭐⭐⭐⭐⭐ | Muy rápido | ⚠️ Bueno | #1 Seguridad |
| DigitalPersona 5160 | $$$ | ⭐⭐⭐⭐ | Rápido | ⚠️ Regular | #1 Web |
| Nitgen Hamster | $$ | ⭐⭐⭐ | Normal | ✅ Muy bueno | #1 PyMEs |
| Futronic FS88 | $$ | ⭐⭐⭐ | Normal | ✅ Excelente | #1 Remoto |

**Leyenda:**
- $$ = $30-40k ARS
- $$$ = $45-60k ARS
- $$$$ = $65-80k ARS

---

## 🎯 RECOMENDACIÓN POR CASO DE USO

### Caso 1: Oficina única (50 empleados)
**Recomendado:** Nitgen Hamster Plus
**Por qué:** Mejor relación precio/calidad, tamaño compacto

### Caso 2: Múltiples sucursales (200+ empleados)
**Recomendado:** ZKTeco U.are.U 4500
**Por qué:** Soporte local, escalable, SDK robusto

### Caso 3: Ambiente industrial/fabril
**Recomendado:** Suprema BioMini Plus 2
**Por qué:** Detecta dedos sucios/mojados/con guantes finos

### Caso 4: Acceso web + mobile
**Recomendado:** Digital Persona 5160
**Por qué:** Plugin web, SDK multi-plataforma

### Caso 5: Presupuesto ajustado
**Recomendado:** Futronic FS88
**Por qué:** Económico con soporte local

---

## 📞 PROVEEDORES EN ARGENTINA

### ZKTeco Argentina
- Web: zkteco.com.ar
- Email: ventas@zkteco.com.ar
- Tel: +54 11 4000-XXXX
- Oficinas: Buenos Aires, Córdoba, Rosario

### Suprema Argentina
- Distribuidor: BioSec Argentina
- Web: biosec.com.ar
- Email: info@biosec.com.ar

### Digital Persona
- Distribuidor: ID Solutions
- Web: idsolutions.com.ar

### Nitgen
- Distribuidor: Tecno Seguridad
- Web: tecnoseguridad.com.ar

### Futronic
- Distribuidor: Futronic Argentina
- Web: futronic.com.ar

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

1. **Templates no imágenes:** Nunca almacenar imágenes de huellas, solo templates matemáticos
2. **Encriptación:** Todos los templates deben estar encriptados en BD (AES-256)
3. **Multi-tenancy:** Separar templates por company_id
4. **Audit logs:** Registrar cada intento de matching
5. **GDPR/LOPD:** Cumplir normativas de protección de datos biométricos

---

**Documento generado para:**
Sistema de Asistencia Biométrico v2.0
Fecha: Octubre 2025
Autor: Claude Code Implementation Team
