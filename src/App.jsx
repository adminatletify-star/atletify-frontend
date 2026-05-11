import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import { jwtDecode } from "jwt-decode";
import Mantenimiento from './pages/Mantenimiento';

// Importaciones de Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import { Register } from './pages/Register';
import TerminosCondiciones from './pages/TerminosCondiciones';
import PoliticaCookies from './pages/PoliticaCookies';
import TiendaBox from './pages/TiendaBox';
import CookieBanner from './components/CookieBanner';
import CrearBox from './pages/CrearBox';
import Dashboard from './pages/Dashboard';
import CompletarRegistro from './pages/CompletarRegistro';
import RegistroManual from './pages/RegistroManual';
import UserPanel from './pages/UserPanel';
import AdminBoxPanel from './pages/AdminBoxPanel';
import ClasesDisponibles from './pages/ClasesDisponibles';
import CrearClaseAdminBox from './pages/CrearClaseAdminBox';
import MisKids from './pages/MisKids';
import GestionStaff from './pages/GestionStaff';
import EditarUsuario from './pages/EditarUsuario';
import GestionClases from './pages/GestionClases';
import MisClases from './pages/MisClases';
import CompletarExpediente from './pages/CompletarExpediente';
import ExpedienteMedicoPage from './pages/ExpedienteMedicoPage';
import GestionSolicitudesAtletas from './pages/GestionSolicitudesAtletas';
import PaseDeLista from './pages/PaseDeLista';
import MiPerfil from './pages/MiPerfil';
import Directorio from './pages/Directorio';
import DiccionarioEjercicios from './pages/DiccionarioEjercicios';
import AdminEjercicios from './pages/AdminEjercicios';
import CreadorWods from './pages/CreadorWods';
import CalendarioWods from './pages/CalendarioWods';
import EditarWod from './pages/EditarWod';
import HistorialCompetenciasPublico from './pages/HistorialCompetenciasPublico';
import HistorialBoxDetalle from './pages/HistorialBoxDetalle';
import AdminArchivadasDev from './pages/AdminArchivadasDev';
import AdminArchivadasDevDetalle from './pages/AdminArchivadasDevDetalle';
import AdminPreregistros from './pages/AdminPreregistros';
import AdminSaaS from './pages/AdminSaaS';
import PortalCompetencias from './pages/PortalCompetencias';
import PortalLeaderboard from './pages/PortalLeaderboard';
import PortalAtleta from './pages/PortalAtleta';
import GestionFinanzas from './pages/GestionFinanzas';
import PerfilAtletaAdmin from './pages/PerfilAtletaAdmin';
import RankingManual from './pages/RankingManual';
import Comunidad from './pages/Comunidad';
import UserResenas from './pages/UserResenas';
import SalaDeEspera from './pages/SalaDeEspera'; // O la ruta donde lo hayas guardado
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SeleccionPlanSaaS from './pages/SeleccionPlanSaaS';
import RegistroBoxSaaS from './pages/RegistroBoxSaaS';
import PerfilAdminCoach from './pages/PerfilAdminCoach';
import NotFound from './pages/NotFound';

// Nuevos Módulos (Edwin)
import GestionInventario from './pages/GestionInventario';
import GestionVentasProductos from './pages/GestionVentasProductos';
import HistorialVentas from './pages/HistorialVentas';
import GestionFiado from './pages/GestionFiado';
import MisFiados from './pages/MisFiados';
import PuntoDeVenta from './pages/PuntoDeVenta';
import SimuladorBarra from './pages/SimuladorBarra';
import MisResultados from './pages/MisResultados';
import AlmacenPanel from './pages/AlmacenPanel';
import EditarBox from './pages/EditarBox';
import AdminCompetencias from './pages/AdminCompetencias';
import AdminCompetenciasHistorial from './pages/AdminCompetenciasHistorial';
import AtletasBox from './pages/AtletasBox';
import AdminRoster from './pages/AdminRoster';
import CompetenciaDetalle from './pages/CompetenciaDetalle';
import PortalJuez from './pages/PortalJuez';
import SobreNosotros from './pages/SobreNosotros';
import ListaCompetencias from './pages/ListaCompetencias';
import SimuladorBarraPublico from './pages/SimuladorBarraPublico';
import WolfPackPage from './pages/WolfPackPage';
import Ejercicios from './pages/Ejercicios';
import AdminRosterFinanzas from './pages/AdminRosterFinanzas';
import AdminCalendario from './pages/AdminCalendario';
import CalendarioAtleta from './pages/CalendarioAtleta';
import DirectorioBoxes from './pages/DirectorioBoxes';
import BoxDetalle from './pages/BoxDetalle';
import DetallePlanUser from './pages/DetallePlanUser';
import WolfBeneficios from './pages/WolfBeneficios';
import PublicDropIn from './pages/PublicDropIn';
import BuzonSugerencias from './pages/BuzonSugerencias';
import GestionReglamento from './pages/GestionReglamento';


// === INTERCEPTOR GLOBAL DE FETCH ===
// Esto permite atrapar los errores del backend y, además, inyectar el token JWT.
const originalFetch = window.fetch;
window.fetch = async function () {
  let [resource, config] = arguments;

  // 0. AUTO-CORRECTOR B2B DE RUTAS (El Enrutador Mágico)
  // Detecta si a las rutas les falta el /api o tienen doble /api/api debido a configuraciones de entorno mixtas
  if (typeof resource === 'string') {
    const rawBase = import.meta.env.VITE_API_URL || '';
    const cleanBase = rawBase.endsWith('/api') ? rawBase.slice(0, -4) : rawBase;

    if (cleanBase && resource.startsWith(cleanBase)) {
      const restString = resource.slice(cleanBase.length);

      if (restString !== '' && restString !== '/' && !restString.startsWith('/api/') && !restString.startsWith('/api?')) {
        // Le falta el /api, se lo inyectamos
        resource = cleanBase + '/api' + (restString.startsWith('/') ? restString : '/' + restString);
      } else if (restString.startsWith('/api/api/')) {
        // Tiene doble /api/api, le quitamos uno
        resource = cleanBase + restString.substring(4);
      }
    }
  }

  // 1. Inyectar el Token JWT si existe
  const token = localStorage.getItem('token');
  if (token) {
    if (!config) config = {};
    if (!config.headers) config.headers = {};

    if (config.headers instanceof Headers) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // 2. Hacer la petición original
  const response = await originalFetch.call(this, resource, config);

  // 3. Manejar Unauthorized (Token expirado o inválido)
  if (response.status === 401) {
    // Obtener el token que se usó en ESTA petición
    let requestToken = null;
    if (config?.headers instanceof Headers) {
      requestToken = config.headers.get('Authorization');
    } else if (config?.headers?.['Authorization']) {
      requestToken = config.headers['Authorization'];
    }

    // Obtener el token ACTUAL en localStorage
    const currentToken = localStorage.getItem('token');

    // Solo redirigir si:
    // 1. No estamos ya en /login
    // 2. El token que falló es TODAVÍA el token activo (no es un 401 residual de otra cuenta)
    const tokenStillCurrent = !currentToken || !requestToken || requestToken === `Bearer ${currentToken}`;

    if (tokenStillCurrent && !window.location.pathname.startsWith('/login')) {
      console.error("CADENERO FETCH: Token inválido o expirado. Cerrando sesión activa...");
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      localStorage.removeItem('boxActivo');
      window.location.href = '/login';
    }
    return response;
  }

  // 4. Filtro Altisonante (Código original)
  if (!response.ok && response.status === 400) {
    try {
      const clone = response.clone();
      const data = await clone.json();

      if (data) {
        const jsonStr = JSON.stringify(data);
        if (jsonStr.includes("altisonante")) {
          alert("⚠️ Se ha detectado una palabra altisonante. Favor de corregir o puede ser penalizado.");
        }
      }
    } catch (e) {
      // Ignorar si no es JSON
    }
  }
  return response;
};

// === EL CADENERO (Protector de Rutas VIP) ===
const ProtectedRoute = ({ children, allowedRoles }) => {
  const storedUserStr = localStorage.getItem('usuario');
  const storedToken = localStorage.getItem('token');

  // Validaciones estrictas: Si falta usuario o token
  if (!storedUserStr || !storedToken) {
    console.error("CADENERO: Faltan credenciales (usuario o token). Mandando a /login");
    return <Navigate to="/login" replace />;
  }

  // Validar si el token expiró decodificándolo
  try {
    const decoded = jwtDecode(storedToken);
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      console.error("CADENERO: El token ha expirado. Mandando a /login");
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      localStorage.removeItem('boxActivo');
      return <Navigate to="/login" replace />;
    }
  } catch (error) {
    console.error("CADENERO: Error decodificando el token:", error);
    return <Navigate to="/login" replace />;
  }

  const storedUser = JSON.parse(storedUserStr);

  // 👇 Interceptar si no aceptó los términos o si es undefined (usuarios viejos)
  if (!storedUser.aceptoTerminos) {
    return <Navigate to="/terminos" replace state={{ requiereAceptacion: true }} />;
  }

  if (allowedRoles && !allowedRoles.includes(storedUser.rol)) {
    console.error(`CADENERO: Acceso denegado a [${allowedRoles}]. Rol actual: '${storedUser.rol}'.`);
    if (storedUser.rol === 'Developer') return <Navigate to="/dashboard" replace />;
    if (storedUser.rol === 'AdminBox' || storedUser.rol === 'Coach') return <Navigate to="/admin-box-panel" replace />;
    if (storedUser.rol === 'Juez') return <Navigate to={`/juez/${storedUser.idCompetenciaAsignada}`} replace />;
    return <Navigate to="/user-panel" replace />;
  }

  // 👇 CADENERO SAAS B2B (PAYWALL PARA ADMINS)
  const storedBoxStr = localStorage.getItem('box');
  if (storedBoxStr && (storedUser.rol === 'AdminBox' || storedUser.rol === 'Coach')) {
    try {
      const boxData = JSON.parse(storedBoxStr);
      // Si están vencidos o pendientes, se bloquea su navegación al panel
      if (window.location.pathname !== '/seleccion-plan-saas' &&
        (boxData.estatusSaaS === 'Pendiente' || boxData.estatusSaaS === 'Vencido')) {
        console.error("CADENERO SAAS: Box bloqueado por falta de pago. Redirigiendo a Paywall.");
        return <Navigate to="/seleccion-plan-saas" replace />;
      }
    } catch (e) {
      console.error("CADENERO SAAS: Error leyendo data del box", e);
    }
  }

  return children;
};

// === GUARDIA DE MANTENIMIENTO ===
function MaintenanceGuard({ children }) {
  const [enMantenimiento, setEnMantenimiento] = useState(false);
  const [checked, setChecked] = useState(false);
  const location = useLocation(); // Fuerza re-render en cada navegación

  useEffect(() => {
    async function verificar() {
      try {
        const res = await originalFetch(`${import.meta.env.VITE_API_URL}/api/developer/configuracion`);
        if (res.ok) {
          const data = await res.json();
          setEnMantenimiento(!!data.enMantenimiento);
        }
      } catch (e) {
        // Si falla la consulta, no bloquear
      } finally {
        setChecked(true);
      }
    }
    verificar(); // Re-verifica en cada cambio de ruta
  }, [location.pathname]);

  if (!checked) return null;

  if (enMantenimiento) {
    // Si hay usuario logueado y es Developer → acceso total
    try {
      const u = JSON.parse(localStorage.getItem('usuario'));
      if (u?.rol === 'Developer') return children;
    } catch (e) { /* sin usuario */ }

    // Rutas públicas permitidas durante mantenimiento (para que el Dev pueda llegar al login)
    const rutasPermitidas = ['/', '/login', '/registro', '/terminos', '/politica-cookies',
      '/forgot-password', '/reset-password', '/sobre-nosotros', '/wolfpack',
      '/ejercicios', '/directorio-boxes', '/simulador-barra-publico'];
    const rutaActual = location.pathname;
    const esRutaPermitida = rutasPermitidas.some(r => rutaActual === r || rutaActual.startsWith('/registro/'));

    if (esRutaPermitida) return children; // Dejar ver rutas públicas básicas

    // Todo lo demás (portales de juez, atleta, leaderboard, paneles, etc.) → bloqueado
    return <Mantenimiento />;
  }

  return children;
}

// === COMPONENTE PRINCIPAL APP ===
function App() {
  return (
    <AuthProvider>
      <Router>
        <MaintenanceGuard>
          <CookieBanner />
          <Routes>
            {/* ========================================= */}
            {/* RUTAS SIN NAVBAR (Públicas y Fullscreen)  */}
            {/* ========================================= */}
            <Route path="/" element={<Home />} />
            <Route path="/sobre-nosotros" element={<SobreNosotros />} />
            <Route path="/competencias" element={<ListaCompetencias />} />
            <Route path="/historial-competencias" element={<HistorialCompetenciasPublico />} />
            <Route path="/historial-competencias/:idBox" element={<HistorialBoxDetalle />} />
            <Route path="/admin-archivadas" element={<AdminArchivadasDev />} />
            <Route path="/admin-archivadas/:idBox" element={<AdminArchivadasDevDetalle />} />
            <Route path="/login" element={<Login />} />
            <Route path="/terminos" element={<TerminosCondiciones />} />
            <Route path="/politica-cookies" element={<PoliticaCookies />} />
            <Route path="/registro/:idBox" element={<Register />} />
            <Route path="/completar-registro" element={<CompletarRegistro />} />
            <Route path="/portal-competencias/:id" element={<PortalCompetencias />} />
            <Route path="/leaderboard/:id" element={<PortalLeaderboard />} />
            <Route path="/juez/:id" element={<PortalJuez />} />
            <Route path="/atleta/:compId" element={<PortalAtleta />} />
            <Route path="/atleta" element={<PortalAtleta />} />
            <Route path="/sala-espera" element={<SalaDeEspera />} />
            <Route path="/simulador-barra-publico" element={<SimuladorBarraPublico />} />
            <Route path="/wolfpack" element={<WolfPackPage />} />
            <Route path="/ejercicios" element={<Ejercicios />} />
            <Route path="/directorio-boxes" element={<DirectorioBoxes />} />
            <Route path="/box/:id" element={<BoxDetalle />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/seleccionar-plan" element={<SeleccionPlanSaaS />} />
            <Route path="/registro-b2b/:idPlan" element={<RegistroBoxSaaS />} />
            <Route path="/public-drop-in" element={<PublicDropIn />} />
            <Route path="/public-drop-in/:idBox" element={<PublicDropIn />} />


            {/* ========================================= */}
            {/* RUTAS CON NAVBAR (Envueltas en Layout)    */}
            {/* ========================================= */}
            <Route element={<Layout />}>

              {/* --- ZONA DEVELOPER --- */}
              <Route path="/registro-manual" element={<RegistroManual />} />
              <Route path="/seleccion-plan-saas" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach']}><SeleccionPlanSaaS /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Developer']}><Dashboard /></ProtectedRoute>} />
              <Route path="/admin-saas" element={<ProtectedRoute allowedRoles={['Developer']}><AdminSaaS /></ProtectedRoute>} />
              <Route path="/admin-preregistros" element={<ProtectedRoute allowedRoles={['Developer', 'AdminBox']}><AdminPreregistros /></ProtectedRoute>} />
              <Route path="/crear-box" element={<ProtectedRoute allowedRoles={['Developer']}><CrearBox /></ProtectedRoute>} />
              <Route path="/admin-competencias" element={<ProtectedRoute allowedRoles={['Developer', 'AdminBox']}><AdminCompetencias /></ProtectedRoute>} />
              <Route path="/admin-competencias/historial" element={<ProtectedRoute allowedRoles={['Developer', 'AdminBox']}><AdminCompetenciasHistorial /></ProtectedRoute>} />
              <Route path="/admin-competencias/roster/:id" element={<ProtectedRoute allowedRoles={['Developer', 'AdminBox']}><AdminRosterFinanzas /></ProtectedRoute>} />
              {/* --- ZONA ADMINISTRACIÓN Y COACHES --- */}
              <Route path="/admin-box-panel" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><AdminBoxPanel /></ProtectedRoute>} />
              <Route path="/gestion-staff" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><GestionStaff /></ProtectedRoute>} />
              <Route path="/editar-usuario/:id" element={<ProtectedRoute allowedRoles={['Developer', 'AdminBox', 'Coach']}><EditarUsuario /></ProtectedRoute>} />
              <Route path="/crear-clase" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><CrearClaseAdminBox /></ProtectedRoute>} />
              <Route path="/admin-roster" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><AdminRoster /></ProtectedRoute>} />
              {/* /juez/:id ahora vive como ruta pública sin navbar — PortalJuez maneja su propia auth */}
              <Route path="/ranking-manual/:idEntrenamiento" element={<RankingManual />} />
              <Route path="/comunidad" element={<Comunidad />} />
              <Route path="/resenas-coaches" element={<UserResenas />} />
              <Route path="/calendario-atleta" element={<ProtectedRoute allowedRoles={['Atleta']}><CalendarioAtleta /></ProtectedRoute>} />
              <Route path="/tienda-box" element={<ProtectedRoute allowedRoles={['Atleta']}><TiendaBox /></ProtectedRoute>} />
              {/* === MÓDULO FINANCIERO (SÓLO ADMIN Y DEVELOPER) === */}
              <Route
                path="/gestion-finanzas"
                element={
                  <ProtectedRoute allowedRoles={['Developer', 'AdminBox']}>
                    <GestionFinanzas />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/perfil-atleta-admin/:idUsuario"
                element={
                  <ProtectedRoute allowedRoles={['Developer', 'AdminBox']}>
                    <PerfilAtletaAdmin />
                  </ProtectedRoute>
                }
              />
              {/* Operaciones Diarias Box */}
              <Route path="/pase-de-lista" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><PaseDeLista /></ProtectedRoute>} />
              <Route path="/admin-calendario" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><AdminCalendario /></ProtectedRoute>} />
              <Route path="/calendario-wods" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><CalendarioWods /></ProtectedRoute>} />
              <Route path="/creador-wods" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><CreadorWods /></ProtectedRoute>} />
              <Route path="/editar-wod/:id" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><EditarWod /></ProtectedRoute>} />
              <Route path="/directorio" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><Directorio /></ProtectedRoute>} />
              <Route path="/gestion-solicitudes" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><GestionSolicitudesAtletas /></ProtectedRoute>} />
              <Route path="/gestion-clases" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><GestionClases /></ProtectedRoute>} />
              <Route path="/diccionario-ejercicios" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><DiccionarioEjercicios /></ProtectedRoute>} />
              <Route path="/admin-ejercicios" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><AdminEjercicios /></ProtectedRoute>} />
              <Route path="/editar-box" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><EditarBox /></ProtectedRoute>} />
              <Route path="/admin-competencias/panel/:id" element={<ProtectedRoute allowedRoles={['Developer', 'AdminBox']}><CompetenciaDetalle /></ProtectedRoute>} />
              <Route path="/atletas-box" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><AtletasBox /></ProtectedRoute>} />
              {/* Nuevos Módulos de Tienda y Almacén */}
              <Route path="/gestion-ventas-productos" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><GestionVentasProductos /></ProtectedRoute>} />
              <Route path="/punto-de-venta" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><PuntoDeVenta /></ProtectedRoute>} />
              <Route path="/gestion-inventario" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><GestionInventario /></ProtectedRoute>} />
              <Route path="/historial-ventas" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><HistorialVentas /></ProtectedRoute>} />
              <Route path="/gestion-fiado" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><GestionFiado /></ProtectedRoute>} />
              <Route path="/almacen-panel" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><AlmacenPanel /></ProtectedRoute>} />
              <Route path="/wolf-beneficios" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><WolfBeneficios /></ProtectedRoute>} />
              <Route path="/buzon-sugerencias" element={<ProtectedRoute allowedRoles={['Atleta', 'Coach', 'AdminBox', 'Developer']}><BuzonSugerencias /></ProtectedRoute>} />
              <Route path="/gestion-reglamento" element={<ProtectedRoute allowedRoles={['AdminBox', 'Developer']}><GestionReglamento /></ProtectedRoute>} />
              <Route path="/perfil-admin" element={<ProtectedRoute allowedRoles={['AdminBox', 'Coach', 'Developer']}><PerfilAdminCoach /></ProtectedRoute>} />

              {/* --- ZONA ATLETAS Y USUARIOS --- */}
              <Route path="/user-panel" element={<ProtectedRoute allowedRoles={['Usuario', 'Atleta', 'AdminBox', 'Coach', 'Developer']}><UserPanel /></ProtectedRoute>} />
              <Route path="/clases" element={<ProtectedRoute allowedRoles={['Usuario', 'Atleta']}><ClasesDisponibles /></ProtectedRoute>} />
              <Route path="/mis-kids" element={<ProtectedRoute allowedRoles={['Usuario', 'Atleta', 'AdminBox']}><MisKids /></ProtectedRoute>} />
              <Route path="/mis-clases" element={<ProtectedRoute allowedRoles={['Usuario', 'Atleta']}><MisClases /></ProtectedRoute>} />
              <Route path="/completar-expediente" element={<ProtectedRoute allowedRoles={['Usuario', 'Atleta']}><CompletarExpediente /></ProtectedRoute>} />
              <Route path="/expediente-medico" element={<ProtectedRoute allowedRoles={['Usuario', 'Atleta']}><ExpedienteMedicoPage /></ProtectedRoute>} />
              <Route path="/mi-perfil" element={<ProtectedRoute allowedRoles={['Usuario', 'Atleta', 'AdminBox', 'Coach', 'Developer']}><MiPerfil /></ProtectedRoute>} />

              {/* Nuevos Módulos del Atleta */}
              <Route path="/mis-resultados" element={<ProtectedRoute allowedRoles={['Usuario', 'Atleta']}><MisResultados /></ProtectedRoute>} />
              <Route path="/simulador-barra" element={<ProtectedRoute allowedRoles={['Usuario', 'Atleta']}><SimuladorBarra /></ProtectedRoute>} />
              <Route path="/detalle-plan-user" element={<ProtectedRoute allowedRoles={['Atleta', 'Usuario']}><DetallePlanUser /></ProtectedRoute>} />
              <Route path="/mis-deudas" element={<ProtectedRoute allowedRoles={['Atleta', 'Usuario']}><MisFiados /></ProtectedRoute>} />

            </Route>

            {/* Ruta 404 - Cualquier ruta no definida caerá aquí */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MaintenanceGuard>
      </Router>
    </AuthProvider>
  );
}

export default App;