/* ==========================================================================
   Insight · Tributario — IVA ventas vs compras (local-first)
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var toast = function (m, ok) { Gate.toast(m, ok); };
  var IVA = 0.15;
  var monthKey = function (d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
  var T = null;

  function goTab(name) {
    $$("#tabs .tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
    $$(".panel").forEach(function (p) { p.classList.toggle("active", p.dataset.panel === name); });
    if (name === "resumen") renderResumen();
    if (name === "ventas") renderDocs("venta");
    if (name === "compras") renderDocs("compra");
  }
  function statCard(lbl, val, cls) { return '<div class="stat"><div class="lbl">' + lbl + '</div><div class="val ' + (cls || "") + '">' + val + "</div></div>"; }
  function thisMonth(d) { return (d.date || "").slice(0, 7) === monthKey() || monthKey(new Date(d.ts)) === monthKey(); }

  function renderResumen() {
    Store.listTaxDocs(T).then(function (docs) {
      var mk = monthKey();
      var month = docs.filter(function (d) { return (d.date || monthKey(new Date(d.ts))).slice(0, 7) === mk; });
      var ventas = month.filter(function (d) { return d.type === "venta"; });
      var compras = month.filter(function (d) { return d.type === "compra"; });
      var ivaVentas = ventas.reduce(function (a, d) { return a + d.iva; }, 0);
      var ivaCompras = compras.reduce(function (a, d) { return a + d.iva; }, 0);
      var neto = ivaVentas - ivaCompras;
      $("#resTitle").textContent = "Resumen de " + mk;
      $("#taxStats").innerHTML =
        statCard("Ventas (base)", money(ventas.reduce(function (a, d) { return a + d.base; }, 0)), "money") +
        statCard("IVA en ventas", money(ivaVentas), "money") +
        statCard("IVA en compras", money(ivaCompras), "money") +
        statCard(neto >= 0 ? "IVA a pagar" : "Crédito tributario", money(Math.abs(neto)), neto > 0 ? "stock-low" : "stock-ok");

      $("#ivaSummary").innerHTML =
        "<tr><td>IVA cobrado en ventas</td><td class=\"num\">" + money(ivaVentas) + "</td></tr>" +
        "<tr><td>(−) IVA pagado en compras</td><td class=\"num\">" + money(ivaCompras) + "</td></tr>" +
        '<tr class="total-row"><td>' + (neto >= 0 ? "IVA A PAGAR" : "CRÉDITO PRÓXIMO MES") + '</td><td class="num">' + money(Math.abs(neto)) + "</td></tr>";
    });
  }

  function renderDocs(type) {
    Store.listTaxDocs(T).then(function (docs) {
      var list = docs.filter(function (d) { return d.type === type; });
      var body = $(type === "venta" ? "#ventasBody" : "#comprasBody");
      if (!list.length) { body.innerHTML = '<tr><td colspan="6" class="muted center" style="padding:26px;">Sin registros todavía.</td></tr>'; return; }
      body.innerHTML = "";
      list.forEach(function (d) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + esc(d.date || "—") + "</td><td>" + esc(d.desc || "—") + '</td><td class="num">' + money(d.base) +
          '</td><td class="num">' + money(d.iva) + '</td><td class="num">' + money(d.total) +
          '</td><td><div class="inv-actions"><button data-a="del" title="Eliminar">🗑</button></div></td>';
        tr.querySelector('[data-a="del"]').addEventListener("click", function () {
          Store.deleteTaxDoc(T, d.id).then(function () { renderDocs(type); });
        });
        body.appendChild(tr);
      });
    });
  }

  /* Modal */
  function openDoc(type) {
    $("#dType").value = type;
    $("#docModalTitle").textContent = type === "venta" ? "Registrar venta" : "Registrar compra";
    $("#dLabel").textContent = type === "venta" ? "Detalle de la venta" : "Proveedor / detalle";
    $("#dDesc").value = ""; $("#dBase").value = "";
    $("#dDate").value = new Date().toISOString().slice(0, 10);
    $("#dIva").textContent = money(0); $("#dTotal").textContent = money(0);
    $("#docModal").classList.add("open");
  }
  function recalc() {
    var base = parseFloat($("#dBase").value) || 0;
    $("#dIva").textContent = money(base * IVA);
    $("#dTotal").textContent = money(base * (1 + IVA));
  }
  $("#dBase").addEventListener("input", recalc);
  $("#btnAddVenta").addEventListener("click", function () { openDoc("venta"); });
  $("#btnAddCompra").addEventListener("click", function () { openDoc("compra"); });
  $("#btnCancelDoc").addEventListener("click", function () { $("#docModal").classList.remove("open"); });
  $("#btnSaveDoc").addEventListener("click", function () {
    var base = parseFloat($("#dBase").value);
    if (isNaN(base) || base < 0) return toast("Escribe la base imponible");
    var type = $("#dType").value;
    var doc = { type: type, desc: $("#dDesc").value.trim(), base: base, iva: base * IVA, total: base * (1 + IVA), date: $("#dDate").value, ts: Date.now() };
    Store.saveTaxDoc(T, doc).then(function () {
      $("#docModal").classList.remove("open");
      renderDocs(type);
      toast((type === "venta" ? "Venta" : "Compra") + " registrada", true);
    });
  });
  $("#btnDeclarar").addEventListener("click", function () {
    toast("📋 Declaración marcada como presentada (borrador local)", true);
  });

  document.addEventListener("DOMContentLoaded", function () {
    $$("#tabs .tab").forEach(function (t) { t.addEventListener("click", function () { goTab(t.dataset.tab); }); });
    Gate.init().then(function (cur) { if (!cur) return; T = cur.tenant; renderResumen(); });
  });
})();
