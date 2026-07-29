"""Build Ordenamiento_de_Datos.xlsm: data sheet + embedded VBA sorting macro."""
import os
import re
import shutil
import zipfile
import datetime

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_XLSX = os.path.join(ROOT, 'workbook_tmp.xlsx')
OUT_XLSM = os.path.join(ROOT, 'Ordenamiento_de_Datos.xlsm')
VBA_BIN = os.path.join(ROOT, 'vbaProject.bin')

# --- Sample data (intentionally unsorted) -------------------------
HEADERS = ['ID', 'Nombre', 'Departamento', 'Edad', 'Salario', 'Fecha Ingreso']
ROWS = [
    [5, 'Carla Mendoza',  'Ventas',      34, 1850.50, datetime.date(2019, 3, 12)],
    [2, 'Luis Paredes',   'Sistemas',    28, 2200.00, datetime.date(2021, 7, 1)],
    [8, 'Ana Torres',     'Recursos H.', 41, 2650.75, datetime.date(2015, 11, 23)],
    [1, 'Pedro Villamar', 'Contabilidad',52, 3100.00, datetime.date(2010, 1, 5)],
    [7, 'Maria Cedeno',   'Ventas',      25, 1600.00, datetime.date(2022, 9, 15)],
    [3, 'Jorge Alvarado', 'Sistemas',    38, 2900.25, datetime.date(2017, 5, 30)],
    [10,'Sofia Reyes',    'Marketing',   30, 2050.00, datetime.date(2020, 2, 18)],
    [4, 'Diego Andrade',  'Contabilidad',45, 2750.00, datetime.date(2013, 8, 9)],
    [9, 'Elena Vaca',     'Marketing',   27, 1750.80, datetime.date(2021, 12, 2)],
    [6, 'Ricardo Nunez',  'Recursos H.', 36, 2400.00, datetime.date(2018, 6, 21)],
]


def build_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = 'Datos'
    ws.sheet_properties.codeName = 'Hoja1'

    header_fill = PatternFill('solid', fgColor='2F5496')
    header_font = Font(bold=True, color='FFFFFF', size=11)
    thin = Side(style='thin', color='BFBFBF')
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    center = Alignment(horizontal='center', vertical='center')

    for c, h in enumerate(HEADERS, start=1):
        cell = ws.cell(row=1, column=c, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center
        cell.border = border

    for r, row in enumerate(ROWS, start=2):
        for c, val in enumerate(row, start=1):
            cell = ws.cell(row=r, column=c, value=val)
            cell.border = border
            if c in (1, 4):
                cell.alignment = center
            if c == 5:
                cell.number_format = '"$"#,##0.00'
            if c == 6:
                cell.number_format = 'dd/mm/yyyy'

    widths = [6, 18, 15, 8, 12, 14]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = 'A2'

    # Instructions sheet
    wsi = wb.create_sheet('Instrucciones')
    wsi.sheet_properties.codeName = 'Hoja2'
    instrucciones = [
        ('Ordenamiento de datos - Instrucciones', True),
        ('', False),
        ('Este libro incluye un macro VBA para ordenar la tabla de la hoja "Datos".', False),
        ('', False),
        ('Como ejecutar los macros:', True),
        ('1. Habilite el contenido/macros si Excel lo solicita al abrir el archivo.', False),
        ('2. Presione ALT + F8  para ver la lista de macros disponibles.', False),
        ('3. Seleccione uno y presione "Ejecutar".', False),
        ('', False),
        ('Macros disponibles:', True),
        ('  - OrdenarAscendente   : pregunta la columna y ordena de menor a mayor.', False),
        ('  - OrdenarDescendente  : pregunta la columna y ordena de mayor a menor.', False),
        ('  - OrdenarPorID        : restaura el orden original por la columna ID.', False),
        ('', False),
        ('Tambien puede abrir el Editor de VBA con ALT + F11 para revisar el codigo', False),
        ('en el modulo "modOrdenamiento".', False),
    ]
    for r, (text, bold) in enumerate(instrucciones, start=1):
        cell = wsi.cell(row=r, column=1, value=text)
        cell.font = Font(bold=bold, size=13 if (bold and r == 1) else 11)
    wsi.column_dimensions['A'].width = 80

    wb.save(OUT_XLSX)


def convert_to_xlsm():
    with open(VBA_BIN, 'rb') as f:
        vba = f.read()

    zin = zipfile.ZipFile(OUT_XLSX, 'r')
    names = zin.namelist()
    data = {n: zin.read(n) for n in names}
    zin.close()

    # 1) [Content_Types].xml : workbook -> macroEnabled + vbaProject part
    ct = data['[Content_Types].xml'].decode('utf-8')
    ct = ct.replace(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
        'application/vnd.ms-excel.sheet.macroEnabled.main+xml')
    if 'vbaProject' not in ct:
        ct = ct.replace('</Types>',
                        '<Override PartName="/xl/vbaProject.bin" '
                        'ContentType="application/vnd.ms-office.vbaProject"/></Types>')
    data['[Content_Types].xml'] = ct.encode('utf-8')

    # 2) workbook rels : add vbaProject relationship
    rels_path = 'xl/_rels/workbook.xml.rels'
    rels = data[rels_path].decode('utf-8')
    ids = re.findall(r'Id="rId(\d+)"', rels)
    next_id = (max(int(i) for i in ids) + 1) if ids else 1
    rel = ('<Relationship Id="rId%d" '
           'Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" '
           'Target="vbaProject.bin"/>' % next_id)
    rels = rels.replace('</Relationships>', rel + '</Relationships>')
    data[rels_path] = rels.encode('utf-8')

    # 3) workbook.xml : ensure codeName="ThisWorkbook" on <workbookPr>
    wbx = data['xl/workbook.xml'].decode('utf-8')
    if '<workbookPr' in wbx:
        if 'codeName' not in wbx.split('<workbookPr', 1)[1].split('>', 1)[0]:
            wbx = wbx.replace('<workbookPr', '<workbookPr codeName="ThisWorkbook"', 1)
    else:
        wbx = re.sub(r'(<workbook[^>]*>)', r'\1<workbookPr codeName="ThisWorkbook"/>', wbx, count=1)
    data['xl/workbook.xml'] = wbx.encode('utf-8')

    # 4) write new .xlsm zip, add vbaProject.bin
    if os.path.exists(OUT_XLSM):
        os.remove(OUT_XLSM)
    zout = zipfile.ZipFile(OUT_XLSM, 'w', zipfile.ZIP_DEFLATED)
    for n in names:
        zout.writestr(n, data[n])
    zout.writestr('xl/vbaProject.bin', vba)
    zout.close()


if __name__ == '__main__':
    build_xlsx()
    convert_to_xlsm()
    print('Wrote', OUT_XLSM, os.path.getsize(OUT_XLSM), 'bytes')
