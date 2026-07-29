import os
import vbaproject

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

THISWORKBOOK_SRC = (
    'Attribute VB_Name = "ThisWorkbook"\n'
    'Attribute VB_Base = "0{00020819-0000-0000-C000-000000000046}"\n'
    'Attribute VB_GlobalNameSpace = False\n'
    'Attribute VB_Creatable = False\n'
    'Attribute VB_PredeclaredId = True\n'
    'Attribute VB_Exposed = True\n'
    'Attribute VB_TemplateDerived = False\n'
    'Attribute VB_Customizable = True\n'
)

SHEET_SRC = (
    'Attribute VB_Name = "Hoja1"\n'
    'Attribute VB_Base = "0{00020820-0000-0000-C000-000000000046}"\n'
    'Attribute VB_GlobalNameSpace = False\n'
    'Attribute VB_Creatable = False\n'
    'Attribute VB_PredeclaredId = True\n'
    'Attribute VB_Exposed = True\n'
    'Attribute VB_TemplateDerived = False\n'
    'Attribute VB_Customizable = True\n'
)


def load_module_source(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def main():
    mod_src = load_module_source(os.path.join(ROOT, 'modOrdenamiento.bas'))
    modules = [
        {'name': 'ThisWorkbook', 'document': True, 'source': THISWORKBOOK_SRC},
        {'name': 'Hoja1', 'document': True, 'source': SHEET_SRC},
        {'name': 'modOrdenamiento', 'document': False, 'source': mod_src},
    ]
    references = [
        ('stdole', '*\\G{00020430-0000-0000-C000-000000000046}#2.0#0#C:\\Windows\\System32\\stdole2.tlb#OLE Automation'),
        ('Excel', '*\\G{00020813-0000-0000-C000-000000000046}#1.9#0#C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE#Microsoft Excel 16.0 Object Library'),
        ('Office', '*\\G{2DF8D04C-5BFA-101B-BDE5-00AA0044DE52}#2.0#0#C:\\Program Files\\Common Files\\Microsoft Shared\\OFFICE16\\MSO.DLL#Microsoft Office 16.0 Object Library'),
    ]
    data = vbaproject.build('VBAProject', modules, references)
    with open(os.path.join(ROOT, 'vbaProject.bin'), 'wb') as f:
        f.write(data)
    print('vbaProject.bin written:', len(data), 'bytes')


if __name__ == '__main__':
    main()
