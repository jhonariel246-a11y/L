# Ejercicio Práctico – Unidad 1: Paquetes Contables y Tributarios

Resolución del ejercicio de la hoja **Instrucciones** (empresa de ejemplo
*LOS INTELECTUALES S.A.* – Reporte de Ventas, Primer Trimestre 2026).

## Archivos

| Archivo | Descripción |
|---|---|
| `Reporte_Ventas_Jhon_Martinez.xlsx` | Ejercicio resuelto (entregable). |
| `archivo_original.xlsx` | Archivo original recibido, sin modificar. |
| `scripts/resolver.py` | Script de Python (openpyxl) que genera el resuelto. |

## Lo que se resolvió (pasos de la página 1)

1. **Formato + encabezado** en la hoja `Ventas`: título de la empresa,
   *REPORTE DE VENTAS* y *PRIMER TRIMESTRE 2026*, tabla con estilos y
   números en formato moneda.
2. **Fórmulas**:
   - `Subtotal = Cantidad × Precio Unitario`
   - `IVA = Subtotal × $B$4` (referencia **absoluta** a la tasa de IVA 15 %)
   - `Total Venta = Subtotal + IVA`
   - Fila de **TOTALES** con `SUMA`.
3. **Formato condicional** en `Total Venta`: verde si > $500, rojo si < $200.
4. **Lista desplegable** en la columna `Categoría`
   (Papelería, Tecnología, Oficina).
5. **Gráfico de columnas**: ventas totales por mes (hoja `Gráficos`).
6. **Gráfico circular**: ventas por categoría (hoja `Gráficos`).
7. **Análisis Categoría × Mes** con `SUMIFS` (hoja `Análisis`), equivalente a
   la tabla dinámica; incluye la guía para crear la tabla dinámica real y el
   segmentador (slicer) por producto directamente en Excel.

## Regenerar

```bash
pip install openpyxl
cd scripts
python resolver.py   # lee archivo_original.xlsx y genera el resuelto
```
