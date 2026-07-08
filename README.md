# Insight — Ecosistema Financiero + Restaurantes y Cafeterías

Sitio web del **ecosistema financiero Insight** para pymes de Ecuador (Guayaquil),
descrito en el documento estratégico, con un **cuarto módulo nuevo**: un sistema
de facturación completo e integrado para **restaurantes y cafeterías**.

## Qué incluye

- **`index.html`** — Landing del ecosistema. Muestra "los tres módulos" del PDF
  (Cobros, Nómina, Tributario) más un cuarto botón destacado: **Restaurantes y
  Cafeterías**. Incluye arquitectura ("un motor, varias caras"), proyección de
  flujo de caja a 12 meses y hoja de ruta de lanzamiento secuencial.
- **`restaurantes.html`** — Sistema para restaurantes/cafeterías con **demo
  funcional que corre en el navegador**:
  - 🍽️ **Mesas** — toma de pedidos táctil, envío a cocina, cuenta con IVA 15%.
  - 💬 **WhatsApp** — bot simulado que saluda, envía el menú, toma la orden para
    llevar y la deja en la "computadora del local".
  - 📦 **Inventario** — stock en vivo, alertas de bajo stock, alta de productos.
  - 🧾 **Facturación** — emisión de factura (consumidor final o con RUC/cédula),
    IVA 15%, listado y vista de comprobante.
  - 📊 **Reportes** — ventas del día, ticket promedio, top de platos y por canal.
  - Planes de **suscripción mensual/anual** + comisión por transacción.

## Cómo verlo

No necesita build ni dependencias. Abre `index.html` en el navegador, o sirve la
carpeta:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

Es 100% estático (HTML/CSS/JS), listo para publicar en GitHub Pages, Netlify,
Vercel o cualquier hosting.

## Sobre la integración real de WhatsApp

La pestaña de WhatsApp es una **simulación** del flujo completo (menú → toma de
orden → confirmación → llega al local). En producción, el bot se conecta con la
**API de WhatsApp Business (Cloud API de Meta o Twilio)** usando el número
verificado del local; requiere una cuenta de WhatsApp Business y aprobación de
las plantillas de mensaje. La lógica de negocio (menú, orden, ruteo al POS) es la
que ya está implementada en el demo.

## Estructura

```
index.html            Landing del ecosistema (4 módulos)
restaurantes.html     Sistema + demo POS para restaurantes/cafeterías
assets/
  styles.css          Sistema de diseño compartido
  restaurant.css      Estilos del POS
  app.js              Interacciones de la landing
  restaurant.js       Motor del demo POS (localStorage, sin dependencias)
```

> Cifras y proyecciones referenciales para planificación interna; no constituyen
> asesoría financiera, legal ni tributaria.
