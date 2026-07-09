/* Pruebas del núcleo SRI (sin dependencias). Ejecuta: node server/sri/test.js */
"use strict";
var assert = require("assert");
var CA = require("./clave-acceso");
var FX = require("./factura-xml");

var fails = 0;
function t(name, fn) {
  try { fn(); console.log("  ✓ " + name); }
  catch (e) { fails++; console.log("  ✗ " + name + "\n      " + e.message); }
}

console.log("Clave de acceso / módulo 11");

t("módulo 11 con caso conocido devuelve dígito válido (0-9)", function () {
  var base = "1".repeat(48);
  var dv = CA.digitoModulo11(base);
  assert.match(dv, /^[0-9]$/);
});

t("módulo 11 rechaza longitudes distintas de 48", function () {
  assert.throws(function () { CA.digitoModulo11("123"); });
});

t("clave de acceso tiene exactamente 49 dígitos", function () {
  var clave = CA.generarClaveAcceso({
    fechaEmision: new Date(2026, 6, 9),
    tipoComprobante: "01",
    ruc: "0992233445001",
    ambiente: "1",
    estab: "001", ptoEmi: "001",
    secuencial: "000000001",
    codigoNumerico: "12345678",
    tipoEmision: "1"
  });
  assert.strictEqual(clave.length, 49, "longitud " + clave.length);
  assert.match(clave, /^\d{49}$/);
});

t("clave es determinística con codigoNumerico fijo y su DV es consistente", function () {
  var o = {
    fechaEmision: new Date(2026, 6, 9), tipoComprobante: "01", ruc: "0992233445001",
    ambiente: "2", estab: "001", ptoEmi: "001", secuencial: "000000042",
    codigoNumerico: "87654321", tipoEmision: "1"
  };
  var c1 = CA.generarClaveAcceso(o);
  var c2 = CA.generarClaveAcceso(o);
  assert.strictEqual(c1, c2);
  // El DV debe corresponder a los primeros 48
  assert.strictEqual(c1[48], CA.digitoModulo11(c1.slice(0, 48)));
});

t("fecha en la clave va como ddmmaaaa", function () {
  assert.strictEqual(CA.fechaDDMMAAAA(new Date(2026, 6, 9)), "09072026");
});

console.log("\nXML de factura");

var built = FX.construirFacturaXML({
  emisor: { razonSocial: "CAFETERIA LA ESQUINA", nombreComercial: "La Esquina", ruc: "0992233445001",
            dirMatriz: "Guayaquil", estab: "001", ptoEmi: "001", obligadoContabilidad: "NO" },
  factura: { ambiente: "1", tipoEmision: "1", secuencial: "000000001", fechaEmision: new Date(2026, 6, 9), claveAcceso: "0".repeat(49), formaPago: "01" },
  cliente: { razonSocial: "CONSUMIDOR FINAL", identificacion: "9999999999999" },
  items: [
    { descripcion: "Bolon mixto", cantidad: 2, precioUnitario: 2.50 },
    { descripcion: "Cafe pasado", cantidad: 1, precioUnitario: 1.25 }
  ]
});

t("XML contiene nodos obligatorios", function () {
  ["<factura", "<infoTributaria>", "<claveAcceso>", "<infoFactura>", "<detalles>", "<importeTotal>"].forEach(function (tag) {
    assert.ok(built.xml.indexOf(tag) !== -1, "falta " + tag);
  });
});

t("IVA 15% usa codigoPorcentaje 4 y tarifa 15", function () {
  assert.ok(built.xml.indexOf("<codigoPorcentaje>4</codigoPorcentaje>") !== -1);
  assert.ok(built.xml.indexOf("<tarifa>15</tarifa>") !== -1);
});

t("totales: base 6.25, IVA 0.94, total 7.19", function () {
  // 2*2.50 + 1*1.25 = 6.25 ; IVA 15% = 0.9375 -> 0.94 ; total 7.19 (aprox por redondeo global)
  assert.strictEqual(built.totales.totalSinImpuestos, 6.25);
  assert.ok(Math.abs(built.totales.totalIva - 0.94) < 0.02, "iva=" + built.totales.totalIva);
  assert.ok(Math.abs(built.totales.importeTotal - 7.19) < 0.02, "total=" + built.totales.importeTotal);
});

t("identificación 13 dígitos => tipo 04 (RUC)", function () {
  var b = FX.construirFacturaXML({
    emisor: { razonSocial: "X", ruc: "0992233445001", dirMatriz: "GYE" },
    factura: { ambiente: "1", secuencial: "000000002", fechaEmision: new Date(), claveAcceso: "0".repeat(49) },
    cliente: { razonSocial: "EMPRESA S.A.", identificacion: "0992233445001" },
    items: [{ descripcion: "Servicio", cantidad: 1, precioUnitario: 10 }]
  });
  assert.ok(b.xml.indexOf("<tipoIdentificacionComprador>04</tipoIdentificacionComprador>") !== -1);
});

// --- Firma XAdES-BES (solo si node-forge está instalado) ---
var forge = null;
try { forge = require("node-forge"); } catch (e) { /* opcional */ }

if (forge) {
  console.log("\nFirma XAdES-BES");
  var crypto = require("crypto");
  var FIRMA = require("./firma");

  t("firma una factura y la firma verifica criptográficamente", function () {
    var keys = forge.pki.rsa.generateKeyPair(2048);
    var cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey; cert.serialNumber = "01AF23";
    cert.validity.notBefore = new Date(); cert.validity.notAfter = new Date(Date.now() + 3.15e10);
    var at = [{ name: "commonName", value: "PRUEBA" }, { name: "countryName", value: "EC" }];
    cert.setSubject(at); cert.setIssuer(at); cert.sign(keys.privateKey, forge.md.sha256.create());
    var p12 = forge.asn1.toDer(forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "c", { algorithm: "3des" })).getBytes();

    var r = FIRMA.firmarFactura(built.xml, Buffer.from(p12, "binary"), "c");
    assert.ok(r.xml.indexOf("<ds:Signature") !== -1, "sin nodo Signature");
    assert.ok(r.xml.indexOf("etsi:SignedProperties") !== -1, "sin SignedProperties XAdES");
    assert.ok(r.xml.indexOf("</ds:Signature></factura>") !== -1, "firma no quedó enveloped");
    var v = crypto.createVerify("RSA-SHA1"); v.update(Buffer.from(r.signedInfo, "utf8"));
    assert.strictEqual(v.verify(r.publicKeyPem, r.signatureValue, "base64"), true, "la firma NO verifica");
  });
} else {
  console.log("\n(Firma XAdES-BES: omitida — instala node-forge con `npm install` para probarla)");
}

console.log("");
if (fails) { console.log("FALLARON " + fails + " prueba(s)"); process.exit(1); }
else console.log("TODAS LAS PRUEBAS PASARON ✅");
