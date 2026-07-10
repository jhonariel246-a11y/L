/* ==========================================================================
   InsightPay · WhatsApp — orquestador
   Une: registro de locales (phone_number_id -> local + menú + credenciales),
   el motor del bot, el almacén de sesiones y el buzón de pedidos entrantes.

   Los almacenes son en memoria por ahora, con interfaz lista para mover a
   Supabase (registro de locales, menús y pedidos en la nube).
   ========================================================================== */
"use strict";

var { procesarMensaje } = require("./bot");
var { enviarTexto, extraerMensajes } = require("./cloud-api");

/* ---- Registro de locales (pluggable -> Supabase) ---- */
var registro = {}; // phoneNumberId -> { tenant, restaurantName, menu, cfg:{phoneNumberId, token} }
function registrarLocal(phoneNumberId, data) { registro[phoneNumberId] = Object.assign({ cfg: { phoneNumberId: phoneNumberId, token: data.token } }, data); }
function resolverLocal(phoneNumberId) { return registro[phoneNumberId] || null; }

/* ---- Sesiones por cliente (en memoria) ---- */
var sesiones = {}; // key -> session
function keyDe(phoneNumberId, from) { return phoneNumberId + ":" + from; }

/* ---- Buzón de pedidos entrantes por local ---- */
var buzon = {}; // tenant -> [pedidos]
function guardarPedido(tenant, pedido) { (buzon[tenant] = buzon[tenant] || []).unshift(pedido); }
function pedidosDe(tenant) { return buzon[tenant] || []; }

/**
 * Procesa un payload de webhook de Meta completo: por cada mensaje entrante,
 * resuelve el local, corre el bot, envía las respuestas y guarda el pedido.
 * @returns {Array} resumen de lo procesado (útil para pruebas/logs)
 */
async function procesarWebhook(body) {
  var mensajes = extraerMensajes(body);
  var resultados = [];
  for (var i = 0; i < mensajes.length; i++) {
    var m = mensajes[i];
    var local = resolverLocal(m.phoneNumberId);
    if (!local) { resultados.push({ from: m.from, error: "local no registrado para " + m.phoneNumberId }); continue; }

    var key = keyDe(m.phoneNumberId, m.from);
    var ctx = { restaurantName: local.restaurantName, menu: local.menu || [] };
    var res = procesarMensaje(sesiones[key], m.text, ctx);
    sesiones[key] = res.session;

    // enviar respuestas
    for (var j = 0; j < res.replies.length; j++) {
      await enviarTexto(local.cfg, m.from, res.replies[j]);
    }

    // si se cerró un pedido, guardarlo en el buzón del local
    if (res.order) {
      var pedido = {
        phone: m.from, lines: res.order.lines, total: res.order.total,
        sub: res.order.sub, iva: res.order.iva, ts: Date.now(),
        time: new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
        origen: "WhatsApp", estado: "nuevo"
      };
      guardarPedido(local.tenant, pedido);
      resultados.push({ from: m.from, pedido: pedido });
    } else {
      resultados.push({ from: m.from, replies: res.replies.length });
    }
  }
  return resultados;
}

module.exports = {
  registrarLocal: registrarLocal, resolverLocal: resolverLocal,
  procesarWebhook: procesarWebhook, pedidosDe: pedidosDe,
  _reset: function () { registro = {}; sesiones = {}; buzon = {}; }
};
