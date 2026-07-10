/* ==========================================================================
   InsightPay · Bot de WhatsApp — motor de conversación (sin dependencias)
   Recibe el texto del cliente + el contexto del local (menú) y devuelve la
   respuesta del bot y, cuando corresponde, el pedido armado.

   Es una máquina de estados por cliente:
     nuevo/saludo -> enviar menú (estado "ordenando")
     ordenando    -> acumular ítems; "listo" -> resumen (estado "confirmando")
     confirmando  -> "sí" crea el pedido; "no" vuelve a ordenar
   ========================================================================== */
"use strict";

var money = function (n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); };
var IVA = 0.15;

function norm(s) {
  return String(s || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // quita tildes
    .trim();
}

var SALUDOS = ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "menu", "menú", "pedido", "quiero", "para llevar"];
var CERRAR = ["listo", "eso es todo", "nada mas", "nada más", "ya", "confirmar", "cerrar", "terminar"];
var SI = ["si", "sí", "confirmo", "confirmado", "dale", "ok", "correcto", "yes"];
var NO = ["no", "cancelar", "cancela", "espera", "cambiar"];

function esAlguno(texto, lista) {
  var t = norm(texto);
  return lista.some(function (x) { return t === x || t.indexOf(x) !== -1; });
}

function menuTexto(ctx) {
  var byCat = {};
  (ctx.menu || []).forEach(function (m) {
    if (m.stock == null || m.stock > 0) (byCat[m.cat || "Menú"] = byCat[m.cat || "Menú"] || []).push(m);
  });
  var lines = ["📋 *Menú de " + (ctx.restaurantName || "nuestro local") + "*"];
  Object.keys(byCat).forEach(function (c) {
    lines.push("\n*" + c + "*");
    byCat[c].forEach(function (m) { lines.push("• " + m.name + " — " + money(m.price)); });
  });
  lines.push('\nEscríbeme tu pedido así: "2 bolón, 1 café". Cuando termines escribe *listo*.');
  return lines.join("\n");
}

/** Intenta emparejar una línea del cliente con ítems del menú. */
function parseItems(texto, ctx) {
  var encontrados = [];
  var partes = String(texto).split(/[,\n;]+| y /i);
  partes.forEach(function (parte) {
    var t = norm(parte);
    if (!t) return;
    var qty = 1;
    var mQty = t.match(/(\d+)/);
    if (mQty) qty = Math.max(1, parseInt(mQty[1], 10));
    var textoSinNum = t.replace(/\d+/g, " ").trim();
    var mejor = null;
    (ctx.menu || []).forEach(function (m) {
      var nm = norm(m.name);
      if (textoSinNum && (nm.indexOf(textoSinNum) !== -1 || textoSinNum.indexOf(nm) !== -1)) {
        if (!mejor || nm.length < norm(mejor.name).length) mejor = m;
      } else {
        // coincidencia por palabra clave
        var palabras = textoSinNum.split(/\s+/).filter(Boolean);
        if (palabras.some(function (p) { return p.length > 2 && nm.indexOf(p) !== -1; })) {
          if (!mejor) mejor = m;
        }
      }
    });
    if (mejor) encontrados.push({ id: mejor.id, name: mejor.name, price: mejor.price, qty: qty });
  });
  return encontrados;
}

function totales(lines) {
  var sub = lines.reduce(function (a, l) { return a + l.price * l.qty; }, 0);
  return { sub: sub, iva: sub * IVA, total: sub * (1 + IVA) };
}
function resumen(lines) {
  var t = totales(lines);
  var r = lines.map(function (l) { return "• " + l.qty + "× " + l.name + " — " + money(l.price * l.qty); }).join("\n");
  return r + "\n\nSubtotal: " + money(t.sub) + "\nIVA 15%: " + money(t.iva) + "\n*Total: " + money(t.total) + "*";
}

/**
 * Procesa un mensaje entrante.
 * @param {Object} session  estado del cliente { estado, lines }
 * @param {string} texto    mensaje del cliente
 * @param {Object} ctx      { restaurantName, menu:[{id,name,price,cat,stock}] }
 * @returns {Object} { replies:[string], order?:{lines,total}, session }
 */
function procesarMensaje(session, texto, ctx) {
  session = session || { estado: "nuevo", lines: [] };
  session.lines = session.lines || [];
  var replies = [];
  var out = { replies: replies, session: session };

  // Saludo o pedir menú en cualquier momento
  if (session.estado === "nuevo" || (session.estado !== "confirmando" && esAlguno(texto, ["menu", "menú"]))) {
    if (session.estado === "nuevo") {
      replies.push("¡Hola! 👋 Bienvenido a *" + (ctx.restaurantName || "nuestro local") + "*. Con gusto tomamos tu pedido para llevar.");
    }
    replies.push(menuTexto(ctx));
    session.estado = "ordenando";
    return out;
  }

  if (session.estado === "confirmando") {
    if (esAlguno(texto, SI)) {
      var t = totales(session.lines);
      out.order = { lines: session.lines.slice(), total: t.total, sub: t.sub, iva: t.iva };
      replies.push("¡Listo! 🎉 Tu pedido entró a cocina y ya lo enviamos a la computadora del local. Estará en unos *15–20 min*. ¡Gracias por tu compra! 🍽️");
      out.session = { estado: "nuevo", lines: [] };
      return out;
    }
    if (esAlguno(texto, NO)) {
      session.estado = "ordenando";
      replies.push("Sin problema 🙌. Dime qué quieres cambiar o agrega más ítems. Escribe *listo* cuando termines.");
      return out;
    }
    replies.push("¿Confirmo tu pedido? Responde *sí* para enviarlo o *no* para cambiarlo.");
    return out;
  }

  // Estado: ordenando
  if (esAlguno(texto, CERRAR)) {
    if (!session.lines.length) {
      replies.push("Aún no has agregado nada 🙂. Escríbeme tu pedido, por ejemplo: \"2 bolón, 1 café\".");
      return out;
    }
    session.estado = "confirmando";
    replies.push("Perfecto ✅ Tu pedido:\n" + resumen(session.lines) + "\n\n¿Confirmo? (*sí* / *no*)");
    return out;
  }

  var nuevos = parseItems(texto, ctx);
  if (nuevos.length) {
    nuevos.forEach(function (nv) {
      var ex = session.lines.filter(function (l) { return l.id === nv.id; })[0];
      if (ex) ex.qty += nv.qty; else session.lines.push(nv);
    });
    if (session.estado === "nuevo") session.estado = "ordenando";
    replies.push("Agregué:\n" + resumen(session.lines) + "\n\n¿Algo más? Escribe *listo* para confirmar.");
    return out;
  }

  // No se entendió
  if (session.estado === "ordenando") {
    replies.push("No te entendí 🤔. Escríbeme el pedido así: \"2 bolón, 1 café\", o escribe *menú* para ver las opciones.");
  } else {
    session.estado = "nuevo";
    return procesarMensaje(session, texto, ctx);
  }
  return out;
}

module.exports = { procesarMensaje: procesarMensaje, menuTexto: menuTexto, parseItems: parseItems };
