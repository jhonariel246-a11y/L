# L — Planos Estructurales (Avance CAD)

Repositorio de avance del archivo CAD de **planos estructurales** (cimentación,
losas y cubierta).

## Contenido

| Ruta | Descripción |
|------|-------------|
| [`docs/avance-planos-estructurales.md`](docs/avance-planos-estructurales.md) | Reporte de avance: enlace del archivo original, verificación de medidas y delineación de la propuesta. |
| [`planos/planta-cimentacion.svg`](planos/planta-cimentacion.svg) | Propuesta de Planta de Cimentación (ejes, columnas, plintos 1.00×1.00 m y riostras e=0.20 m). |
| [`scripts/generar_planta_cimentacion.py`](scripts/generar_planta_cimentacion.py) | Generador reproducible del dibujo a escala. |

## Avance incluido

1. **Enlace del archivo original** — sección 1 del reporte *(pendiente de completar con la URL del DWG)*.
2. **Verificación de medidas** — plantas de cimentación, losas y cubierta (malla 8.00 × 7.00 m).
3. **Delineación de la Planta de Cimentación** — ejes, columnas, plintos (1.00×1.00 m) y riostras (e=0.20 m).

## Regenerar el dibujo

```bash
python3 scripts/generar_planta_cimentacion.py
```
