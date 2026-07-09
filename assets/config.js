/* InsightPay — configuración del cliente web.
   API_BASE vacío = mismo origen (cuando el backend sirve el sitio).
   En producción apuntar a la API en el hosting, p.ej. "https://insightpay.lat". */
window.INSIGHTPAY = {
  API_BASE: "",

  // Número de WhatsApp de InsightPay para gestionar la compra de firmas
  // electrónicas (solo dígitos, con código de país). CAMBIAR por el real.
  WHATSAPP: "593999999999",

  api: function (p) { return (window.INSIGHTPAY.API_BASE || "") + p; },

  // Construye un enlace wa.me con un mensaje pre-escrito
  wa: function (mensaje) {
    return "https://wa.me/" + window.INSIGHTPAY.WHATSAPP + "?text=" + encodeURIComponent(mensaje);
  }
};
