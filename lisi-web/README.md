# LISI · Landing Page

Landing page de intriga para la campaña **"SE VIENE ALGO GRANDE EN GUAYAQUIL. LISI ESTÁ LLEGANDO."**

Estética oscura / hacker con efectos de glitch, terminal y lluvia matrix. Publicada en **GitHub Pages**.

## 🌐 Ver el sitio

Una vez activado GitHub Pages (Settings → Pages → Deploy from branch `main` / root):

```
https://jhonariel246-a11y.github.io/lisi-web/
```

## 📦 El botón de descarga del APK

El APK (`lisi-acceso.apk`) **no se sube por git**: es un binario pesado y GitHub
rechaza archivos de más de 100 MB en un `push` normal. Por eso el botón apunta a
un **GitHub Release**, que admite archivos de hasta 2 GB.

El enlace del botón es fijo y siempre sirve la última versión:

```
https://github.com/jhonariel246-a11y/lisi-web/releases/latest/download/lisi-acceso.apk
```

### Cómo publicar el APK (una sola vez, desde tu navegador)

1. Entra a este repositorio en GitHub → pestaña **Releases** → **Draft a new release**.
2. Crea un tag (por ejemplo `v1.0`) y un título.
3. En **Attach binaries**, arrastra tu archivo APK y **renómbralo exactamente** a
   `lisi-acceso.apk` (el nombre debe coincidir con el del enlace).
4. **Publish release.**

Listo: el botón de la landing descargará el APK automáticamente. Para actualizar
la app, publica un nuevo release con un APK con el mismo nombre `lisi-acceso.apk`.

## 🗂 Estructura

```
lisi-web/
├── index.html   # Landing page (todo el CSS y JS va inline)
└── README.md
```
