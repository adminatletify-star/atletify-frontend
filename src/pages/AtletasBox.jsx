import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import '../assets/css/AtletasBox.css';
import '../assets/css/Directorio.css';
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

export default function AtletasBox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boxNombre, setBoxNombre] = useState('');

  // Filtros — el estatus inicial viene de la query param (?estatus=activo)
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState(searchParams.get('estatus') || '');
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [mostrarModalRol, setMostrarModalRol] = useState(false);
  const [staffSeleccionado, setStaffSeleccionado] = useState(null);

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

  const atletasMostrados = atletas.filter(a => {
    const termino = busqueda.toLowerCase();
    const matchNombre = !busqueda ||
      a.nombre?.toLowerCase().includes(termino) ||
      a.correo?.toLowerCase().includes(termino);
    const matchCat = !filtroCat || a.categoriaBase === filtroCat;
    const matchEstatus = !filtroEstatus ||
      (filtroEstatus === 'activo' ? a.activo : !a.activo);
    const rolActual = a.rol || a.Rol;
    const matchRol = !filtroRol || rolActual === filtroRol;
    return matchNombre && matchCat && matchEstatus && matchRol;
  }).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));

  const rolSeleccionado = ROLES.find(r => r.value === filtroRol) || ROLES[0];

  if (loading) {
    return (
      <div className="atb-loading">
        <AtletifyLoader />
      </div>
    );
  }

  return (
    <div className="atb-page">

      {/* ══════════════════════════════════
          HEADER FIJO
      ══════════════════════════════════ */}
      <header className="atb-header">
        <div className="atb-header-inner">
          <BackButton />
          <div>
            <h1 className="atb-header-title">
              Atletas del <span>Box</span>
            </h1>
            <p className="atb-header-sub">{boxNombre}</p>
          </div>
          <div className="ms-auto">
            <Link to="/exportar-bd-box" className="btn btn-danger btn-sm rounded-pill fw-bold px-3">
              <i className="fas fa-database me-2"></i>Exportar BD
            </Link>
          </div>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">

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
            BARRA DE FILTROS
        ══════════════════════════════════ */}
        <div className="atb-filtros">
          <div className="row g-2">
            <div className="col-12 col-md-4">
              <div className="atb-search-wrapper">
                <i className="fas fa-search atb-search-icon"></i>
                <input
                  type="text"
                  className="atb-search-input"
                  placeholder="Buscar por nombre o correo..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
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
                <i className="fas fa-chevron-right atb-rol-btn__arrow" />
              </button>
            </div>
            <div className="col-12 col-md-4">
              <FiltroCategoriaPicker
                categorias={categorias}
                valor={filtroCat}
                onCambiar={setFiltroCat}
              />
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════
            CONTADOR Y LISTA
        ══════════════════════════════════ */}
        <p className="atb-contador">
          Mostrando <strong>{atletasMostrados.length}</strong> de {atletas.length} atletas
        </p>

        {atletasMostrados.length === 0 ? (
          <div className="tarjeta-panel">
            <div className="estado-vacio">
              <i className="fas fa-search"></i>
              <p>No se encontraron atletas con ese criterio.</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── TABLA — desktop (md+) ── */}
            <div className="d-none d-md-block tarjeta-panel overflow-hidden">
              <table className="table mb-0" style={{
                '--bs-table-bg': 'transparent',
                '--bs-table-color': 'var(--text-primary)',
                '--bs-table-border-color': 'var(--border)',
                '--bs-table-hover-bg': 'var(--bg-card-hover)',
                '--bs-table-hover-color': 'var(--text-primary)',
                color: 'var(--text-primary)'
              }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <th className="border-0 py-3 px-4" style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Atleta</th>
                    <th className="border-0 py-3" style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Categoría</th>
                    <th className="border-0 py-3" style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Estatus</th>
                    <th className="border-0 py-3 text-end px-4" style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {atletasMostrados.map(atleta => (
                    <tr key={atleta.idUsuario} style={{ borderColor: 'var(--border)' }}>
                      <td className="py-3 px-4" style={{ borderColor: 'var(--border)', verticalAlign: 'middle', background: 'transparent', color: 'var(--text-primary)' }}>
                        <div className="d-flex align-items-center gap-3">
                          <div className="avatar-inicial">
                            {atleta.foto
                              ? <img src={atleta.foto} alt={atleta.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                              : atleta.nombre?.charAt(0).toUpperCase()
                            }
                          </div>
                          <div>
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              {atleta.nombre}
                              {(atleta.rol === 'Coach' || atleta.Rol === 'Coach') && <span className="badge bg-info text-dark ms-2" style={{fontSize: '0.65rem'}}>Coach</span>}
                              {(atleta.rol === 'AdminBox' || atleta.Rol === 'AdminBox') && <span className="badge bg-warning text-dark ms-2" style={{fontSize: '0.65rem'}}>Admin</span>}
                            </div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{atleta.correo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3" style={{ borderColor: 'var(--border)', verticalAlign: 'middle', background: 'transparent' }}>
                        {(atleta.rol === 'Coach' || atleta.Rol === 'Coach' || atleta.rol === 'AdminBox' || atleta.Rol === 'AdminBox') ? (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        ) : (
                          <span className="badge-estado" style={{ background: 'rgba(168,178,209,0.08)', border: '1px solid rgba(168,178,209,0.2)', color: 'var(--secondary)', fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', letterSpacing: '1px' }}>
                            {atleta.categoriaBase || 'Sin categoría'}
                          </span>
                        )}
                      </td>
                      <td className="py-3" style={{ borderColor: 'var(--border)', verticalAlign: 'middle', background: 'transparent' }}>
                        <span className={`badge-estado ${atleta.activo ? 'badge-estado-activo' : 'badge-estado-inactivo'}`}>
                          <i className={`fas ${atleta.activo ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                          {atleta.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4" style={{ borderColor: 'var(--border)', verticalAlign: 'middle', background: 'transparent' }}>
                        <div className="d-flex justify-content-end gap-2">
                          <Link
                            to={`/editar-usuario/${atleta.idUsuario}`}
                            className="atb-action-btn btn btn-sm btn-outline-info"
                            title="Editar perfil"
                          >
                            <i className="fas fa-pen"></i>
                          </Link>
                          {(atleta.rol === 'Coach' || atleta.Rol === 'Coach' || atleta.rol === 'AdminBox' || atleta.Rol === 'AdminBox') ? (
                            <button
                              className="atb-action-btn btn btn-sm btn-outline-secondary"
                              title="Ver datos"
                              onClick={() => setStaffSeleccionado(atleta)}
                            >
                              <i className="fas fa-id-card"></i>
                            </button>
                          ) : (
                            <Link
                              to={`/perfil-atleta-admin/${atleta.idUsuario}`}
                              className="atb-action-btn btn btn-sm btn-outline-secondary"
                              title="Ver expediente"
                            >
                              <i className="fas fa-id-card"></i>
                            </Link>
                          )}
                          <BotonSeguro
                            onClick={() => expulsarAtleta(atleta.idUsuario)}
                            className="atb-action-btn btn btn-sm btn-outline-danger"
                            title="Expulsar del Box"
                            tiempoBloqueo={2000}
                            textoProcesando={<i className="fas fa-spinner fa-spin"></i>}
                          >
                            <i className="fas fa-user-minus"></i>
                          </BotonSeguro>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── CARDS — mobile (< md) ── */}
            <div className="d-md-none atleta-lista">
              {atletasMostrados.map(atleta => (
                <div key={atleta.idUsuario} className="atb-atleta-card">
                  {/* Fila superior: avatar + nombre + estado */}
                  <div className="d-flex align-items-center gap-3">
                    <div className="avatar-inicial">
                      {atleta.foto
                        ? <img src={atleta.foto} alt={atleta.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                        : atleta.nombre?.charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="atleta-nombre d-flex align-items-center flex-wrap gap-1">
                        {atleta.nombre}
                        {(atleta.rol === 'Coach' || atleta.Rol === 'Coach') && <span className="badge bg-info text-dark" style={{fontSize: '0.6rem'}}>Coach</span>}
                        {(atleta.rol === 'AdminBox' || atleta.Rol === 'AdminBox') && <span className="badge bg-warning text-dark" style={{fontSize: '0.6rem'}}>Admin</span>}
                      </div>
                      <div className="atleta-correo">{atleta.correo}</div>
                    </div>
                    <span className={`badge-estado flex-shrink-0 ${atleta.activo ? 'badge-estado-activo' : 'badge-estado-inactivo'}`}>
                      <i className={`fas ${atleta.activo ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                      {atleta.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Fila inferior: categoría + acciones */}
                  <div className="atb-atleta-footer">
                    {(atleta.rol === 'Coach' || atleta.Rol === 'Coach' || atleta.rol === 'AdminBox' || atleta.Rol === 'AdminBox') ? (
                      <span></span>
                    ) : (
                      <span className="badge-estado" style={{ background: 'rgba(168,178,209,0.08)', border: '1px solid rgba(168,178,209,0.2)', color: 'var(--secondary)', fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', letterSpacing: '1px' }}>
                        <i className="fas fa-tag me-1"></i>
                        {atleta.categoriaBase || 'Sin categoría'}
                      </span>
                    )}
                    <div className="d-flex gap-2">
                      <Link
                        to={`/editar-usuario/${atleta.idUsuario}`}
                        className="atb-action-btn btn btn-sm btn-outline-info"
                        title="Editar"
                      >
                        <i className="fas fa-pen"></i>
                      </Link>
                      {(atleta.rol === 'Coach' || atleta.Rol === 'Coach' || atleta.rol === 'AdminBox' || atleta.Rol === 'AdminBox') ? (
                        <button
                          className="atb-action-btn btn btn-sm btn-outline-secondary"
                          title="Ver datos"
                          onClick={() => setStaffSeleccionado(atleta)}
                        >
                          <i className="fas fa-id-card"></i>
                        </button>
                      ) : (
                        <Link
                          to={`/perfil-atleta-admin/${atleta.idUsuario}`}
                          className="atb-action-btn btn btn-sm btn-outline-secondary"
                          title="Expediente"
                        >
                          <i className="fas fa-id-card"></i>
                        </Link>
                      )}
                      <BotonSeguro
                        onClick={() => expulsarAtleta(atleta.idUsuario)}
                        className="atb-action-btn btn btn-sm btn-outline-danger"
                        title="Expulsar"
                        tiempoBloqueo={2000}
                        textoProcesando={<i className="fas fa-spinner fa-spin"></i>}
                      >
                        <i className="fas fa-user-minus"></i>
                      </BotonSeguro>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      {/* MODAL FILTRO ROL */}
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

      {/* MODAL STAFF */}
      {staffSeleccionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: '400px', width: '100%', margin: 'auto' }}>
            <div className="modal-content text-start border-secondary shadow-lg rounded-4 p-4 w-100" style={{ backgroundColor: '#141414', border: '1px solid #333' }}>
              
              <div className="text-center mb-3 mt-2">
                <div style={{ width: '80px', height: '80px', margin: '0 auto', borderRadius: '50%', backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {staffSeleccionado.foto ? (
                    <img src={staffSeleccionado.foto} alt={staffSeleccionado.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    staffSeleccionado.nombre?.charAt(0).toUpperCase()
                  )}
                </div>
                <h4 style={{ color: 'var(--text-primary)', marginTop: '1rem', marginBottom: '0.25rem', fontFamily: 'var(--font-heading)' }}>
                  {staffSeleccionado.nombre} {staffSeleccionado.apellidos || ''}
                </h4>
                <div className="mb-3 mt-2">
                  <span className={`badge ${staffSeleccionado.rol === 'Coach' || staffSeleccionado.Rol === 'Coach' ? 'bg-info text-dark' : 'bg-warning text-dark'}`} style={{ fontSize: '0.8rem', padding: '0.5em 1em', letterSpacing: '0.5px' }}>
                    <i className="fas fa-shield-alt me-1"></i> {staffSeleccionado.rol || staffSeleccionado.Rol}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid var(--border)' }}>
                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary">
                  <span style={{ color: 'var(--text-muted)' }}><i className="fas fa-envelope me-2 text-primary"></i>Correo:</span>
                  <span style={{ color: 'var(--text-primary)', textAlign: 'right', wordBreak: 'break-all', maxWidth: '60%' }}>{staffSeleccionado.correo}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary">
                  <span style={{ color: 'var(--text-muted)' }}><i className="fas fa-phone me-2 text-success"></i>Teléfono:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{staffSeleccionado.telefono || 'No registrado'}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary">
                  <span style={{ color: 'var(--text-muted)' }}><i className="fas fa-tint me-2 text-danger"></i>Tipo de Sangre:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{staffSeleccionado.tipoDeSangre || staffSeleccionado.TipoDeSangre || 'No registrado'}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary">
                  <span style={{ color: 'var(--text-muted)' }}><i className="fas fa-tshirt me-2 text-warning"></i>Talla:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{staffSeleccionado.tallaPlayera || staffSeleccionado.TallaPlayera || 'No registrada'}</span>
                </div>
                <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-secondary">
                  <span style={{ color: 'var(--text-muted)' }}><i className="fas fa-layer-group me-2 text-info"></i>Nivel:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{staffSeleccionado.categoriaBase || staffSeleccionado.CategoriaBase || 'Sin definir'}</span>
                </div>
                <div className="d-flex flex-column mb-2 pb-2 border-bottom border-secondary">
                  <span style={{ color: 'var(--text-muted)', marginBottom: '4px' }}><i className="fas fa-running me-2 text-success"></i>Deportes Previos:</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {staffSeleccionado.tieneExperiencia || staffSeleccionado.TieneExperiencia
                      ? (staffSeleccionado.deporteExperiencia || staffSeleccionado.DeporteExperiencia || 'Sí (No especificó)')
                      : 'Ninguno / Sin experiencia'
                    }
                  </span>
                </div>
                <div className="d-flex flex-column mb-2 pb-2 border-bottom border-secondary">
                  <span style={{ color: 'var(--text-muted)', marginBottom: '4px' }}><i className="fas fa-notes-medical me-2 text-warning"></i>Lesiones / Enfermedades:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{staffSeleccionado.tieneDiscapacidad || staffSeleccionado.TieneDiscapacidad || 'Ninguna registrada'}</span>
                </div>
                <div className="d-flex flex-column mt-3">
                  <span style={{ color: 'var(--text-muted)', marginBottom: '4px' }}><i className="fas fa-truck-medical me-2 text-danger"></i>Contacto de Emergencia:</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {staffSeleccionado.contactoEmergenciaNombre || staffSeleccionado.ContactoEmergenciaNombre
                      ? `${staffSeleccionado.contactoEmergenciaNombre || staffSeleccionado.ContactoEmergenciaNombre} - ${staffSeleccionado.contactoEmergenciaTelefono || staffSeleccionado.ContactoEmergenciaTelefono || 'Sin tel'}`
                      : 'No registrado'
                    }
                  </span>
                </div>
              </div>

              <button className="btn btn-outline-secondary w-100 py-2 fw-bold" style={{ borderRadius: '8px' }} onClick={() => setStaffSeleccionado(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
