/* ==========================================================================
   Insight · SRI — Orquestador de emisión de factura electrónica
   Une los 6 pasos: clave de acceso -> XML -> firma -> recepción ->
   autorización -> resultado. (El RIDE/PDF y el correo son el paso 6, aparte.)
   ========================================================================== */
"use strict";

var { generarClaveAcceso } = require("./clave-acceso");
var { construirFacturaXML } = require("./factura-xml");
var { firmarFactura } = require("./firma");
var { enviarRecepcion, consultarAutorizacion } = require("./sri-client");

function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/**
 * Emite una factura electrónica de principio a fin.
 * @param {Object} opts
 *   emisor, cliente, items  -> ver factura-xml.js
 *   secuencial              -> '000000001'
 *   ambiente                -> '1' pruebas | '2' producción
 *   certificado: { p12: Buffer|base64, password: string }
 * @returns {Object} { claveAcceso, estadoRecepcion, estadoAutorizacion, numeroAutorizacion, xmlAutorizado, xmlFirmado }
 */
async function emitirFactura(opts) {
  var fechaEmision = opts.fechaEmision ? new Date(opts.fechaEmision) : new Date();
  var ambiente = opts.ambiente || "1";

  // 1) Clave de acceso
  var claveAcceso = generarClaveAcceso({
    fechaEmision: fechaEmision, tipoComprobante: "01", ruc: opts.emisor.ruc,
    ambiente: ambiente, estab: opts.emisor.estab || "001", ptoEmi: opts.emisor.ptoEmi || "001",
    secuencial: opts.secuencial, tipoEmision: "1"
  });

  // 2) XML
  var built = construirFacturaXML({
    emisor: opts.emisor, cliente: opts.cliente, items: opts.items,
    factura: { ambiente: ambiente, tipoEmision: "1", secuencial: opts.secuencial, fechaEmision: fechaEmision, claveAcceso: claveAcceso, formaPago: opts.formaPago }
  });

  // 3) Firma XAdES-BES
  if (!opts.certificado || !opts.certificado.p12) {
    return { claveAcceso: claveAcceso, estado: "SIN_CERTIFICADO", xmlSinFirmar: built.xml, totales: built.totales,
      nota: "Falta el certificado .p12 del emisor. La factura no puede firmarse ni autorizarse sin la firma electrónica del negocio." };
  }
  var firmado = firmarFactura(built.xml, opts.certificado.p12, opts.certificado.password);

  // Modo prueba local: detenerse tras firmar (sin llamar al SRI)
  if (opts.soloFirmar) {
    return { claveAcceso: claveAcceso, estado: "FIRMADO", totales: built.totales, xmlFirmado: firmado.xml };
  }

  // 4) Recepción (con manejo de error de conexión)
  var recepcion;
  try {
    recepcion = await enviarRecepcion(firmado.xml, ambiente);
  } catch (e) {
    return { claveAcceso: claveAcceso, estado: "ERROR_CONEXION_SRI", mensajes: [String(e.message || e)], xmlFirmado: firmado.xml,
      nota: "No se pudo contactar los web services del SRI (revisa la red del servidor / que el ambiente sea el correcto)." };
  }
  if (recepcion.estado !== "RECIBIDA") {
    return { claveAcceso: claveAcceso, estado: "DEVUELTA", estadoRecepcion: recepcion.estado, mensajes: recepcion.mensajes, xmlFirmado: firmado.xml };
  }

  // 5) Autorización (con un pequeño reintento: el SRI puede tardar en procesar)
  var aut = null;
  for (var i = 0; i < 3; i++) {
    aut = await consultarAutorizacion(claveAcceso, ambiente);
    if (aut.estado && aut.estado !== "EN PROCESO" && aut.estado !== "DESCONOCIDO") break;
    await delay(1500);
  }

  return {
    claveAcceso: claveAcceso,
    estado: aut.estado,                      // AUTORIZADO / NO AUTORIZADO
    estadoRecepcion: recepcion.estado,
    numeroAutorizacion: aut.numeroAutorizacion,
    fechaAutorizacion: aut.fechaAutorizacion,
    mensajes: aut.mensajes,
    totales: built.totales,
    xmlFirmado: firmado.xml,
    xmlAutorizado: aut.raw
  };
}

module.exports = { emitirFactura: emitirFactura };
