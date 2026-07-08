/* ==========================================================================
   Insight Restaurantes — motor del demo POS (100% en el navegador)
   Persistencia en localStorage. Sin dependencias externas.
   ========================================================================== */
(function () {
  "use strict";

  var IVA = 0.15; // IVA Ecuador 2024+
  var KEY = "insight_rest_demo_v1";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); };

  if (!$("#app")) return; // solo corre en la página de restaurantes

  /* ---------- Estado inicial ---------- */
  function seed() {
    return {
      menu: [
        { id: "m1", name: "Bolón mixto", cat: "Desayunos", price: 2.50, stock: 30 },
        { id: "m2", name: "Tigrillo", cat: "Desayunos", price: 3.00, stock: 25 },
        { id: "m3", name: "Encebollado", cat: "Platos fuertes", price: 3.50, stock: 20 },
        { id: "m4", name: "Seco de pollo", cat: "Platos fuertes", price: 4.50, stock: 18 },
        { id: "m5", name: "Guatita", cat: "Platos fuertes", price: 4.00, stock: 12 },
        { id: "m6", name: "Arroz con menestra y carne", cat: "Platos fuertes", price: 5.00, stock: 22 },
        { id: "m7", name: "Café pasado", cat: "Bebidas", price: 1.25, stock: 60 },
        { id: "m8", name: "Jugo de naranja", cat: "Bebidas", price: 1.75, stock: 40 },
        { id: "m9", name: "Cola", cat: "Bebidas", price: 1.00, stock: 50 },
        { id: "m10", name: "Empanada de verde", cat: "Snacks", price: 1.50, stock: 35 },
        { id: "m11", name: "Humita", cat: "Snacks", price: 1.25, stock: 15 },
        { id: "m12", name: "Torta de chocolate", cat: "Postres", price: 2.75, stock: 8 }
      ],
      tables: buildTables(8),
      invoices: [],
      waOrders: [],
      counter: 141
    };
  }
  function buildTables(n) {
    var t = [];
    for (var i = 1; i <= n; i++) t.push({ id: i, name: "Mesa " + i, type: "mesa", lines: [], status: "free" });
    return t;
  }

  var state = load();
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---------- Helpers de UI ---------- */
  var toastEl = $("#toast");
  var toastT;
  function toast(msg, ok) {
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (ok ? " ok" : "");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.className = "toast"; }, 2200);
  }

  function totalsOf(lines) {
    var sub = lines.reduce(function (a, l) { return a + l.price * l.qty; }, 0);
    return { sub: sub, iva: sub * IVA, total: sub * (1 + IVA) };
  }
  function findMenu(id) { return state.menu.filter(function (m) { return m.id === id; })[0]; }
  function findTable(id) { return state.tables.filter(function (t) { return t.id === id; })[0]; }

  /* ---------- Tabs ---------- */
  $$("#tabs .tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      $$("#tabs .tab").forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      $$(".panel").forEach(function (p) { p.classList.remove("active"); });
      $('[data-panel="' + tab.dataset.tab + '"]').classList.add("active");
      if (tab.dataset.tab === "inventario") renderInventory();
      if (tab.dataset.tab === "facturacion") renderInvoices();
      if (tab.dataset.tab === "reportes") renderReports();
    });
  });

  /* =========================================================================
     MESAS + TOMA DE PEDIDO
     ========================================================================= */
  var currentTableId = null;
  var currentCat = "Todos";

  function renderTables() {
    var grid = $("#tablesGrid");
    grid.innerHTML = "";
    state.tables.forEach(function (t) {
      var tot = totalsOf(t.lines);
      var cls = t.status === "free" ? "free" : (t.type === "togo" ? "togo" : "busy");
      var label = t.status === "free" ? "Libre" : (t.type === "togo" ? "Para llevar" : "Ocupada");
      var div = document.createElement("div");
      div.className = "table-card " + cls;
      div.innerHTML =
        '<div class="tnum">' + (t.type === "togo" ? "🛍️" : t.id) + '</div>' +
        '<div class="tstate">' + label + '</div>' +
        '<div class="tamt">' + (t.lines.length ? money(tot.total) : (t.type === "togo" ? t.name : "&mdash;")) + '</div>';
      div.addEventListener("click", function () { openOrder(t.id); });
      grid.appendChild(div);
    });
    $("#mesasTitle").textContent = "Mesas del local (" +
      state.tables.filter(function (t) { return t.status !== "free"; }).length + " activas)";
  }

  function openOrder(id) {
    currentTableId = id;
    var t = findTable(id);
    $("#tablesView").style.display = "none";
    $("#orderView").style.display = "block";
    $("#orderTitle").textContent = t.name + (t.type === "togo" ? " · Para llevar" : "");
    $("#ticketTitle").textContent = "Cuenta · " + t.name;
    renderMenuCats();
    renderMenuItems();
    renderTicket();
  }
  $("#btnBackTables").addEventListener("click", function () {
    $("#orderView").style.display = "none";
    $("#tablesView").style.display = "block";
    currentTableId = null;
    renderTables();
  });

  function renderMenuCats() {
    var cats = ["Todos"].concat(uniqueCats());
    var wrap = $("#menuCats");
    wrap.innerHTML = "";
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "cat-chip" + (c === currentCat ? " active" : "");
      b.textContent = c;
      b.addEventListener("click", function () { currentCat = c; renderMenuCats(); renderMenuItems(); });
      wrap.appendChild(b);
    });
  }
  function uniqueCats() {
    var seen = {}, out = [];
    state.menu.forEach(function (m) { if (!seen[m.cat]) { seen[m.cat] = 1; out.push(m.cat); } });
    return out;
  }
  function renderMenuItems() {
    var wrap = $("#menuItems");
    wrap.innerHTML = "";
    state.menu.filter(function (m) { return currentCat === "Todos" || m.cat === currentCat; })
      .forEach(function (m) {
        var out = m.stock <= 0;
        var d = document.createElement("div");
        d.className = "menu-item" + (out ? " out" : "");
        d.innerHTML =
          '<div class="mi-name">' + m.name + '</div>' +
          '<div class="mi-meta"><span class="mi-price">' + money(m.price) + '</span>' +
          '<span class="mi-stock">' + (out ? "Agotado" : m.stock + " disp.") + '</span></div>';
        if (!out) d.addEventListener("click", function () { addLine(m.id); });
        wrap.appendChild(d);
      });
  }

  function addLine(mid) {
    var t = findTable(currentTableId);
    var m = findMenu(mid);
    if (!m || m.stock <= 0) return;
    var line = t.lines.filter(function (l) { return l.id === mid; })[0];
    if (line) { line.qty++; } else { t.lines.push({ id: mid, name: m.name, price: m.price, qty: 1 }); }
    if (t.status === "free") t.status = "busy";
    save(); renderTicket();
  }
  function changeQty(mid, delta) {
    var t = findTable(currentTableId);
    var line = t.lines.filter(function (l) { return l.id === mid; })[0];
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) t.lines = t.lines.filter(function (l) { return l.id !== mid; });
    if (!t.lines.length && t.type !== "togo") t.status = "free";
    save(); renderTicket();
  }

  function renderTicket() {
    var t = findTable(currentTableId);
    var box = $("#ticketLines");
    if (!t.lines.length) {
      box.innerHTML = '<div class="ticket-empty">Sin productos aún.<br>Toca un plato del menú para agregarlo.</div>';
    } else {
      box.innerHTML = "";
      t.lines.forEach(function (l) {
        var row = document.createElement("div");
        row.className = "tl";
        row.innerHTML =
          '<span class="tl-name">' + l.name + '</span>' +
          '<span class="qty"><button data-a="minus">−</button><b>' + l.qty + '</b><button data-a="plus">+</button></span>' +
          '<span class="tl-amt">' + money(l.price * l.qty) + '</span>';
        row.querySelector('[data-a="minus"]').addEventListener("click", function () { changeQty(l.id, -1); });
        row.querySelector('[data-a="plus"]').addEventListener("click", function () { changeQty(l.id, 1); });
        box.appendChild(row);
      });
    }
    var tot = totalsOf(t.lines);
    $("#tSub").textContent = money(tot.sub);
    $("#tIva").textContent = money(tot.iva);
    $("#tTotal").textContent = money(tot.total);
    $("#ticketSub").textContent = t.lines.length ? (t.lines.length + " producto(s) en la cuenta") : "Toca un plato para agregarlo";
  }

  $("#btnKitchen").addEventListener("click", function () {
    var t = findTable(currentTableId);
    if (!t.lines.length) { toast("Agrega productos primero"); return; }
    toast("👨‍🍳 Enviado a cocina · " + t.name, true);
  });

  /* =========================================================================
     FACTURACIÓN (modal)
     ========================================================================= */
  var billBack = $("#billBack");
  $("#btnBill").addEventListener("click", function () {
    var t = findTable(currentTableId);
    if (!t.lines.length) { toast("La cuenta está vacía"); return; }
    var tot = totalsOf(t.lines);
    $("#bSub").textContent = money(tot.sub);
    $("#bIva").textContent = money(tot.iva);
    $("#bTotal").textContent = money(tot.total);
    billBack.classList.add("open");
  });
  $("#bType").addEventListener("change", function () {
    var ruc = this.value === "ruc";
    $("#bIdField").style.display = ruc ? "block" : "none";
    $("#bNameField").style.display = ruc ? "block" : "none";
  });
  $("#btnCancelBill").addEventListener("click", function () { billBack.classList.remove("open"); });

  $("#btnConfirmBill").addEventListener("click", function () {
    var t = findTable(currentTableId);
    var tot = totalsOf(t.lines);
    state.counter++;
    var num = "001-001-" + String(state.counter).padStart(9, "0");
    var client = $("#bType").value === "ruc"
      ? { id: $("#bId").value || "9999999999", name: $("#bName").value || "Cliente" }
      : { id: "9999999999", name: "Consumidor final" };
    // descontar inventario
    t.lines.forEach(function (l) {
      var m = findMenu(l.id);
      if (m) m.stock = Math.max(0, m.stock - l.qty);
    });
    state.invoices.unshift({
      num: num,
      origin: t.type === "togo" ? "WhatsApp" : t.name,
      client: client,
      pay: $("#bPay").value,
      lines: t.lines.slice(),
      sub: tot.sub, iva: tot.iva, total: tot.total,
      time: new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })
    });
    // liberar / quitar mesa
    if (t.type === "togo") {
      state.tables = state.tables.filter(function (x) { return x.id !== t.id; });
    } else {
      t.lines = []; t.status = "free";
    }
    save();
    billBack.classList.remove("open");
    $("#bType").value = "final"; $("#bIdField").style.display = "none"; $("#bNameField").style.display = "none";
    toast("🧾 Factura " + num + " emitida · " + money(tot.total), true);
    // volver a mesas
    $("#orderView").style.display = "none";
    $("#tablesView").style.display = "block";
    currentTableId = null;
    renderTables();
    updateWaBadge();
  });

  /* =========================================================================
     WHATSAPP (bot simulado)
     ========================================================================= */
  var waBody = $("#waBody");
  var waBusy = false;
  function waPush(text, who) {
    var m = document.createElement("div");
    m.className = "wa-msg " + who;
    var time = new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
    m.innerHTML = text.replace(/</g, "&lt;") + '<span class="t">' + time + '</span>';
    waBody.appendChild(m);
    waBody.scrollTop = waBody.scrollHeight;
  }
  function typing(cb, delay) {
    $("#waStatus").textContent = "escribiendo…";
    setTimeout(function () { $("#waStatus").textContent = "en línea · bot activo"; cb(); }, delay || 900);
  }

  function menuText() {
    var byCat = {};
    state.menu.forEach(function (m) { if (m.stock > 0) { (byCat[m.cat] = byCat[m.cat] || []).push(m); } });
    var lines = ["📋 *Menú del día*"];
    Object.keys(byCat).forEach(function (c) {
      lines.push("\n*" + c + "*");
      byCat[c].forEach(function (m) { lines.push("• " + m.name + " — " + money(m.price)); });
    });
    lines.push("\nEscríbeme lo que deseas 😊");
    return lines.join("\n");
  }

  var sampleOrders = [
    [ { id: "m1", qty: 2 }, { id: "m7", qty: 2 } ],
    [ { id: "m3", qty: 1 }, { id: "m9", qty: 1 } ],
    [ { id: "m6", qty: 1 }, { id: "m4", qty: 1 }, { id: "m8", qty: 2 } ],
    [ { id: "m10", qty: 3 }, { id: "m12", qty: 1 } ]
  ];
  var custNum = 0;

  $("#btnSimWa").addEventListener("click", function () {
    if (waBusy) return;
    waBusy = true;
    custNum++;
    var phone = "+593 99" + String(1000000 + Math.floor(Math.random() * 8999999));
    var order = sampleOrders[(custNum - 1) % sampleOrders.length];

    waBody.innerHTML = "";
    waPush("Buenas, ¿tienen para llevar?", "user");
    typing(function () {
      waPush("¡Hola! 👋 Bienvenido a *Cafetería La Esquina*. Claro que sí, con gusto tomamos tu pedido para llevar. Te comparto el menú:", "bot");
      typing(function () {
        waPush(menuText(), "bot");
        typing(function () {
          var reqText = order.map(function (o) { var m = findMenu(o.id); return o.qty + " " + (m ? m.name : ""); }).join(", ");
          waPush("Quiero " + reqText + " porfa", "user");
          typing(function () {
            var lines = order.map(function (o) { var m = findMenu(o.id); return { id: o.id, name: m.name, price: m.price, qty: o.qty }; });
            var tot = totalsOf(lines);
            var resumen = lines.map(function (l) { return "• " + l.qty + "× " + l.name + " — " + money(l.price * l.qty); }).join("\n");
            waPush("Perfecto ✅ Tu pedido:\n" + resumen + "\n\nSubtotal: " + money(tot.sub) + "\nIVA 15%: " + money(tot.iva) + "\n*Total: " + money(tot.total) + "*\n\n¿Confirmo el pedido? (sí/no)", "bot");
            typing(function () {
              waPush("Sí, confirmado 🙌", "user");
              typing(function () {
                waPush("¡Listo! 🎉 Tu pedido entró a cocina. Estará en unos *15–20 min*. Ya avisé a la computadora del local. ¡Gracias por tu compra! 🍽️", "bot");
                pushWaOrder(phone, lines, tot);
                waBusy = false;
              }, 800);
            }, 700);
          }, 1100);
        }, 1100);
      }, 900);
    }, 700);
  });

  function pushWaOrder(phone, lines, tot) {
    var order = { phone: phone, lines: lines, total: tot.total, time: new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }), accepted: false };
    state.waOrders.unshift(order);
    save();
    renderWaQueue();
    updateWaBadge();
    toast("💬 Nuevo pedido por WhatsApp · " + money(tot.total), true);
  }

  function renderWaQueue() {
    var q = $("#waQueue");
    var pending = state.waOrders.filter(function (o) { return !o.accepted; });
    if (!pending.length) {
      q.innerHTML = '<p class="ticket-empty">No hay órdenes pendientes.<br>Pulsa "Simular cliente entrante".</p>';
      return;
    }
    q.innerHTML = "";
    state.waOrders.forEach(function (o, idx) {
      if (o.accepted) return;
      var items = o.lines.map(function (l) { return l.qty + "× " + l.name; }).join(", ");
      var d = document.createElement("div");
      d.className = "wa-order";
      d.innerHTML =
        '<div class="wo-head">💬 ' + o.phone + ' <span class="amt">' + money(o.total) + '</span></div>' +
        '<div class="wo-items">' + items + ' · ' + o.time + '</div>' +
        '<div class="wo-actions"><button class="btn btn-accent btn-sm" data-i="' + idx + '">✓ Aceptar y crear pedido</button></div>';
      d.querySelector("button").addEventListener("click", function () { acceptWaOrder(idx); });
      q.appendChild(d);
    });
  }

  function acceptWaOrder(idx) {
    var o = state.waOrders[idx];
    if (!o || o.accepted) return;
    o.accepted = true;
    // crear "mesa" para llevar
    var newId = 1000 + state.tables.length + Math.floor(Math.random() * 1000);
    state.tables.push({
      id: newId, name: "Llevar " + o.phone.slice(-4), type: "togo",
      lines: o.lines.slice(), status: "busy"
    });
    save();
    renderWaQueue();
    updateWaBadge();
    renderTables();
    toast("🛍️ Pedido enviado a la compu del local (Para llevar)", true);
  }

  function updateWaBadge() {
    var n = state.waOrders.filter(function (o) { return !o.accepted; }).length;
    var b = $("#waBadge");
    if (n > 0) { b.style.display = ""; b.textContent = n; } else { b.style.display = "none"; }
  }

  /* =========================================================================
     INVENTARIO
     ========================================================================= */
  function renderInventory() {
    var body = $("#invBody");
    body.innerHTML = "";
    state.menu.forEach(function (m) {
      var low = m.stock <= 5;
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + m.name + "</td>" +
        "<td>" + m.cat + "</td>" +
        '<td class="num">' + money(m.price) + "</td>" +
        '<td class="num ' + (low ? "stock-low" : "stock-ok") + '">' + m.stock + (low ? " ⚠" : "") + "</td>" +
        '<td><div class="inv-actions"><button data-a="minus">−</button><button data-a="plus">+</button><button data-a="restock">+10</button></div></td>';
      tr.querySelector('[data-a="minus"]').addEventListener("click", function () { adjustStock(m.id, -1); });
      tr.querySelector('[data-a="plus"]').addEventListener("click", function () { adjustStock(m.id, 1); });
      tr.querySelector('[data-a="restock"]').addEventListener("click", function () { adjustStock(m.id, 10); });
      body.appendChild(tr);
    });
    // stats
    var totalItems = state.menu.length;
    var lowCount = state.menu.filter(function (m) { return m.stock <= 5; }).length;
    var stockVal = state.menu.reduce(function (a, m) { return a + m.price * m.stock; }, 0);
    var units = state.menu.reduce(function (a, m) { return a + m.stock; }, 0);
    $("#invStats").innerHTML =
      statCard("Productos", totalItems) +
      statCard("Unidades en stock", units) +
      statCard("Bajo stock", lowCount, lowCount ? "stock-low" : "") +
      statCard("Valor inventario", money(stockVal), "money");
  }
  function statCard(lbl, val, cls) {
    return '<div class="stat"><div class="lbl">' + lbl + '</div><div class="val ' + (cls || "") + '">' + val + "</div></div>";
  }
  function adjustStock(id, d) {
    var m = findMenu(id);
    if (!m) return;
    m.stock = Math.max(0, m.stock + d);
    save(); renderInventory();
  }

  /* Modal agregar producto */
  var modalBack = $("#modalBack");
  $("#btnAddItem").addEventListener("click", function () { modalBack.classList.add("open"); });
  $("#btnCancelItem").addEventListener("click", function () { modalBack.classList.remove("open"); });
  $("#btnSaveItem").addEventListener("click", function () {
    var name = $("#fName").value.trim();
    var price = parseFloat($("#fPrice").value);
    var stock = parseInt($("#fStock").value, 10);
    if (!name || isNaN(price) || price < 0) { toast("Completa nombre y precio"); return; }
    state.menu.push({ id: "m" + Date.now(), name: name, cat: $("#fCat").value, price: price, stock: isNaN(stock) ? 0 : stock });
    save();
    $("#fName").value = ""; $("#fPrice").value = ""; $("#fStock").value = "";
    modalBack.classList.remove("open");
    renderInventory();
    toast("Producto agregado al menú", true);
  });

  /* =========================================================================
     FACTURACIÓN (listado)
     ========================================================================= */
  function renderInvoices() {
    var body = $("#billBody");
    $("#invCount").textContent = state.invoices.length;
    if (!state.invoices.length) {
      body.innerHTML = '<tr><td colspan="4" class="muted center" style="padding:30px;">Aún no hay facturas. Cobra una mesa para emitir la primera.</td></tr>';
      return;
    }
    body.innerHTML = "";
    state.invoices.forEach(function (inv, i) {
      var tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.innerHTML =
        "<td><b>" + inv.num + "</b></td>" +
        "<td>" + inv.origin + "</td>" +
        "<td>" + inv.client.name + "</td>" +
        '<td class="num">' + money(inv.total) + "</td>";
      tr.addEventListener("click", function () { showInvoice(i); });
      body.appendChild(tr);
    });
    showInvoice(0);
  }
  function showInvoice(i) {
    var inv = state.invoices[i];
    if (!inv) return;
    var rows = inv.lines.map(function (l) {
      return '<tr><td>' + l.qty + '× ' + l.name + '</td><td class="num">' + money(l.price * l.qty) + '</td></tr>';
    }).join("");
    $("#invoicePreview").innerHTML =
      '<div class="invoice-view">' +
        '<div class="iv-head">' +
          '<div><div class="brand-mark" style="margin-bottom:8px;">i</div><h4>Cafetería La Esquina</h4>' +
          '<div class="iv-meta" style="text-align:left">RUC 099XXXXXXXXX001<br>Guayaquil, Ecuador</div></div>' +
          '<div class="iv-meta">FACTURA<br><b>' + inv.num + '</b><br>' + inv.time + '<br>' + inv.pay + '</div>' +
        '</div>' +
        '<div style="font-size:.85rem; margin-bottom:10px;"><b>Cliente:</b> ' + inv.client.name + ' · ' + inv.client.id + '<br><b>Origen:</b> ' + inv.origin + '</div>' +
        '<table class="data" style="min-width:0"><tbody>' + rows +
          '<tr><td>Subtotal</td><td class="num">' + money(inv.sub) + '</td></tr>' +
          '<tr><td>IVA 15%</td><td class="num">' + money(inv.iva) + '</td></tr>' +
          '<tr class="total-row"><td>TOTAL</td><td class="num">' + money(inv.total) + '</td></tr>' +
        '</tbody></table>' +
        '<p class="muted center" style="font-size:.75rem; margin-top:14px;">Comprobante generado por Insight Restaurantes · Autorización SRI (demo)</p>' +
      '</div>';
  }

  /* =========================================================================
     REPORTES
     ========================================================================= */
  function renderReports() {
    var ventas = state.invoices.reduce(function (a, inv) { return a + inv.total; }, 0);
    var count = state.invoices.length;
    var ticket = count ? ventas / count : 0;
    var waTotal = state.invoices.filter(function (i) { return i.origin === "WhatsApp"; }).reduce(function (a, i) { return a + i.total; }, 0);

    $("#repStats").innerHTML =
      statCard("Ventas del día", money(ventas), "money") +
      statCard("Facturas", count) +
      statCard("Ticket promedio", money(ticket), "money") +
      statCard("Vía WhatsApp", money(waTotal), "money");

    // top platos
    var agg = {};
    state.invoices.forEach(function (inv) {
      inv.lines.forEach(function (l) {
        agg[l.name] = agg[l.name] || { qty: 0, amt: 0 };
        agg[l.name].qty += l.qty; agg[l.name].amt += l.price * l.qty;
      });
    });
    var top = Object.keys(agg).map(function (k) { return { name: k, qty: agg[k].qty, amt: agg[k].amt }; })
      .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 6);
    $("#repTop").innerHTML = top.length
      ? top.map(function (r) { return "<tr><td>" + r.name + '</td><td class="num">' + r.qty + '</td><td class="num">' + money(r.amt) + "</td></tr>"; }).join("")
      : '<tr><td colspan="3" class="muted center" style="padding:24px;">Sin ventas todavía.</td></tr>';

    // por canal
    var chan = {};
    state.invoices.forEach(function (inv) {
      var key = inv.origin === "WhatsApp" ? "WhatsApp (para llevar)" : "Mesa (salón)";
      chan[key] = chan[key] || { n: 0, t: 0 };
      chan[key].n++; chan[key].t += inv.total;
    });
    var keys = Object.keys(chan);
    $("#repChannel").innerHTML = keys.length
      ? keys.map(function (k) { return "<tr><td>" + k + '</td><td class="num">' + chan[k].n + '</td><td class="num">' + money(chan[k].t) + "</td></tr>"; }).join("")
      : '<tr><td colspan="3" class="muted center" style="padding:24px;">Sin ventas todavía.</td></tr>';
  }

  /* =========================================================================
     RESET
     ========================================================================= */
  $("#btnResetDemo").addEventListener("click", function () {
    if (!confirm("¿Reiniciar el demo? Se borrarán mesas, pedidos y facturas de esta sesión.")) return;
    state = seed(); save();
    currentTableId = null;
    $("#orderView").style.display = "none";
    $("#tablesView").style.display = "block";
    renderTables(); renderWaQueue(); updateWaBadge();
    waBody.innerHTML = "";
    toast("Demo reiniciado", true);
  });

  /* ---------- Init ---------- */
  waPush("👋 Escribe o pulsa \"Simular cliente entrante\" para ver cómo el bot atiende un pedido para llevar de principio a fin.", "bot");
  renderTables();
  renderWaQueue();
  updateWaBadge();
})();
