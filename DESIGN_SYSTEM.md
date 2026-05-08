# AtletifySystem — Design System v2

## Giro del Sistema

**AtletifySystem** es una plataforma integral de gestión para Boxes de entrenamiento funcional y fitness.
La nueva estética es **cálida, legible y moderna**: fondos crema suave, tipografía navy profunda, acentos en rosa y teal — transmite profesionalismo sin perder energía.

---

## Paleta de Colores Principal

Basada en 7 colores base oficiales, ampliada con derivados armónicos para cubrir todos los casos de uso del sistema.

### 1. Colores Base Oficiales

| Token               | Hexadecimal | Nombre Visual      | Rol                                         |
| :------------------ | :---------- | :----------------- | :------------------------------------------ |
| `--color-bg`        | `#fef6e4`   | Warm Cream         | Fondo principal de la aplicación            |
| `--color-headline`  | `#001858`   | Deep Navy          | Títulos H1–H2, texto de alto peso           |
| `--color-paragraph` | `#172c66`   | Dark Navy          | Párrafos, texto de cuerpo                   |
| `--color-btn`       | `#f582ae`   | Soft Rose          | Botones primarios, CTA                      |
| `--color-btn-text`  | `#001858`   | Deep Navy          | Texto de botones (siempre legible)          |
| `--color-main`      | `#f3d2c1`   | Soft Peach         | Cards, paneles y contenedores principales   |
| `--color-highlight` | `#fef6e4`   | Warm Cream (alias) | Zonas de énfasis, tooltips                  |
| `--color-secondary` | `#8bd3dd`   | Sky Teal           | Badges informativos, acentos fríos          |
| `--color-tertiary`  | `#f582ae`   | Soft Rose (alias)  | Elementos terciarios, pills, etiquetas      |

---

### 2. Derivados Armónicos (añadidos para coherencia del sistema)

Todos calculados manteniéndose dentro de la misma familia de temperatura (cálidos y fríos pasteles + navy profundo).

#### Fondos y Superficies
| Token                  | Hexadecimal | Uso                                             |
| :--------------------- | :---------- | :---------------------------------------------- |
| `--bg-base`            | `#fef6e4`   | Fondo global de página                          |
| `--bg-elevated`        | `#fdf0d5`   | Fondos elevados (headers sticky, navbar)        |
| `--bg-card`            | `#f3d2c1`   | Cards y contenedores primarios                  |
| `--bg-card-hover`      | `#edcab7`   | Estado hover de cards                           |
| `--bg-input`           | `#fef9f0`   | Fondo de campos de formulario                   |
| `--bg-modal`           | `#fdf2e0`   | Fondo de modales y overlays                     |
| `--bg-sidebar`         | `#001858`   | Sidebar / navs laterales oscuros               |
| `--bg-overlay`         | `rgba(0,24,88,0.55)` | Overlay de modales / blur screens      |

#### Texto
| Token            | Hexadecimal          | Uso                                          |
| :--------------- | :------------------- | :------------------------------------------- |
| `--text-primary` | `#001858`            | Títulos y texto de máxima importancia        |
| `--text-body`    | `#172c66`            | Texto de párrafo y contenido general         |
| `--text-muted`   | `#5a6e9a`            | Texto secundario, placeholders, hints        |
| `--text-disabled`| `#aab4cc`            | Texto deshabilitado                          |
| `--text-on-dark` | `#fef6e4`            | Texto sobre fondos navy oscuros              |
| `--text-on-btn`  | `#001858`            | Texto dentro de botones rosa/teal            |

#### Botones
| Token                 | Hexadecimal | Uso                                            |
| :-------------------- | :---------- | :--------------------------------------------- |
| `--btn-primary`       | `#f582ae`   | Botón principal (Guardar, Enviar, Confirmar)   |
| `--btn-primary-hover` | `#f065a0`   | Hover del botón primario                       |
| `--btn-primary-glow`  | `rgba(245,130,174,0.32)` | Sombra y glow del primario          |
| `--btn-secondary`     | `#8bd3dd`   | Botón secundario (Cancelar, Ver más)           |
| `--btn-secondary-hover`| `#6ac4d0`  | Hover del botón secundario                     |
| `--btn-dark`          | `#001858`   | Botón oscuro (acción navy)                     |
| `--btn-dark-hover`    | `#002a80`   | Hover del botón oscuro                         |
| `--btn-ghost`         | `transparent` | Botón fantasma con borde                    |
| `--btn-ghost-border`  | `rgba(0,24,88,0.3)` | Borde del botón fantasma              |
| `--btn-danger`        | `#e05c7e`   | Botón destructivo (Eliminar)                   |
| `--btn-danger-hover`  | `#c94a6a`   | Hover del botón destructivo                    |

#### Estados del Sistema
| Token           | Hexadecimal | Uso                                               |
| :-------------- | :---------- | :------------------------------------------------ |
| `--success`     | `#52b788`   | Confirmaciones, registros exitosos, publicados    |
| `--success-bg`  | `#d8f3e3`   | Fondo de alertas success                          |
| `--warning`     | `#f4a261`   | Advertencias, campos pendientes, borradores       |
| `--warning-bg`  | `#fde8ce`   | Fondo de alertas warning                          |
| `--danger`      | `#e05c7e`   | Errores, eliminaciones, deudas vencidas           |
| `--danger-bg`   | `#fdd8e0`   | Fondo de alertas danger                           |
| `--info`        | `#8bd3dd`   | Información, notas, tips                          |
| `--info-bg`     | `#ddf4f8`   | Fondo de alertas info                             |

#### Bordes y Divisores
| Token              | Hexadecimal                   | Uso                                      |
| :----------------- | :---------------------------- | :--------------------------------------- |
| `--border`         | `rgba(0,24,88,0.12)`          | Borde suave por defecto                  |
| `--border-medium`  | `rgba(0,24,88,0.22)`          | Borde de cards y paneles                 |
| `--border-strong`  | `rgba(0,24,88,0.38)`          | Borde de inputs focus, elementos activos |
| `--border-hover`   | `rgba(245,130,174,0.55)`      | Borde de elementos en hover (rosa)       |
| `--border-teal`    | `rgba(139,211,221,0.5)`       | Borde de badges teal                     |

#### Acentos y Decorativos
| Token              | Hexadecimal | Uso                                            |
| :----------------- | :---------- | :--------------------------------------------- |
| `--accent-rose`    | `#f582ae`   | Acento rosa principal (alias de btn primary)   |
| `--accent-teal`    | `#8bd3dd`   | Acento teal frío                               |
| `--accent-peach`   | `#f3d2c1`   | Acento melocotón suave                         |
| `--accent-navy`    | `#001858`   | Acento navy fuerte                             |
| `--accent-lavender`| `#c9b8e8`   | Acento lavanda (armónico frío-cálido)          |
| `--accent-gold`    | `#e9c46a`   | Acento dorado (estadísticas, premios, ranking) |
| `--accent-coral`   | `#f4845f`   | Acento coral (alertas importantes, urgencias)  |

#### Glassmorphism / Efectos
| Token           | Valor                           | Uso                                      |
| :-------------- | :------------------------------ | :--------------------------------------- |
| `--glass-bg`    | `rgba(254,246,228,0.82)`        | Cards con efecto glass en fondo claro    |
| `--glass-dark`  | `rgba(0,24,88,0.88)`            | Glass sobre elementos navy               |
| `--blur`        | `blur(20px)`                    | Backdropfilter estándar                  |
| `--shadow-sm`   | `0 2px 8px rgba(0,24,88,0.10)` | Sombra sutil                             |
| `--shadow-md`   | `0 4px 20px rgba(0,24,88,0.15)`| Sombra media (cards)                     |
| `--shadow-lg`   | `0 8px 40px rgba(0,24,88,0.22)`| Sombra grande (modales, dropdowns)       |
| `--shadow-rose` | `0 4px 20px rgba(245,130,174,0.35)` | Sombra rosa (botones CTA hover)    |
| `--shadow-teal` | `0 4px 20px rgba(139,211,221,0.35)` | Sombra teal (info elements hover)  |

---

## Tipografía

### Google Fonts — Línea de importación
```html
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&family=Barlow+Condensed:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

### Asignación por elemento
| Elemento               | Fuente              | Peso    | Color recomendado      |
|------------------------|---------------------|---------|------------------------|
| Headings H1–H2         | `Oswald`            | 600–700 | `--color-headline` (#001858) |
| Headings H3–H4         | `Barlow Condensed`  | 500–600 | `--text-body` (#172c66)      |
| Cuerpo / párrafos      | `Inter`             | 400     | `--text-body` (#172c66)      |
| Botones y labels       | `Inter`             | 500–600 | `--text-on-btn` (#001858)    |
| Números / stats        | `Rajdhani`          | 600–700 | `--color-headline` (#001858) |
| Banners heroicos       | `Bebas Neue`        | 400     | `--color-headline` (#001858) |
| Texto en fondos navy   | `Inter`             | 400–500 | `--text-on-dark` (#fef6e4)   |

---

## Responsive Design — Bootstrap 5

### Breakpoints Oficiales
- **xs**: `< 576px` — Móviles verticales
- **sm**: `≥ 576px` — Móviles horizontales / tablets pequeñas
- **md**: `≥ 768px` — Tablets / iPads
- **lg**: `≥ 992px` — Laptops / pantallas pequeñas
- **xl**: `≥ 1200px` — Escritorios
- **xxl**: `≥ 1400px` — Pantallas grandes

### Reglas de Diseño
1. **Mobile-First**: `col-12` → escalar con `col-md-6`, `col-lg-4`.
2. **Grid estricto**: Todo en `.container > .row > .col-*`. Sin `width` forzados.
3. **Visibilidad**: `d-none d-md-block` para tablas. Tarjetas apiladas en móvil.
4. **Espaciados dinámicos**: `gap-2 gap-md-4`, `p-3 p-lg-5`.

---

## CSS Variables — Bloque Global Completo

```css
:root {
  /* ── FONDOS Y SUPERFICIES ── */
  --bg-base:          #fef6e4;
  --bg-elevated:      #fdf0d5;
  --bg-card:          #f3d2c1;
  --bg-card-hover:    #edcab7;
  --bg-input:         #fef9f0;
  --bg-modal:         #fdf2e0;
  --bg-sidebar:       #001858;
  --bg-overlay:       rgba(0,24,88,0.55);

  /* ── TEXTO ── */
  --text-primary:     #001858;
  --text-body:        #172c66;
  --text-muted:       #5a6e9a;
  --text-disabled:    #aab4cc;
  --text-on-dark:     #fef6e4;
  --text-on-btn:      #001858;

  /* ── COLORES BASE OFICIALES ── */
  --color-bg:         #fef6e4;
  --color-headline:   #001858;
  --color-paragraph:  #172c66;
  --color-btn:        #f582ae;
  --color-btn-text:   #001858;
  --color-main:       #f3d2c1;
  --color-highlight:  #fef6e4;
  --color-secondary:  #8bd3dd;
  --color-tertiary:   #f582ae;

  /* ── PRIMARIO (Rosa) ── */
  --primary:          #f582ae;
  --primary-dark:     #f065a0;
  --primary-glow:     rgba(245,130,174,0.32);

  /* ── SECUNDARIO (Teal) ── */
  --secondary:        #8bd3dd;
  --secondary-dark:   #6ac4d0;
  --secondary-glow:   rgba(139,211,221,0.32);

  /* ── BOTONES ── */
  --btn-primary:      #f582ae;
  --btn-primary-hover:#f065a0;
  --btn-secondary:    #8bd3dd;
  --btn-secondary-hover:#6ac4d0;
  --btn-dark:         #001858;
  --btn-dark-hover:   #002a80;
  --btn-danger:       #e05c7e;
  --btn-danger-hover: #c94a6a;
  --btn-ghost-border: rgba(0,24,88,0.3);

  /* ── ESTADOS ── */
  --success:          #52b788;
  --success-bg:       #d8f3e3;
  --warning:          #f4a261;
  --warning-bg:       #fde8ce;
  --danger:           #e05c7e;
  --danger-bg:        #fdd8e0;
  --info:             #8bd3dd;
  --info-bg:          #ddf4f8;

  /* ── ACENTOS ── */
  --accent:           #f582ae;
  --accent-rose:      #f582ae;
  --accent-teal:      #8bd3dd;
  --accent-peach:     #f3d2c1;
  --accent-navy:      #001858;
  --accent-lavender:  #c9b8e8;
  --accent-gold:      #e9c46a;
  --accent-coral:     #f4845f;
  --accent-cool:      #8bd3dd;

  /* ── BORDES ── */
  --border:           rgba(0,24,88,0.12);
  --border-medium:    rgba(0,24,88,0.22);
  --border-strong:    rgba(0,24,88,0.38);
  --border-hover:     rgba(245,130,174,0.55);
  --border-teal:      rgba(139,211,221,0.5);

  /* ── GLASS Y SOMBRAS ── */
  --glass-bg:         rgba(254,246,228,0.82);
  --glass-dark:       rgba(0,24,88,0.88);
  --shadow-sm:        0 2px 8px rgba(0,24,88,0.10);
  --shadow-md:        0 4px 20px rgba(0,24,88,0.15);
  --shadow-lg:        0 8px 40px rgba(0,24,88,0.22);
  --shadow-rose:      0 4px 20px rgba(245,130,174,0.35);
  --shadow-teal:      0 4px 20px rgba(139,211,221,0.35);

  /* ── FUENTES ── */
  --font-heading:     'Oswald', sans-serif;
  --font-heading-alt: 'Barlow Condensed', sans-serif;
  --font-body:        'Inter', sans-serif;
  --font-stats:       'Rajdhani', sans-serif;
  --font-hero:        'Bebas Neue', sans-serif;

  /* ── TRANSICIÓN GLOBAL ── */
  --transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Guía de Uso por Componente

### Cards y Panels
- **Fondo**: `var(--bg-card)` → `#f3d2c1`
- **Borde**: `var(--border)` → `rgba(0,24,88,0.12)`
- **Hover borde**: `var(--border-hover)` → rosa suave
- **Sombra**: `var(--shadow-md)`

### Inputs y Formularios
- **Fondo**: `var(--bg-input)` → `#fef9f0`
- **Borde normal**: `var(--border-medium)`
- **Borde focus**: `var(--border-strong)` + `box-shadow: 0 0 0 3px var(--primary-glow)`
- **Placeholder**: `var(--text-muted)`
- **Texto**: `var(--text-body)`

### Botones Primarios (CTA)
- **Fondo**: `var(--btn-primary)` → `#f582ae`
- **Texto**: `var(--text-on-btn)` → `#001858`
- **Hover**: `var(--btn-primary-hover)` + `var(--shadow-rose)`

### Botones Secundarios
- **Fondo**: `var(--btn-secondary)` → `#8bd3dd`
- **Texto**: `var(--text-on-btn)` → `#001858`
- **Hover**: `var(--btn-secondary-hover)` + `var(--shadow-teal)`

### Botones Destructivos
- **Fondo**: `var(--btn-danger)` → `#e05c7e`
- **Texto**: `#fff`
- **Hover**: `var(--btn-danger-hover)`

### Modales
- **Fondo**: `var(--bg-modal)` con `backdrop-filter: blur(20px)`
- **Borde**: `var(--border-hover)`
- **Overlay**: `var(--bg-overlay)`
- **Sombra**: `var(--shadow-lg)`

### Badges y Pills
- **Info/Clases**: fondo `var(--info-bg)`, texto `var(--info)` (#8bd3dd)
- **Success/Publicado**: fondo `var(--success-bg)`, texto `var(--success)`
- **Warning/Borrador**: fondo `var(--warning-bg)`, texto `var(--warning)`
- **Danger/Alerta**: fondo `var(--danger-bg)`, texto `var(--danger)`
- **Rose (Acento)**: fondo `rgba(245,130,174,0.15)`, texto `var(--accent-rose)`

### Navbar y Header Sticky
- **Fondo**: `var(--bg-elevated)` → `#fdf0d5`
- **Borde inferior**: `var(--border-medium)`
- **Sombra**: `var(--shadow-sm)`
- **Backdrop**: `blur(20px)`

### Sidebar / Menús Oscuros
- **Fondo**: `var(--bg-sidebar)` → `#001858`
- **Texto**: `var(--text-on-dark)` → `#fef6e4`
- **Ítem activo**: fondo `rgba(245,130,174,0.18)`, borde izquierdo `var(--accent-rose)`

### Scrollbar
- **Track**: `var(--bg-elevated)`
- **Thumb**: `var(--primary)`
- **Thumb hover**: `var(--primary-dark)`

### Spinner / Loading
- **Track**: `rgba(0,24,88,0.15)`
- **Activo**: `var(--primary)` (rosa)

---

## Colores Reservados — NO mezclar con la paleta nueva

> Estos colores solo deben usarse en contextos muy específicos (modo TV/pizarra, overlay de pantalla completa).

| Contexto        | Color      | Justificación                            |
| :-------------- | :--------- | :--------------------------------------- |
| Fondo TV/Pizarra | `#001858` | Pantalla completa para visualización     |
| Overlay de error fatal | `#e05c7e` con opacidad alta | Solo en bloqueos críticos |
