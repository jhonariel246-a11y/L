# Ordenamiento de Datos en Excel (con macro VBA)

Libro de Excel habilitado para macros que contiene una tabla de datos de
ejemplo y un macro **VBA para el ordenamiento de datos**.

## Contenido del repositorio

| Archivo | Descripción |
|---|---|
| `Ordenamiento_de_Datos.xlsm` | Libro de Excel listo para usar, con los datos y el macro ya integrado. |
| `modOrdenamiento.bas` | Código fuente del macro VBA (por si desea revisarlo o importarlo). |
| `tools/` | Scripts de Python usados para generar el `vbaProject.bin` e integrar el macro en el `.xlsm`. |

## El libro `Ordenamiento_de_Datos.xlsm`

- **Hoja "Datos"**: tabla de ejemplo con 10 registros y las columnas
  `ID`, `Nombre`, `Departamento`, `Edad`, `Salario` y `Fecha Ingreso`
  (los datos vienen desordenados a propósito para probar el macro).
- **Hoja "Instrucciones"**: guía rápida de uso dentro del propio archivo.
- **Módulo VBA `modOrdenamiento`**: el macro de ordenamiento.

## Cómo usar el macro

1. Abra `Ordenamiento_de_Datos.xlsm` en Excel.
2. Si Excel lo pide, pulse **Habilitar contenido / macros**.
3. Pulse **ALT + F8** para ver la lista de macros y ejecute el que necesite.
   (También puede abrir el editor con **ALT + F11** para ver el código.)

### Macros disponibles

- **`OrdenarAscendente`** — pregunta el número de columna y ordena de menor a mayor.
- **`OrdenarDescendente`** — pregunta el número de columna y ordena de mayor a menor.
- **`OrdenarPorID`** — restaura el orden original ordenando por la columna `ID`.
- **`OrdenarPorColumna(indice, ascendente)`** — rutina base reutilizable.
- **`OrdenarArregloBurbuja(arr, ascendente)`** — ejemplo didáctico del
  algoritmo de la burbuja aplicado a un arreglo.

El macro detecta automáticamente el rango de datos (encabezados en la fila 1)
y usa el motor de ordenamiento nativo de Excel, respetando la fila de títulos.

## Regenerar el archivo (opcional)

El `.xlsm` se puede reconstruir con las herramientas de la carpeta `tools/`:

```bash
pip install openpyxl
cd tools
python build_bin.py      # genera vbaProject.bin desde modOrdenamiento.bas
python build_xlsm.py     # arma Ordenamiento_de_Datos.xlsm
```
