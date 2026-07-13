# L — Proyecto Arquitectónico y Estructural (CAD)

Proyecto: **casa moderna de 3 niveles** (~12.00 × 11.00 m), basado en una imagen
de referencia (fachada). La distribución es una **propuesta**.

## Láminas

**Todo en un solo archivo (referencia):**
[`planos/proyecto-completo.dxf`](planos/proyecto-completo.dxf) ·
[vista previa](planos/proyecto-completo.svg) — las 4 plantas en una lámina general.

| Lámina | Archivo CAD | Vista previa |
|--------|-------------|--------------|
| 01 · Planta Baja | [`planos/arq-planta-baja.dxf`](planos/arq-planta-baja.dxf) | [svg](planos/arq-planta-baja.svg) |
| 02 · Primer Piso | [`planos/arq-primer-piso.dxf`](planos/arq-primer-piso.dxf) | [svg](planos/arq-primer-piso.svg) |
| 03 · Segundo Piso | [`planos/arq-segundo-piso.dxf`](planos/arq-segundo-piso.dxf) | [svg](planos/arq-segundo-piso.svg) |
| 04 · Planta de Cimentación | [`planos/planta-cimentacion.dxf`](planos/planta-cimentacion.dxf) | [svg](planos/planta-cimentacion.svg) |

## Especificaciones (del arquitecto)

- Malla estructural: ejes **1-2-3-4** (X, vanos 4.00 m) y **A-B-C-D** (Y, vanos 3.50 / 3.50 / 4.00 m).
- **16 columnas** de 0.30 × 0.30 m.
- **Plintos** 1.00 × 1.00 m · **Riostras** e = 0.20 m.

## Cómo obtener el `.dwg`

Los archivos CAD se entregan en **`.dxf`**. Para el `.dwg` nativo: abrir el `.dxf`
en AutoCAD / ZWCAD / BricsCAD / LibreCAD → **Archivo → Guardar como → `.dwg`**.

> ⚠️ Si usas **AutoCAD Web** (navegador) te abrirá en modo *solo vista* y no te
> dejará guardar: eso es un límite de la versión gratis, no del archivo. Usa la
> versión de escritorio (licencia educativa gratuita de Autodesk con tu correo
> universitario) o un conversor DXF→DWG.

Unidades: **metros**. Capas: `EJES`, `MUROS`, `PUERTAS`, `VENTANAS`, `ESCALERA`,
`MOBILIARIO`, `COTAS`, `TEXTOS`, `COLUMNAS`, `PLINTOS`, `RIOSTRAS`, `MARCO`,
`MEMBRETE`.

Membrete: Dibujante *John Ariel Martínez* · Asignatura *Planos Digitales* ·
*Segundo Parcial* · Carrera *Ingeniería Civil*.

## Regenerar todas las láminas

```bash
python3 scripts/generar_proyecto.py
```
