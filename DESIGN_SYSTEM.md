# AtletifySystem — Design System

## Giro del Sistema

**AtletifySystem** es una plataforma integral de gestión para Boxes de entrenamiento funcional y fitness. Su estética busca ser vibrante, de alto contraste, moderna y orientada a la acción. 

---

## Paleta de Colores

La paleta de colores de AtletifySystem está dividida estrictamente por casos de uso para mantener la consistencia visual en toda la aplicación.

### 1. Fondos, Contenedores y Cards (60%)
Estos colores deben utilizarse en los fondos principales de la aplicación, contenedores modulares, tarjetas (cards), paneles y modales. 
Aportan la estructura base sobre la cual descansan los demás componentes.

| Color | Hexadecimal | Uso sugerido |
| :--- | :--- | :--- |
| ![#1912EA](https://via.placeholder.com/15/1912EA/000000?text=+) | `#1912EA` | Fondos intensos, contenedores heroicos |
| ![#F02C10](https://via.placeholder.com/15/F02C10/000000?text=+) | `#F02C10` | Tarjetas destacadas, bloques de advertencia/importancia |
| ![#DADFE5](https://via.placeholder.com/15/DADFE5/000000?text=+) | `#DADFE5` | Fondos de aplicación claros, tarjetas neutrales |
| ![#081A19](https://via.placeholder.com/15/081A19/000000?text=+) | `#081A19` | Fondos dark-mode, sidebars, modales profundos |
| ![#C135EB](https://via.placeholder.com/15/C135EB/000000?text=+) | `#C135EB` | Paneles creativos, tarjetas de membrecías premium |

### 2. Contrastes (30%)
Estos colores están destinados a generar jerarquía visual. Se usan para separar contenido, crear líneas divisorias, bordes, sombras, y para enfatizar secciones o dar peso a elementos inactivos o de estado.

| Color | Hexadecimal | Uso sugerido |
| :--- | :--- | :--- |
| ![#000000](https://via.placeholder.com/15/000000/000000?text=+) | `#000000` | Contrastes absolutos, sombras, superposiciones (overlays) |
| ![#2A0048](https://via.placeholder.com/15/2A0048/000000?text=+) | `#2A0048` | Bordes profundos, fondos para insignias |
| ![#560072](https://via.placeholder.com/15/560072/000000?text=+) | `#560072` | Divisores, secciones contrastantes secundarias |
| ![#800080](https://via.placeholder.com/15/800080/000000?text=+) | `#800080` | Elementos de estado neutral o enfocados |
| ![#A90072](https://via.placeholder.com/15/A90072/000000?text=+) | `#A90072` | Detalles sutiles, acentos en bordes |
| ![#D50048](https://via.placeholder.com/15/D50048/000000?text=+) | `#D50048` | Alertas de sistema secundarias, iconos |
| ![#FF0000](https://via.placeholder.com/15/FF0000/000000?text=+) | `#FF0000` | Errores críticos, eliminaciones, estados de peligro |

### 3. Botones y Texto Primario (10%)
La interacción del usuario depende de estos colores. Son de máxima jerarquía visual para las llamadas a la acción (CTA), botones, links y textos de alto impacto.

| Color | Hexadecimal | Uso sugerido |
| :--- | :--- | :--- |
| ![#7288B9](https://via.placeholder.com/15/7288B9/000000?text=+) | `#7288B9` | Botones secundarios, texto descriptivo o informativo |
| ![#4D59F8](https://via.placeholder.com/15/4D59F8/000000?text=+) | `#4D59F8` | Botones primarios (Guardar, Enviar, Aceptar) |
| ![#C71627](https://via.placeholder.com/15/C71627/000000?text=+) | `#C71627` | Botones de acción urgente, texto de alerta vital |
| ![#7C1ED9](https://via.placeholder.com/15/7C1ED9/000000?text=+) | `#7C1ED9` | Botones de features premium, enlaces destacados |
| ![#9153C6](https://via.placeholder.com/15/9153C6/000000?text=+) | `#9153C6` | Texto interactivo, hovers en botones púrpuras |

---

## Responsive Design — Estandarización con Bootstrap 5

El sistema **AtletifySystem** utiliza **Bootstrap 5** como motor principal para la disposición fluida y responsiva de los elementos. Todo diseño nuevo debe apegarse estrictamente al sistema de Grid y utilidades de Bootstrap.

### Breakpoints Oficiales (Bootstrap 5)
- **xs (Extra small)**: `< 576px` (Móviles en vertical)
- **sm (Small)**: `≥ 576px` (Móviles en horizontal / Tablets pequeñas)
- **md (Medium)**: `≥ 768px` (Tablets / iPads)
- **lg (Large)**: `≥ 992px` (Laptops / Pantallas pequeñas)
- **xl (Extra large)**: `≥ 1200px` (Monitores de escritorio)
- **xxl (Extra extra large)**: `≥ 1400px` (Pantallas grandes)

### Reglas de Diseño Responsivo
1. **Mobile-First Approach**: Siempre se diseña pensando primero en la pantalla móvil (`col-12`) y se escala hacia arriba con los breakpoints (`col-md-6`, `col-lg-4`).
2. **Uso de Grid (`row` y `col`)**: Nunca usar valores de `width` forzados en CSS para layouts. Todo debe ir envuelto en un `.container` o `.container-fluid`, seguido de `.row` y sus respectivas `.col-`.
3. **Visibilidad de Elementos (`d-none`, `d-md-block`)**:
   - Ocultar tablas densas en móviles usando `d-none d-md-block` o implementar `table-responsive`.
   - Mostrar versiones en tarjetas apiladas para móviles (`d-md-none`).
4. **Espaciados Dinámicos**: Usar clases de utilidad como `gap-2 gap-md-4`, `p-3 p-lg-5`, `mb-3 mb-md-0` para ajustar los márgenes y paddings según el tamaño de la pantalla sin necesidad de media queries manuales en CSS.
5. **Flexbox Utilities**: Priorizar `d-flex`, `align-items-center`, `justify-content-between`, `flex-column flex-md-row` para adaptar barras de navegación, menús laterales y headers responsivos de manera nativa.

---

## Tipografía (Fuentes)

### Google Fonts — Línea de importación
```html
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&family=Barlow+Condensed:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Asignación por elemento
| Elemento               | Fuente              | Peso      | Notas                          |
|------------------------|---------------------|-----------|--------------------------------|
| Headings H1-H2         | `Oswald`            | 600–700   | uppercase, impacto máximo      |
| Headings H3-H4         | `Barlow Condensed`  | 500–600   | Subtítulos, secciones          |
| Cuerpo / párrafos      | `Inter`             | 400       | Legibilidad en UI              |
| Botones y labels       | `Inter`             | 500–600   | Claridad en controles          |
| Números / stats        | `Rajdhani`          | 600–700   | Counters, leaderboards, timers |
| Banners heroicos       | `Bebas Neue`        | 400       | Ya es bold por naturaleza      |

---

## CSS Variables — Bloque Base 

A partir de los colores proporcionados, se sugiere declararlos en la raíz global para un fácil uso con Tailwind o CSS puro:

```css
:root {
  /* FONDOS, CONTENEDORES Y CARDS */
  --bg-deep-blue: #1912EA;
  --bg-alert-red: #F02C10;
  --bg-light-grey: #DADFE5;
  --bg-dark-teal: #081A19;
  --bg-neon-purple: #C135EB;

  /* CONTRASTES */
  --contrast-black: #000000;
  --contrast-deep-purple: #2A0048;
  --contrast-purple: #560072;
  --contrast-magenta: #800080;
  --contrast-pinkish: #A90072;
  --contrast-reddish: #D50048;
  --contrast-red: #FF0000;

  /* BOTONES Y TEXTO */
  --btn-steel-blue: #7288B9;
  --btn-bright-blue: #4D59F8;
  --btn-crimson: #C71627;
  --btn-electric-purple: #7C1ED9;
  --btn-soft-purple: #9153C6;
}
```
