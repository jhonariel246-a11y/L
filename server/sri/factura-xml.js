/* ==========================================================================
   Insight · SRI — Construcción del XML de FACTURA (comprobante v1.1.0)
   Genera el XML según el esquema del SRI. IVA 15% => codigoPorcentaje "4".
   No firma: eso lo hace firma.js (XAdES-BES).
   ========================================================================== */
"use strict";

var IVA_CODIGO = "2";        // 2 = IVA
var IVA_COD_PORCENTAJE = "4"; // 4 = 15% (código del SRI para tarifa 15%)
var IVA_TARIFA = 15;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function n2(v) { return (Math.round((+v || 0) * 100) / 100).toFixed(2); }

/** Mapa de tipo de identificación del comprador (tabla 7 del SRI). */
function tipoIdentificacion(cliente) {
  if (cliente.tipoId) return cliente.tipoId;
  var id = (cliente.identificacion || "").replace(/\D/g, "");
  if (id === "9999999999999" || id === "9999999999") return "07"; // consumidor final
  if (id.length === 13) return "04"; // RUC
  if (id.length === 10) return "05"; // cédula
  return "06"; // pasaporte / exterior
}

/**
 * @param {Object} data
 *   emisor: { razonSocial, nombreComercial, ruc, dirMatriz, dirEstablecimiento,
 *             estab, ptoEmi, obligadoContabilidad:'SI'|'NO', contribuyenteEspecial? }
 *   factura: { ambiente, tipoEmision, secuencial, fechaEmision(Date), claveAcceso,
 *              formaPago('01'|'20'...), placa? }
 *   cliente: { razonSocial, identificacion, tipoId?, direccion?, email? }
 *   items: [{ codigoPrincipal?, descripcion, cantidad, precioUnitario, descuento? }]
 * @returns {string} XML sin firmar
 */
function construirFacturaXML(data) {
  var e = data.emisor, f = data.factura, c = data.cliente, items = data.items || [];

  var totalSinImpuestos = 0, totalDescuento = 0;
  var detallesXml = items.map(function (it) {
    var cant = +it.cantidad || 0;
    var pu = +it.precioUnitario || 0;
    var desc = +it.descuento || 0;
    var totalLinea = cant * pu - desc;
    totalSinImpuestos += totalLinea;
    totalDescuento += desc;
    var ivaLinea = totalLinea * IVA_TARIFA / 100;
    return "" +
      "<detalle>" +
      "<codigoPrincipal>" + esc(it.codigoPrincipal || "N/A") + "</codigoPrincipal>" +
      "<descripcion>" + esc(it.descripcion) + "</descripcion>" +
      "<cantidad>" + n2(cant) + "</cantidad>" +
      "<precioUnitario>" + n2(pu) + "</precioUnitario>" +
      "<descuento>" + n2(desc) + "</descuento>" +
      "<precioTotalSinImpuesto>" + n2(totalLinea) + "</precioTotalSinImpuesto>" +
      "<impuestos><impuesto>" +
      "<codigo>" + IVA_CODIGO + "</codigo>" +
      "<codigoPorcentaje>" + IVA_COD_PORCENTAJE + "</codigoPorcentaje>" +
      "<tarifa>" + IVA_TARIFA + "</tarifa>" +
      "<baseImponible>" + n2(totalLinea) + "</baseImponible>" +
      "<valor>" + n2(ivaLinea) + "</valor>" +
      "</impuesto></impuestos>" +
      "</detalle>";
  }).join("");

  var totalIva = totalSinImpuestos * IVA_TARIFA / 100;
  var importeTotal = totalSinImpuestos + totalIva;
  var formaPago = f.formaPago || "01"; // 01 = sin utilización sistema financiero (efectivo)

  var infoTributaria = "" +
    "<infoTributaria>" +
    "<ambiente>" + esc(f.ambiente) + "</ambiente>" +
    "<tipoEmision>" + esc(f.tipoEmision || "1") + "</tipoEmision>" +
    "<razonSocial>" + esc(e.razonSocial) + "</razonSocial>" +
    "<nombreComercial>" + esc(e.nombreComercial || e.razonSocial) + "</nombreComercial>" +
    "<ruc>" + esc(e.ruc) + "</ruc>" +
    "<claveAcceso>" + esc(f.claveAcceso) + "</claveAcceso>" +
    "<codDoc>01</codDoc>" +
    "<estab>" + esc(e.estab || "001") + "</estab>" +
    "<ptoEmi>" + esc(e.ptoEmi || "001") + "</ptoEmi>" +
    "<secuencial>" + esc(f.secuencial) + "</secuencial>" +
    "<dirMatriz>" + esc(e.dirMatriz) + "</dirMatriz>" +
    "</infoTributaria>";

  var fecha = f.fechaEmision instanceof Date ? f.fechaEmision : new Date(f.fechaEmision || Date.now());
  var fechaStr = String(fecha.getDate()).padStart(2, "0") + "/" +
    String(fecha.getMonth() + 1).padStart(2, "0") + "/" + fecha.getFullYear();

  var infoFactura = "" +
    "<infoFactura>" +
    "<fechaEmision>" + fechaStr + "</fechaEmision>" +
    "<dirEstablecimiento>" + esc(e.dirEstablecimiento || e.dirMatriz) + "</dirEstablecimiento>" +
    (e.contribuyenteEspecial ? "<contribuyenteEspecial>" + esc(e.contribuyenteEspecial) + "</contribuyenteEspecial>" : "") +
    "<obligadoContabilidad>" + esc(e.obligadoContabilidad || "NO") + "</obligadoContabilidad>" +
    "<tipoIdentificacionComprador>" + tipoIdentificacion(c) + "</tipoIdentificacionComprador>" +
    "<razonSocialComprador>" + esc(c.razonSocial || "CONSUMIDOR FINAL") + "</razonSocialComprador>" +
    "<identificacionComprador>" + esc(c.identificacion || "9999999999999") + "</identificacionComprador>" +
    "<totalSinImpuestos>" + n2(totalSinImpuestos) + "</totalSinImpuestos>" +
    "<totalDescuento>" + n2(totalDescuento) + "</totalDescuento>" +
    "<totalConImpuestos><totalImpuesto>" +
    "<codigo>" + IVA_CODIGO + "</codigo>" +
    "<codigoPorcentaje>" + IVA_COD_PORCENTAJE + "</codigoPorcentaje>" +
    "<baseImponible>" + n2(totalSinImpuestos) + "</baseImponible>" +
    "<valor>" + n2(totalIva) + "</valor>" +
    "</totalImpuesto></totalConImpuestos>" +
    "<propina>0.00</propina>" +
    "<importeTotal>" + n2(importeTotal) + "</importeTotal>" +
    "<moneda>DOLAR</moneda>" +
    "<pagos><pago>" +
    "<formaPago>" + esc(formaPago) + "</formaPago>" +
    "<total>" + n2(importeTotal) + "</total>" +
    "</pago></pagos>" +
    "</infoFactura>";

  var xml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<factura id="comprobante" version="1.1.0">' +
    infoTributaria +
    infoFactura +
    "<detalles>" + detallesXml + "</detalles>" +
    "</factura>";

  return {
    xml: xml,
    totales: {
      totalSinImpuestos: +n2(totalSinImpuestos),
      totalIva: +n2(totalIva),
      importeTotal: +n2(importeTotal)
    }
  };
}

module.exports = { construirFacturaXML: construirFacturaXML };
