/* ==========================================================================
   InsightPay · WhatsApp Cloud API (Meta) — envío de mensajes
   Requiere, por cada número conectado: phone_number_id y un access token.
   Estos valores son SECRETOS y viven en variables de entorno del servidor.
   ========================================================================== */
"use strict";

var GRAPH = "https://graph.facebook.com/v20.0";

/**
 * Envía un mensaje de texto por WhatsApp.
 * @param {Object} cfg { phoneNumberId, token }
 * @param {string} to  número del cliente (wa_id, solo dígitos)
 * @param {string} text
 */
async function enviarTexto(cfg, to, text) {
  if (!cfg || !cfg.phoneNumberId || !cfg.token) {
    // Sin credenciales: modo simulado (para pruebas locales).
    return { simulado: true, to: to, text: text };
  }
  var res = await fetch(GRAPH + "/" + cfg.phoneNumberId + "/messages", {
    method: "POST",
    headers: { "Authorization": "Bearer " + cfg.token, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to, type: "text", text: { body: text } })
  });
  var data = await res.json().catch(function () { return {}; });
  return { ok: res.ok, status: res.status, data: data };
}

/** Extrae los mensajes entrantes de un payload de webhook de Meta. */
function extraerMensajes(body) {
  var out = [];
  try {
    (body.entry || []).forEach(function (entry) {
      (entry.changes || []).forEach(function (change) {
        var value = change.value || {};
        var phoneNumberId = value.metadata && value.metadata.phone_number_id;
        (value.messages || []).forEach(function (msg) {
          out.push({
            phoneNumberId: phoneNumberId,
            from: msg.from,
            text: msg.text ? msg.text.body : (msg.button ? msg.button.text : ""),
            type: msg.type,
            id: msg.id
          });
        });
      });
    });
  } catch (e) { /* payload inesperado */ }
  return out;
}

module.exports = { enviarTexto: enviarTexto, extraerMensajes: extraerMensajes };
