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
  function showHub(cur) {
    $("#authScreen").style.display = "none";
    $("#hubScreen").style.display = "block";
    $("#storeName").textContent = cur.restaurant.name;
    $("#hubName").textContent = cur.restaurant.name;
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
        showHub({ restaurant: acc.restaurant });
      }).catch(function (e) { toast(e.message || "No se pudo registrar"); })
        .then(function () { $("#doRegister").disabled = false; });
    });

    $("#doLogin").addEventListener("click", function () {
      $("#doLogin").disabled = true;
      Store.login($("#lgEmail").value.trim(), $("#lgPass").value).then(function (acc) {
        toast("Sesión iniciada", true);
        showHub({ restaurant: acc.restaurant });
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
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
    Store.getCurrent().then(function (cur) {
      if (cur) showHub(cur); else showAuth();
    }).catch(showAuth);
  });
})();
