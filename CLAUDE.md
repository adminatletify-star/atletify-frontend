# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WolfPack is a CrossFit/functional training box management system with a React frontend and .NET 8 backend.

## Commands

### Frontend
```bash
cd WolfPack.Frontend/WolfPack.Frontend
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview built version
```

### Backend
```bash
cd WolfPack.API
dotnet build
dotnet run        # HTTPS at import.meta.env.VITE_API_URL:7149, Swagger at /swagger
```

### Database (EF Core / PostgreSQL)
```bash
cd WolfPack.API
dotnet ef migrations add <MigrationName>
dotnet ef database update
```
Connection: `Host=localhost;Port=5432;Database=WolfPackDB;Username=postgres;Password=admin`

## Architecture

```
Frontend (React 19 + Vite)  ──HTTP/REST──▶  Backend (.NET 8 ASP.NET Core)
  localhost:5173                               localhost:7149
  Vite proxies /api/* to backend               15 controllers, 27 EF models
                                               PostgreSQL via Npgsql
```

### Frontend Structure
- **`src/services/api.js`** — Centralized fetch wrapper. All API calls go through named methods here (e.g. `api.crearUsuario()`, `api.obtenerClasesDelBox()`). Uses `API_BASE_URL = import.meta.env.VITE_API_URL:7149/api`.
- **`src/context/AuthContext.jsx`** — Global auth state: user object, JWT token, active box. Persisted in `localStorage` under `usuario`, `token`, `boxActivo`.
- **`src/App.jsx`** — All routes + `ProtectedRoute` HOC. After login, routes to `/dashboard` (Developer), `/admin-box-panel` (AdminBox/Coach), or `/user-panel` (others).
- **`src/pages/`** — 50+ page components organized by module.
- **`src/components/`** — Shared components including `GlobalAlertBridge` for system-wide notifications.
- CSS: Bootstrap 5 loaded via CDN in `index.html`. Custom theme variables in `src/assets/css/global.css`. See `DESIGN_SYSTEM.md` for the full Arctic Wolf palette and typography.

### Backend Structure
- **`Program.cs`** — JWT config (HS256, hardcoded secret), CORS (AllowAll), service registration.
- **`Data/AppDbContext.cs`** — EF Core DbContext, cascade rules in `OnModelCreating`.
- **`Controllers/`** — 15 REST controllers. Auth is checked via JWT Bearer but server-side `[Authorize]` attributes are not consistently applied — role checks are largely frontend-only.
- **`Services/MensualidadExpiryService.cs`** — Background service that auto-expires subscriptions.

### User Roles
`Developer` › `AdminBox` › `Coach` › `Usuario` › `Atleta`

### Key Domain Modules
| Module | Controllers | Notes |
|--------|------------|-------|
| Users & Auth | `UsuariosController` | JWT issued at login, no refresh tokens |
| Box Management | `BoxController`, `ClasesController` | Gym, classes, staff |
| Kids | `KidsController` | Tutor-managed children, separate classes |
| Finance | `PagosController`, `VentasController`, `ApartadosController` | Monthly subscriptions (mensualidades), POS, layaways |
| Training/WODs | `EntrenamientosController`, `WodsController` | Workout builder, calendar, results |
| Competitions | `CompetenciasController` | Multi-team scoring |
| Inventory | `ProductosController` | Stock management |
| Attendance | `AsistenciaController` | Daily check-ins |

## Design System

See `DESIGN_SYSTEM.md` for the full Arctic Wolf theme. Key values:
- Base background: `#0B0B0F`
- Primary accent: `#E63946` (red)
- Fonts: Oswald (headings), Barlow Condensed (UI), Inter (body), Bebas Neue (display)

## Process Flows

See `FLUJO_PROCESOS.md` for sequence diagrams covering registration, login, kid enrollment, class requests, and attendance.

## Known Gaps (from PENDIENTES.md)

- Passwords use plain SHA256 — not bcrypt/PBKDF2
- JWT secret is hardcoded in `Program.cs`
- Server-side authorization relies mostly on frontend role checks
- No JWT refresh token flow

---

## REGLAS OBLIGATORIAS DE DESARROLLO

Estas reglas son de carácter **prioritario y no negociable**. Deben respetarse en CADA modificación sin excepción.

### 1. Protección del código existente
- **NUNCA** elimines, muevas ni modifiques código, funciones, endpoints, modelos, estilos o componentes que ya existen, a menos que el usuario lo confirme explícitamente.
- Si una tarea requiere tocar código existente, **avisa primero** qué vas a modificar y espera confirmación antes de proceder.
- Cuando edites un archivo existente, **entrega únicamente las inserciones o cambios exactos**. Nunca reescribas el archivo completo a menos que el usuario lo pida expresamente.

### 2. Diseño — Paleta de colores (Arctic Wolf)
- **Siempre** aplica los colores definidos en `DESIGN_SYSTEM.md`. Usa las variables CSS definidas en `:root`.
- **Prohibido** introducir colores fuera de la paleta oficial sin aprobación del usuario.
- Respetar la regla **60-30-10**: fondos oscuros (60%), tarjetas/secciones (30%), acentos rojos/dorados (10%).
- Colores de referencia rápida:
  - Fondo base: `#0B0B0F` (`--bg-base`)
  - Tarjetas: `#1C1C26` (`--bg-card`)
  - Acento principal: `#E63946` (`--primary`)
  - Acento premium: `#F5A623` (`--accent`)
  - Texto principal: `#F0F0F5` (`--text-primary`)

### 3. Tipografía — Fuentes oficiales
- **Siempre** usa las fuentes definidas en `DESIGN_SYSTEM.md`. No uses otras fuentes.
- Asignación estricta:
  - **Oswald** → H1, H2, títulos de página (700, uppercase)
  - **Bebas Neue** → Banners heroicos, secciones de impacto visual
  - **Barlow Condensed** → H3, H4, labels, nombres de secciones (600, uppercase)
  - **Inter** → Cuerpo, párrafos, botones, inputs, texto de UI (400–600)
  - **Rajdhani** → Números, estadísticas, scores, precios, timers (700)
- Si las fuentes no están cargadas en el `index.html`, agrégalas antes de usarlas.

### 4. Responsividad — Solo Bootstrap 5
- **Todo** diseño debe ser **Mobile-First** y responsive.
- Usa **exclusivamente el sistema de grilla y utilidades de Bootstrap 5** para responsividad: `row`, `col-*`, `col-md-*`, `col-lg-*`, `d-flex`, `gap-*`, `p-*`, `m-*`, breakpoints, etc.
- **Prohibido** usar CSS media queries personalizadas para responsividad cuando Bootstrap puede resolverlo.
- Si una animación existe para desktop, en mobile debe ser más sutil y no debe interferir con la navegación táctil.

### 5. Tecnologías permitidas
- Frontend: **React**, **Bootstrap 5**, **React Bits** para animaciones. No introducir librerías externas sin aprobación.
- CSS personalizado: Solo para estilos que Bootstrap **no puede resolver** con sus utilidades.
- Animaciones: React Bits, CSS nativo o Framer Motion. Siempre a 60fps.

### 6. Referencia siempre activa
- Antes de crear o modificar cualquier componente visual, consulta `DESIGN_SYSTEM.md`.
- El archivo `DESIGN_SYSTEM.md` es la fuente de verdad para colores, fuentes y jerarquía visual de este proyecto.


### 7. Consulta de recursos CSS existentes
- Antes de escribir CSS personalizado, **revisa los archivos en `src/assets/css/` y componentes para reutilizar clases, utilidades o estilos ya definidos**.
- Si existe una clase o variable que resuelve el diseño, **úsala en vez de crear una nueva**.
- Solo crea nuevas reglas CSS si no hay nada reutilizable y Bootstrap no lo cubre.

### 8. Separación estricta de código y ubicación de archivos
- **Siempre** separa el código de CSS, JS, componentes y lógica en archivos distintos. No mezcles estilos en archivos JS ni lógica en archivos de estilos.
- Cada archivo debe crearse y ubicarse en la carpeta correspondiente según su tipo (por ejemplo: componentes en `components/`, estilos en `assets/css/`, servicios en `services/`, páginas en `pages/`, etc.).
- El objetivo es mantener archivos más cortos, claros y facilitar el mantenimiento y escalabilidad del proyecto.
