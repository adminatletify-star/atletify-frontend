import { useEffect, useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import CardNav from './ReactBits/CardNav';
import MobileNavBar from './MobileNavBar';
import { Link } from 'react-router-dom';
import { BOXES_ENDPOINT } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModalFirmaReglamento from './ModalFirmaReglamento';
import ModalExpedienteMedico from './ModalExpedienteMedico';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario: user, logout: authLogout, boxActivo } = useAuth();
  const [box, setBox] = useState(null);
  const [statusReglamento, setStatusReglamento] = useState(null);
  const [statusExpediente, setStatusExpediente] = useState(null);

  const hideNavRoutes = ['/', '/login'];
  const shouldHideNav = hideNavRoutes.includes(location.pathname);
  const isStaticNavRoute = location.pathname === '/admin-competencias/panel/1';

  useEffect(() => {
    // Sincronizar el box del localStorage siempre que cambie el usuario o la ruta
    const bStr = localStorage.getItem('box');
    let b = null;
    if (bStr) {
      try { b = JSON.parse(bStr); } catch (e) {}
    }
    setBox(b);

    // Refrescar los datos del Box en segundo plano para obtener permisos actualizados (ej. moduloCompetenciasActivo)
    if (b && (b.idBox || b.IdBox)) {
      const targetId = b.idBox || b.IdBox;
      fetch(`${BOXES_ENDPOINT}/${targetId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Network response was not ok.');
        })
        .then(data => {
          if (data && (data.idBox || data.IdBox)) {
             const updatedBox = { ...b, ...data };
             localStorage.setItem('box', JSON.stringify(updatedBox));
             setBox(updatedBox); // Actualiza el estado y recalcula el menú
          }
        })
        .catch(err => console.error("Error refrescando box en segundo plano:", err));
    }

    if (user && b && user.rol === 'Atleta') {
      const idUsuarioActual = user.idUsuario || user.id;
      if (idUsuarioActual) {
        verificarReglamento(b.idBox || b.IdBox, idUsuarioActual);
        verificarExpediente(idUsuarioActual);
      }
    }
  }, [location, user, boxActivo]);

  const verificarReglamento = async (idBox, idUsuario) => {
    try {
      const res = await fetch(`${BOXES_ENDPOINT}/${idBox}/atletas/${idUsuario}/status-reglamento`);
      if (res.ok) {
        const data = await res.json();
        setStatusReglamento(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const verificarExpediente = async (idUsuario) => {
    try {
      // Ajusta la URL base si es diferente en tu entorno
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ExpedienteMedico/usuario/${idUsuario}/status`);
      if (res.ok) {
        const data = await res.json();
        setStatusExpediente(data);
      }
    } catch (err) {
      console.error("Error verificando expediente", err);
    }
  };



  const handleLogout = () => {
    authLogout();
    localStorage.removeItem('box');
    navigate('/');
  };

  // 👇 LA MAGIA AQUÍ: useMemo memoriza el menú para no interrumpir la animación
  const navItems = useMemo(() => {
    if (!user) return [];

    if (user.rol === 'AdminBox' || user.rol === 'Developer') {
      return [
        {
          label: 'Operaciones', icon: 'fa-clipboard-check', bgColor: '#1a1a1a', textColor: '#fff',
          links: [
            { label: 'Pase de Lista', href: '/pase-de-lista' },
            { label: 'Programar WODs', href: '/calendario-wods' },
            { label: 'Directorio Atletas', href: '/directorio' },
            { label: 'Nuevo Atleta', href: '/registro-manual' },
            { label: 'Calendario', href: '/admin-calendario' },
          ]
        },
        {
          label: 'Administración', icon: 'fa-store', bgColor: '#2c1214', textColor: '#fff',
          links: [
            { label: 'Punto de Venta / Tienda', href: '/gestion-ventas-productos' },
            { label: 'Inventario de Almacén', href: '/almacen-panel' },
            { label: 'Gestión de Clases', href: '/gestion-clases' },
            { label: 'Mensualidades', href: "/gestion-finanzas" },
            { label: 'Gestión Competencias', href: '/admin-competencias' },
            { label: 'Historial Competencias', href: '/admin-competencias/historial' },
            { label: 'Beneficios', href: '/wolf-beneficios' },

          ]
        },
        {
          label: 'Ajustes', icon: 'fa-cogs', bgColor: '#1a1a1a', textColor: '#fff',
          links: [
            { label: 'Panel Principal', href: '/admin-box-panel' },
            { label: 'Staff y Coaches', href: '/gestion-staff' },
            { label: 'Editar Box', href: '/editar-box' },
            { label: 'Bandeja de pagos', href: '/admin-roster' },
            { label: 'Buzón de Sugerencias', href: '/buzon-sugerencias' },
            { label: 'Mi Perfil', href: '/perfil-admin' },
          ]
        }
      ];
    }

    if (user.rol === 'Atleta') {
      return [
        {
          label: 'Mi Entrenamiento', icon: 'fa-dumbbell', bgColor: '#1a1a1a', textColor: '#fff',
          links: [
            { label: 'Panel de Atleta', href: '/user-panel' },
            { label: 'Mis Resultados (Scores)', href: '/mis-resultados' },
            { label: 'Simulador de Barra', href: '/simulador-barra' }
          ]
        },
        {
          label: 'Comunidad', icon: 'fa-trophy', bgColor: '#2c1214', textColor: '#fff',
          links: [
            { label: 'Calendario', href: '/calendario-atleta' },
            { label: 'Eventos del Box', href: '#' },
            { label: 'Reseñas', href: '/resenas-coaches' },
            { label: 'Tienda del Box', href: '/tienda-box' },
          ]
        },
        {
          label: 'Mi Cuenta', icon: 'fa-user', bgColor: '#1a1a1a', textColor: '#fff',
          links: [
            { label: 'Mi Perfil', href: '/mi-perfil' },
            { label: 'Mis Mensualidades', href: '/detalle-plan-user' },
            { label: 'Estado de Cuenta (Tienda)', href: '/mis-deudas' },
            { label: 'Expediente Médico', href: '/expediente-medico' },
            { label: 'Buzón de Sugerencias', href: '/buzon-sugerencias' },
          ]
        }
      ];
    }

    return [
      {
        label: 'Clases', icon: 'fa-stopwatch', bgColor: '#1a1a1a', textColor: '#fff',
        links: [
          { label: 'Panel de Coach', href: '/admin-box-panel' },
          { label: 'Pase de Lista', href: '/pase-de-lista' },
          { label: 'Calendario de WODs', href: '/calendario-wods' },
          { label: 'Buzón de Sugerencias', href: '/buzon-sugerencias' },
          { label: 'Mi Perfil', href: '/perfil-admin' },
        ]
      }
    ];
  }, [user, box]); // <- Se recalcula si cambia el usuario o el box

  // Ruta de inicio según rol (para el tab Inicio del MobileNavBar)
  const homeRoute = useMemo(() => {
    if (!user) return '/';
    if (user.rol === 'Developer') return '/dashboard';
    if (user.rol === 'AdminBox' || user.rol === 'Coach') return '/admin-box-panel';
    if (user.rol === 'Atleta' || user.rol === 'Usuario') return '/user-panel';
    return '/';
  }, [user]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#050505' }}>
      {!shouldHideNav && (
        <>
          {/* CardNav — solo en pantallas md+ */}
          <div className="d-none d-md-block">
            <CardNav
              className={isStaticNavRoute ? 'card-nav-static-only-route' : ''}
              logo={user ? "Logout" : "Login"}
              logoAlt="WOLFPACK"
              items={navItems}
              baseColor="rgba(10, 10, 10, 0.85)"
              menuColor="#ffffff"
              buttonBgColor="#dc3545"
              buttonTextColor="#ffffff"
              onButtonClick={handleLogout}
            />
          </div>

          {/* MobileNavBar — solo en mobile (CSS la oculta en md+) */}
          <MobileNavBar
            navItems={navItems}
            homeRoute={homeRoute}
            onLogout={handleLogout}
          />
        </>
      )}

      <div
        className={!shouldHideNav ? 'layout-has-nav' : ''}
        style={{ paddingTop: shouldHideNav ? '0' : '120px' }}
      >
        <Outlet />
      </div>

      {/* MODAL GLOBAL DE FIRMA DE REGLAMENTO */}
      {statusReglamento?.requiereFirma && statusReglamento?.reglamentoHtml && (
        <ModalFirmaReglamento
          idBox={box?.idBox}
          idUsuario={user?.idUsuario || user?.id}
          reglamentoHtml={statusReglamento.reglamentoHtml}
          reglamentoActualizadoEn={statusReglamento.reglamentoActualizadoEn}
          onFirmaCompletada={() => {
            alert("¡Firma guardada con éxito! Bienvenido al Box.");
            setStatusReglamento(null); // Oculta el modal
          }}
        />
      )}

      {/* MODAL GLOBAL DE EXPEDIENTE MÉDICO */}
      {statusExpediente?.requiereExpediente && (
        <ModalExpedienteMedico
          idUsuario={user?.idUsuario || user?.id}
          onCompletado={() => {
            setStatusExpediente({ requiereExpediente: false });
          }}
        />
      )}
    </div>
  );
}