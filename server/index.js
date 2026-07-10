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
app.disable("x-powered-by");
app.use(express.json({ limit: "6mb" })); // el .p12 en base64 puede pesar

// SEGURIDAD: nunca servir la carpeta del servidor (código, .env, certificados
// cifrados) ni archivos ocultos. Solo el frontend.
app.use(function (req, res, next) {
  var p = decodeURIComponent(req.path || "");
  if (p.indexOf("/server") === 0 || p.indexOf("/.") !== -1 || p.indexOf("..") !== -1) {
    return res.status(404).send("No encontrado");
  }
  next();
});
app.use(express.static(path.join(__dirname, ".."), { dotfiles: "deny", index: false }));

// CORS: solo si se configura explícitamente un origen (el backend sirve el
// frontend en el MISMO origen, así que por defecto NO se necesita CORS).
app.use(function (req, res, next) {
  var origin = process.env.CORS_ORIGIN;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Límite básico de tasa para la API (mitiga fuerza bruta / abuso).
var hits = {};
var hitsTimer = setInterval(function () { hits = {}; }, 60 * 1000);
if (hitsTimer.unref) hitsTimer.unref();
app.use("/api", function (req, res, next) {
  var ip = req.ip || (req.connection && req.connection.remoteAddress) || "?";
  hits[ip] = (hits[ip] || 0) + 1;
  if (hits[ip] > 120) return res.status(429).json({ error: "Demasiadas solicitudes, intenta en un minuto." });
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
      // El RUC y la razón social SIEMPRE se toman del certificado (no del cliente).
      emisor: Object.assign({}, b.emisor || {}, { ruc: cert.ruc, razonSocial: cert.razonSocial }),
      cliente: b.cliente,
      items: b.items,
      certificado: { p12: cert.p12, password: cert.password },
      soloFirmar: b.soloFirmar === true
    });
    res.json(r);
  } catch (e) {
    console.error("emitir factura:", e);
    res.status(500).json({ error: "No se pudo emitir la factura." });
  }
});

app.get("/api/health", function (req, res) { res.json({ ok: true, servicio: "InsightPay API" }); });

var PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, function () { console.log("InsightPay API escuchando en http://localhost:" + PORT); });
}
module.exports = app;
