/* ==========================================================================
   InsightPay · Bóveda de certificados (.p12) por negocio
   Guarda cifrado el certificado de firma electrónica y su clave, para poder
   firmar TODAS las facturas del negocio sin volver a pedirlos.

   Cifrado en reposo: AES-256-GCM con una clave maestra que vive en la
   variable de entorno INSIGHTPAY_MASTER_KEY (32 bytes en hex).
   En producción esa clave debe venir de un secreto/KMS del hosting, nunca
   del código. Aquí, si no existe, se deriva una de desarrollo (NO producción).
   ========================================================================== */
"use strict";

var crypto = require("crypto");
var fs = require("fs");
var path = require("path");
var { leerP12 } = require("./sri/firma");

var DATA_DIR = path.join(__dirname, "data", "certs");

function masterKey() {
  var hex = process.env.INSIGHTPAY_MASTER_KEY;
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  // Clave de DESARROLLO derivada (no usar en producción).
  return crypto.createHash("sha256").update("insightpay-dev-key-cambiar-en-produccion").digest();
}

function ensureDir() { fs.mkdirSync(DATA_DIR, { recursive: true }); }
function fileFor(tenant) { return path.join(DATA_DIR, tenant.replace(/[^a-zA-Z0-9_]/g, "") + ".enc"); }

function encrypt(plainBuf) {
  var iv = crypto.randomBytes(12);
  var cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  var enc = Buffer.concat([cipher.update(plainBuf), cipher.final()]);
  var tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]); // iv(12) + tag(16) + datos
}
function decrypt(blob) {
  var iv = blob.subarray(0, 12);
  var tag = blob.subarray(12, 28);
  var data = blob.subarray(28);
  var decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/**
 * Valida y guarda el certificado de un negocio.
 * @param {string} tenant
 * @param {Buffer|string} p12  archivo .p12 (Buffer o base64)
 * @param {string} password
 * @returns {Object} { ruc, razonSocial, validoHasta } (datos leídos del certificado)
 */
function guardarCertificado(tenant, p12, password) {
  var p12Buf = Buffer.isBuffer(p12) ? p12 : Buffer.from(p12, "base64");
  // Validar que abre con la clave y extraer datos del titular
  var creds = leerP12(p12Buf, password); // lanza si la clave es incorrecta
  var cert = creds.cert;
  var subject = {};
  cert.subject.attributes.forEach(function (a) { subject[a.shortName || a.name] = a.value; });
  var ruc = extraerRuc(cert, subject);
  var razonSocial = subject.CN || subject.O || "";

  ensureDir();
  var payload = JSON.stringify({ p12: p12Buf.toString("base64"), password: password, ruc: ruc, razonSocial: razonSocial, guardado: Date.now() });
  fs.writeFileSync(fileFor(tenant), encrypt(Buffer.from(payload, "utf8")));

  return { ruc: ruc, razonSocial: razonSocial, validoHasta: cert.validity.notAfter };
}

function extraerRuc(cert, subject) {
  // El RUC suele venir en serialNumber o en algún OID del certificado ecuatoriano.
  if (subject.serialNumber && /\d{13}/.test(subject.serialNumber)) return (subject.serialNumber.match(/\d{13}/) || [])[0];
  // Buscar en extensiones/attrs cualquier secuencia de 13 dígitos
  var blob = JSON.stringify(subject);
  var m = blob.match(/\d{13}/);
  return m ? m[0] : "";
}

/** Recupera el certificado descifrado para firmar. */
function obtenerCertificado(tenant) {
  var f = fileFor(tenant);
  if (!fs.existsSync(f)) return null;
  var obj = JSON.parse(decrypt(fs.readFileSync(f)).toString("utf8"));
  return { p12: Buffer.from(obj.p12, "base64"), password: obj.password, ruc: obj.ruc, razonSocial: obj.razonSocial };
}

function tieneCertificado(tenant) { return fs.existsSync(fileFor(tenant)); }
function eliminarCertificado(tenant) { var f = fileFor(tenant); if (fs.existsSync(f)) fs.unlinkSync(f); }

module.exports = { guardarCertificado: guardarCertificado, obtenerCertificado: obtenerCertificado, tieneCertificado: tieneCertificado, eliminarCertificado: eliminarCertificado };
