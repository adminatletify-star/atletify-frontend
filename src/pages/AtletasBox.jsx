import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import '../assets/css/AtletasBox.css';
import '../assets/css/Directorio.css';
import BackButton from '../components/BackButton';
import FiltroCategoriaPicker from '../components/FiltroCategoriaPicker';
import BotonSeguro from '../components/BotonSeguro';

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
        (x.rol === 'Atleta' || x.Rol === 'Atleta')
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
    return matchNombre && matchCat && matchEstatus;
  });

  if (loading) {
    return (
      <div className="atb-loading">
        <div className="spinner-wp"></div>
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
              <i className="fas fa-users me-2" style={{ color: 'var(--primary)' }}></i>
              Atletas del Box
            </h1>
            <p className="atb-header-sub">{boxNombre}</p>
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
            <div className="col-12 col-md-6">
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
            <div className="col-12 col-md-6">
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
                            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{atleta.nombre}</div>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{atleta.correo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3" style={{ borderColor: 'var(--border)', verticalAlign: 'middle', background: 'transparent' }}>
                        <span className="badge-estado" style={{ background: 'rgba(168,178,209,0.08)', border: '1px solid rgba(168,178,209,0.2)', color: 'var(--secondary)', fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', letterSpacing: '1px' }}>
                          {atleta.categoriaBase || 'Sin categoría'}
                        </span>
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
                          <Link
                            to={`/perfil-atleta-admin/${atleta.idUsuario}`}
                            className="atb-action-btn btn btn-sm btn-outline-secondary"
                            title="Ver expediente"
                          >
                            <i className="fas fa-id-card"></i>
                          </Link>
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
                      <div className="atleta-nombre">{atleta.nombre}</div>
                      <div className="atleta-correo">{atleta.correo}</div>
                    </div>
                    <span className={`badge-estado flex-shrink-0 ${atleta.activo ? 'badge-estado-activo' : 'badge-estado-inactivo'}`}>
                      <i className={`fas ${atleta.activo ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                      {atleta.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Fila inferior: categoría + acciones */}
                  <div className="atb-atleta-footer">
                    <span className="badge-estado" style={{ background: 'rgba(168,178,209,0.08)', border: '1px solid rgba(168,178,209,0.2)', color: 'var(--secondary)', fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', letterSpacing: '1px' }}>
                      <i className="fas fa-tag me-1"></i>
                      {atleta.categoriaBase || 'Sin categoría'}
                    </span>
                    <div className="d-flex gap-2">
                      <Link
                        to={`/editar-usuario/${atleta.idUsuario}`}
                        className="atb-action-btn btn btn-sm btn-outline-info"
                        title="Editar"
                      >
                        <i className="fas fa-pen"></i>
                      </Link>
                      <Link
                        to={`/perfil-atleta-admin/${atleta.idUsuario}`}
                        className="atb-action-btn btn btn-sm btn-outline-secondary"
                        title="Expediente"
                      >
                        <i className="fas fa-id-card"></i>
                      </Link>
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
    </div>
  );
}
