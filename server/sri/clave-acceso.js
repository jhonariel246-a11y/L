/* ==========================================================================
   Insight · SRI — Generación de la CLAVE DE ACCESO (49 dígitos)
   Esquema offline del SRI Ecuador.
   Estructura (48 dígitos) + dígito verificador (módulo 11) = 49:
     ddmmaaaa (8)  fecha de emisión
     tipoComprobante (2)   ej. 01 = factura
     ruc (13)
     ambiente (1)          1 = pruebas, 2 = producción
     serie (6)             estab(3) + ptoEmi(3)
     secuencial (9)
     codigoNumerico (8)    aleatorio del emisor
     tipoEmision (1)       1 = emisión normal
     digitoVerificador (1) módulo 11
   ========================================================================== */
"use strict";

/** Dígito verificador por módulo 11 (algoritmo del SRI). */
function digitoModulo11(cadena48) {
  if (!/^\d{48}$/.test(cadena48)) {
    throw new Error("La cadena para el módulo 11 debe tener 48 dígitos");
  }
  var pesos = [2, 3, 4, 5, 6, 7];
  var suma = 0;
  var p = 0;
  // Se recorre de derecha a izquierda
  for (var i = cadena48.length - 1; i >= 0; i--) {
    suma += parseInt(cadena48[i], 10) * pesos[p];
    p = (p + 1) % pesos.length;
  }
  var residuo = suma % 11;
  var dv = 11 - residuo;
  if (dv === 11) dv = 0;
  if (dv === 10) dv = 1;
  return String(dv);
}

function pad(v, n) { return String(v).replace(/\D/g, "").padStart(n, "0").slice(-n); }

function fechaDDMMAAAA(date) {
  var d = date instanceof Date ? date : new Date(date);
  var dd = String(d.getDate()).padStart(2, "0");
  var mm = String(d.getMonth() + 1).padStart(2, "0");
  var aa = String(d.getFullYear());
  return dd + mm + aa;
}

/**
 * Genera la clave de acceso de 49 dígitos.
 * @param {Object} o
 * @param {Date}   o.fechaEmision
 * @param {string} o.tipoComprobante  '01' factura, '04' NC, '05' ND, '06' guía, '07' retención
 * @param {string} o.ruc              13 dígitos
 * @param {string} o.ambiente         '1' pruebas | '2' producción
 * @param {string} o.estab            '001'
 * @param {string} o.ptoEmi           '001'
 * @param {string} o.secuencial       9 dígitos
 * @param {string} [o.codigoNumerico] 8 dígitos (si falta, se genera)
 * @param {string} [o.tipoEmision]    '1' normal
 * @returns {string} clave de 49 dígitos
 */
function generarClaveAcceso(o) {
  var codigoNumerico = o.codigoNumerico
    ? pad(o.codigoNumerico, 8)
    : pad(String(Math.floor(Math.random() * 1e8)), 8);

  var base =
    fechaDDMMAAAA(o.fechaEmision) +      // 8
    pad(o.tipoComprobante, 2) +          // 2
    pad(o.ruc, 13) +                     // 13
    pad(o.ambiente, 1) +                 // 1
    pad(o.estab, 3) + pad(o.ptoEmi, 3) + // 6
    pad(o.secuencial, 9) +               // 9
    codigoNumerico +                     // 8
    pad(o.tipoEmision || "1", 1);        // 1  => 48

  if (base.length !== 48) {
    throw new Error("La base de la clave de acceso debe tener 48 dígitos, tiene " + base.length);
  }
  return base + digitoModulo11(base);    // 49
}

module.exports = { generarClaveAcceso: generarClaveAcceso, digitoModulo11: digitoModulo11, fechaDDMMAAAA: fechaDDMMAAAA };
