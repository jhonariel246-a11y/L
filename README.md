# L — Planos Estructurales (Avance CAD)

Repositorio de avance del archivo CAD de **planos estructurales** (cimentación,
losas y cubierta).

## Contenido

| Ruta | Descripción |
|------|-------------|
| [`planos/planta-cimentacion-circular.dxf`](planos/planta-cimentacion-circular.dxf) | **Archivo CAD (casa circular)** — ábrelo en AutoCAD y guárdalo como `.dwg`. |
| [`planos/planta-cimentacion-circular.svg`](planos/planta-cimentacion-circular.svg) | Vista previa de la planta circular. |
| [`docs/avance-planos-estructurales.md`](docs/avance-planos-estructurales.md) | Reporte de avance: enlace del archivo original, verificación de medidas y delineación de la propuesta. |
| [`planos/planta-cimentacion.svg`](planos/planta-cimentacion.svg) | Propuesta previa de planta rectangular (referencia). |
| [`scripts/generar_planta_circular.py`](scripts/generar_planta_circular.py) | Generador del DXF + SVG de la casa circular. |
| [`scripts/generar_planta_cimentacion.py`](scripts/generar_planta_cimentacion.py) | Generador de la planta rectangular. |

## Avance incluido

1. **Enlace del archivo original** — sección 1 del reporte *(pendiente de completar con la URL del DWG)*.
2. **Verificación de medidas** — plantas de cimentación, losas y cubierta (malla 8.00 × 7.00 m).
3. **Delineación de la Planta de Cimentación** — ejes, columnas, plintos (1.00×1.00 m) y riostras (e=0.20 m).

## Cómo obtener el `.dwg`

El archivo CAD se entrega en formato **`.dxf`** (intercambio CAD, texto).
Para tener el `.dwg` nativo:

1. Abrir `planos/planta-cimentacion-circular.dxf` en AutoCAD / ZWCAD /
   BricsCAD / LibreCAD.
2. **Archivo → Guardar como → AutoCAD `.dwg`**.

Unidades del dibujo: **metros**. Capas: `EJES`, `COLUMNAS`, `PLINTOS`,
`RIOSTRAS`, `MUROS`, `COTAS`, `TEXTOS`.

## Regenerar los dibujos

```bash
python3 scripts/generar_planta_circular.py       # casa circular (DXF + SVG)
python3 scripts/generar_planta_cimentacion.py    # planta rectangular (SVG)
```
