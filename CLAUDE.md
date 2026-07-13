# CLAUDE.md — Memoria del proyecto (leer al iniciar cada sesión)

> Este archivo es la **memoria persistente** del proyecto. Contiene TODO lo
> acordado. Léelo completo antes de trabajar. El proyecto se desarrolla
> **poco a poco durante todo el parcial**, con avances que el usuario irá
> indicando. **No empezar de cero: continuar sobre lo ya hecho.**

## Idioma
Responder SIEMPRE en **español** (el usuario es hispanohablante, Ecuador).

## Estudiante / Membrete (va en TODAS las láminas)
- **Dibujante:** John Ariel Martínez
- **Asignatura:** Planos Digitales
- **Parcial:** Segundo Parcial
- **Carrera:** Ingeniería Civil
- **Universidad:** UCSG (correo jhon.martinez@cu.ucsg.edu.ec)

## Proyecto
Casa **moderna de 3 niveles**, basada en una imagen de referencia (fachada:
casa crema con garaje, balcones con jardineras y ventanal en arco). La
distribución arquitectónica es **una propuesta** (la imagen no traía medidas).
Este es el proyecto con el que se trabaja **TODO el parcial**.

- **Archivo CAD original (fuente):** `proyecto-completo.dwg`, alojado en Google Drive:
  https://drive.google.com/file/d/1zfL9muo_BWWw2PnaNCiBtKRWGQREuz5W/view?usp=drivesdk
  (compartido como editor/lector; el DWG que generó el usuario es AC1018 = AutoCAD 2004).

## Especificaciones estructurales (del arquitecto) — NO cambiar sin aviso
- Malla de ejes: **X = 1·2·3·4** en 0/4/8/12 m · **Y = A·B·C·D** en 0/3.5/7/11 m.
- Envolvente: **12.00 × 11.00 m**.
- **Columnas** 0.30 × 0.30 m (16, una por intersección de ejes).
- **Plintos 1.00 × 1.00 m** (uno por columna).
- **Riostras e = 0.20 m** (malla ortogonal entre caras de plinto).
- Muro exterior 0.20 m · muro interior 0.12 m.

## La tarea (estructura recurrente de cada avance)
El entregable central es **SOLO EL PLANO ESTRUCTURAL** (Planta de Cimentación).
Cada avance debe incluir:
1. **Inserción del enlace del archivo original** (el link de Drive de arriba;
   ya se inserta como nota "REF. ARCHIVO ORIGINAL" en el membrete).
2. **Verificación de medidas** de plantas de cimentación, losas y cubierta.
3. **Delineación de la Planta de Cimentación:** ejes, columnas, plintos
   (1.00×1.00), riostras (e=0.20).

> ⚠️ IMPORTANTE: el profe pidió **solo el plano estructural**. Las plantas
> arquitectónicas (baja/pisos) fueron un extra nuestro; NO son el entregable
> salvo que el usuario las pida. El archivo de entrega principal es
> **`planos/planta-cimentacion.dxf`**.

## Formato de entrega
- Se generan archivos **`.dxf`** (R12/AC1009). El usuario los abre en AutoCAD y
  hace **Guardar como → `.dwg`** (su conversor ya funciona).
- ⚠️ **AutoCAD Web** abre en "solo vista" (no deja guardar): eso es límite de la
  versión gratis, NO del archivo. Usar AutoCAD de escritorio (licencia educativa
  gratis de Autodesk) o un conversor DXF→DWG.
- Unidades: **metros**.

## Estructura del repo
```
CLAUDE.md                          <- este archivo (memoria)
README.md
docs/avance-planos-estructurales.md  <- reporte de avance (3 puntos)
scripts/lib_cad.py                 <- toolkit CAD (primitivas, DXF R12, SVG, arcos)
scripts/generar_proyecto.py        <- genera TODAS las láminas
planos/planta-cimentacion.dxf/.svg <- ENTREGABLE PRINCIPAL (solo estructural)
planos/proyecto-completo.dxf/.svg  <- las 4 plantas en una lámina (referencia)
planos/arq-planta-baja / arq-primer-piso / arq-segundo-piso  <- arquitectónicas (extra)
```
Regenerar todo: `python3 scripts/generar_proyecto.py`
Validar DXF: leer con `ezdxf` (debe dar 0 errores).

## Cómo generar dibujos (arquitectura del código)
- `scripts/lib_cad.py`: clase `Sheet` con primitivas (line, circle, arc, poly,
  text, erase) + `write_dxf` (R12) y `write_svg`. Capas y colores en `LAYERS`.
- `scripts/generar_proyecto.py`: funciones `build_*()` devuelven un `Sheet`;
  `emit()` agrega membrete y escribe DXF+SVG; `emit_combinado()` arma la lámina
  2×2. Parámetros de malla y specs al inicio del archivo. `REF_LINK` = enlace Drive.
- Para SVG de vista previa se envían al usuario con SendUserFile (display render).

## Flujo de trabajo (Git)
- Rama de desarrollo: **`claude/structural-cad-plans-upload-yyz0gi`**.
- Commit + push en cada avance. Mensajes de commit en español, descriptivos.
- Enviar al usuario el `.dxf` (+ `.svg` de vista previa) en cada avance.

## Historial de decisiones
- Se probó planta **circular** → descartada; el proyecto es **rectangular**.
- Se dimensionó a **12×11 m** (opción "grande") a pedido del usuario.
- El usuario ya convirtió DXF→DWG con éxito con un conversor web.
- La Planta de Cimentación quedó como **lámina única** (LAMINA 01, sin serie).

## Pendientes / próximos avances posibles
- [ ] Confirmar si el profe pide tamaño/número de ejes específico.
- [ ] Verificar que el enlace de Drive quede accesible (probar en incógnito).
- [ ] Posibles avances futuros: planta de losa, planta de cubierta, cuadro de
      columnas, detalle de plinto tipo, secciones. (Hacer SOLO lo que pida el usuario.)
