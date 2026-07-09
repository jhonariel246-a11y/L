/* InsightPay — configuración del cliente web.
   API_BASE vacío = mismo origen (cuando el backend sirve el sitio).
   En producción apuntar a la API en el hosting, p.ej. "https://insightpay.lat". */
window.INSIGHTPAY = {
  API_BASE: "",
  api: function (p) { return (window.INSIGHTPAY.API_BASE || "") + p; }
};
