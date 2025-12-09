# 📋 INTEGRACIÓN CON AFIP - FACTURACIÓN ELECTRÓNICA Y OBTENCIÓN DE CAE

**Documento técnico completo** para integración con los WebServices de AFIP/ARCA para facturación electrónica en Argentina.

---

## 🎯 OBJETIVO

Implementar la integración completa con AFIP para:
1. **Autenticación** mediante certificado digital (WSAA)
2. **Obtención de CAE** (Código de Autorización Electrónica) para facturas (WSFEv1)
3. **Cumplimiento legal** de la normativa argentina de facturación electrónica

---

## 📚 MARCO LEGAL Y NORMATIVO

### Resoluciones Generales
- **RG 4291**: Facturación electrónica - Régimen general
- **RG 5157**: Actualización 2025 (obligación de informar tipo de cambio desde 15/04/2025)
- **RG 5152**: Obligación de itemizar IVA (grandes empresas desde 01/01/2025, demás desde 01/04/2025)

### Requisitos Legales
- ✅ **CAE obligatorio**: Todo comprobante electrónico DEBE tener CAE antes de tener efectos fiscales
- ✅ **Plazo de entrega**: Comprobante disponible al comprador en 10 días desde asignación CAE
- ✅ **Inmutabilidad**: Una vez con CAE, solo modificable con nota de crédito/débito

---

## 🏗️ ARQUITECTURA DE INTEGRACIÓN

```
┌─────────────────────────────────────────────────────────────┐
│                   TU SISTEMA DE FACTURACIÓN                 │
│          (backend/src/services/billing/...)                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ 1. Solicitar Token
                  ▼
          ┌───────────────┐
          │   WSAA        │ ← WebService de Autenticación y Autorización
          │ (12h TTL)     │    Retorna: Token + Sign
          └───────┬───────┘
                  │
                  │ 2. Token válido
                  ▼
          ┌───────────────┐
          │   WSFEv1      │ ← WebService de Facturación Electrónica v1
          │ (FECAESolicitar)│   Retorna: CAE + CAE_vto
          └───────────────┘
```

---

## 🔐 PASO 1: AUTENTICACIÓN CON WSAA

### 1.1. Requisitos Previos

**Certificado Digital X.509:**
- **Homologación/Testing**: Obtener via WSASS (Self-Service) con clave fiscal
  - URL: https://www.afip.gob.ar/ws/WSAA (ambiente testing)
- **Producción**: Obtener via "Administrador de Certificados Digitales"
  - URL: https://www.afip.gob.ar/ws/documentacion/wsaa.asp

**Archivos necesarios:**
```
/certs/
  ├── certificate.crt    # Certificado público
  ├── private_key.key    # Clave privada (NUNCA commitear a git)
  └── ca.crt            # Certificado de CA AFIP (opcional)
```

### 1.2. Flujo de Autenticación

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Cliente  │────▶│  WSAA    │────▶│  WSFE    │
└──────────┘     └──────────┘     └──────────┘
     │                │                 │
     │ 1. LoginCms    │                 │
     │───────────────▶│                 │
     │                │                 │
     │ 2. TA          │                 │
     │◀───────────────│                 │
     │                │                 │
     │ 3. FECAESolicitar (Token+Sign)   │
     │─────────────────────────────────▶│
     │                                   │
     │ 4. CAE + CAE_vto                 │
     │◀─────────────────────────────────│
```

### 1.3. Generar Ticket de Requerimiento de Acceso (TRA)

**XML de ejemplo:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
    <header>
        <uniqueId>{TIMESTAMP}</uniqueId>
        <generationTime>{ISO8601_DATE}</generationTime>
        <expirationTime>{ISO8601_DATE_PLUS_12H}</expirationTime>
    </header>
    <service>wsfe</service>  <!-- IMPORTANTE: nombre del servicio -->
</loginTicketRequest>
```

**Firmar con certificado:**
```bash
# Comando OpenSSL para firmar
openssl smime -sign \
    -in tra.xml \
    -signer certificate.crt \
    -inkey private_key.key \
    -out tra.cms \
    -outform DER \
    -nodetach
```

### 1.4. Solicitar Token de Acceso (TA)

**Endpoint WSAA:**
- **Testing**: `https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl`
- **Producción**: `https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl`

**Método SOAP:** `loginCms()`

**Request:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="https://wsaa.afip.gov.ar/ws/services/LoginCms">
   <soapenv:Body>
      <wsaa:loginCms>
         <wsaa:in0>{BASE64_ENCODED_TRA_CMS}</wsaa:in0>
      </wsaa:loginCms>
   </soapenv:Body>
</soapenv:Envelope>
```

**Response:**
```xml
<credentials>
    <token>PD94bWwgdm...</token>     <!-- Token de acceso -->
    <sign>jbwxmW+w...</sign>         <!-- Firma digital -->
    <expirationTime>2025-12-09T10:00:00.000Z</expirationTime>
</credentials>
```

**⏱️ IMPORTANTE:** El TA tiene validez de **12 horas**. Cachear y reutilizar.

---

## 📄 PASO 2: SOLICITAR CAE CON WSFEv1

### 2.1. Endpoints

- **Testing**: `https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL`
- **Producción**: `https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL`

### 2.2. Método Principal: `FECAESolicitar`

**Solicita CAE para uno o varios comprobantes.**

### 2.3. Estructura del Request

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:fe="http://ar.gov.afip.dif.FEV1/">
   <soapenv:Body>
      <fe:FECAESolicitar>
         <!-- AUTENTICACIÓN -->
         <fe:Auth>
            <fe:Token>{TOKEN_FROM_WSAA}</fe:Token>
            <fe:Sign>{SIGN_FROM_WSAA}</fe:Sign>
            <fe:Cuit>{CUIT_EMPRESA}</fe:Cuit>
         </fe:Auth>

         <!-- DATOS DE FACTURACIÓN -->
         <fe:FeCAEReq>
            <fe:FeCabReq>
               <fe:CantReg>1</fe:CantReg>                     <!-- Cantidad de comprobantes -->
               <fe:PtoVta>1</fe:PtoVta>                       <!-- Punto de venta -->
               <fe:CbteTipo>1</fe:CbteTipo>                   <!-- Tipo: 1=FactA, 6=FactB, 11=FactC -->
            </fe:FeCabReq>

            <fe:FeDetReq>
               <!-- COMPROBANTE 1 -->
               <fe:FECAEDetRequest>
                  <fe:Concepto>1</fe:Concepto>                <!-- 1=Productos, 2=Servicios, 3=Productos+Servicios -->
                  <fe:DocTipo>80</fe:DocTipo>                 <!-- 80=CUIT, 96=DNI, 99=CF -->
                  <fe:DocNro>{CUIT_CLIENTE}</fe:DocNro>
                  <fe:CbteDesde>{NUMERO_DESDE}</fe:CbteDesde>
                  <fe:CbteHasta>{NUMERO_HASTA}</fe:CbteHasta>
                  <fe:CbteFch>{YYYYMMDD}</fe:CbteFch>         <!-- Fecha comprobante -->
                  <fe:ImpTotal>{TOTAL_CON_IVA}</fe:ImpTotal>  <!-- Total final -->
                  <fe:ImpTotConc>0.00</fe:ImpTotConc>         <!-- No gravado -->
                  <fe:ImpNeto>{SUBTOTAL}</fe:ImpNeto>         <!-- Neto gravado -->
                  <fe:ImpOpEx>0.00</fe:ImpOpEx>               <!-- Exento -->
                  <fe:ImpIVA>{IVA_TOTAL}</fe:ImpIVA>          <!-- IVA total -->
                  <fe:ImpTrib>0.00</fe:ImpTrib>               <!-- Otros tributos -->
                  <fe:MonId>PES</fe:MonId>                    <!-- PES=Pesos, DOL=Dólar -->
                  <fe:MonCotiz>1</fe:MonCotiz>                <!-- Cotización -->

                  <!-- ALÍCUOTAS IVA (OBLIGATORIO desde 2025) -->
                  <fe:Iva>
                     <fe:AlicIva>
                        <fe:Id>5</fe:Id>                      <!-- 3=0%, 4=10.5%, 5=21%, 6=27% -->
                        <fe:BaseImp>{BASE_IMPONIBLE}</fe:BaseImp>
                        <fe:Importe>{IVA_CALCULADO}</fe:Importe>
                     </fe:AlicIva>
                  </fe:Iva>

                  <!-- OTROS TRIBUTOS (opcional) -->
                  <fe:Tributos>
                     <fe:Tributo>
                        <fe:Id>99</fe:Id>                     <!-- ID del tributo -->
                        <fe:Desc>Percepción IIBB</fe:Desc>
                        <fe:BaseImp>{BASE}</fe:BaseImp>
                        <fe:Alic>3.50</fe:Alic>
                        <fe:Importe>{MONTO}</fe:Importe>
                     </fe:Tributo>
                  </fe:Tributos>

                  <!-- TIPO DE CAMBIO (OBLIGATORIO desde 15/04/2025 para Fact A, B, C, E) -->
                  <fe:CbtesAsoc>
                     <!-- Si corresponde -->
                  </fe:CbtesAsoc>
               </fe:FECAEDetRequest>
            </fe:FeDetReq>
         </fe:FeCAEReq>
      </fe:FECAESolicitar>
   </soapenv:Body>
</soapenv:Envelope>
```

### 2.4. Response - CAE Obtenido

```xml
<FeCAEResp>
   <FeCabResp>
      <Cuit>20123456789</Cuit>
      <PtoVta>1</PtoVta>
      <CbteTipo>1</CbteTipo>
      <FchProceso>20251208</FchProceso>
      <CantReg>1</CantReg>
      <Resultado>A</Resultado>          <!-- A=Aprobado, R=Rechazado -->
   </FeCabResp>

   <FeDetResp>
      <FECAEDetResponse>
         <Concepto>1</Concepto>
         <DocTipo>80</DocTipo>
         <DocNro>20987654321</DocNro>
         <CbteDesde>1</CbteDesde>
         <CbteHasta>1</CbteHasta>
         <CbteFch>20251208</CbteFch>
         <Resultado>A</Resultado>

         <!-- ✅ CAE OBTENIDO -->
         <CAE>12345678901234</CAE>                    <!-- 14 dígitos -->
         <CAEFchVto>20251218</CAEFchVto>              <!-- Vencimiento CAE (10 días) -->

         <Observaciones>
            <!-- Si hay observaciones -->
         </Observaciones>
      </FECAEDetResponse>
   </FeDetResp>

   <Errors>
      <!-- Si hay errores -->
   </Errors>
</FeCAEResp>
```

---

## 🔢 CÓDIGOS Y CONSTANTES

### Tipos de Comprobante (CbteTipo)
| Código | Tipo | Descripción |
|--------|------|-------------|
| 1 | A | Factura A (RI → RI) |
| 6 | B | Factura B (RI → CF/RM) |
| 11 | C | Factura C (RM → RM/CF) |
| 3 | A | Nota de Crédito A |
| 8 | B | Nota de Crédito B |
| 13 | C | Nota de Crédito C |
| 2 | A | Nota de Débito A |
| 7 | B | Nota de Débito B |
| 12 | C | Nota de Débito C |

### Tipos de Documento (DocTipo)
| Código | Tipo |
|--------|------|
| 80 | CUIT |
| 86 | CUIL |
| 87 | CDI |
| 89 | LE |
| 90 | LC |
| 91 | CI Extranjera |
| 94 | RUC |
| 96 | DNI |
| 99 | Consumidor Final |

### Alícuotas IVA (Id)
| Código | Alícuota |
|--------|----------|
| 3 | 0% |
| 4 | 10.5% |
| 5 | 21% |
| 6 | 27% |

### Conceptos (Concepto)
| Código | Tipo |
|--------|------|
| 1 | Productos |
| 2 | Servicios |
| 3 | Productos y Servicios |

---

## ⚠️ VALIDACIONES Y ERRORES COMUNES

### Errores de Autenticación
| Código | Descripción | Solución |
|--------|-------------|----------|
| 600 | Token expirado | Renovar TA con WSAA |
| 601 | CUIT no autorizado | Verificar certificado |
| 602 | Error de firma | Regenerar TRA firmado |

### Errores de Facturación
| Código | Descripción | Solución |
|--------|-------------|----------|
| 10001 | CUIT inválido | Verificar formato |
| 10002 | Punto de venta no habilitado | Habilitar en AFIP |
| 10003 | Número de comprobante duplicado | Obtener último número |
| 10004 | Fecha inválida | Usar fecha actual ±5 días |
| 10005 | IVA no cuadra | Recalcular ImpIVA e ImpTotal |

---

## 📦 IMPLEMENTACIÓN EN NODE.JS

### Librerías Recomendadas

```bash
npm install soap          # Cliente SOAP
npm install node-forge    # Para firmar certificados
npm install moment        # Manejo de fechas
npm install xml2js        # Parsear XML
```

### Estructura de Archivos

```
backend/src/services/afip/
├── AfipAuthService.js           # WSAA - Autenticación
├── AfipBillingService.js        # WSFEv1 - Facturación
├── AfipCertificateManager.js    # Gestión de certificados
└── utils/
    ├── soap-client.js           # Cliente SOAP genérico
    ├── xml-signer.js            # Firmador de XML
    └── afip-constants.js        # Códigos y constantes
```

---

## 🔄 FLUJO COMPLETO DE INTEGRACIÓN

```javascript
// 1. Autenticar (WSAA)
const ta = await AfipAuthService.getAccessTicket('wsfe');
// ta = { token, sign, expiration }

// 2. Preparar factura
const invoice = {
    CbteTipo: 1,      // Factura A
    PtoVta: 1,
    DocTipo: 80,      // CUIT
    DocNro: '20123456789',
    ImpTotal: 12100,  // $10,000 + 21% IVA
    ImpNeto: 10000,
    ImpIVA: 2100,
    // ... más campos
};

// 3. Solicitar CAE (WSFEv1)
const result = await AfipBillingService.solicitarCAE(ta, invoice);
// result = { CAE: '12345678901234', CAEFchVto: '20251218' }

// 4. Guardar en BD
await sequelize.query(`
    UPDATE siac_facturas
    SET cae = :cae,
        cae_vencimiento = :caeVto,
        estado = 'AUTORIZADA'
    WHERE id = :facturaId
`, {
    replacements: {
        cae: result.CAE,
        caeVto: result.CAEFchVto,
        facturaId: invoice.id
    }
});
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Certificados y Autenticación
- [ ] Generar certificado de testing en WSASS
- [ ] Implementar `AfipCertificateManager.js`
- [ ] Implementar `AfipAuthService.js` (WSAA)
- [ ] Test de autenticación en ambiente homologación
- [ ] Cachear TA (12h TTL)

### Fase 2: Facturación Básica
- [ ] Implementar `AfipBillingService.js` (WSFEv1)
- [ ] Método `FECAESolicitar` para Factura A
- [ ] Método `FECAESolicitar` para Factura B y C
- [ ] Validaciones de datos pre-envío
- [ ] Manejo de errores y reintentos

### Fase 3: Funcionalidades Avanzadas
- [ ] Notas de Crédito y Débito
- [ ] Consulta de último número (`FECompUltimoAutorizado`)
- [ ] Consulta de CAE emitido (`FECompConsultar`)
- [ ] Itemización de IVA (obligatorio 2025)
- [ ] Tipo de cambio (obligatorio desde 15/04/2025)

### Fase 4: Producción
- [ ] Obtener certificado de producción
- [ ] Habilitar puntos de venta en AFIP
- [ ] Migrar a endpoints de producción
- [ ] Logs y monitoreo
- [ ] Backup de facturas autorizadas

---

## 📚 FUENTES Y DOCUMENTACIÓN OFICIAL

### Documentación AFIP/ARCA
- [Factura Electrónica | ARCA](https://www.afip.gob.ar/fe/)
- [Emisión y autorización - Consideraciones](https://www.afip.gob.ar/fe/emision-autorizacion/consideraciones.asp)
- [WebServices de Factura Electrónica](https://www.afip.gob.ar/ws/documentacion/ws-factura-electronica.asp)
- [Manual Desarrollador ARCA COMPG v4.0 (PDF)](https://www.afip.gob.ar/ws/documentacion/manuales/manual-desarrollador-ARCA-COMPG-v4-0.pdf)

### Documentación WSAA (Autenticación)
- [WSAA - Documentación](https://www.afip.gob.ar/ws/documentacion/wsaa.asp)
- [WSAA Manual del Desarrollador (PDF)](https://www.afip.gob.ar/ws/WSAA/WSAAmanualDev.pdf)
- [Especificación Técnica WSAA 1.2.2 (PDF)](https://www.afip.gob.ar/ws/wsaa/especificacion_tecnica_wsaa_1.2.2.pdf)
- [Generación de Certificados para Producción (PDF)](https://www.afip.gob.ar/ws/wsaa/wsaa.obtenercertificado.pdf)

### Manuales WSFEv1
- [Manual Desarrollador WSFEv1 V.2.22 (PDF)](https://servicioscf.afip.gob.ar/facturadecreditoelectronica/documentos/wsfev1_Manual-desarrollador-V.2.22.pdf)
- [Manual WSBFEv1 Para El Desarrollador (PDF)](https://www.afip.gob.ar/fe/ayuda/documentos/WSBFEV1-Manual-Para-El-Desarrollador.pdf)

### Otros WebServices AFIP
- [Web Service MTXCA (PDF)](https://www.afip.gob.ar/fe/ayuda/documentos/Web-Service-MTXCA.pdf)
- [FECred Service (PDF)](https://servicioscf.afip.gob.ar/facturadecreditoelectronica/documentos/Manual-Desarrollador-WSFECRED.pdf)

### Recursos de la Comunidad
- [PyAfipWs - Factura Electrónica Libre](https://www.pyafipws.com.ar/factura-electr%C3%B3nica/wsaa)
- [GitHub - gabrielpaz7/afip-wsdocs](https://github.com/gabrielpaz7/afip-wsdocs)
- [GitHub - janusky/auth-afip](https://github.com/janusky/auth-afip)
- [Factura Electrónica Argentina | EDICOM](https://edicom.com.ar/blog/como-es-la-factura-electronica-en-argentina)

### Consultas y ABC
- [Consultas y respuestas frecuentes AFIP](https://servicioscf.afip.gob.ar/publico/abc/ABCpaso2.aspx?id_nivel1=556&id_nivel2=892&id_nivel3=1508&id_nivel4=2059)
- [Constatación de Comprobantes | AFIP](https://servicioscf.afip.gob.ar/publico/comprobantes/cae.aspx)
- [CAEA - Código de Autorización Anticipado](https://servicioscf.afip.gob.ar/publico/abc/ABCpaso2.aspx?cat=3222)

---

## 🎯 PRÓXIMOS PASOS

1. **Implementar `AfipAuthService.js`** - Autenticación WSAA
2. **Implementar `AfipBillingService.js`** - Facturación WSFEv1
3. **Integrar con `BillingRulesService.js`** - Usar plantillas fiscales
4. **Testing completo** en ambiente homologación
5. **Obtener certificado producción** y migrar

---

**Documentado**: 2025-12-08
**Última actualización**: 2025-12-08
**Versión**: 1.0.0
