import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import CardNav from './ReactBits/CardNav';

import { Link } from 'react-router-dom';
import { BOXES_ENDPOINT } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModalFirmaReglamento from './ModalFirmaReglamento';
import ModalExpedienteMedico from './ModalExpedienteMedico';
import { esModuloCore } from '../config/modulosSaaS';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario: user, logout: authLogout, boxActivo } = useAuth();
  const [box, setBox] = useState(null);
  const [statusReglamento, setStatusReglamento] = useState(null);
  const [statusExpediente, setStatusExpediente] = useState(null);

  const hideNavRoutes = ['/', '/login'];
  const shouldHideNav =
    hideNavRoutes.includes(location.pathname) ||
    location.pathname.startsWith('/box/') ||
    location.pathname.startsWith('/registro/');
  const isStaticNavRoute = location.pathname === '/admin-competencias/panel/1';

  // Sync de box desde localStorage — solo actualiza el estado si el ID cambió,
  // evitando que JSON.parse genere un nuevo objeto en cada navegación y dispare
  // la cadena: navItems recalcula → CardNav re-renderiza → GSAP reflow → freeze.
  useEffect(() => {
    const bStr = localStorage.getItem('box');
    let b = null;
    if (bStr) {
      try { b = JSON.parse(bStr); } catch (e) {}
    }
    setBox(prev => {
      const prevId = prev?.idBox || prev?.IdBox;
      const newId = b?.idBox || b?.IdBox;
      return prevId === newId ? prev : b;
    });
  }, [user?.idUsuario, boxActivo]);

  // Verificaciones de atleta — se leen en cada ruta pero no tocan el box
  useEffect(() => {
    if (!user || user.rol !== 'Atleta') return;
    const bStr = localStorage.getItem('box');
    let b = null;
    if (bStr) {
      try { b = JSON.parse(bStr); } catch (e) {}
    }
    if (!b) return;
    const idUsuarioActual = user.idUsuario || user.id;
    if (idUsuarioActual) {
      verificarReglamento(b.idBox || b.IdBox, idUsuarioActual);
      verificarExpediente(idUsuarioActual);
    }
  }, [location.pathname, user?.idUsuario || user?.id]);

  // Refresh de datos del Box desde el servidor — solo cuando cambia el box activo
  useEffect(() => {
    const bStr = localStorage.getItem('box');
    let b = null;
    if (bStr) {
      try { b = JSON.parse(bStr); } catch (e) {}
    }
    if (!b || !(b.idBox || b.IdBox)) return;
    const targetId = b.idBox || b.IdBox;
    fetch(`${BOXES_ENDPOINT}/${targetId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && (data.idBox || data.IdBox)) {
          const updatedBox = { ...b, ...data };
          localStorage.setItem('box', JSON.stringify(updatedBox));
          setBox(updatedBox);
        }
      })
      .catch(err => console.error("Error refrescando box:", err));
  }, [boxActivo]);

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
  const navItemsRaw = useMemo(() => {
    if (!user) return [];

    if (user.rol === 'AdminBox' || user.rol === 'Developer') {
      return [
        {
          label: 'Operaciones', icon: 'fa-clipboard-check', bgColor: '#1C1C26', textColor: '#fff',
          links: [
            { label: 'Pase de Lista', href: '/pase-de-lista' },
            { label: 'Programar WODs', href: '/calendario-wods' },
            { label: 'Directorio Atletas', href: '/directorio' },
            { label: 'Nuevo Atleta', href: '/registro-manual' },
            { label: 'Calendario', href: '/admin-calendario' },
          ]
        },
        {
          label: 'Administración', icon: 'fa-store', bgColor: '#1f1015', textColor: '#fff',
          links: [
            { label: 'Punto de Venta / Tienda', href: '/gestion-ventas-productos' },
            { label: 'Inventario de Almacén', href: '/almacen-panel', modulo: 'ventas-avanzado' },
            { label: 'Gestión de Clases', href: '/gestion-clases' },
            { label: 'Mensualidades', href: "/gestion-finanzas" },
            { label: 'Finanzas Globales', href: '/finanzas-globales', modulo: 'finanzas-reportes-globales' },
            { label: 'Anuncios y Campañas', href: '/gestion-anuncios' },
            { label: 'Gestión Competencias', href: '/admin-competencias', modulo: 'competencias' },
            { label: 'Historial Competencias', href: '/admin-competencias/historial', modulo: 'competencias' },
            { label: 'Beneficios', href: '/wolf-beneficios' },
          ]
        },
        {
          label: 'Ajustes', icon: 'fa-cogs', bgColor: '#1C1C26', textColor: '#fff',
          links: [
            { label: 'Panel Principal', href: '/admin-box-panel' },
            { label: 'Staff y Coaches', href: '/gestion-staff' },
            { label: 'Editar Box', href: '/editar-box' },
            { label: 'Mi Suscripción', href: '/mi-suscripcion' },
            { label: 'Bandeja de pagos (Staff)', href: '/admin-roster' },
            { label: 'Bandeja de Validaciones', href: '/admin-box/validaciones' },
            { label: 'Buzón de Sugerencias', href: '/buzon-sugerencias' },
            { label: 'Preguntas y Respuestas', href: '/preguntas-frecuentes' },
            { label: 'Mi Perfil', href: '/perfil-admin' },
          ]
        }
      ];
    }

    if (user.rol === 'Atleta') {
      return [
        {
          label: 'Mi Entrenamiento', icon: 'fa-dumbbell', bgColor: '#1C1C26', textColor: '#fff',
          links: [
            { label: 'Panel de Atleta', href: '/user-panel' },
            { label: 'Mis Resultados (Scores)', href: '/mis-resultados' },
            { label: 'Simulador de Barra', href: '/simulador-barra' }
          ]
        },
        {
          label: 'Comunidad', icon: 'fa-trophy', bgColor: '#1f1015', textColor: '#fff',
          links: [
            { label: 'Calendario', href: '/calendario-atleta' },
            { label: 'Eventos del Box', href: '/competencias' },
            { label: 'Reseñas', href: '/resenas-coaches' },
            { label: 'Tienda del Box', href: '/tienda-box' },
          ]
        },
        {
          label: 'Mi Cuenta', icon: 'fa-user', bgColor: '#1C1C26', textColor: '#fff',
          links: [
            { label: 'Mi Perfil', href: '/mi-perfil' },
            { label: 'Mis Mensualidades', href: '/detalle-plan-user' },
            { label: 'Estado de Cuenta (Tienda)', href: '/mis-deudas' },
            { label: 'Expediente Médico', href: '/expediente-medico' },
            { label: 'Preguntas y Respuestas', href: '/preguntas-frecuentes' },
            { label: 'Buzón de Sugerencias', href: '/buzon-sugerencias' },
          ]
        }
      ];
    }

    return [
      {
        label: 'Clases', icon: 'fa-stopwatch', bgColor: '#1C1C26', textColor: '#fff',
        links: [
          { label: 'Panel de Coach', href: '/admin-box-panel' },
          { label: 'Pase de Lista', href: '/pase-de-lista' },
          { label: 'Calendario de WODs', href: '/calendario-wods' },
          { label: 'Buzón de Sugerencias', href: '/buzon-sugerencias' },
          { label: 'Preguntas y Respuestas', href: '/preguntas-frecuentes' },
          { label: 'Mi Perfil', href: '/perfil-admin' },
        ]
      }
    ];
  }, [user?.idUsuario, user?.rol]); // Solo depende del rol del usuario, box no se usa aquí

  // Filtra los links por módulo del plan SaaS del box. Developer ve todo; las
  // claves CORE siempre pasan. Solo recalcula al cambiar el box (no por navegación).
  const navItems = useMemo(() => {
    const modulosBox = Array.isArray(box?.modulos) ? box.modulos : [];
    const tiene = (clave) =>
      !clave || user?.rol === 'Developer' || esModuloCore(clave) || modulosBox.includes(clave);
    return navItemsRaw
      .map(g => ({ ...g, links: (g.links || []).filter(l => tiene(l.modulo)) }))
      .filter(g => g.links.length > 0);
  }, [navItemsRaw, box, user?.rol]);

  // Ruta de inicio según rol (para el tab Inicio del MobileNavBar)
  const homeRoute = useMemo(() => {
    if (!user) return '/';
    if (user.rol === 'Developer') return '/dashboard';
    if (user.rol === 'AdminBox' || user.rol === 'Coach') return '/admin-box-panel';
    if (user.rol === 'Atleta' || user.rol === 'Usuario') return '/user-panel';
    return '/';
  }, [user]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {!shouldHideNav && createPortal(
        <CardNav
          className={isStaticNavRoute ? 'card-nav-static-only-route' : ''}
          logo={user ? "Logout" : "Login"}
          logoAlt="WOLFPACK"
          items={navItems}
          baseColor="rgba(20, 20, 30, 0.88)"
          menuColor="#ffffff"
          buttonBgColor="#dc3545"
          buttonTextColor="#ffffff"
          onButtonClick={handleLogout}
        />,
        document.body
      )}

      <div className={!shouldHideNav ? 'layout-has-nav layout-content' : ''}>
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