/* ==========================================================================
   Insight · Cobros — mensualidades de socios/alumnos (local-first)
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); };
  var toast = function (m, ok) { Gate.toast(m, ok); };
  var monthKey = function (d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };

  var T = null; // tenant

  function goTab(name) {
    $$("#tabs .tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
    $$(".panel").forEach(function (p) { p.classList.toggle("active", p.dataset.panel === name); });
    if (name === "panel") renderPanel();
    if (name === "socios") renderMembers();
    if (name === "historial") renderPayments();
  }

  function statCard(lbl, val, cls) { return '<div class="stat"><div class="lbl">' + lbl + '</div><div class="val ' + (cls || "") + '">' + val + "</div></div>"; }
  function isPaidThisMonth(m) { return m.lastPaidMonth === monthKey(); }

  /* ---------- PANEL ---------- */
  function renderPanel() {
    Store.listMembers(T).then(function (members) {
      var mk = monthKey();
      var alDia = members.filter(isPaidThisMonth);
      var morosos = members.filter(function (m) { return !isPaidThisMonth(m); });
      var esperado = members.reduce(function (a, m) { return a + (+m.amount || 0); }, 0);
      var recaudado = alDia.reduce(function (a, m) { return a + (+m.amount || 0); }, 0);
      $("#panelTitle").textContent = "Cobros de " + mk;
      $("#cobStats").innerHTML =
        statCard("Socios", members.length) +
        statCard("Al día", alDia.length, "stock-ok") +
        statCard("Morosos", morosos.length, morosos.length ? "stock-low" : "") +
        statCard("Recaudado", money(recaudado), "money") +
        statCard("Por cobrar", money(esperado - recaudado), esperado - recaudado > 0 ? "stock-low" : "");

      var body = $("#statusBody");
      if (!members.length) { body.innerHTML = '<tr><td colspan="5" class="muted center" style="padding:26px;">Aún no tienes socios. Ve a "Socios / alumnos" y agrega el primero.</td></tr>'; return; }
      body.innerHTML = "";
      members.forEach(function (m) {
        var paid = isPaidThisMonth(m);
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + esc(m.name) + "</td><td>" + esc(m.plan || "—") + '</td><td class="num">' + money(+m.amount || 0) + "</td>" +
          "<td>" + (paid ? '<span class="pill">Al día</span>' : '<span class="pill-warn pill">Debe</span>') + "</td>" +
          "<td>" + (paid ? '<span class="muted">Pagado</span>' : '<button class="btn btn-accent btn-sm" data-pay>Registrar pago</button>') + "</td>";
        if (!paid) tr.querySelector("[data-pay]").addEventListener("click", function () { registerPayment(m); });
        body.appendChild(tr);
      });
    });
  }

  function registerPayment(m) {
    var pay = { memberId: m.id, memberName: m.name, concept: "Mensualidad " + monthKey(), amount: +m.amount || 0, ts: Date.now(), date: new Date().toLocaleDateString("es-EC") };
    Store.savePayment(T, pay).then(function () {
      m.lastPaidMonth = monthKey();
      return Store.saveMember(T, m);
    }).then(renderPanel).then(function () { toast("💳 Pago registrado · " + money(pay.amount), true); });
  }

  $("#btnRemind") && $("#btnRemind").addEventListener("click", function () {
    Store.listMembers(T).then(function (members) {
      var n = members.filter(function (m) { return !isPaidThisMonth(m); }).length;
      if (!n) return toast("¡Todos al día! 🎉", true);
      toast("🔔 Recordatorio por WhatsApp enviado a " + n + " moroso(s)", true);
    });
  });

  /* ---------- SOCIOS ---------- */
  function renderMembers() {
    Store.listMembers(T).then(function (members) {
      var body = $("#membersBody");
      if (!members.length) { body.innerHTML = '<tr><td colspan="6" class="muted center" style="padding:26px;">Sin socios. Pulsa "+ Agregar socio".</td></tr>'; return; }
      body.innerHTML = "";
      members.forEach(function (m) {
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + esc(m.name) + "</td><td>" + esc(m.plan || "—") + '</td><td class="num">' + money(+m.amount || 0) +
          '</td><td class="num">' + (m.day || "—") + "</td><td>" + esc(m.phone || "—") +
          '</td><td><div class="inv-actions"><button data-a="edit" title="Editar">✎</button><button data-a="del" title="Eliminar">🗑</button></div></td>';
        tr.querySelector('[data-a="edit"]').addEventListener("click", function () { openMemberModal(m); });
        tr.querySelector('[data-a="del"]').addEventListener("click", function () {
          if (confirm("¿Eliminar a " + m.name + "?")) Store.deleteMember(T, m.id).then(renderMembers);
        });
        body.appendChild(tr);
      });
    });
  }
  function openMemberModal(m) {
    $("#memberModalTitle").textContent = m ? "Editar socio" : "Agregar socio";
    $("#mId").value = m ? m.id : "";
    $("#mName").value = m ? m.name : "";
    $("#mPlan").value = m ? (m.plan || "") : "";
    $("#mAmount").value = m ? m.amount : "";
    $("#mDay").value = m ? (m.day || "") : "";
    $("#mPhone").value = m ? (m.phone || "") : "";
    $("#memberModal").classList.add("open");
  }
  $("#btnAddMember").addEventListener("click", function () { openMemberModal(null); });
  $("#btnCancelMember").addEventListener("click", function () { $("#memberModal").classList.remove("open"); });
  $("#btnSaveMember").addEventListener("click", function () {
    var name = $("#mName").value.trim();
    var amount = parseFloat($("#mAmount").value);
    if (!name || isNaN(amount) || amount < 0) return toast("Completa nombre y mensualidad");
    var existing = $("#mId").value;
    var m = { id: existing || null, name: name, plan: $("#mPlan").value.trim(), amount: amount, day: parseInt($("#mDay").value, 10) || null, phone: $("#mPhone").value.trim() };
    // conservar lastPaidMonth si edición
    var save = existing
      ? Store.listMembers(T).then(function (list) { var old = list.filter(function (x) { return x.id === existing; })[0]; if (old) m.lastPaidMonth = old.lastPaidMonth; return Store.saveMember(T, m); })
      : Store.saveMember(T, m);
    save.then(function () { $("#memberModal").classList.remove("open"); renderMembers(); toast("Socio guardado", true); });
  });

  /* ---------- HISTORIAL ---------- */
  function renderPayments() {
    Store.listPayments(T).then(function (pays) {
      var body = $("#payBody");
      if (!pays.length) { body.innerHTML = '<tr><td colspan="4" class="muted center" style="padding:26px;">Aún no hay pagos registrados.</td></tr>'; return; }
      body.innerHTML = pays.map(function (p) {
        return "<tr><td>" + esc(p.date) + "</td><td>" + esc(p.memberName) + "</td><td>" + esc(p.concept) + '</td><td class="num">' + money(p.amount) + "</td></tr>";
      }).join("");
    });
  }

  /* ---------- INIT ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    $$("#tabs .tab").forEach(function (t) { t.addEventListener("click", function () { goTab(t.dataset.tab); }); });
    Gate.init().then(function (cur) {
      if (!cur) return;
      T = cur.tenant;
      renderPanel();
    });
  });
})();
