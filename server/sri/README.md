# Insight · Motor de Facturación Electrónica SRI (Camino B — integración directa)

Este módulo implementa, **desde cero y en nuestro servidor**, la emisión de
comprobantes electrónicos según el **esquema offline del SRI Ecuador**.

## Los 6 pasos y dónde están

| Paso | Archivo | Estado |
|---|---|---|
| 1. Clave de acceso (49 díg. + módulo 11) | `clave-acceso.js` | ✅ Implementado y **probado** |
| 2. XML de la factura (v1.1.0, IVA 15%) | `factura-xml.js` | ✅ Implementado y **probado** |
| 3. Firma **XAdES-BES** con el `.p12` | `firma.js` | ✅ Implementado y **verificado criptográficamente** |
| 4. Web service de **Recepción** (SOAP) | `sri-client.js` | ✅ Implementado — falta probar contra el SRI real |
| 5. Web service de **Autorización** (SOAP) | `sri-client.js` | ✅ Implementado — falta probar contra el SRI real |
| 6. RIDE (PDF) + envío por correo | *pendiente* | ⏳ Siguiente |
| Orquestador de los 6 pasos | `emitir.js` | ✅ |

## Cómo se prueba lo que ya está

```bash
cd server
npm install            # instala node-forge
node sri/test.js       # pruebas de clave de acceso, módulo 11 y XML
```

La firma se validó generando un certificado de prueba, firmando una factura y
verificando la firma con la clave pública (round-trip criptográfico correcto).

## Lo que falta para emitir facturas AUTORIZADAS de verdad

1. **Firma electrónica (.p12) del negocio** — es obligatoria; sin ella no se
   puede firmar ni autorizar nada. Se compra en Security Data, Uanataca o el
   Banco Central (firmaEC), ~$25/año, emitida al RUC del cliente.
2. **Certificar en el ambiente de PRUEBAS del SRI** (`celcer.sri.gob.ec`): con
   el certificado real, correr `emitir.js` con `ambiente:'1'` y ajustar
   cualquier detalle que el validador del SRI observe (el SRI es estricto con
   la firma y el esquema).
3. **Pasar a PRODUCCIÓN** (`cel.sri.gob.ec`, `ambiente:'2'`) una vez aprobado.
4. **Hosting del backend** (servidor 24/7) y conectar el POS: cuando el local
   está sin internet, la factura se emite local y queda en cola; al volver la
   conexión, el servidor la envía al SRI y baja el número de autorización.
5. **Paso 6**: generar el RIDE (PDF) y enviarlo con el XML al correo del cliente.

## Uso (una vez con certificado)

```js
const { emitirFactura } = require("./sri/emitir");

const r = await emitirFactura({
  ambiente: "1", // 1 pruebas, 2 producción
  secuencial: "000000001",
  emisor: { razonSocial: "CAFETERIA LA ESQUINA", ruc: "0992233445001",
            dirMatriz: "Guayaquil", estab: "001", ptoEmi: "001", obligadoContabilidad: "NO" },
  cliente: { razonSocial: "CONSUMIDOR FINAL", identificacion: "9999999999999" },
  items: [{ descripcion: "Almuerzo", cantidad: 1, precioUnitario: 3.50 }],
  certificado: { p12: bufferDelP12, password: "clave-del-cert" }
});
// r.estado -> "AUTORIZADO" | "NO AUTORIZADO" ; r.numeroAutorizacion
```

> Nota honesta: los pasos 1–3 están probados aquí. Los pasos 4–5 están escritos
> con los endpoints oficiales del SRI pero **solo pueden validarse al 100% con el
> certificado real del negocio y conexión al SRI**. Ese es el trabajo de
> certificación que sigue.
