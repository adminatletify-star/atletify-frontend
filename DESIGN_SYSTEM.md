# WolfPack System — Design System

## Giro del Sistema

WolfPack es un sistema de gestión integral para **Boxes de CrossFit / Functional Training**.  
El nombre "WolfPack" (manada de lobos) evoca: **fuerza, unidad, ferocidad, disciplina, élite**.  
La estética debe ser **oscura, agresiva, premium y atlética**.

---

## Paleta de Colores — "Arctic Wolf"

Regla aplicada: **60-30-10**

### Fondos (60%)

| Variable          | Hex         | Descripción                          |
|-------------------|-------------|--------------------------------------|
| `--bg-base`       | `#0B0B0F`   | Fondo principal de toda la app       |
| `--bg-elevated`   | `#14141A`   | Fondo de secciones, contenedores     |
| `--bg-card`       | `#1C1C26`   | Tarjetas, modales, sidebars          |
| `--bg-card-hover` | `#252533`   | Hover de tarjetas                    |
| `--bg-input`      | `#1A1A24`   | Inputs y selects                     |

### Colores principales (30% + 10%)

| Variable           | Hex / Valor                      | Descripción                                  |
|--------------------|----------------------------------|----------------------------------------------|
| `--primary`        | `#E63946`                        | Botones principales, acentos clave (10%)     |
| `--primary-dark`   | `#B82D38`                        | Hover de botones, bordes activos             |
| `--primary-glow`   | `rgba(230, 57, 70, 0.25)`       | Box-shadow, glows, focus rings               |
| `--secondary`      | `#A8B2D1`                        | Texto secundario, subtítulos, iconos inactivos |
| `--accent`         | `#F5A623`                        | Badges premium, rankings, estrellas, alertas |
| `--accent-cool`    | `#4FC3F7`                        | Links informativos, stats, charts            |

### Estados

| Variable      | Hex         | Descripción                        |
|---------------|-------------|------------------------------------|
| `--success`   | `#2ECC71`   | Estados activos, confirmaciones    |
| `--warning`   | `#F39C12`   | Advertencias, estados pendientes   |
| `--danger`    | `#E74C3C`   | Errores, eliminaciones             |

### Texto

| Variable          | Hex / Valor   | Descripción                       |
|-------------------|---------------|-----------------------------------|
| `--text-primary`  | `#F0F0F5`     | Texto principal (no blanco puro)  |
| `--text-muted`    | `#6B7280`     | Texto terciario, placeholders     |

### Bordes y Glass

| Variable          | Valor                            | Descripción                        |
|-------------------|----------------------------------|------------------------------------|
| `--border`        | `rgba(255, 255, 255, 0.06)`     | Líneas divisoras, bordes tarjetas  |
| `--border-hover`  | `rgba(230, 57, 70, 0.4)`        | Bordes en hover/focus              |
| `--glass-bg`      | `rgba(20, 20, 30, 0.85)`        | Glassmorphism (modales, dropdowns) |

---

## Fuentes

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

### Descripción de cada fuente

- **Oswald**: Condensada, fuerte, impactante. LA fuente del mundo fitness/CrossFit.
- **Bebas Neue**: Ultra condensada, all-caps natural. Para títulos heroicos y banners de competencia.
- **Rajdhani**: Geométrica, técnica. Ideal para estadísticas, counters y leaderboards.
- **Barlow Condensed**: Militar/atlética, limpia. Subtítulos y nombres de secciones.
- **Inter**: Diseñada para interfaces. Ultra legible, moderna, elegante.

### Ejemplos concretos de uso por fuente

#### Oswald (Títulos principales — H1, H2)
- Nombre del Box: **"WOLFPACK GYM"**
- Título de página: **"DASHBOARD"**, **"MIS CLASES"**, **"INVENTARIO"**
- Encabezado de sección principal: **"COMPETENCIAS ACTIVAS"**, **"PASE DE LISTA"**
- Nombre de competencia grande: **"WOLFPACK THROWDOWN 2026"**
- Estilo: `font-family: 'Oswald'; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;`

#### Bebas Neue (Banners heroicos, impacto visual)
- Hero del Home: **"ENTRENA COMO MANADA"**
- Banners de competencia: **"INSCRIPCIONES ABIERTAS"**
- Pantalla de splash o bienvenida: **"BIENVENIDO A WOLFPACK"**
- Contadores gigantes en landing: **"150+ ATLETAS"**
- Estilo: `font-family: 'Bebas Neue'; font-size: 3rem+; text-transform: uppercase; letter-spacing: 2px;`

#### Barlow Condensed (Subtítulos — H3, H4, H5)
- Subtítulos de tarjeta: **"Información del Atleta"**, **"Detalles de la Clase"**
- Nombres de tabs/secciones: **"General"**, **"Finanzas"**, **"Staff"**
- Encabezados de tabla: **"Nombre"**, **"Rol"**, **"Estatus"**
- Labels de formulario: **"Correo electrónico"**, **"Contraseña"**
- Títulos de modales: **"Editar Usuario"**, **"Confirmar Pago"**
- Estilo: `font-family: 'Barlow Condensed'; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;`

#### Inter (Cuerpo, UI general)
- Párrafos y descripciones: "Este WOD consiste en 5 rondas de..."
- Texto dentro de inputs y selects
- Texto de botones: "Guardar", "Cancelar", "Registrarse"
- Mensajes de alerta: "Usuario registrado correctamente"
- Contenido de tarjetas: datos del atleta, descripción de productos
- Texto de navegación (navbar, sidebar, menús)
- Placeholders: "Ingresa tu correo..."
- Estilo: `font-family: 'Inter'; font-weight: 400; (500-600 para botones y labels)`

#### Rajdhani (Números, estadísticas, datos numéricos)
- Contadores de dashboard: **"85"** atletas activos, **"12"** clases hoy
- Leaderboard scores: **"15:23"**, **"245 lbs"**, **"3 Rondas + 5 Reps"**
- Precios en punto de venta: **"$350.00"**
- Timers de WOD: **"12:00"**, **"AMRAP 20"**
- Estadísticas de perfil: Peso **"75 kg"**, PR **"120 kg"**
- Cantidades de inventario: **"Stock: 24"**
- Estilo: `font-family: 'Rajdhani'; font-weight: 700; letter-spacing: 0.5px;`

---

## CSS Variables — Bloque listo para copiar

```css
:root {
  /* === FONDOS === */
  --bg-base: #0B0B0F;
  --bg-elevated: #14141A;
  --bg-card: #1C1C26;
  --bg-card-hover: #252533;
  --bg-input: #1A1A24;

  /* === PRIMARIOS === */
  --primary: #E63946;
  --primary-dark: #B82D38;
  --primary-glow: rgba(230, 57, 70, 0.25);

  /* === SECUNDARIOS Y ACENTOS === */
  --secondary: #A8B2D1;
  --accent: #F5A623;
  --accent-cool: #4FC3F7;

  /* === ESTADOS === */
  --success: #2ECC71;
  --warning: #F39C12;
  --danger: #E74C3C;

  /* === TEXTO === */
  --text-primary: #F0F0F5;
  --text-muted: #6B7280;

  /* === BORDES Y GLASS === */
  --border: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(230, 57, 70, 0.4);
  --glass-bg: rgba(20, 20, 30, 0.85);

  /* === FUENTES === */
  --font-heading: 'Oswald', sans-serif;
  --font-heading-alt: 'Barlow Condensed', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-stats: 'Rajdhani', sans-serif;
  --font-hero: 'Bebas Neue', sans-serif;

  /* === TRANSICIÓN GLOBAL === */
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Referencia Visual Rápida

```
┌──────────────────────────────────────────────────────┐
│  FONDO BASE (#0B0B0F)                     60%        │
│  ┌──────────────────────────────────────────────┐    │
│  │  TARJETA (#1C1C26)                   30%     │    │
│  │                                              │    │
│  │  Título (Oswald 700) ── #F0F0F5              │    │
│  │  Subtítulo (Barlow) ── #A8B2D1               │    │
│  │  Párrafo (Inter 400) ── #6B7280              │    │
│  │                                              │    │
│  │  [  BOTÓN PRIMARIO  ]  ── #E63946    10%     │    │
│  │  ★ Ranking ── #F5A623                        │    │
│  │  ℹ Info link ── #4FC3F7                      │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

---

## Notas de Diseño

- **Rojo `#E63946`** en lugar de `#FF0000`: El rojo puro cansa la vista. Este rojo tiene profundidad, es sofisticado y sigue siendo agresivo.
- **Fondos con subtono azulado** (`#0B0B0F`, `#1C1C26`): Sensación premium y nocturna — como un lobo en la noche. No usar grises puros.
- **Oro `#F5A623`**: Para rankings, trofeos y badges de competencia. Toque de "élite" y "campeón".
- **Plata `#A8B2D1`**: Texto secundario que no compite con el blanco principal, jerarquía visual limpia.
- **Glassmorphism**: Usar `backdrop-filter: blur(20px)` con `--glass-bg` en modales, dropdowns y elementos flotantes.
- **Regla 60-30-10**: Siempre respetar la proporción para mantener armonía visual.
