/* ==========================================================================
   InsightPay · Netlify Function — API serverless
   Rutas (bajo /api/*  → redirigido a /.netlify/functions/api/*):
     GET  /api/facturacion/estado     ¿el negocio ya activó facturación?
     POST /api/facturacion/activar    sube el .p12 -> se guarda CIFRADO en Supabase
     POST /api/facturas               firma con el cert guardado + envía al SRI

   Autenticación: el frontend envía el JWT de Supabase (Authorization: Bearer).
   El certificado .p12 se cifra (AES-256-GCM) y se guarda en Supabase; nunca en
   disco (las funciones serverless no tienen almacenamiento persistente).

   Variables de entorno (Netlify → Site settings → Environment variables):
     SUPABASE_URL
     SUPABASE_SERVICE_ROLE_KEY   (SECRETO — solo aquí, nunca en el frontend)
     INSIGHTPAY_MASTER_KEY       (32 bytes hex — openssl rand -hex 32)
   ========================================================================== */
"use strict";

var crypto = require("crypto");
var { createClient } = require("@supabase/supabase-js");
var { leerP12 } = require("../../server/sri/firma");
var { emitirFactura } = require("../../server/sri/emitir");

function svc() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function masterKey() {
  var hex = process.env.INSIGHTPAY_MASTER_KEY;
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  throw new Error("INSIGHTPAY_MASTER_KEY no configurada");
}
function encrypt(buf) {
  var iv = crypto.randomBytes(12);
  var c = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  var enc = Buffer.concat([c.update(buf), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}
function decrypt(b64) {
  var blob = Buffer.from(b64, "base64");
  var iv = blob.subarray(0, 12), tag = blob.subarray(12, 28), data = blob.subarray(28);
  var d = crypto.createDecipheriv("aes-256-gcm", masterKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]);
}

function json(statusCode, obj) {
  return { statusCode: statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}

// Verifica el JWT de Supabase y devuelve el negocio del usuario autenticado.
async function negocioDe(event, sb) {
  var auth = event.headers.authorization || event.headers.Authorization || "";
  var token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { error: json(401, { error: "No autenticado" }) };
  var u = await sb.auth.getUser(token);
  if (u.error || !u.data || !u.data.user) return { error: json(401, { error: "Sesión inválida" }) };
  var userId = u.data.user.id;
  var b = await sb.from("businesses").select("id").eq("owner_id", userId).limit(1).single();
  if (b.error || !b.data) return { error: json(409, { error: "Tu cuenta no tiene un negocio creado." }) };
  return { userId: userId, businessId: b.data.id };
}

exports.handler = async function (event) {
  var path = (event.path || "").replace(/^\/(\.netlify\/functions\/api|api)/, "") || "/";
  var method = event.httpMethod;
  var sb;
  try { sb = svc(); } catch (e) { return json(500, { error: "Backend mal configurado" }); }

  try {
    // GET /facturacion/estado
    if (method === "GET" && path === "/facturacion/estado") {
      var ctx = await negocioDe(event, sb); if (ctx.error) return ctx.error;
      var r = await sb.from("billing_certificates").select("activo").eq("business_id", ctx.businessId).maybeSingle();
      return json(200, { activa: !!(r.data && r.data.activo) });
    }

    // POST /facturacion/activar  { p12 (base64), password }
    if (method === "POST" && path === "/facturacion/activar") {
      var ctx2 = await negocioDe(event, sb); if (ctx2.error) return ctx2.error;
      var body = JSON.parse(event.body || "{}");
      if (!body.p12 || !body.password) return json(400, { error: "Falta p12 y/o password" });
      var creds;
      try { creds = leerP12(Buffer.from(body.p12, "base64"), body.password); }
      catch (e) { return json(400, { error: "No se pudo leer el certificado: clave incorrecta o archivo inválido." }); }
      var subject = {}; creds.cert.subject.attributes.forEach(function (a) { subject[a.shortName || a.name] = a.value; });
      var ruc = (JSON.stringify(subject).match(/\d{13}/) || [""])[0];
      var razon = subject.CN || subject.O || "";
      // Se cifra el .p12 JUNTO con su clave (se necesita para firmar luego).
      var p12enc = encrypt(Buffer.from(JSON.stringify({ p12: body.p12, password: body.password }), "utf8"));
      var up = await sb.from("billing_certificates").upsert({
        business_id: ctx2.businessId, ruc: ruc, razon_social: razon, activo: true,
        valid_until: creds.cert.validity.notAfter, p12_encrypted: p12enc, updated_at: new Date().toISOString()
      }).select().maybeSingle();
      if (up.error) return json(500, { error: "No se pudo guardar el certificado." });
      return json(200, { ok: true, ruc: ruc, razonSocial: razon });
    }

    // POST /facturas
    if (method === "POST" && path === "/facturas") {
      var ctx3 = await negocioDe(event, sb); if (ctx3.error) return ctx3.error;
      var b = JSON.parse(event.body || "{}");
      var cert = await sb.from("billing_certificates").select("p12_encrypted, ruc, razon_social, activo")
        .eq("business_id", ctx3.businessId).maybeSingle();
      if (cert.error || !cert.data || !cert.data.activo || !cert.data.p12_encrypted) {
        return json(409, { error: "Este negocio no tiene facturación activada." });
      }
      var guardado = JSON.parse(decrypt(cert.data.p12_encrypted).toString("utf8"));
      var r2 = await emitirFactura({
        ambiente: b.ambiente || "1", secuencial: b.secuencial, formaPago: b.formaPago,
        emisor: Object.assign({}, b.emisor || {}, { ruc: cert.data.ruc, razonSocial: cert.data.razon_social }),
        cliente: b.cliente, items: b.items,
        certificado: { p12: Buffer.from(guardado.p12, "base64"), password: guardado.password },
        soloFirmar: b.soloFirmar === true
      });
      return json(200, r2);
    }

    return json(404, { error: "Ruta no encontrada" });
  } catch (e) {
    console.error("api error:", e);
    return json(500, { error: "Error interno" });
  }
};
