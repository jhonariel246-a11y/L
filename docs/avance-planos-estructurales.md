# Avance — Archivo CAD de Planos Estructurales

**Proyecto:** Diseño estructural — planos de cimentación, losas y cubierta
**Fecha de avance:** 2026-07-13
**Estado:** En progreso

---

## 1. Enlace del archivo original

Archivo CAD fuente (DWG/DXF) del que se desarrollan los planos estructurales:

> **Enlace:** _`<<REEMPLAZAR CON EL ENLACE DEL ARCHIVO ORIGINAL>>`_
>
> _(pegar aquí la URL del DWG/DXF alojado en Drive / OneDrive / plataforma del curso)_

| Campo | Detalle |
|-------|---------|
| Nombre del archivo | `planos_estructurales.dwg` |
| Formato | DWG / DXF (AutoCAD) |
| Versión de avance | v0.1 — propuesta de cimentación |
| Enlace | *(por completar)* |

> Nota: el repositorio versiona la **documentación del avance** y el **dibujo
> vectorial de referencia** (`planos/planta-cimentacion.svg`). El DWG binario
> se enlaza externamente porque no es apto para control de versiones en texto.

---

## 2. Verificación de medidas

Verificación de las dimensiones de partida sobre plantas de **cimentación**,
**losas** y **cubierta**. La malla estructural adoptada es común a los tres
niveles para garantizar la coincidencia de ejes y la transmisión vertical de
cargas.

### 2.1 Malla de ejes (común a todos los niveles)

| Dirección | Ejes | Vanos (m) | Longitud total (m) |
|-----------|------|-----------|--------------------|
| X (horizontal) | 1 – 2 – 3 | 4.00 + 4.00 | 8.00 |
| Y (vertical)   | A – B – C | 3.50 + 3.50 | 7.00 |

**Área en planta:** 8.00 m × 7.00 m = **56.00 m²**

### 2.2 Planta de Cimentación

| Elemento | Cantidad | Dimensión | Verificación |
|----------|----------|-----------|--------------|
| Ejes | 3 (X) × 3 (Y) | Según malla | ✔ Coinciden con losas y cubierta |
| Columnas | 9 | 0.30 × 0.30 m | ✔ Una por intersección de ejes |
| Plintos | 9 | **1.00 × 1.00 m** | ✔ Centrados en columna |
| Riostras | red perimetral e interior | **e = 0.20 m** | ✔ Conectan todos los plintos |

### 2.3 Planta de Losa (entrepiso)

| Elemento | Dimensión | Verificación |
|----------|-----------|--------------|
| Paños de losa | 4.00 × 3.50 m (×4) | ✔ Definidos por la malla de ejes |
| Perímetro de losa | 8.00 × 7.00 m | ✔ Coincide con cimentación |
| Ejes de vigas | Sobre ejes 1–3 / A–C | ✔ Alineados con columnas |

### 2.4 Planta de Cubierta

| Elemento | Dimensión | Verificación |
|----------|-----------|--------------|
| Perímetro de cubierta | 8.00 × 7.00 m | ✔ Coincide con losas y cimentación |
| Apoyos | Sobre ejes 1–3 / A–C | ✔ Alineados con columnas |

**Resultado de la verificación:** las tres plantas comparten la misma malla de
ejes (8.00 × 7.00 m) y los apoyos verticales son coincidentes en todos los
niveles. ✔ Medidas consistentes.

> ⚠️ Pendiente: confirmar contra el DWG original los valores reales de vanos y
> secciones (aquí se documenta la malla adoptada en la propuesta de avance).

---

## 3. Delineación de la propuesta — Planta de Cimentación

Se graficó la propuesta de Planta de Cimentación incluyendo los cuatro
elementos solicitados. El dibujo está a escala real (1 m = 60 px), por lo que
puede medirse directamente sobre el archivo vectorial.

**Archivo del dibujo:** [`planos/planta-cimentacion.svg`](../planos/planta-cimentacion.svg)

Elementos graficados:

- **Ejes** — malla estructural 1·2·3 (X) y A·B·C (Y), con burbujas de eje.
- **Columnas** — 9 columnas de 0.30 × 0.30 m en cada intersección de ejes.
- **Plintos** — 9 plintos de **1.00 × 1.00 m**, centrados bajo cada columna.
- **Riostras** — vigas de amarre de **e = 0.20 m** formando la red que conecta
  todos los plintos en ambas direcciones.

Incluye además: cotas de vanos, simbología y escala gráfica.

> El dibujo se genera de forma reproducible con
> [`scripts/generar_planta_cimentacion.py`](../scripts/generar_planta_cimentacion.py).
> Para ajustar la geometría (vanos, número de ejes, secciones) se editan las
> variables `EJES_X`, `EJES_Y`, `COL`, `PLINTO` y `RIOSTRA` y se vuelve a
> ejecutar el script.

---

## 4. Archivo CAD — Planta de Cimentación Circular (casa redonda)

Se generó el archivo CAD de la propuesta con planta **circular**, según la idea
del proyecto, manteniendo las especificaciones del arquitecto.

**Archivo CAD:** [`planos/planta-cimentacion-circular.dxf`](../planos/planta-cimentacion-circular.dxf)
(formato DXF; se abre en AutoCAD y se guarda como `.dwg`).
**Vista previa:** [`planos/planta-cimentacion-circular.svg`](../planos/planta-cimentacion-circular.svg)

| Elemento | Descripción | Especificación |
|----------|-------------|----------------|
| Geometría | Planta circular | Ø = 9.00 m (radio de ejes R = 4.50 m) |
| Ejes | 8 ejes radiales (E1–E8) + eje central (C) | Espaciados 45° |
| Columnas | 8 perimetrales + 1 central = 9 | 0.30 × 0.30 m |
| Plintos | Uno bajo cada columna | **1.00 × 1.00 m** |
| Riostras radiales | Del plinto central a cada plinto perimetral | **e = 0.20 m** |
| Riostras perimetrales | Anillo octogonal entre plintos perimetrales | **e = 0.20 m** |
| Muro perimetral | Círculo de referencia (proyección) | R = 4.95 m |

**Capas del DXF:** `EJES`, `COLUMNAS`, `PLINTOS`, `RIOSTRAS`, `MUROS`, `COTAS`,
`TEXTOS`. Unidades: metros. Validado con `ezdxf` (0 errores).

> Parámetros ajustables en [`scripts/generar_planta_circular.py`](../scripts/generar_planta_circular.py):
> `R` (radio), `N` (número de columnas), `COL`, `PLINTO`, `RIOSTRA`, `R_MURO`.

---

## Próximos pasos

- [ ] Insertar el enlace real del archivo DWG original (sección 1).
- [ ] Contrastar vanos y secciones de la propuesta con el DWG original.
- [ ] Delinear Planta de Losa (entrepiso) con nervios y sentido de armado.
- [ ] Delinear Planta de Cubierta.
- [ ] Elaborar cuadro de columnas y detalle de plinto tipo.
