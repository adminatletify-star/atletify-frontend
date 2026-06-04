import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import CajaActivaPicker from '../components/CajaActivaPicker';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/GestionVentasProductos.css';

export default function GestionVentasProductos() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [listaApartados, setListaApartados] = useState(['General (Box)']);
  const [apartadoActivo, setApartadoActivo] = useState('General (Box)');
  const [boxGuardado, setBoxGuardado] = useState(null);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (b) {
      setBoxGuardado(b);
      cargarApartadosDesdeBD(b.idBox);
    }

    const guardado = localStorage.getItem('apartadoVentas');
    if (guardado) setApartadoActivo(guardado);
  }, []);

  const cargarApartadosDesdeBD = async (idBox) => {
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/apartados/${idBox}`);
      if(res.ok) {
        const data = await res.json();
        // data is now an array of objects: { nombre, esPrivado, permisoVenta }
        localStorage.setItem('apartadosData', JSON.stringify(data));
        setListaApartados(data.map(d => d.nombre));
      }
    } catch(e) {
      console.error("Error al cargar lista de apartados:", e);
    }
  };

  const handleCambioApartado = (valor) => {
    localStorage.setItem('apartadoVentas', valor);
    setApartadoActivo(valor);
  };

  const handleCrearTienda = async () => {
    const nuevoApartado = await window.wpPrompt("NUEVA MINI-TIENDA\nEscribe el nombre (Ej: Recepción, Competencia, Coach Silvia):");

    if (nuevoApartado && nuevoApartado.trim() !== '') {
      const limpio = nuevoApartado.trim();

      try {
        const res = await fetch(`${VENTAS_ENDPOINT}/apartados`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idBox: boxGuardado.idBox, nombre: limpio })
        });

        if (res.ok) {
          localStorage.setItem('apartadoVentas', limpio);
          setApartadoActivo(limpio);
          cargarApartadosDesdeBD(boxGuardado.idBox);
          alert(`¡Tienda "${limpio}" creada y guardada en el sistema!`);
        } else {
          const errorData = await res.json();
          alert(errorData.mensaje || "Error al crear la tienda.");
        }
      } catch (error) {
        alert("Error de conexión al crear la tienda.");
      }
    }
  };

  const resetearHistorial = async () => {
    if (!boxGuardado) return;
    const confirmacion1 = await window.wpConfirm(` ¡ADVERTENCIA! Borrarás TODO el historial de ventas de la tienda "${apartadoActivo}". ¿Seguro?`);
    if (!confirmacion1) return;

    const confirmacion2 = await window.wpPrompt("Para confirmar, escribe la palabra: BORRAR");
    if (confirmacion2 !== "BORRAR") return alert("Operación cancelada.");

    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/reset/${boxGuardado.idBox}?apartado=${encodeURIComponent(apartadoActivo)}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if(res.ok) {
        alert(`¡Purga completada! 🧹\n${data.mensaje}`);
        cargarApartadosDesdeBD(boxGuardado.idBox);
      } else {
        alert(`Error: ${data.mensaje}`);
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
    }
  };

  const eliminarMiniTienda = async () => {
    if (!boxGuardado) return;
    if (apartadoActivo === 'General (Box)') {
      return alert("No puedes eliminar la tienda principal del Box. Es indestructible. 🐺");
    }

    const confirmacion = await window.wpConfirm(`¿Estás seguro de eliminar la tienda "${apartadoActivo}" para siempre?\n\n(Si quedaron productos en el inventario de esta tienda, se moverán automáticamente a "General (Box)").`);
    if (!confirmacion) return;

    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/apartados/${boxGuardado.idBox}?nombre=${encodeURIComponent(apartadoActivo)}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if(res.ok) {
        alert(`Tienda eliminada.\n${data.mensaje}`);
        localStorage.setItem('apartadoVentas', 'General (Box)');
        setApartadoActivo('General (Box)');
        cargarApartadosDesdeBD(boxGuardado.idBox);
      } else {
        alert(`Error: ${data.mensaje}`);
      }
    } catch (error) {
      alert("Error de conexión al eliminar la tienda.");
    }
  };

  let opciones = [
    {
      titulo: 'Vender Productos',
      descripcion: 'Registra una nueva venta y descuenta stock automáticamente.',
      icono: 'fa-cash-register',
      colorClass: 'success',
      ruta: '/punto-de-venta',
      variante: 'red'
    },
    {
      titulo: 'Gestionar Inventario',
      descripcion: 'Agrega, edita o elimina productos y controla el stock disponible.',
      icono: 'fa-boxes',
      colorClass: 'warning',
      ruta: '/gestion-inventario',
      variante: 'gold'
    },
    {
      titulo: 'Historial de Ventas',
      descripcion: 'Consulta todas las ventas realizadas, busca por producto o fecha.',
      icono: 'fa-receipt',
      colorClass: 'info',
      ruta: '/historial-ventas',
      variante: 'cyan'
    },
    {
      titulo: 'Gestión de Fiado',
      descripcion: 'Controla las deudas de los atletas de confianza y registra sus pagos/abonos.',
      icono: 'fa-hand-holding-usd',
      colorClass: 'danger',
      ruta: '/gestion-fiado',
      variante: 'red'
    }
  ];

  if (apartadoActivo !== 'General (Box)') {
    opciones = opciones.filter(o => o.titulo !== 'Gestión de Fiado');
  }

  return (
    <div className="gvp-page">

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="gvp-header">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/admin-box-panel" />
            <div className="gvp-header-icon d-none d-sm-flex">
              <i className="fas fa-store"></i>
            </div>
            <h1 className="gvp-header-title">
              Gestión y <span>Ventas</span>
            </h1>
          </div>
      </header>

      <div className="container-xl px-3 px-md-4">

        {/* ══════════════════════════════════
            SELECTOR DE TIENDA
        ══════════════════════════════════ */}
        <div className="row justify-content-center mb-4 mb-md-5">
          <div className="col-12 col-md-8 col-xl-6">
            <div className="gvp-tienda-card">
              <p className="gvp-tienda-label">
                <i className="fas fa-store-alt"></i>
                Caja activa
              </p>
              <CajaActivaPicker
                valor={apartadoActivo}
                opciones={listaApartados}
                onCambiar={handleCambioApartado}
                onCrear={handleCrearTienda}
              />
              <p className="gvp-tienda-hint">
                Inventario, ventas y cortes se guardan en <strong>{apartadoActivo}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════
            TARJETAS DE ACCIONES
        ══════════════════════════════════ */}
        <div className="row g-3 g-md-4 justify-content-center mb-2">
          {opciones.map((op) => (
            <div key={op.ruta} className="col-12 col-md-6 col-xl-4">
              <div
                className={`gvp-opcion-card gvp-opcion-card--${op.variante}`}
                onClick={() => navigate(op.ruta)}
              >
                <div className={`gvp-opcion-icono gvp-opcion-icono--${op.variante}`}>
                  <i className={`fas ${op.icono}`}></i>
                </div>
                <h2 className="gvp-opcion-titulo">{op.titulo}</h2>
                <p className="gvp-opcion-desc">{op.descripcion}</p>
                <button
                  className={`gvp-opcion-btn gvp-opcion-btn--${op.variante}`}
                  onClick={(e) => { e.stopPropagation(); navigate(op.ruta); }}
                >
                  <i className={`fas ${op.icono}`}></i>
                  {op.titulo}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════
            ZONA DE PELIGRO
        ══════════════════════════════════ */}
        {(usuario?.rol === 'Developer' || usuario?.rol === 'AdminBox') && (
          <div className="gvp-danger-zone">
            <p className="gvp-danger-title">
              <i className="fas fa-exclamation-triangle"></i>
              Zona de peligro
            </p>

            <div className="d-flex justify-content-center gap-2 gap-md-3 flex-wrap">
              <BotonSeguro onClick={resetearHistorial} className="gvp-danger-btn" textoProcesando="Procesando...">
                <i className="fas fa-trash-alt"></i>
                Purgar historial de "{apartadoActivo}"
              </BotonSeguro>

              {apartadoActivo !== 'General (Box)' && (
                <BotonSeguro onClick={eliminarMiniTienda} className="gvp-danger-btn gvp-danger-btn--warning" textoProcesando="Procesando...">
                  <i className="fas fa-store-slash"></i>
                  Destruir tienda "{apartadoActivo}"
                </BotonSeguro>
              )}
            </div>

            <p className="gvp-danger-hint">
              La purga borra el historial de ventas. La destrucción elimina la tienda por completo.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
