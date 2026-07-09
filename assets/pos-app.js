/* ==========================================================================
   Insight POS — aplicación (Opción B, local-first, multi-restaurante)
   Requiere store.js. Todo se guarda en la computadora del local (IndexedDB).
   ========================================================================== */
(function () {
  "use strict";

  var IVA = 0.15;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };

  var S = { email: null, tenant: null, restaurant: null, tableId: null, cat: "Todos", menu: [], tables: [] };

  var toastEl, toastT;
  function toast(msg, ok) {
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (ok ? " ok" : "");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.className = "toast"; }, 2400);
  }

  /* ===================== AUTENTICACIÓN ===================== */
  function showAuth() {
    $("#authScreen").style.display = "flex";
    $("#appScreen").style.display = "none";
  }
  function showApp() {
    $("#authScreen").style.display = "none";
    $("#appScreen").style.display = "block";
    $("#storeName").textContent = S.restaurant.name;
    goTab("mesas");
    refreshAll();
  }

  function bindAuth() {
    $$(".auth-switch").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".auth-switch").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        var mode = b.dataset.mode;
        $("#formRegister").style.display = mode === "register" ? "block" : "none";
        $("#formLogin").style.display = mode === "login" ? "block" : "none";
      });
    });

    $("#doRegister").addEventListener("click", function () {
      var data = {
        restaurant: $("#rgName").value.trim(),
        type: $("#rgType").value,
        ruc: $("#rgRuc").value.trim(),
        phone: $("#rgPhone").value.trim(),
        email: $("#rgEmail").value.trim(),
        password: $("#rgPass").value
      };
      if (!data.restaurant) return toast("Escribe el nombre del local");
      if (!data.email) return toast("Escribe un correo");
      if ((data.password || "").length < 4) return toast("La contraseña debe tener al menos 4 caracteres");
      $("#doRegister").disabled = true;
      Store.register(data).then(function (acc) {
        S.email = acc.email; S.tenant = acc.tenantId; S.restaurant = acc.restaurant;
        toast("¡Bienvenido, " + acc.restaurant.name + "!", true);
        showApp();
      }).catch(function (e) { toast(e.message || "No se pudo registrar"); })
        .then(function () { $("#doRegister").disabled = false; });
    });

    $("#doLogin").addEventListener("click", function () {
      var email = $("#lgEmail").value.trim();
      var pass = $("#lgPass").value;
      $("#doLogin").disabled = true;
      Store.login(email, pass).then(function (acc) {
        S.email = acc.email; S.tenant = acc.tenantId; S.restaurant = acc.restaurant;
        toast("Sesión iniciada", true);
        showApp();
      }).catch(function (e) { toast(e.message || "No se pudo entrar"); })
        .then(function () { $("#doLogin").disabled = false; });
    });

    $("#btnLogout").addEventListener("click", function () {
      Store.logout().then(function () {
        S.email = S.tenant = S.restaurant = null;
        showAuth();
      });
    });
  }

  /* ===================== TABS ===================== */
  function goTab(name) {
    $$("#tabs .tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
    $$(".panel").forEach(function (p) { p.classList.toggle("active", p.dataset.panel === name); });
    if (name === "inventario") renderInventory();
    if (name === "facturacion") renderInvoices();
    if (name === "reportes") renderReports();
    if (name === "mesas") renderTables();
    if (name === "whatsapp") renderWaQueue();
  }
  function bindTabs() {
    $$("#tabs .tab").forEach(function (t) { t.addEventListener("click", function () { goTab(t.dataset.tab); }); });
  }

  function refreshAll() {
    return Promise.all([Store.listMenu(S.tenant), Store.listTables(S.tenant)]).then(function (r) {
      S.menu = r[0]; S.tables = r[1];
      renderTables();
      Store.updateSyncBadge();
    });
  }

  /* ===================== MESAS + PEDIDO ===================== */
  function totalsOf(lines) {
    var sub = lines.reduce(function (a, l) { return a + l.price * l.qty; }, 0);
    return { sub: sub, iva: sub * IVA, total: sub * (1 + IVA) };
  }
  function findMenu(id) { return S.menu.filter(function (m) { return m.id === id; })[0]; }
  function findTable(id) { return S.tables.filter(function (t) { return t.id === id; })[0]; }

  function renderTables() {
    var grid = $("#tablesGrid");
    if (!grid) return;
    grid.innerHTML = "";
    S.tables.forEach(function (t) {
      var tot = totalsOf(t.lines || []);
      var cls = t.status === "free" ? "free" : (t.type === "togo" ? "togo" : "busy");
      var label = t.status === "free" ? "Libre" : (t.type === "togo" ? "Para llevar" : "Ocupada");
      var div = document.createElement("div");
      div.className = "table-card " + cls;
      div.innerHTML =
        '<div class="tnum">' + (t.type === "togo" ? "🛍️" : t.num) + "</div>" +
        '<div class="tstate">' + label + "</div>" +
        '<div class="tamt">' + ((t.lines && t.lines.length) ? money(tot.total) : (t.type === "togo" ? esc(t.name) : "&mdash;")) + "</div>";
      div.addEventListener("click", function () { openOrder(t.id); });
      grid.appendChild(div);
    });
    var active = S.tables.filter(function (t) { return t.status !== "free"; }).length;
    $("#mesasTitle").textContent = "Mesas del local (" + active + " activas)";
    $("#tablesView").style.display = "block";
    $("#orderView").style.display = "none";
  }

  function openOrder(id) {
    S.tableId = id;
    var t = findTable(id);
    $("#tablesView").style.display = "none";
    $("#orderView").style.display = "block";
    $("#orderTitle").textContent = t.name + (t.type === "togo" ? " · Para llevar" : "");
    $("#ticketTitle").textContent = "Cuenta · " + t.name;
    S.cat = "Todos";
    renderMenuCats(); renderMenuItems(); renderTicket();
  }

  function uniqueCats() {
    var seen = {}, out = [];
    S.menu.forEach(function (m) { if (!seen[m.cat]) { seen[m.cat] = 1; out.push(m.cat); } });
    return out;
  }
  function renderMenuCats() {
    var cats = ["Todos"].concat(uniqueCats());
    var wrap = $("#menuCats"); wrap.innerHTML = "";
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "cat-chip" + (c === S.cat ? " active" : "");
      b.textContent = c;
      b.addEventListener("click", function () { S.cat = c; renderMenuCats(); renderMenuItems(); });
      wrap.appendChild(b);
    });
  }
  function renderMenuItems() {
    var wrap = $("#menuItems"); wrap.innerHTML = "";
    if (!S.menu.length) {
      wrap.innerHTML = '<p class="muted" style="grid-column:1/-1">Aún no tienes platos. Ve a la pestaña <b>Inventario</b> y agrega tu menú.</p>';
      return;
    }
    S.menu.filter(function (m) { return S.cat === "Todos" || m.cat === S.cat; }).forEach(function (m) {
      var out = m.stock <= 0;
      var d = document.createElement("div");
      d.className = "menu-item" + (out ? " out" : "");
      d.innerHTML =
        '<div class="mi-name">' + esc(m.name) + "</div>" +
        '<div class="mi-meta"><span class="mi-price">' + money(m.price) + "</span>" +
        '<span class="mi-stock">' + (out ? "Agotado" : m.stock + " disp.") + "</span></div>";
      if (!out) d.addEventListener("click", function () { addLine(m.id); });
      wrap.appendChild(d);
    });
  }

  function persistTable(t) { return Store.saveTable(S.tenant, t); }

  function addLine(mid) {
    var t = findTable(S.tableId), m = findMenu(mid);
    if (!m || m.stock <= 0) return;
    t.lines = t.lines || [];
    var line = t.lines.filter(function (l) { return l.id === mid; })[0];
    if (line) line.qty++; else t.lines.push({ id: mid, name: m.name, price: m.price, qty: 1 });
    if (t.status === "free") t.status = "busy";
    persistTable(t).then(renderTicket);
  }
  function changeQty(mid, d) {
    var t = findTable(S.tableId);
    var line = (t.lines || []).filter(function (l) { return l.id === mid; })[0];
    if (!line) return;
    line.qty += d;
    if (line.qty <= 0) t.lines = t.lines.filter(function (l) { return l.id !== mid; });
    if (!t.lines.length && t.type !== "togo") t.status = "free";
    persistTable(t).then(renderTicket);
  }

  function renderTicket() {
    var t = findTable(S.tableId);
    var box = $("#ticketLines");
    if (!t.lines || !t.lines.length) {
      box.innerHTML = '<div class="ticket-empty">Sin productos aún.<br>Toca un plato del menú para agregarlo.</div>';
    } else {
      box.innerHTML = "";
      t.lines.forEach(function (l) {
        var row = document.createElement("div");
        row.className = "tl";
        row.innerHTML =
          '<span class="tl-name">' + esc(l.name) + "</span>" +
          '<span class="qty"><button data-a="minus">−</button><b>' + l.qty + '</b><button data-a="plus">+</button></span>' +
          '<span class="tl-amt">' + money(l.price * l.qty) + "</span>";
        row.querySelector('[data-a="minus"]').addEventListener("click", function () { changeQty(l.id, -1); });
        row.querySelector('[data-a="plus"]').addEventListener("click", function () { changeQty(l.id, 1); });
        box.appendChild(row);
      });
    }
    var tot = totalsOf(t.lines || []);
    $("#tSub").textContent = money(tot.sub);
    $("#tIva").textContent = money(tot.iva);
    $("#tTotal").textContent = money(tot.total);
    $("#ticketSub").textContent = (t.lines && t.lines.length) ? (t.lines.length + " producto(s)") : "Toca un plato para agregarlo";
  }

  function bindOrder() {
    $("#btnBackTables").addEventListener("click", function () { S.tableId = null; renderTables(); });
    $("#btnKitchen").addEventListener("click", function () {
      var t = findTable(S.tableId);
      if (!t.lines || !t.lines.length) return toast("Agrega productos primero");
      toast("👨‍🍳 Enviado a cocina · " + t.name, true);
    });
    $("#btnBill").addEventListener("click", function () {
      var t = findTable(S.tableId);
      if (!t.lines || !t.lines.length) return toast("La cuenta está vacía");
      var tot = totalsOf(t.lines);
      $("#bSub").textContent = money(tot.sub);
      $("#bIva").textContent = money(tot.iva);
      $("#bTotal").textContent = money(tot.total);
      $("#billBack").classList.add("open");
    });
    $("#bType").addEventListener("change", function () {
      var ruc = this.value === "ruc";
      $("#bIdField").style.display = ruc ? "block" : "none";
      $("#bNameField").style.display = ruc ? "block" : "none";
    });
    $("#btnCancelBill").addEventListener("click", function () { $("#billBack").classList.remove("open"); });
    $("#btnConfirmBill").addEventListener("click", confirmBill);
  }

  function confirmBill() {
    var t = findTable(S.tableId);
    var tot = totalsOf(t.lines);
    var client = $("#bType").value === "ruc"
      ? { id: $("#bId").value || "9999999999", name: $("#bName").value || "Cliente" }
      : { id: "9999999999", name: "Consumidor final" };

    Store.nextInvoiceNumber(S.tenant).then(function (num) {
      // descontar inventario
      var stockOps = [];
      t.lines.forEach(function (l) {
        var m = findMenu(l.id);
        if (m) { m.stock = Math.max(0, m.stock - l.qty); stockOps.push(Store.saveMenuItem(S.tenant, m)); }
      });
      var inv = {
        num: num, origin: t.type === "togo" ? "WhatsApp" : t.name, client: client,
        pay: $("#bPay").value, lines: t.lines.slice(),
        sub: tot.sub, iva: tot.iva, total: tot.total, ts: Date.now(),
        time: new Date().toLocaleString("es-EC", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      };
      return Promise.all(stockOps).then(function () { return Store.saveInvoice(S.tenant, inv); })
        .then(function () {
          if (t.type === "togo") return Store.deleteTable(S.tenant, t.id);
          t.lines = []; t.status = "free"; return Store.saveTable(S.tenant, t);
        })
        .then(function () { return refreshAll(); })
        .then(function () {
          $("#billBack").classList.remove("open");
          $("#bType").value = "final"; $("#bIdField").style.display = "none"; $("#bNameField").style.display = "none";
          $("#bId").value = ""; $("#bName").value = "";
          S.tableId = null; renderTables();
          toast("🧾 Factura " + num + " emitida · " + money(tot.total), true);
        });
    }).catch(function (e) { toast("Error al facturar"); console.error(e); });
  }

  /* ===================== INVENTARIO ===================== */
  function renderInventory() {
    Store.listMenu(S.tenant).then(function (menu) {
      S.menu = menu;
      var body = $("#invBody"); body.innerHTML = "";
      if (!menu.length) {
        body.innerHTML = '<tr><td colspan="5" class="muted center" style="padding:26px;">Tu menú está vacío. Pulsa "+ Agregar producto".</td></tr>';
      }
      menu.forEach(function (m) {
        var low = m.stock <= 5;
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + esc(m.name) + "</td><td>" + esc(m.cat) + '</td><td class="num">' + money(m.price) +
          '</td><td class="num ' + (low ? "stock-low" : "stock-ok") + '">' + m.stock + (low ? " ⚠" : "") +
          '</td><td><div class="inv-actions"><button data-a="minus">−</button><button data-a="plus">+</button><button data-a="restock">+10</button><button data-a="edit" title="Editar">✎</button><button data-a="del" title="Eliminar">🗑</button></div></td>';
        tr.querySelector('[data-a="minus"]').addEventListener("click", function () { adjustStock(m, -1); });
        tr.querySelector('[data-a="plus"]').addEventListener("click", function () { adjustStock(m, 1); });
        tr.querySelector('[data-a="restock"]').addEventListener("click", function () { adjustStock(m, 10); });
        tr.querySelector('[data-a="edit"]').addEventListener("click", function () { openItemModal(m); });
        tr.querySelector('[data-a="del"]').addEventListener("click", function () {
          if (confirm("¿Eliminar \"" + m.name + "\" del menú?")) Store.deleteMenuItem(S.tenant, m.id).then(renderInventory);
        });
        body.appendChild(tr);
      });
      var units = menu.reduce(function (a, m) { return a + m.stock; }, 0);
      var lowCount = menu.filter(function (m) { return m.stock <= 5; }).length;
      var val = menu.reduce(function (a, m) { return a + m.price * m.stock; }, 0);
      $("#invStats").innerHTML =
        statCard("Productos", menu.length) + statCard("Unidades", units) +
        statCard("Bajo stock", lowCount, lowCount ? "stock-low" : "") + statCard("Valor inventario", money(val), "money");
    });
  }
  function statCard(lbl, val, cls) { return '<div class="stat"><div class="lbl">' + lbl + '</div><div class="val ' + (cls || "") + '">' + val + "</div></div>"; }
  function adjustStock(m, d) { m.stock = Math.max(0, m.stock + d); Store.saveMenuItem(S.tenant, m).then(renderInventory); }

  function openItemModal(item) {
    $("#itemModalTitle").textContent = item ? "Editar producto" : "Agregar producto al menú";
    $("#fId").value = item ? item.id : "";
    $("#fName").value = item ? item.name : "";
    $("#fCat").value = item ? item.cat : "Platos fuertes";
    $("#fPrice").value = item ? item.price : "";
    $("#fStock").value = item ? item.stock : "";
    $("#modalBack").classList.add("open");
  }
  function bindInventory() {
    $("#btnAddItem").addEventListener("click", function () { openItemModal(null); });
    $("#btnCancelItem").addEventListener("click", function () { $("#modalBack").classList.remove("open"); });
    $("#btnSaveItem").addEventListener("click", function () {
      var name = $("#fName").value.trim();
      var price = parseFloat($("#fPrice").value);
      var stock = parseInt($("#fStock").value, 10);
      if (!name || isNaN(price) || price < 0) return toast("Completa nombre y precio");
      var item = { id: $("#fId").value || null, name: name, cat: $("#fCat").value, price: price, stock: isNaN(stock) ? 0 : stock };
      Store.saveMenuItem(S.tenant, item).then(function () {
        $("#modalBack").classList.remove("open");
        renderInventory();
        toast("Producto guardado", true);
      });
    });
  }

  /* ===================== FACTURACIÓN ===================== */
  function renderInvoices() {
    Store.listInvoices(S.tenant).then(function (invoices) {
      $("#invCount").textContent = invoices.length;
      var body = $("#billBody");
      if (!invoices.length) {
        body.innerHTML = '<tr><td colspan="4" class="muted center" style="padding:30px;">Aún no hay facturas. Cobra una mesa para emitir la primera.</td></tr>';
        $("#invoicePreview").innerHTML = emptyInvoiceCard();
        return;
      }
      body.innerHTML = "";
      invoices.forEach(function (inv) {
        var tr = document.createElement("tr");
        tr.style.cursor = "pointer";
        tr.innerHTML = "<td><b>" + esc(inv.num) + "</b></td><td>" + esc(inv.origin) + "</td><td>" + esc(inv.client.name) + '</td><td class="num">' + money(inv.total) + "</td>";
        tr.addEventListener("click", function () { showInvoice(inv); });
        body.appendChild(tr);
      });
      showInvoice(invoices[0]);
    });
  }
  function emptyInvoiceCard() {
    return '<div class="invoice-view"><p class="muted center" style="padding:30px 0;">Aquí verás el detalle de la factura seleccionada.</p></div>';
  }
  function showInvoice(inv) {
    var rows = inv.lines.map(function (l) { return "<tr><td>" + l.qty + "× " + esc(l.name) + '</td><td class="num">' + money(l.price * l.qty) + "</td></tr>"; }).join("");
    $("#invoicePreview").innerHTML =
      '<div class="invoice-view"><div class="iv-head"><div><div class="brand-mark" style="margin-bottom:8px;">i</div><h4>' + esc(S.restaurant.name) + "</h4>" +
      '<div class="iv-meta" style="text-align:left">RUC ' + esc(S.restaurant.ruc || "—") + "<br>" + esc(S.restaurant.address || "Ecuador") + "</div></div>" +
      '<div class="iv-meta">FACTURA<br><b>' + esc(inv.num) + "</b><br>" + esc(inv.time) + "<br>" + esc(inv.pay) + "</div></div>" +
      '<div style="font-size:.85rem; margin-bottom:10px;"><b>Cliente:</b> ' + esc(inv.client.name) + " · " + esc(inv.client.id) + "<br><b>Origen:</b> " + esc(inv.origin) + "</div>" +
      '<table class="data" style="min-width:0"><tbody>' + rows +
      '<tr><td>Subtotal</td><td class="num">' + money(inv.sub) + "</td></tr>" +
      '<tr><td>IVA 15%</td><td class="num">' + money(inv.iva) + "</td></tr>" +
      '<tr class="total-row"><td>TOTAL</td><td class="num">' + money(inv.total) + "</td></tr></tbody></table>" +
      '<p class="muted center" style="font-size:.75rem; margin-top:14px;">Comprobante generado por Insight · Autorización SRI pendiente de integración (Fase C)</p></div>';
  }

  /* ===================== REPORTES ===================== */
  function renderReports() {
    Store.listInvoices(S.tenant).then(function (invoices) {
      var ventas = invoices.reduce(function (a, i) { return a + i.total; }, 0);
      var ticket = invoices.length ? ventas / invoices.length : 0;
      var wa = invoices.filter(function (i) { return i.origin === "WhatsApp"; }).reduce(function (a, i) { return a + i.total; }, 0);
      $("#repStats").innerHTML =
        statCard("Ventas", money(ventas), "money") + statCard("Facturas", invoices.length) +
        statCard("Ticket prom.", money(ticket), "money") + statCard("Vía WhatsApp", money(wa), "money");

      var agg = {};
      invoices.forEach(function (inv) {
        inv.lines.forEach(function (l) { agg[l.name] = agg[l.name] || { qty: 0, amt: 0 }; agg[l.name].qty += l.qty; agg[l.name].amt += l.price * l.qty; });
      });
      var top = Object.keys(agg).map(function (k) { return { name: k, qty: agg[k].qty, amt: agg[k].amt }; })
        .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 6);
      $("#repTop").innerHTML = top.length
        ? top.map(function (r) { return "<tr><td>" + esc(r.name) + '</td><td class="num">' + r.qty + '</td><td class="num">' + money(r.amt) + "</td></tr>"; }).join("")
        : '<tr><td colspan="3" class="muted center" style="padding:24px;">Sin ventas todavía.</td></tr>';

      var chan = {};
      invoices.forEach(function (inv) {
        var key = inv.origin === "WhatsApp" ? "WhatsApp (para llevar)" : "Mesa (salón)";
        chan[key] = chan[key] || { n: 0, t: 0 }; chan[key].n++; chan[key].t += inv.total;
      });
      var keys = Object.keys(chan);
      $("#repChannel").innerHTML = keys.length
        ? keys.map(function (k) { return "<tr><td>" + esc(k) + '</td><td class="num">' + chan[k].n + '</td><td class="num">' + money(chan[k].t) + "</td></tr>"; }).join("")
        : '<tr><td colspan="3" class="muted center" style="padding:24px;">Sin ventas todavía.</td></tr>';
    });
  }

  /* ===================== WHATSAPP (bot simulado) ===================== */
  var waBody, waBusy = false, custNum = 0;
  function waPush(text, who) {
    var m = document.createElement("div");
    m.className = "wa-msg " + who;
    var time = new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
    m.innerHTML = esc(text) + '<span class="t">' + time + "</span>";
    waBody.appendChild(m); waBody.scrollTop = waBody.scrollHeight;
  }
  function typing(cb, d) { $("#waStatus").textContent = "escribiendo…"; setTimeout(function () { $("#waStatus").textContent = "en línea · bot activo"; cb(); }, d || 900); }
  function menuText() {
    var byCat = {};
    S.menu.forEach(function (m) { if (m.stock > 0) { (byCat[m.cat] = byCat[m.cat] || []).push(m); } });
    var lines = ["📋 Menú del día"];
    Object.keys(byCat).forEach(function (c) { lines.push("\n" + c); byCat[c].forEach(function (m) { lines.push("• " + m.name + " — " + money(m.price)); }); });
    lines.push("\nEscríbeme lo que deseas 😊");
    return lines.join("\n");
  }
  function bindWa() {
    $("#btnSimWa").addEventListener("click", function () {
      if (waBusy) return;
      if (!S.menu.length) return toast("Agrega platos al menú primero (pestaña Inventario)");
      waBusy = true; custNum++;
      var phone = "+593 99" + String(1000000 + Math.floor(Math.random() * 8999999));
      var avail = S.menu.filter(function (m) { return m.stock > 0; });
      var pick = [];
      pick.push({ m: avail[0], qty: 2 });
      if (avail[1]) pick.push({ m: avail[1], qty: 1 });
      waBody.innerHTML = "";
      waPush("Buenas, ¿tienen para llevar?", "user");
      typing(function () {
        waPush("¡Hola! 👋 Bienvenido a " + S.restaurant.name + ". Claro que sí. Te comparto el menú:", "bot");
        typing(function () {
          waPush(menuText(), "bot");
          typing(function () {
            var req = pick.map(function (p) { return p.qty + " " + p.m.name; }).join(", ");
            waPush("Quiero " + req + " porfa", "user");
            typing(function () {
              var lines = pick.map(function (p) { return { id: p.m.id, name: p.m.name, price: p.m.price, qty: p.qty }; });
              var tot = totalsOf(lines);
              var resumen = lines.map(function (l) { return "• " + l.qty + "× " + l.name + " — " + money(l.price * l.qty); }).join("\n");
              waPush("Perfecto ✅ Tu pedido:\n" + resumen + "\n\nSubtotal: " + money(tot.sub) + "\nIVA 15%: " + money(tot.iva) + "\nTotal: " + money(tot.total) + "\n\n¿Confirmo? (sí/no)", "bot");
              typing(function () {
                waPush("Sí, confirmado 🙌", "user");
                typing(function () {
                  waPush("¡Listo! 🎉 Tu pedido entró a cocina (15–20 min). Ya avisé a la computadora del local. ¡Gracias!", "bot");
                  Store.saveWaOrder(S.tenant, { phone: phone, lines: lines, total: tot.total, ts: Date.now(), time: new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }), accepted: false })
                    .then(function () { renderWaQueue(); toast("💬 Nuevo pedido por WhatsApp · " + money(tot.total), true); });
                  waBusy = false;
                }, 800);
              }, 700);
            }, 1000);
          }, 1000);
        }, 800);
      }, 600);
    });
  }
  function renderWaQueue() {
    Store.listWaOrders(S.tenant).then(function (orders) {
      var pending = orders.filter(function (o) { return !o.accepted; });
      var q = $("#waQueue");
      var badge = $("#waBadge");
      if (pending.length) { badge.style.display = ""; badge.textContent = pending.length; } else { badge.style.display = "none"; }
      if (!pending.length) { q.innerHTML = '<p class="ticket-empty">No hay órdenes pendientes.<br>Pulsa "Simular cliente entrante".</p>'; return; }
      q.innerHTML = "";
      pending.forEach(function (o) {
        var items = o.lines.map(function (l) { return l.qty + "× " + l.name; }).join(", ");
        var d = document.createElement("div");
        d.className = "wa-order";
        d.innerHTML = '<div class="wo-head">💬 ' + esc(o.phone) + ' <span class="amt">' + money(o.total) + "</span></div>" +
          '<div class="wo-items">' + esc(items) + " · " + esc(o.time) + "</div>" +
          '<div class="wo-actions"><button class="btn btn-accent btn-sm">✓ Aceptar y crear pedido</button></div>';
        d.querySelector("button").addEventListener("click", function () { acceptWa(o); });
        q.appendChild(d);
      });
    });
  }
  function acceptWa(o) {
    o.accepted = true;
    Store.saveWaOrder(S.tenant, o).then(function () {
      var newTable = { id: "tb_togo_" + Date.now(), tenant: S.tenant, num: 900, name: "Llevar " + o.phone.slice(-4), type: "togo", lines: o.lines.slice(), status: "busy" };
      return Store.saveTable(S.tenant, newTable);
    }).then(refreshAll).then(function () {
      renderWaQueue();
      toast("🛍️ Pedido enviado a la compu del local (Para llevar)", true);
    });
  }

  /* ===================== VARIOS ===================== */
  function bindMisc() {
    $("#btnResetDemo").addEventListener("click", function () {
      if (!confirm("¿Reiniciar los datos de este restaurante? Se borran menú, mesas y facturas y vuelve al ejemplo inicial.")) return;
      Store.resetTenant(S.tenant).then(refreshAll).then(function () { toast("Datos reiniciados", true); });
    });
    Store.onSyncChange(function (st) {
      var el = $("#syncState");
      if (!el) return;
      if (st.online) {
        el.className = "sync online";
        el.innerHTML = '<span class="sdot"></span> En línea' + (st.pending ? " · " + st.pending + " por sincronizar" : " · sincronizado");
      } else {
        el.className = "sync offline";
        el.innerHTML = '<span class="sdot"></span> Sin internet · guardando local' + (st.pending ? " (" + st.pending + " en cola)" : "");
      }
    });
  }

  /* ===================== INIT ===================== */
  document.addEventListener("DOMContentLoaded", function () {
    toastEl = $("#toast");
    waBody = $("#waBody");
    bindAuth(); bindTabs(); bindOrder(); bindInventory(); bindWa(); bindMisc();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }

    Store.currentSession().then(function (sess) {
      if (sess && sess.email) {
        return Store.account(sess.email).then(function (acc) {
          if (acc) { S.email = acc.email; S.tenant = acc.tenantId; S.restaurant = acc.restaurant; showApp(); }
          else showAuth();
        });
      }
      showAuth();
    }).catch(showAuth);

    Store.updateSyncBadge();
  });
})();
