# Avance — Archivo CAD de Planos Estructurales

**Proyecto:** Diseño estructural — planos de cimentación, losas y cubierta
**Fecha de avance:** 2026-07-13
**Estado:** En progreso

---

## 1. Enlace del archivo original

Archivo CAD original (editable, fuente del proyecto) alojado en Google Drive.
Formato **DWG (AutoCAD 2004 / AC1018)**, archivo `proyecto-completo.dwg`.

> **Enlace:** https://drive.google.com/file/d/1zfL9muo_BWWw2PnaNCiBtKRWGQREuz5W/view?usp=drivesdk

| Campo | Detalle |
|-------|---------|
| Archivo | `proyecto-completo.dwg` |
| Formato | DWG (AutoCAD 2004 / AC1018) |
| Ubicación | Google Drive |
| Enlace | [Abrir archivo CAD](https://drive.google.com/file/d/1zfL9muo_BWWw2PnaNCiBtKRWGQREuz5W/view?usp=drivesdk) |

> ⚠️ **Permisos:** para que el enlace sea accesible, el archivo en Drive debe
> compartirse como **"Cualquier persona con el enlace"**. Verificar antes de la
> entrega (al momento de este avance el enlace responde 403 / restringido).

---

## 2. Verificación de medidas

Verificación de las dimensiones de partida sobre plantas de **cimentación**,
**losas** y **cubierta**. La malla estructural adoptada es común a los tres
niveles para garantizar la coincidencia de ejes y la transmisión vertical de
cargas.

### 2.1 Malla de ejes (común a todos los niveles)

| Dirección | Ejes | Vanos (m) | Longitud total (m) |
|-----------|------|-----------|--------------------|
| X (horizontal) | 1 – 2 – 3 – 4 | 4.00 + 4.00 + 4.00 | 12.00 |
| Y (vertical)   | A – B – C – D | 3.50 + 3.50 + 4.00 | 11.00 |

**Área en planta:** 12.00 m × 11.00 m = **132.00 m²** por nivel (3 niveles).

### 2.2 Planta de Cimentación

| Elemento | Cantidad | Dimensión | Verificación |
|----------|----------|-----------|--------------|
| Ejes | 4 (X) × 4 (Y) | Según malla | ✔ Coinciden en los 3 niveles |
| Columnas | 16 | 0.30 × 0.30 m | ✔ Una por intersección de ejes |
| Plintos | 16 | **1.00 × 1.00 m** | ✔ Centrados en columna |
| Riostras | red ortogonal | **e = 0.20 m** | ✔ Conectan todos los plintos |

### 2.3 Plantas de Losa (entrepisos)

| Elemento | Dimensión | Verificación |
|----------|-----------|--------------|
| Perímetro de losa | 12.00 × 11.00 m | ✔ Coincide con cimentación |
| Ejes de vigas | Sobre ejes 1–4 / A–D | ✔ Alineados con columnas |

### 2.4 Planta de Cubierta

| Elemento | Dimensión | Verificación |
|----------|-----------|--------------|
| Perímetro de cubierta | 12.00 × 11.00 m | ✔ Coincide con losas y cimentación |
| Apoyos | Sobre ejes 1–4 / A–D | ✔ Alineados con columnas |

**Resultado de la verificación:** los tres niveles comparten la misma malla de
ejes (12.00 × 11.00 m) y los apoyos verticales son coincidentes. ✔ Consistente.

> ⚠️ Pendiente: confirmar contra el DWG original los valores reales de vanos y
> secciones (aquí se documenta la malla adoptada en la propuesta de avance).

---

## 3. Proyecto arquitectónico — Casa moderna de 3 niveles

A partir de una **imagen de referencia** (fachada, casa moderna de 3 pisos con
garaje, balcones y ventanal en arco) se desarrolló la **planta arquitectónica**
de cada nivel. La distribución es una **propuesta** coherente con la fachada
(las medidas internas no existen en la imagen, se adoptaron realistas).

| Lámina | Archivo CAD | Ambientes principales |
|--------|-------------|-----------------------|
| 01 · Planta Baja | [`planos/arq-planta-baja.dxf`](../planos/arq-planta-baja.dxf) | Garaje, hall, sala, comedor, cocina, baño, escalera |
| 02 · Primer Piso | [`planos/arq-primer-piso.dxf`](../planos/arq-primer-piso.dxf) | Sala, comedor, 2 dormitorios, baño, clóset, balcón |
| 03 · Segundo Piso | [`planos/arq-segundo-piso.dxf`](../planos/arq-segundo-piso.dxf) | Dormitorio principal + baño/vestidor, dorm. 4, estudio, terraza, balcón |

Cada lámina incluye: ejes, columnas, muros, puertas (con barrido), ventanas,
escalera, mobiliario, cotas, marco y membrete.

## 4. Delineación estructural — Planta de Cimentación

**Archivo CAD:** [`planos/planta-cimentacion.dxf`](../planos/planta-cimentacion.dxf)
(Lámina 04) · **Vista previa:** [`planos/planta-cimentacion.svg`](../planos/planta-cimentacion.svg)

| Elemento | Descripción | Especificación |
|----------|-------------|----------------|
| Geometría | Planta rectangular | 12.00 × 11.00 m |
| Ejes | 1–2–3–4 (X) y A–B–C–D (Y) | Vanos 4.00 / 3.50–4.00 m |
| Columnas | 16 (una por intersección) | 0.30 × 0.30 m |
| Plintos | Uno bajo cada columna | **1.00 × 1.00 m** |
| Riostras | Malla ortogonal entre plintos | **e = 0.20 m** |

**Membrete (todas las láminas):** Dibujante *John Ariel Martínez* · Asignatura
*Planos Digitales* · *Segundo Parcial* · Carrera *Ingeniería Civil*.

**Capas del DXF:** `EJES`, `MUROS`, `PUERTAS`, `VENTANAS`, `ESCALERA`,
`MOBILIARIO`, `COTAS`, `TEXTOS`, `COLUMNAS`, `PLINTOS`, `RIOSTRAS`, `MARCO`,
`MEMBRETE`. Unidades: metros. Validado con `ezdxf` (0 errores).

> Todas las láminas se regeneran con
> [`scripts/generar_proyecto.py`](../scripts/generar_proyecto.py)
> (geometría y toolkit CAD en [`scripts/lib_cad.py`](../scripts/lib_cad.py)).

---

## Próximos pasos

- [ ] Insertar el enlace real del archivo DWG original (sección 1).
- [ ] Contrastar vanos y secciones de la propuesta con el DWG original.
- [ ] Delinear Planta de Losa (entrepiso) con nervios y sentido de armado.
- [ ] Delinear Planta de Cubierta.
- [ ] Elaborar cuadro de columnas y detalle de plinto tipo.
