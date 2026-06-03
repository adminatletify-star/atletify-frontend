import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import '../assets/css/AtletasBox.css';
import '../assets/css/Directorio.css';
import '../assets/css/GestionClases.css';
import AtletifyLoader from '../components/AtletifyLoader';
import BackButton from '../components/BackButton';
import FiltroCategoriaPicker from '../components/FiltroCategoriaPicker';
import BotonSeguro from '../components/BotonSeguro';

const ROLES = [
  { value: '',         icon: 'fa-users',                label: 'Todos los roles', desc: 'Muestra atletas, coaches y administradores', color: '#A8B2D1' },
  { value: 'Atleta',   icon: 'fa-running',              label: 'Atleta',          desc: 'Miembros activos del box',                   color: '#2ECC71' },
  { value: 'Coach',    icon: 'fa-chalkboard-teacher',   label: 'Coach',           desc: 'Entrenadores del box',                       color: '#4FC3F7' },
  { value: 'AdminBox', icon: 'fa-shield-alt',           label: 'Admin Box',       desc: 'Administradores del box',                    color: '#F5A623' },
];

const PAGE_SIZE = 10;

// Normaliza (quita tildes + lowercase) para búsqueda tolerante a acentos.
const normalizar = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const esStaff = (a) => {
  const rol = a.rol || a.Rol;
  return rol === 'Coach' || rol === 'AdminBox';
};

/* ── Paginación (mismo patrón que PreguntasRespuestasDev) ── */
function buildPaginas(pagina, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  if (pagina > 3) out.push('...');
  const start = Math.max(2, pagina - 1);
  const end = Math.min(total - 1, pagina + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (pagina < total - 2) out.push('...');
  out.push(total);
  return out;
}

function Paginacion({ pagina, totalPaginas, onCambio }) {
  if (totalPaginas <= 1) return null;
  const paginas = buildPaginas(pagina, totalPaginas);
  return (
    <div className="atb-paginacion" role="navigation" aria-label="Paginación">
      <button
        type="button"
        className="atb-pag-btn"
        disabled={pagina === 1}
        onClick={() => onCambio(pagina - 1)}
        aria-label="Página anterior"
      >
        <i className="fas fa-chevron-left"></i>
      </button>

      {/* Números — solo en pantallas ≥576px */}
      <div className="atb-pag-numbers">
        {paginas.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="atb-pag-ellipsis">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`atb-pag-btn ${pagina === p ? 'atb-pag-btn--active' : ''}`}
              onClick={() => onCambio(p)}
            >
              {p}
            </button>
          )
        )}
      </div>

      {/* Indicador compacto — solo en móvil (no crece con el nº de páginas) */}
      <span className="atb-pag-compact">{pagina} / {totalPaginas}</span>

      <button
        type="button"
        className="atb-pag-btn"
        disabled={pagina === totalPaginas}
        onClick={() => onCambio(pagina + 1)}
        aria-label="Página siguiente"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}

export default function AtletasBox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boxNombre, setBoxNombre] = useState('');

  const storedUser = JSON.parse(localStorage.getItem('usuario')) || {};
  const isCoach = storedUser.rol === 'Coach' || storedUser.Rol === 'Coach';

  // Filtros — el estatus inicial viene de la query param (?estatus=activo)
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState(searchParams.get('estatus') || '');
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [mostrarModalRol, setMostrarModalRol] = useState(false);
  const [staffSeleccionado, setStaffSeleccionado] = useState(null);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u || !b) { navigate('/login'); return; }
    setBoxNombre(b.nombre || '');
    cargarAtletas(b.idBox);
  }, [navigate]);

  async function cargarAtletas(idBox) {
    try {
      const res = await fetch(USUARIOS_ENDPOINT);
      const data = await res.json();
      const todos = Array.isArray(data) ? data : (data.data || []);
      const delBox = todos.filter(x =>
        (x.idBoxPredeterminado === idBox || x.IdBoxPredeterminado === idBox) &&
        (x.rol === 'Atleta' || x.Rol === 'Atleta' || x.rol === 'Coach' || x.Rol === 'Coach' || x.rol === 'AdminBox' || x.Rol === 'AdminBox')
      );
      setAtletas(delBox);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function expulsarAtleta(idUsuario) {
    if (!await window.wpConfirm('¿Seguro que deseas expulsar a este atleta del Box? Quedará como usuario independiente.')) return;
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idBoxPredeterminado: 0, rol: 'Usuario' })
      });
      if (res.ok) {
        alert('Atleta expulsado correctamente');
        const b = JSON.parse(localStorage.getItem('box'));
        cargarAtletas(b.idBox);
      } else {
        alert('Error al expulsar al atleta');
      }
    } catch (err) { console.error(err); alert('Error de conexión'); }
  }

  // Derivados
  const activos = atletas.filter(a => a.activo);
  const inactivos = atletas.filter(a => !a.activo);
  const categorias = [...new Set(atletas.map(a => a.categoriaBase).filter(Boolean))].sort();

  // Filtro + búsqueda sobre TODO lo visible (nombre, correo, teléfono,
  // categoría, rol y estado) — así el usuario encuentra lo que ve en pantalla.
  const atletasMostrados = atletas.filter(a => {
    const rolActual = a.rol || a.Rol;
    const matchCat = !filtroCat || a.categoriaBase === filtroCat;
    const matchEstatus = !filtroEstatus || (filtroEstatus === 'activo' ? a.activo : !a.activo);
    const matchRol = !filtroRol || rolActual === filtroRol;
    if (!matchCat || !matchEstatus || !matchRol) return false;
    if (!busqueda) return true;
    const termino = normalizar(busqueda);
    const haystack = normalizar([
      a.nombre, a.apellidos, a.correo, a.telefono, a.categoriaBase, rolActual,
      ROLES.find(r => r.value === rolActual)?.label,
      a.activo ? 'activo' : 'inactivo',
    ].filter(Boolean).join(' '));
    return haystack.includes(termino);
  }).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));

  const rolSeleccionado = ROLES.find(r => r.value === filtroRol) || ROLES[0];

  // Paginación de 10 en 10 (compartida entre tabla desktop y cards móvil)
  const totalPaginas = Math.max(1, Math.ceil(atletasMostrados.length / PAGE_SIZE));
  const atletasPagina = atletasMostrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
  const desde = atletasMostrados.length === 0 ? 0 : (pagina - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(pagina * PAGE_SIZE, atletasMostrados.length);

  // Resetea a la página 1 al cambiar cualquier filtro o el buscador
  useEffect(() => { setPagina(1); }, [busqueda, filtroEstatus, filtroCat, filtroRol]);
  // Clampa la página si la lista se acorta
  useEffect(() => { if (pagina > totalPaginas) setPagina(totalPaginas); }, [pagina, totalPaginas]);

  if (loading) {
    return (
      <div className="atb-loading">
        <AtletifyLoader />
      </div>
    );
  }

  /* Botones de acción reutilizados en tabla y cards */
  const renderAcciones = (atleta) => (
    <>
      {!isCoach && (
        <Link
          to={`/editar-usuario/${atleta.idUsuario}`}
          className="atb-action-btn atb-action-btn--edit"
          title="Editar perfil"
          aria-label="Editar perfil"
        >
          <i className="fas fa-pen"></i>
        </Link>
      )}
      {esStaff(atleta) ? (
        <button
          type="button"
          className="atb-action-btn atb-action-btn--info"
          title="Ver datos"
          aria-label="Ver datos"
          onClick={() => setStaffSeleccionado(atleta)}
        >
          <i className="fas fa-id-card"></i>
        </button>
      ) : (
        <Link
          to={`/perfil-atleta-admin/${atleta.idUsuario}`}
          className="atb-action-btn atb-action-btn--info"
          title="Ver expediente"
          aria-label="Ver expediente"
        >
          <i className="fas fa-id-card"></i>
        </Link>
      )}
      {!isCoach && (
        <BotonSeguro
          onClick={() => expulsarAtleta(atleta.idUsuario)}
          className="atb-action-btn atb-action-btn--danger"
          title="Expulsar del Box"
          tiempoBloqueo={2000}
          textoProcesando={<i className="fas fa-spinner fa-spin"></i>}
        >
          <i className="fas fa-user-minus"></i>
        </BotonSeguro>
      )}
    </>
  );

  return (
    <div className="atb-page">

      {/* ══════════════════════════════════
          HEADER STICKY
      ══════════════════════════════════ */}
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton />
          <h1 className="gc-header-title">
            Atletas del <span>Box</span>
          </h1>
          <Link to="/exportar-bd-box" className="atb-export-btn ms-auto">
            <i className="fas fa-database"></i>
            <span className="atb-btn-label">Exportar BD</span>
          </Link>
        </div>
      </header>

      <div className="atb-container">

        {/* ══════════════════════════════════
            CHIPS DE ESTADÍSTICAS / FILTRO RÁPIDO
        ══════════════════════════════════ */}
        <div className="atb-chips">
          <button
            className={`atb-chip total-chip ${filtroEstatus === '' ? 'seleccionado' : ''}`}
            onClick={() => setFiltroEstatus('')}
          >
            <i className="fas fa-users"></i>
            <span>Todos</span>
            <span className="atb-chip-num">{atletas.length}</span>
          </button>

          <button
            className={`atb-chip activo-chip ${filtroEstatus === 'activo' ? 'seleccionado' : ''}`}
            onClick={() => setFiltroEstatus('activo')}
          >
            <i className="fas fa-check-circle"></i>
            <span>Activos</span>
            <span className="atb-chip-num">{activos.length}</span>
          </button>

          <button
            className={`atb-chip inactivo-chip ${filtroEstatus === 'inactivo' ? 'seleccionado' : ''}`}
            onClick={() => setFiltroEstatus('inactivo')}
          >
            <i className="fas fa-times-circle"></i>
            <span>Inactivos</span>
            <span className="atb-chip-num">{inactivos.length}</span>
          </button>
        </div>

        {/* ══════════════════════════════════
            BARRA DE FILTROS (toolbar mobile-first)
        ══════════════════════════════════ */}
        <div className="atb-filtros">
          <div className="atb-toolbar">
            <div className="atb-toolbar-search">
              <div className="atb-search-wrapper">
                <i className="fas fa-search atb-search-icon"></i>
                <input
                  type="text"
                  className="atb-search-input"
                  placeholder="Buscar por nombre, correo, categoría…"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button
                    type="button"
                    className="atb-search-clear"
                    onClick={() => setBusqueda('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="atb-toolbar-ctrl">
              <button
                type="button"
                className={`atb-rol-btn${filtroRol ? ' atb-rol-btn--active' : ''}`}
                style={{ '--rol-color': rolSeleccionado.color }}
                onClick={() => setMostrarModalRol(true)}
              >
                <span className="atb-rol-btn__left">
                  <span className="atb-rol-btn__icon">
                    <i className={`fas ${rolSeleccionado.icon}`} />
                  </span>
                  <span className="atb-rol-btn__label">{rolSeleccionado.label}</span>
                </span>
                <i className="fas fa-chevron-down atb-rol-btn__arrow" />
              </button>
            </div>

            <div className="atb-toolbar-ctrl">
              <FiltroCategoriaPicker
                categorias={categorias}
                valor={filtroCat}
                onCambiar={setFiltroCat}
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════
            CONTADOR + LISTA
        ══════════════════════════════════ */}
        {atletasMostrados.length === 0 ? (
          <div className="tarjeta-panel">
            <div className="estado-vacio">
              <i className="fas fa-user-slash"></i>
              <p>No se encontraron atletas con ese criterio.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="atb-contador">
              Mostrando <strong>{desde}–{hasta}</strong> de <strong>{atletasMostrados.length}</strong>{' '}
              {atletasMostrados.length === 1 ? 'atleta' : 'atletas'}
            </p>

            {/* ── TABLA — desktop (md+) ── */}
            <div className="d-none d-md-block atb-table-wrap">
              <table className="atb-table">
                <thead>
                  <tr>
                    <th>Atleta</th>
                    <th>Categoría</th>
                    <th>Estatus</th>
                    <th className="atb-th-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {atletasPagina.map(atleta => (
                    <tr key={atleta.idUsuario}>
                      <td>
                        <div className="atb-cell-atleta">
                          <div className="avatar-inicial atb-avatar">
                            {atleta.foto
                              ? <img src={atleta.foto} alt={atleta.nombre} />
                              : atleta.nombre?.charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="atb-cell-id">
                            <div className="atb-cell-nombre">
                              <span className="atb-nombre-txt">{atleta.nombre}</span>
                              {(atleta.rol === 'Coach' || atleta.Rol === 'Coach') && <span className="atb-rolchip atb-rolchip--coach">Coach</span>}
                              {(atleta.rol === 'AdminBox' || atleta.Rol === 'AdminBox') && <span className="atb-rolchip atb-rolchip--admin">Admin</span>}
                            </div>
                            <div className="atb-cell-correo">{atleta.correo}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {esStaff(atleta) ? (
                          <span className="atb-dash">—</span>
                        ) : (
                          <span className="atb-cat-badge">
                            {atleta.categoriaBase || 'Sin categoría'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge-estado ${atleta.activo ? 'badge-estado-activo' : 'badge-estado-inactivo'}`}>
                          <i className={`fas ${atleta.activo ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                          {atleta.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="atb-th-end">
                        <div className="atb-cell-actions">
                          {renderAcciones(atleta)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── CARDS — mobile (< md) ── */}
            <div className="d-md-none atb-lista">
              {atletasPagina.map(atleta => (
                <div key={atleta.idUsuario} className="atb-atleta-card">
                  <div className="atb-card-top">
                    <div className="avatar-inicial atb-avatar">
                      {atleta.foto
                        ? <img src={atleta.foto} alt={atleta.nombre} />
                        : atleta.nombre?.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="atb-card-id">
                      <div className="atb-card-nombre">
                        <span className="atb-nombre-txt">{atleta.nombre}</span>
                        {(atleta.rol === 'Coach' || atleta.Rol === 'Coach') && <span className="atb-rolchip atb-rolchip--coach">Coach</span>}
                        {(atleta.rol === 'AdminBox' || atleta.Rol === 'AdminBox') && <span className="atb-rolchip atb-rolchip--admin">Admin</span>}
                      </div>
                      <div className="atb-card-correo">{atleta.correo}</div>
                    </div>
                    <span className={`badge-estado atb-card-estado ${atleta.activo ? 'badge-estado-activo' : 'badge-estado-inactivo'}`}>
                      <i className={`fas ${atleta.activo ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                      <span className="atb-estado-txt">{atleta.activo ? 'Activo' : 'Inactivo'}</span>
                    </span>
                  </div>

                  <div className="atb-atleta-footer">
                    {esStaff(atleta) ? (
                      <span className="atb-cat-badge atb-cat-badge--staff">
                        <i className="fas fa-shield-alt me-1"></i>Staff
                      </span>
                    ) : (
                      <span className="atb-cat-badge">
                        <i className="fas fa-tag me-1"></i>
                        {atleta.categoriaBase || 'Sin categoría'}
                      </span>
                    )}
                    <div className="atb-card-actions">
                      {renderAcciones(atleta)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Paginacion pagina={pagina} totalPaginas={totalPaginas} onCambio={setPagina} />
          </>
        )}

      </div>

      {/* ══════════════════════════════════
          MODAL FILTRO ROL (centrado)
      ══════════════════════════════════ */}
      {mostrarModalRol && createPortal(
        <div
          className="atb-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setMostrarModalRol(false); }}
        >
          <div className="atb-modal">
            <div className="atb-modal__header">
              <div>
                <p className="atb-modal__supertitle">ATLETAS</p>
                <h2 className="atb-modal__title">Filtrar por Rol</h2>
              </div>
              <button
                type="button"
                className="atb-modal__close"
                onClick={() => setMostrarModalRol(false)}
                aria-label="Cerrar"
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <p className="atb-modal__hint">
              Selecciona el tipo de usuario que deseas ver.
            </p>
            <div className="atb-modal__list">
              {ROLES.map(rol => {
                const activo = filtroRol === rol.value;
                return (
                  <button
                    key={rol.value || 'todos'}
                    type="button"
                    className={`atb-rol-opcion${activo ? ' atb-rol-opcion--activo' : ''}`}
                    style={{ '--rol-color': rol.color }}
                    onClick={() => { setFiltroRol(rol.value); setMostrarModalRol(false); }}
                  >
                    <span className="atb-rol-opcion__icon">
                      <i className={`fas ${rol.icon}`} />
                    </span>
                    <span className="atb-rol-opcion__info">
                      <span className="atb-rol-opcion__nombre">{rol.label}</span>
                      <span className="atb-rol-opcion__desc">{rol.desc}</span>
                    </span>
                    {activo && <i className="fas fa-check-circle atb-rol-opcion__check" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ══════════════════════════════════
          MODAL STAFF (centrado, sistema de diseño)
      ══════════════════════════════════ */}
      {staffSeleccionado && createPortal(
        <div
          className="atb-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setStaffSeleccionado(null); }}
        >
          <div className="atb-modal atb-staff-modal">
            <button
              type="button"
              className="atb-modal__close atb-staff-close"
              onClick={() => setStaffSeleccionado(null)}
              aria-label="Cerrar"
            >
              <i className="fas fa-times" />
            </button>

            <div className="atb-staff-head">
              <div className="avatar-inicial atb-staff-avatar">
                {staffSeleccionado.foto
                  ? <img src={staffSeleccionado.foto} alt={staffSeleccionado.nombre} />
                  : staffSeleccionado.nombre?.charAt(0).toUpperCase()
                }
              </div>
              <h4 className="atb-staff-nombre">
                {staffSeleccionado.nombre} {staffSeleccionado.apellidos || ''}
              </h4>
              <span className={`atb-rolchip ${(staffSeleccionado.rol === 'Coach' || staffSeleccionado.Rol === 'Coach') ? 'atb-rolchip--coach' : 'atb-rolchip--admin'} atb-staff-rolchip`}>
                <i className="fas fa-shield-alt me-1"></i>
                {staffSeleccionado.rol || staffSeleccionado.Rol}
              </span>
            </div>

            <div className="atb-staff-info">
              <div className="atb-staff-row">
                <span className="atb-staff-label"><i className="fas fa-envelope" style={{ color: 'var(--primary)' }}></i>Correo</span>
                <span className="atb-staff-val atb-staff-val--break">{staffSeleccionado.correo}</span>
              </div>
              <div className="atb-staff-row">
                <span className="atb-staff-label"><i className="fas fa-phone" style={{ color: 'var(--success)' }}></i>Teléfono</span>
                <span className="atb-staff-val">{staffSeleccionado.telefono || 'No registrado'}</span>
              </div>
              <div className="atb-staff-row">
                <span className="atb-staff-label"><i className="fas fa-tint" style={{ color: 'var(--danger)' }}></i>Tipo de Sangre</span>
                <span className="atb-staff-val">{staffSeleccionado.tipoDeSangre || staffSeleccionado.TipoDeSangre || 'No registrado'}</span>
              </div>
              <div className="atb-staff-row">
                <span className="atb-staff-label"><i className="fas fa-tshirt" style={{ color: 'var(--accent)' }}></i>Talla</span>
                <span className="atb-staff-val">{staffSeleccionado.tallaPlayera || staffSeleccionado.TallaPlayera || 'No registrada'}</span>
              </div>
              <div className="atb-staff-row">
                <span className="atb-staff-label"><i className="fas fa-layer-group" style={{ color: 'var(--accent-cool)' }}></i>Nivel</span>
                <span className="atb-staff-val">{staffSeleccionado.categoriaBase || staffSeleccionado.CategoriaBase || 'Sin definir'}</span>
              </div>
              <div className="atb-staff-row atb-staff-row--col">
                <span className="atb-staff-label"><i className="fas fa-running" style={{ color: 'var(--success)' }}></i>Deportes Previos</span>
                <span className="atb-staff-val">
                  {staffSeleccionado.tieneExperiencia || staffSeleccionado.TieneExperiencia
                    ? (staffSeleccionado.deporteExperiencia || staffSeleccionado.DeporteExperiencia || 'Sí (No especificó)')
                    : 'Ninguno / Sin experiencia'
                  }
                </span>
              </div>
              <div className="atb-staff-row atb-staff-row--col">
                <span className="atb-staff-label"><i className="fas fa-notes-medical" style={{ color: 'var(--accent)' }}></i>Lesiones / Enfermedades</span>
                <span className="atb-staff-val">{staffSeleccionado.tieneDiscapacidad || staffSeleccionado.TieneDiscapacidad || 'Ninguna registrada'}</span>
              </div>
              <div className="atb-staff-row atb-staff-row--col">
                <span className="atb-staff-label"><i className="fas fa-truck-medical" style={{ color: 'var(--danger)' }}></i>Contacto de Emergencia</span>
                <span className="atb-staff-val">
                  {staffSeleccionado.contactoEmergenciaNombre || staffSeleccionado.ContactoEmergenciaNombre
                    ? `${staffSeleccionado.contactoEmergenciaNombre || staffSeleccionado.ContactoEmergenciaNombre} - ${staffSeleccionado.contactoEmergenciaTelefono || staffSeleccionado.ContactoEmergenciaTelefono || 'Sin tel'}`
                    : 'No registrado'
                  }
                </span>
              </div>
            </div>

            <button
              type="button"
              className="atb-staff-cerrar"
              onClick={() => setStaffSeleccionado(null)}
            >
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
