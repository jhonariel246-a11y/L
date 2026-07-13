# L — Planos Estructurales (Avance CAD)

Repositorio de avance del archivo CAD de **planos estructurales** (cimentación,
losas y cubierta). Proyecto de planta **rectangular** (plano tradicional).

## Contenido

| Ruta | Descripción |
|------|-------------|
| [`planos/planta-cimentacion.dxf`](planos/planta-cimentacion.dxf) | **Archivo CAD** — ábrelo en AutoCAD y guárdalo como `.dwg`. |
| [`planos/planta-cimentacion.svg`](planos/planta-cimentacion.svg) | Vista previa de la Planta de Cimentación. |
| [`docs/avance-planos-estructurales.md`](docs/avance-planos-estructurales.md) | Reporte de avance: enlace del archivo original, verificación de medidas y delineación. |
| [`scripts/generar_planta_cimentacion.py`](scripts/generar_planta_cimentacion.py) | Generador del DXF + SVG. |

## Avance incluido

1. **Enlace del archivo original** — sección 1 del reporte *(pendiente de completar con la URL del DWG)*.
2. **Verificación de medidas** — plantas de cimentación, losas y cubierta (malla 8.00 × 7.00 m).
3. **Delineación de la Planta de Cimentación** — ejes, columnas, plintos (1.00×1.00 m) y riostras (e=0.20 m).

## Cómo obtener el `.dwg`

El archivo CAD se entrega en formato **`.dxf`** (intercambio CAD, texto).
Para tener el `.dwg` nativo:

1. Abrir `planos/planta-cimentacion.dxf` en AutoCAD / ZWCAD / BricsCAD /
   LibreCAD.
2. **Archivo → Guardar como → AutoCAD `.dwg`**.

Unidades del dibujo: **metros**. Capas: `EJES`, `COLUMNAS`, `PLINTOS`,
`RIOSTRAS`, `COTAS`, `TEXTOS`, `MARCO`, `MEMBRETE`.

Membrete: Dibujante *John Ariel Martínez* · Asignatura *Planos Digitales* ·
*Segundo Parcial* · Carrera *Ingeniería Civil*.

## Regenerar los dibujos

```bash
python3 scripts/generar_planta_cimentacion.py    # planta rectangular (DXF + SVG)
```
