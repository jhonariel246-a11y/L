/* Prueba del bot de WhatsApp con una conversación simulada.
   node server/whatsapp/test.js */
"use strict";
var assert = require("assert");
var wa = require("./handler");
var bot = require("./bot");

var fails = 0;
function t(name, fn) { try { fn(); console.log("  ✓ " + name); } catch (e) { fails++; console.log("  ✗ " + name + "\n      " + e.message); } }

var MENU = [
  { id: "m1", name: "Bolón mixto", cat: "Desayunos", price: 2.5, stock: 30 },
  { id: "m2", name: "Café pasado", cat: "Bebidas", price: 1.25, stock: 60 },
  { id: "m3", name: "Encebollado", cat: "Platos fuertes", price: 3.5, stock: 20 }
];

console.log("Bot de WhatsApp — motor de conversación");

t("parseItems entiende '2 bolón, 1 café'", function () {
  var items = bot.parseItems("2 bolón, 1 café", { menu: MENU });
  assert.strictEqual(items.length, 2);
  var bolon = items.filter(function (i) { return i.id === "m1"; })[0];
  assert.ok(bolon && bolon.qty === 2, "bolón x2");
});

t("conversación completa termina en un pedido guardado", async function () {
  // se ejecuta abajo (async)
});

async function conversacionCompleta() {
  console.log("\nConversación completa (vía webhook simulado)");
  wa._reset();
  var PNID = "123456";
  wa.registrarLocal(PNID, { tenant: "t_demo", restaurantName: "Cafetería La Esquina", menu: MENU, token: null });

  function payload(text, from) {
    return { entry: [{ changes: [{ value: { metadata: { phone_number_id: PNID }, messages: [{ from: from || "593999111222", type: "text", text: { body: text } }] } }] }] };
  }

  var r1 = await wa.procesarWebhook(payload("Hola, para llevar"));
  t("1) saluda y manda menú (sin pedido aún)", function () { assert.ok(!r1[0].pedido && r1[0].replies >= 1); });

  var r2 = await wa.procesarWebhook(payload("2 bolón y 1 café"));
  t("2) toma los ítems", function () { assert.ok(!r2[0].pedido && r2[0].replies >= 1); });

  var r3 = await wa.procesarWebhook(payload("listo"));
  t("3) pide confirmación (aún sin guardar)", function () { assert.ok(!r3[0].pedido); });

  var r4 = await wa.procesarWebhook(payload("sí"));
  t("4) confirma y GUARDA el pedido", function () {
    assert.ok(r4[0].pedido, "no se generó pedido");
    assert.strictEqual(r4[0].pedido.lines.length, 2);
    // 2*2.5 + 1*1.25 = 6.25 ; total con IVA 15% = 7.19
    assert.ok(Math.abs(r4[0].pedido.total - 7.19) < 0.02, "total=" + r4[0].pedido.total);
  });

  t("5) el pedido queda en el buzón del local", function () {
    var pend = wa.pedidosDe("t_demo");
    assert.ok(pend.length === 1 && pend[0].origen === "WhatsApp");
  });

  console.log("");
  if (fails) { console.log("FALLARON " + fails + " prueba(s)"); process.exit(1); }
  else console.log("TODAS LAS PRUEBAS DEL BOT PASARON ✅");
}

conversacionCompleta();
