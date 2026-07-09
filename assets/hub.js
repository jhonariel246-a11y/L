/* ==========================================================================
   Insight — login/registro + hub de módulos (app.html)
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var toastEl, toastT;
  function toast(msg, ok) {
    toastEl = toastEl || $("#toast");
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (ok ? " ok" : "");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.className = "toast"; }, 2400);
  }

  function showAuth() {
    $("#authScreen").style.display = "grid";
    $("#hubScreen").style.display = "none";
  }
  var currentTenant = null;

  function refreshFEStatus() {
    var el = $("#feStatus");
    if (!el || !currentTenant) return;
    fetch(INSIGHTPAY.api("/api/facturacion/estado?tenant=" + encodeURIComponent(currentTenant)))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.activa) { el.innerHTML = '<span class="pill">✓ Activa</span> Tu certificado está guardado; las facturas se firman automáticamente.'; }
        else { el.innerHTML = "Aún no has subido tu certificado. Actívala para emitir facturas autorizadas por el SRI."; }
      })
      .catch(function () { el.innerHTML = '<span class="pill-warn pill">Servidor no disponible</span> Se activará cuando el backend esté en línea.'; });
  }

  function bindFE() {
    var open = $("#btnActivarFE"), modal = $("#feModal");
    if (!open) return;
    open.addEventListener("click", function () { $("#feResult").textContent = ""; modal.classList.add("open"); });
    $("#feCancel").addEventListener("click", function () { modal.classList.remove("open"); });
    $("#feSave").addEventListener("click", function () {
      var file = $("#feP12").files[0];
      var pass = $("#fePass").value;
      if (!file) return toast("Selecciona tu archivo .p12");
      if (!pass) return toast("Escribe la clave del certificado");
      var reader = new FileReader();
      reader.onload = function () {
        var b64 = String(reader.result).split(",").pop();
        $("#feSave").disabled = true; $("#feResult").textContent = "Validando certificado…";
        fetch(INSIGHTPAY.api("/api/facturacion/activar"), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant: currentTenant, p12: b64, password: pass, ambiente: $("#feAmb").value })
        }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
          .then(function (res) {
            if (res.ok && res.j.ok) {
              $("#feResult").innerHTML = "✅ Activada · RUC " + (res.j.ruc || "") + " · " + (res.j.razonSocial || "");
              toast("Facturación electrónica activada", true);
              refreshFEStatus();
              setTimeout(function () { modal.classList.remove("open"); }, 1400);
            } else {
              $("#feResult").textContent = "⚠ " + (res.j.error || "No se pudo activar");
            }
          }).catch(function () { $("#feResult").textContent = "⚠ No se pudo contactar el servidor (¿backend en línea?)"; })
          .then(function () { $("#feSave").disabled = false; });
      };
      reader.readAsDataURL(file);
    });
  }

  function showHub(cur) {
    $("#authScreen").style.display = "none";
    $("#hubScreen").style.display = "block";
    $("#storeName").textContent = cur.restaurant.name;
    $("#hubName").textContent = cur.restaurant.name;
    if (cur.tenant) currentTenant = cur.tenant;
    refreshFEStatus();
    Store.onSyncChange(function (st) {
      var el = $("#syncState"); if (!el) return;
      if (st.online) { el.className = "sync online"; el.innerHTML = '<span class="sdot"></span> En línea' + (st.pending ? " · " + st.pending + " por sincronizar" : " · sincronizado"); }
      else { el.className = "sync offline"; el.innerHTML = '<span class="sdot"></span> Sin internet · guardando local' + (st.pending ? " (" + st.pending + ")" : ""); }
    });
    Store.updateSyncBadge();
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
        restaurant: $("#rgName").value.trim(), type: $("#rgType").value,
        ruc: $("#rgRuc").value.trim(), phone: $("#rgPhone").value.trim(),
        email: $("#rgEmail").value.trim(), password: $("#rgPass").value
      };
      if (!data.restaurant) return toast("Escribe el nombre del negocio");
      if (!data.email) return toast("Escribe un correo");
      if ((data.password || "").length < 4) return toast("La contraseña debe tener al menos 4 caracteres");
      $("#doRegister").disabled = true;
      Store.register(data).then(function (acc) {
        toast("¡Bienvenido, " + acc.restaurant.name + "!", true);
        showHub({ restaurant: acc.restaurant, tenant: acc.tenantId });
      }).catch(function (e) { toast(e.message || "No se pudo registrar"); })
        .then(function () { $("#doRegister").disabled = false; });
    });

    $("#doLogin").addEventListener("click", function () {
      $("#doLogin").disabled = true;
      Store.login($("#lgEmail").value.trim(), $("#lgPass").value).then(function (acc) {
        toast("Sesión iniciada", true);
        showHub({ restaurant: acc.restaurant, tenant: acc.tenantId });
      }).catch(function (e) { toast(e.message || "No se pudo entrar"); })
        .then(function () { $("#doLogin").disabled = false; });
    });

    $("#btnLogout").addEventListener("click", function () {
      Store.logout().then(showAuth);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    toastEl = $("#toast");
    bindAuth();
    bindFE();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
    Store.getCurrent().then(function (cur) {
      if (cur) showHub(cur); else showAuth();
    }).catch(showAuth);
  });
})();
