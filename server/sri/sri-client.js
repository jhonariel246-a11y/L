/* ==========================================================================
   Insight · SRI — Cliente de los web services (esquema offline)
   Recepción y Autorización de comprobantes electrónicos vía SOAP.
   Usa fetch nativo de Node 18+. Endpoints de PRUEBAS y PRODUCCIÓN.
   ========================================================================== */
"use strict";

var ENDPOINTS = {
  pruebas: {
    recepcion: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    autorizacion: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline"
  },
  produccion: {
    recepcion: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    autorizacion: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline"
  }
};

function pick(ambiente) { return ambiente === "2" || ambiente === "produccion" ? ENDPOINTS.produccion : ENDPOINTS.pruebas; }

function tag(xml, name) {
  var m = xml.match(new RegExp("<" + name + "[^>]*>([\\s\\S]*?)</" + name + ">", "i"));
  return m ? m[1].trim() : null;
}

/** Envía el XML firmado al SRI (Recepción). Devuelve { estado, raw, mensajes[] }. */
async function enviarRecepcion(xmlFirmado, ambiente) {
  var url = pick(ambiente).recepcion;
  var xmlB64 = Buffer.from(xmlFirmado, "utf8").toString("base64");
  var envelope =
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">' +
    "<soapenv:Header/><soapenv:Body><ec:validarComprobante>" +
    "<xml>" + xmlB64 + "</xml>" +
    "</ec:validarComprobante></soapenv:Body></soapenv:Envelope>";

  var res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "" },
    body: envelope
  });
  var raw = await res.text();
  var estado = tag(raw, "estado") || "DESCONOCIDO";
  var mensajes = [];
  var re = /<mensaje>([\s\S]*?)<\/mensaje>/gi, m;
  while ((m = re.exec(raw))) mensajes.push(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return { estado: estado, mensajes: mensajes, raw: raw };
}

/** Consulta la autorización por clave de acceso. Devuelve { estado, numeroAutorizacion, fechaAutorizacion, mensajes[], raw }. */
async function consultarAutorizacion(claveAcceso, ambiente) {
  var url = pick(ambiente).autorizacion;
  var envelope =
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">' +
    "<soapenv:Header/><soapenv:Body><ec:autorizacionComprobante>" +
    "<claveAccesoComprobante>" + claveAcceso + "</claveAccesoComprobante>" +
    "</ec:autorizacionComprobante></soapenv:Body></soapenv:Envelope>";

  var res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": "" },
    body: envelope
  });
  var raw = await res.text();
  var estado = tag(raw, "estado") || "DESCONOCIDO";
  var mensajes = [];
  var re = /<mensaje>([\s\S]*?)<\/mensaje>/gi, m;
  while ((m = re.exec(raw))) mensajes.push(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return {
    estado: estado,
    numeroAutorizacion: tag(raw, "numeroAutorizacion"),
    fechaAutorizacion: tag(raw, "fechaAutorizacion"),
    mensajes: mensajes,
    raw: raw
  };
}

module.exports = { enviarRecepcion: enviarRecepcion, consultarAutorizacion: consultarAutorizacion, ENDPOINTS: ENDPOINTS };
