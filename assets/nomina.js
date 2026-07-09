/* ==========================================================================
   Insight · Nómina — rol de pagos Ecuador (local-first)
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var toast = function (m, ok) { Gate.toast(m, ok); };

  var SBU = 470;            // Salario Básico Unificado (referencial 2026)
  var APORTE_PERSONAL = 0.0945;
  var APORTE_PATRONAL = 0.1115;
  var FONDO_RESERVA = 0.0833;
  var T = null;

  function calc(salary) {
    var s = +salary || 0;
    var iessPersonal = s * APORTE_PERSONAL;
    var liquido = s - iessPersonal;
    var d13 = s / 12;
    var d14 = SBU / 12;
    var reserva = s * FONDO_RESERVA;
    var vacaciones = s / 24;
    var patronal = s * APORTE_PATRONAL;
    var costoTotal = s + patronal + d13 + d14 + reserva + vacaciones;
    return { s: s, iessPersonal: iessPersonal, liquido: liquido, d13: d13, d14: d14, reserva: reserva, vacaciones: vacaciones, patronal: patronal, costoTotal: costoTotal };
  }

  function goTab(name) {
    $$("#tabs .tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
    $$(".panel").forEach(function (p) { p.classList.toggle("active", p.dataset.panel === name); });
    if (name === "rol") renderRol();
    if (name === "empleados") renderEmployees();
  }
  function statCard(lbl, val, cls) { return '<div class="stat"><div class="lbl">' + lbl + '</div><div class="val ' + (cls || "") + '">' + val + "</div></div>"; }

  function renderRol() {
    Store.listEmployees(T).then(function (emps) {
      var body = $("#rolBody"), foot = $("#rolFoot");
      if (!emps.length) {
        body.innerHTML = '<tr><td colspan="10" class="muted center" style="padding:26px;">Aún no tienes empleados. Ve a "Empleados" y agrega el primero.</td></tr>';
        foot.innerHTML = ""; $("#nomStats").innerHTML = ""; return;
      }
      var tot = { s: 0, iessPersonal: 0, liquido: 0, d13: 0, d14: 0, reserva: 0, vacaciones: 0, patronal: 0, costoTotal: 0 };
      body.innerHTML = "";
      emps.forEach(function (e) {
        var c = calc(e.salary);
        Object.keys(tot).forEach(function (k) { tot[k] += c[k]; });
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + esc(e.name) + "</td>" +
          '<td class="num">' + money(c.s) + '</td><td class="num">' + money(c.iessPersonal) + '</td>' +
          '<td class="num"><b>' + money(c.liquido) + '</b></td><td class="num">' + money(c.d13) + '</td><td class="num">' + money(c.d14) + '</td>' +
          '<td class="num">' + money(c.reserva) + '</td><td class="num">' + money(c.vacaciones) + '</td><td class="num">' + money(c.patronal) + '</td>' +
          '<td class="num"><b>' + money(c.costoTotal) + "</b></td>";
        body.appendChild(tr);
      });
      foot.innerHTML =
        '<tr class="total-row"><td>TOTAL (' + emps.length + ")</td>" +
        '<td class="num">' + money(tot.s) + '</td><td class="num">' + money(tot.iessPersonal) + '</td>' +
        '<td class="num">' + money(tot.liquido) + '</td><td class="num">' + money(tot.d13) + '</td><td class="num">' + money(tot.d14) + '</td>' +
        '<td class="num">' + money(tot.reserva) + '</td><td class="num">' + money(tot.vacaciones) + '</td><td class="num">' + money(tot.patronal) + '</td>' +
        '<td class="num">' + money(tot.costoTotal) + "</td></tr>";

      $("#nomStats").innerHTML =
        statCard("Empleados", emps.length) +
        statCard("Masa salarial", money(tot.s), "money") +
        statCard("Total líquido a pagar", money(tot.liquido), "money") +
        statCard("Costo total empleador", money(tot.costoTotal), "money");
    });
  }

  function renderEmployees() {
    Store.listEmployees(T).then(function (emps) {
      var body = $("#empBody");
      if (!emps.length) { body.innerHTML = '<tr><td colspan="5" class="muted center" style="padding:26px;">Sin empleados. Pulsa "+ Agregar empleado".</td></tr>'; return; }
      body.innerHTML = "";
      emps.forEach(function (e) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + esc(e.name) + "</td><td>" + esc(e.role || "—") + '</td><td class="num">' + money(+e.salary || 0) + "</td><td>" + esc(e.start || "—") +
          '</td><td><div class="inv-actions"><button data-a="edit" title="Editar">✎</button><button data-a="del" title="Eliminar">🗑</button></div></td>';
        tr.querySelector('[data-a="edit"]').addEventListener("click", function () { openEmp(e); });
        tr.querySelector('[data-a="del"]').addEventListener("click", function () {
          if (confirm("¿Eliminar a " + e.name + "?")) Store.deleteEmployee(T, e.id).then(renderEmployees);
        });
        body.appendChild(tr);
      });
    });
  }
  function openEmp(e) {
    $("#empModalTitle").textContent = e ? "Editar empleado" : "Agregar empleado";
    $("#eId").value = e ? e.id : "";
    $("#eName").value = e ? e.name : "";
    $("#eRole").value = e ? (e.role || "") : "";
    $("#eSalary").value = e ? e.salary : "";
    $("#eStart").value = e ? (e.start || "") : "";
    $("#empModal").classList.add("open");
  }
  $("#btnAddEmp").addEventListener("click", function () { openEmp(null); });
  $("#btnCancelEmp").addEventListener("click", function () { $("#empModal").classList.remove("open"); });
  $("#btnSaveEmp").addEventListener("click", function () {
    var name = $("#eName").value.trim();
    var salary = parseFloat($("#eSalary").value);
    if (!name || isNaN(salary) || salary < 0) return toast("Completa nombre y salario");
    var e = { id: $("#eId").value || null, name: name, role: $("#eRole").value.trim(), salary: salary, start: $("#eStart").value };
    Store.saveEmployee(T, e).then(function () { $("#empModal").classList.remove("open"); renderEmployees(); toast("Empleado guardado", true); });
  });

  document.addEventListener("DOMContentLoaded", function () {
    $("#sbuLabel").textContent = "$" + SBU;
    $$("#tabs .tab").forEach(function (t) { t.addEventListener("click", function () { goTab(t.dataset.tab); }); });
    Gate.init().then(function (cur) { if (!cur) return; T = cur.tenant; renderRol(); });
  });
})();
