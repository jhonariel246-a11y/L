/* ==========================================================================
   InsightPay · Servidor backend (API)
   - Activación de facturación: el cliente sube su .p12 y lo guardamos cifrado.
   - Emisión de facturas: firmamos con el certificado guardado y enviamos al SRI.
   Pensado para correr en el hosting (Node) detrás de insightpay.lat.
   ========================================================================== */
"use strict";

var express = require("express");
var path = require("path");
var certStore = require("./cert-store");
var { emitirFactura } = require("./sri/emitir");

var app = express();
app.use(express.json({ limit: "8mb" })); // el .p12 en base64 puede pesar

// Servir el frontend (los html/assets del repo)
app.use(express.static(path.join(__dirname, "..")));

// CORS básico (para pruebas desde otro origen)
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ---- Estado de facturación de un negocio ---- */
app.get("/api/facturacion/estado", function (req, res) {
  var tenant = req.query.tenant;
  if (!tenant) return res.status(400).json({ error: "falta tenant" });
  res.json({ activa: certStore.tieneCertificado(tenant) });
});

/* ---- Activar facturación: subir y guardar el certificado .p12 ---- */
app.post("/api/facturacion/activar", function (req, res) {
  var b = req.body || {};
  if (!b.tenant || !b.p12 || !b.password) {
    return res.status(400).json({ error: "Se requiere tenant, p12 (base64) y password" });
  }
  try {
    var info = certStore.guardarCertificado(b.tenant, b.p12, b.password);
    res.json({ ok: true, mensaje: "Facturación electrónica activada", ruc: info.ruc, razonSocial: info.razonSocial, validoHasta: info.validoHasta });
  } catch (e) {
    res.status(400).json({ ok: false, error: "No se pudo leer el certificado: clave incorrecta o archivo inválido." });
  }
});

/* ---- Quitar el certificado ---- */
app.delete("/api/facturacion/certificado", function (req, res) {
  var tenant = (req.body && req.body.tenant) || req.query.tenant;
  if (!tenant) return res.status(400).json({ error: "falta tenant" });
  certStore.eliminarCertificado(tenant);
  res.json({ ok: true });
});

/* ---- Emitir una factura (firma con el cert guardado + envía al SRI) ---- */
app.post("/api/facturas", async function (req, res) {
  var b = req.body || {};
  if (!b.tenant) return res.status(400).json({ error: "falta tenant" });
  var cert = certStore.obtenerCertificado(b.tenant);
  if (!cert) return res.status(409).json({ error: "Este negocio no tiene facturación activada. Sube tu certificado .p12 primero." });

  try {
    var r = await emitirFactura({
      ambiente: b.ambiente || "1",
      secuencial: b.secuencial,
      formaPago: b.formaPago,
      emisor: Object.assign({ ruc: cert.ruc, razonSocial: cert.razonSocial }, b.emisor || {}),
      cliente: b.cliente,
      items: b.items,
      certificado: { p12: cert.p12, password: cert.password },
      soloFirmar: b.soloFirmar === true
    });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: "Error al emitir: " + (e.message || e) });
  }
});

app.get("/api/health", function (req, res) { res.json({ ok: true, servicio: "InsightPay API" }); });

var PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, function () { console.log("InsightPay API escuchando en http://localhost:" + PORT); });
}
module.exports = app;
