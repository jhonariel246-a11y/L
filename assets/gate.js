/* ==========================================================================
   Insight — portero de sesión compartido entre módulos.
   Cada módulo (pos, cobros, nómina, tributario) lo usa para exigir login,
   pintar la barra superior y mostrar el estado de sincronización.
   ========================================================================== */
(function (global) {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };

  function requireSession() {
    return Store.getCurrent().then(function (cur) {
      if (!cur) { location.href = "app.html"; return null; }
      return cur;
    }).catch(function () { location.href = "app.html"; return null; });
  }

  function wireCommon(cur) {
    var nameEl = $("#storeName");
    if (nameEl && cur) nameEl.textContent = cur.restaurant.name;

    var out = $("#btnLogout");
    if (out) out.addEventListener("click", function () {
      Store.logout().then(function () { location.href = "app.html"; });
    });

    if ($("#syncState")) {
      Store.onSyncChange(function (st) {
        var el = $("#syncState");
        if (!el) return;
        if (st.online) {
          el.className = "sync online";
          el.innerHTML = '<span class="sdot"></span> En línea' + (st.pending ? " · " + st.pending + " por sincronizar" : " · sincronizado");
        } else {
          el.className = "sync offline";
          el.innerHTML = '<span class="sdot"></span> Sin internet · guardando local' + (st.pending ? " (" + st.pending + ")" : "");
        }
      });
      Store.updateSyncBadge();
    }

    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  // Inicializa un módulo: exige sesión, pinta lo común y devuelve el usuario actual.
  function init() {
    return requireSession().then(function (cur) {
      if (!cur) return null;
      wireCommon(cur);
      return cur;
    });
  }

  // Toast reutilizable
  var toastEl, toastT;
  function toast(msg, ok) {
    toastEl = toastEl || $("#toast");
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (ok ? " ok" : "");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.className = "toast"; }, 2400);
  }

  global.Gate = { init: init, requireSession: requireSession, toast: toast };
})(window);
