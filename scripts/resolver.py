# -*- coding: utf-8 -*-
"""Resuelve el ejercicio de la hoja 'Instrucciones' sobre la hoja 'Ventas'."""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.chart.label import DataLabelList

import os
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(_ROOT, 'archivo_original.xlsx')
OUT = os.path.join(_ROOT, 'Reporte_Ventas_Jhon_Martinez.xlsx')

# Mapeo producto -> categoria (para poblar la columna y que los graficos/
# analisis tengan sentido; la lista desplegable se mantiene igual).
CATEGORIA = {
    'Impresora': 'Tecnología', 'Toner': 'Tecnología', 'Router': 'Tecnología',
    'Tinta': 'Tecnología', 'Monitor': 'Tecnología', 'Calculadora': 'Tecnología',
    'Carpeta': 'Papelería', 'Lápiz': 'Papelería', 'Cuadernos': 'Papelería',
    'Escritorio': 'Oficina',
}
MESES = ['Enero', 'Febrero', 'Marzo']
CATS = ['Tecnología', 'Papelería', 'Oficina']

MONEDA = '"$"#,##0.00'
ENTERO = '#,##0'
PORC = '0%'

# ---- estilos ----
azul = '2F5496'
azul_claro = 'D9E1F2'
blanco = 'FFFFFF'
thin = Side(style='thin', color='BFBFBF')
BORDE = Border(left=thin, right=thin, top=thin, bottom=thin)
CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
CENTER_NW = Alignment(horizontal='center', vertical='center')
RIGHT = Alignment(horizontal='right', vertical='center')


def cargar_datos():
    wb = openpyxl.load_workbook(SRC)
    ws = wb['Ventas']
    filas = []
    for r in range(2, 52):
        mes = ws.cell(r, 1).value
        prod = ws.cell(r, 2).value
        cant = ws.cell(r, 4).value
        precio = ws.cell(r, 5).value
        if mes and prod:
            filas.append((mes, prod, cant, precio))
    return filas


def construir():
    filas = cargar_datos()
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # ================= HOJA VENTAS =================
    ws = wb.create_sheet('Ventas')

    # --- Encabezado de la empresa (paso 1) ---
    titulos = ['LOS INTELECTUALES S.A.', 'REPORTE DE VENTAS', 'PRIMER TRIMESTRE 2026']
    for i, t in enumerate(titulos, start=1):
        ws.merge_cells(start_row=i, start_column=1, end_row=i, end_column=8)
        c = ws.cell(i, 1, t)
        c.alignment = CENTER_NW
        if i == 1:
            c.font = Font(bold=True, size=16, color=azul)
        elif i == 2:
            c.font = Font(bold=True, size=13, color='000000')
        else:
            c.font = Font(bold=True, italic=True, size=11, color='595959')

    # --- Tasa de IVA (referencia absoluta, paso 2) ---
    ws.cell(4, 1, 'Tasa de IVA:').font = Font(bold=True)
    ws.cell(4, 1).alignment = RIGHT
    rate = ws.cell(4, 2, 0.15)
    rate.number_format = PORC
    rate.font = Font(bold=True, color='C00000')
    rate.alignment = CENTER_NW
    rate.fill = PatternFill('solid', fgColor='FFF2CC')
    rate.border = BORDE

    # --- Encabezados de la tabla (fila 5) ---
    headers = ['Mes', 'Producto', 'Categoría', 'Cantidad Vendida',
               'Precio Unitario', 'Subtotal', 'IVA', 'Total Venta']
    HR = 5
    for c, h in enumerate(headers, start=1):
        cell = ws.cell(HR, c, h)
        cell.fill = PatternFill('solid', fgColor=azul)
        cell.font = Font(bold=True, color=blanco, size=11)
        cell.alignment = CENTER
        cell.border = BORDE

    # --- Datos + formulas (paso 2) ---
    first = HR + 1               # 6
    for i, (mes, prod, cant, precio) in enumerate(filas):
        r = first + i
        ws.cell(r, 1, mes)
        ws.cell(r, 2, prod)
        ws.cell(r, 3, CATEGORIA.get(prod, 'Oficina'))     # categoria poblada
        ws.cell(r, 4, cant).number_format = ENTERO
        ws.cell(r, 5, precio).number_format = MONEDA
        # Subtotal = Cantidad * Precio Unitario
        ws.cell(r, 6, f'=D{r}*E{r}').number_format = MONEDA
        # IVA = Subtotal * $B$4  (referencia absoluta a la tasa)
        ws.cell(r, 7, f'=F{r}*$B$4').number_format = MONEDA
        # Total Venta = Subtotal + IVA
        ws.cell(r, 8, f'=F{r}+G{r}').number_format = MONEDA
        for c in range(1, 9):
            cell = ws.cell(r, c)
            cell.border = BORDE
            if c in (1, 2, 3):
                cell.alignment = Alignment(vertical='center')
            else:
                cell.alignment = RIGHT
            if i % 2 == 1:
                if cell.fill.patternType is None:
                    cell.fill = PatternFill('solid', fgColor='F2F6FC')
    last = first + len(filas) - 1   # 55

    # --- Fila de TOTALES (formula de suma, paso 2) ---
    tr = last + 1
    ws.merge_cells(start_row=tr, start_column=1, end_row=tr, end_column=5)
    ct = ws.cell(tr, 1, 'TOTALES')
    ct.font = Font(bold=True, color=blanco)
    ct.alignment = RIGHT
    ct.fill = PatternFill('solid', fgColor=azul)
    for c in (6, 7, 8):
        col = get_column_letter(c)
        cell = ws.cell(tr, c, f'=SUM({col}{first}:{col}{last})')
        cell.number_format = MONEDA
        cell.font = Font(bold=True, color=blanco)
        cell.fill = PatternFill('solid', fgColor=azul)
        cell.alignment = RIGHT
        cell.border = BORDE
    for c in (1, 6, 7, 8):
        ws.cell(tr, c).border = BORDE

    # --- Formato condicional en Total Venta (paso 3) ---
    rng = f'H{first}:H{last}'
    verde = PatternFill('solid', fgColor='C6EFCE')
    rojo = PatternFill('solid', fgColor='FFC7CE')
    ws.conditional_formatting.add(
        rng, CellIsRule(operator='greaterThan', formula=['500'],
                        fill=verde, font=Font(color='006100')))
    ws.conditional_formatting.add(
        rng, CellIsRule(operator='lessThan', formula=['200'],
                        fill=rojo, font=Font(color='9C0006')))

    # --- Lista desplegable de Categoria (paso 4) ---
    dv = DataValidation(type='list', formula1="='Categorías'!$A$2:$A$4",
                        allow_blank=True, showDropDown=False)
    dv.error = 'Seleccione: Papelería, Tecnología u Oficina'
    dv.errorTitle = 'Categoría inválida'
    dv.prompt = 'Elija una categoría de la lista'
    dv.promptTitle = 'Categoría'
    ws.add_data_validation(dv)
    dv.add(f'C{first}:C{last}')

    # --- ancho de columnas / vista ---
    anchos = [11, 14, 14, 11, 12, 13, 12, 13]
    for i, w in enumerate(anchos, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[HR].height = 30
    ws.freeze_panes = f'A{first}'
    ws.sheet_view.showGridLines = False

    # ================= HOJA CATEGORIAS (lista, paso 4) =================
    wl = wb.create_sheet('Categorías')
    wl.cell(1, 1, 'Categorías').font = Font(bold=True, color=blanco)
    wl.cell(1, 1).fill = PatternFill('solid', fgColor=azul)
    for i, cat in enumerate(CATS, start=2):
        wl.cell(i, 1, cat).border = BORDE
    wl.column_dimensions['A'].width = 18

    # ================= HOJA GRAFICOS (pasos 5 y 6) =================
    wg = wb.create_sheet('Gráficos')
    wg.sheet_view.showGridLines = False
    wg.cell(1, 1, 'RESUMEN PARA GRÁFICOS').font = Font(bold=True, size=14, color=azul)

    # Resumen por mes
    wg.cell(3, 1, 'Mes').font = Font(bold=True, color=blanco)
    wg.cell(3, 2, 'Total Ventas').font = Font(bold=True, color=blanco)
    for c in (1, 2):
        wg.cell(3, c).fill = PatternFill('solid', fgColor=azul)
        wg.cell(3, c).alignment = CENTER_NW
        wg.cell(3, c).border = BORDE
    for i, mes in enumerate(MESES):
        r = 4 + i
        wg.cell(r, 1, mes).border = BORDE
        cell = wg.cell(r, 2,
                       f"=SUMIF(Ventas!$A${first}:$A${last},A{r},Ventas!$H${first}:$H${last})")
        cell.number_format = MONEDA
        cell.border = BORDE

    # Resumen por categoria
    wg.cell(9, 1, 'Categoría').font = Font(bold=True, color=blanco)
    wg.cell(9, 2, 'Total Ventas').font = Font(bold=True, color=blanco)
    for c in (1, 2):
        wg.cell(9, c).fill = PatternFill('solid', fgColor=azul)
        wg.cell(9, c).alignment = CENTER_NW
        wg.cell(9, c).border = BORDE
    for i, cat in enumerate(CATS):
        r = 10 + i
        wg.cell(r, 1, cat).border = BORDE
        cell = wg.cell(r, 2,
                       f"=SUMIF(Ventas!$C${first}:$C${last},A{r},Ventas!$H${first}:$H${last})")
        cell.number_format = MONEDA
        cell.border = BORDE
    wg.column_dimensions['A'].width = 16
    wg.column_dimensions['B'].width = 16

    # Grafico de columnas: ventas por mes (paso 5)
    bar = BarChart()
    bar.type = 'col'
    bar.title = 'Ventas Totales por Mes'
    bar.y_axis.title = 'Total ($)'
    bar.x_axis.title = 'Mes'
    data = Reference(wg, min_col=2, min_row=3, max_row=6)
    cats = Reference(wg, min_col=1, min_row=4, max_row=6)
    bar.add_data(data, titles_from_data=True)
    bar.set_categories(cats)
    bar.dataLabels = DataLabelList(); bar.dataLabels.showVal = True
    bar.height = 8; bar.width = 15
    wg.add_chart(bar, 'D3')

    # Grafico circular: ventas por categoria (paso 6)
    pie = PieChart()
    pie.title = 'Ventas por Categoría'
    pdata = Reference(wg, min_col=2, min_row=9, max_row=12)
    pcats = Reference(wg, min_col=1, min_row=10, max_row=12)
    pie.add_data(pdata, titles_from_data=True)
    pie.set_categories(pcats)
    pie.dataLabels = DataLabelList(); pie.dataLabels.showPercent = True
    pie.height = 8; pie.width = 15
    wg.add_chart(pie, 'D18')

    # ================= HOJA ANALISIS (paso 7) =================
    wa = wb.create_sheet('Análisis')
    wa.sheet_view.showGridLines = False
    wa.cell(1, 1, 'ANÁLISIS DE VENTAS: Categoría x Mes').font = Font(bold=True, size=14, color=azul)
    wa.cell(2, 1, '(Total Venta agrupado por categoría y mes)').font = Font(italic=True, color='595959')

    hr = 4
    wa.cell(hr, 1, 'Categoría / Mes').font = Font(bold=True, color=blanco)
    wa.cell(hr, 1).fill = PatternFill('solid', fgColor=azul)
    wa.cell(hr, 1).border = BORDE
    wa.cell(hr, 1).alignment = CENTER_NW
    for j, mes in enumerate(MESES):
        cell = wa.cell(hr, 2 + j, mes)
        cell.font = Font(bold=True, color=blanco)
        cell.fill = PatternFill('solid', fgColor=azul)
        cell.border = BORDE
        cell.alignment = CENTER_NW
    tot_col = 2 + len(MESES)
    tcell = wa.cell(hr, tot_col, 'Total general')
    tcell.font = Font(bold=True, color=blanco)
    tcell.fill = PatternFill('solid', fgColor='C00000')
    tcell.border = BORDE
    tcell.alignment = CENTER_NW

    for i, cat in enumerate(CATS):
        r = hr + 1 + i
        wa.cell(r, 1, cat).font = Font(bold=True)
        wa.cell(r, 1).border = BORDE
        for j, mes in enumerate(MESES):
            col = get_column_letter(2 + j)
            cell = wa.cell(r, 2 + j,
                           f"=SUMIFS(Ventas!$H${first}:$H${last},"
                           f"Ventas!$C${first}:$C${last},$A{r},"
                           f"Ventas!$A${first}:$A${last},{col}${hr})")
            cell.number_format = MONEDA
            cell.border = BORDE
        fcol = get_column_letter(2)
        lcol = get_column_letter(1 + len(MESES))
        tc = wa.cell(r, tot_col, f'=SUM({fcol}{r}:{lcol}{r})')
        tc.number_format = MONEDA
        tc.font = Font(bold=True)
        tc.border = BORDE
    # fila de totales por mes
    r = hr + 1 + len(CATS)
    wa.cell(r, 1, 'Total general').font = Font(bold=True, color=blanco)
    wa.cell(r, 1).fill = PatternFill('solid', fgColor='C00000')
    wa.cell(r, 1).border = BORDE
    for j in range(len(MESES) + 1):
        col = get_column_letter(2 + j)
        cell = wa.cell(r, 2 + j, f'=SUM({col}{hr+1}:{col}{r-1})')
        cell.number_format = MONEDA
        cell.font = Font(bold=True, color=blanco)
        cell.fill = PatternFill('solid', fgColor='C00000')
        cell.border = BORDE
    for c in range(1, tot_col + 1):
        wa.column_dimensions[get_column_letter(c)].width = 16

    nota = ("NOTA: Para el paso 7 con una TABLA DINÁMICA real + SEGMENTADOR "
            "(slicer): en Excel selecciona la tabla de 'Ventas' (A5:H55) y usa "
            "Insertar > Tabla dinámica; arrastra Categoría a Filas, Mes a "
            "Columnas y Total Venta a Valores; luego Insertar > Segmentación "
            "de datos por 'Producto'. La tabla de arriba ya entrega ese mismo "
            "análisis calculado con SUMIFS.")
    wa.cell(r + 3, 1, nota).alignment = Alignment(wrap_text=True, vertical='top')
    wa.merge_cells(start_row=r + 3, start_column=1, end_row=r + 6, end_column=tot_col)

    # ================= HOJA TABLA DINAMICA (paso 7) =================
    wp = wb.create_sheet('TablaDinamica')
    wp.sheet_view.showGridLines = False
    wp.cell(1, 1, 'TABLA DINÁMICA – Ventas por Categoría y Mes').font = Font(
        bold=True, size=14, color=azul)
    wp.cell(2, 1, 'Segmentador (slicer) por Producto a la derecha →').font = Font(
        italic=True, color='595959')
    for c in range(1, 6):
        wp.column_dimensions[get_column_letter(c)].width = 15

    # orden de hojas
    wb.move_sheet('Ventas', -wb.sheetnames.index('Ventas'))

    wb.save(OUT)
    print('Guardado', OUT)


if __name__ == '__main__':
    construir()
