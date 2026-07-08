/* Interacciones ligeras del sitio Insight */
(function () {
  // Revelado al hacer scroll
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && els.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // Cerrar menú móvil al navegar
  var nav = document.getElementById('navlinks');
  if (nav) {
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }
})();
