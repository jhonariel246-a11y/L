/* ==========================================================================
   Insight · SRI — Firma electrónica XAdES-BES para comprobantes
   Usa el certificado .p12 del emisor (firma electrónica) para firmar el XML
   de la factura de forma "enveloped", como exige el SRI Ecuador.

   IMPORTANTE: la aceptación final la valida el SRI. Este módulo produce una
   firma XAdES-BES bien formada y verificable criptográficamente; debe
   certificarse contra el ambiente de PRUEBAS del SRI con el certificado real
   del negocio antes de pasar a producción.
   ========================================================================== */
"use strict";

var forge = require("node-forge");
var crypto = require("crypto");

function sha1Base64(str) {
  return crypto.createHash("sha1").update(Buffer.from(str, "utf8")).digest("base64");
}
function rnd(n) { return String(Math.floor(Math.random() * Math.pow(10, n))).padStart(n, "0"); }

/** Extrae clave privada y certificado de un .p12 (Buffer o base64) + clave. */
function leerP12(p12Input, password) {
  var der = Buffer.isBuffer(p12Input) ? p12Input : Buffer.from(p12Input, "base64");
  var p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(der.toString("binary")));
  var p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

  var keyObj = null, certObj = null;
  p12.safeContents.forEach(function (sc) {
    sc.safeBags.forEach(function (bag) {
      if (bag.key) keyObj = bag.key;
      if (bag.type === forge.pki.oids.pkcs8ShroudedKeyBag && bag.key) keyObj = bag.key;
      if (bag.cert) {
        // preferir el certificado con uso de firma
        if (!certObj) certObj = bag.cert; else if (bag.cert.getExtension && bag.cert.getExtension("keyUsage")) certObj = bag.cert;
      }
    });
  });
  if (!keyObj || !certObj) throw new Error("No se pudo leer la clave/certificado del .p12 (¿clave incorrecta?)");
  return { key: keyObj, cert: certObj };
}

function certDER(cert) {
  return forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(); // binary string
}

/**
 * Firma un XML de factura (enveloped XAdES-BES).
 * @param {string} xml       XML de la factura (con <factura id="comprobante" ...>)
 * @param {Buffer|string} p12  certificado .p12 (Buffer o base64)
 * @param {string} password  clave del .p12
 * @returns {string} XML firmado
 */
function firmarFactura(xml, p12, password) {
  var creds = leerP12(p12, password);
  var cert = creds.cert;
  var privateKeyPem = forge.pki.privateKeyToPem(creds.key);

  // Certificado en base64 (DER)
  var certDerBin = certDER(cert);
  var certB64 = forge.util.encode64(certDerBin);
  var certDigest = forge.util.encode64(forge.md.sha1.create().update(certDerBin).digest().getBytes());

  // Datos del emisor del certificado
  var issuerName = cert.issuer.attributes.map(function (a) { return a.shortName + "=" + a.value; }).reverse().join(", ");
  var serialDec = new forge.jsbn.BigInteger(cert.serialNumber, 16).toString(10);

  // RSA public key value
  var pk = cert.publicKey;
  var modulusB64 = forge.util.encode64(forge.util.hexToBytes(pk.n.toString(16)));
  var exponentB64 = forge.util.encode64(forge.util.hexToBytes(pk.e.toString(16)));

  // Ids únicos (estilo SRI)
  var n1 = rnd(6), n2 = rnd(6), n3 = rnd(6);
  var signatureId = "Signature" + n1;
  var signedInfoId = "Signature-SignedInfo" + n2;
  var signedPropId = "Signature" + n1 + "-SignedProperties" + n3;
  var certId = "Certificate" + n2;
  var refDocId = "Reference-ID-" + n3;
  var signedPropRefId = "SignedPropertiesID" + n1;
  var signingTime = new Date().toISOString();

  // --- SignedProperties ---
  var signedProperties =
    '<etsi:SignedProperties xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" Id="' + signedPropId + '">' +
    '<etsi:SignedSignatureProperties>' +
    '<etsi:SigningTime>' + signingTime + '</etsi:SigningTime>' +
    '<etsi:SigningCertificate><etsi:Cert><etsi:CertDigest>' +
    '<ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>' +
    '<ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">' + certDigest + '</ds:DigestValue>' +
    '</etsi:CertDigest><etsi:IssuerSerial>' +
    '<ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">' + issuerName + '</ds:X509IssuerName>' +
    '<ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">' + serialDec + '</ds:X509SerialNumber>' +
    '</etsi:IssuerSerial></etsi:Cert></etsi:SigningCertificate>' +
    '</etsi:SignedSignatureProperties>' +
    '<etsi:SignedDataObjectProperties>' +
    '<etsi:DataObjectFormat ObjectReference="#' + refDocId + '">' +
    '<etsi:Description>contenido comprobante</etsi:Description>' +
    '<etsi:MimeType>text/xml</etsi:MimeType>' +
    '</etsi:DataObjectFormat></etsi:SignedDataObjectProperties>' +
    '</etsi:SignedProperties>';

  // --- KeyInfo ---
  var keyInfo =
    '<ds:KeyInfo Id="' + certId + '">' +
    '<ds:X509Data><ds:X509Certificate>' + certB64 + '</ds:X509Certificate></ds:X509Data>' +
    '<ds:KeyValue><ds:RSAKeyValue>' +
    '<ds:Modulus>' + modulusB64 + '</ds:Modulus>' +
    '<ds:Exponent>' + exponentB64 + '</ds:Exponent>' +
    '</ds:RSAKeyValue></ds:KeyValue></ds:KeyInfo>';

  // --- Digests de las referencias ---
  var digestComprobante = sha1Base64(xml);                 // documento (enveloped)
  var digestSignedProps = sha1Base64(signedProperties);
  var digestKeyInfo = sha1Base64(keyInfo);

  // --- SignedInfo ---
  var signedInfo =
    '<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="' + signedInfoId + '">' +
    '<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></ds:CanonicalizationMethod>' +
    '<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></ds:SignatureMethod>' +
    '<ds:Reference Id="SignedPropertiesID' + n1 + '" Type="http://uri.etsi.org/01903#SignedProperties" URI="#' + signedPropId + '">' +
    '<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>' +
    '<ds:DigestValue>' + digestSignedProps + '</ds:DigestValue></ds:Reference>' +
    '<ds:Reference URI="#' + certId + '">' +
    '<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>' +
    '<ds:DigestValue>' + digestKeyInfo + '</ds:DigestValue></ds:Reference>' +
    '<ds:Reference Id="' + refDocId + '" URI="#comprobante">' +
    '<ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></ds:Transform></ds:Transforms>' +
    '<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></ds:DigestMethod>' +
    '<ds:DigestValue>' + digestComprobante + '</ds:DigestValue></ds:Reference>' +
    '</ds:SignedInfo>';

  // --- Firma RSA-SHA1 sobre SignedInfo ---
  var signer = crypto.createSign("RSA-SHA1");
  signer.update(Buffer.from(signedInfo, "utf8"));
  var signatureValue = signer.sign(privateKeyPem, "base64");

  var signature =
    '<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="' + signatureId + '">' +
    signedInfo +
    '<ds:SignatureValue Id="SignatureValue' + n2 + '">' + signatureValue + '</ds:SignatureValue>' +
    keyInfo +
    '<ds:Object Id="' + signatureId + '-Object' + n3 + '">' +
    '<etsi:QualifyingProperties xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#" Target="#' + signatureId + '">' +
    signedProperties +
    '</etsi:QualifyingProperties></ds:Object>' +
    '</ds:Signature>';

  // Insertar la firma dentro de </factura> (enveloped)
  var firmado = xml.replace("</factura>", signature + "</factura>");
  return { xml: firmado, signatureValue: signatureValue, publicKeyPem: forge.pki.publicKeyToPem(cert.publicKey), signedInfo: signedInfo };
}

module.exports = { firmarFactura: firmarFactura, leerP12: leerP12 };
