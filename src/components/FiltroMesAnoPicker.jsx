import { useState } from 'react';
import { createPortal } from 'react-dom';
import './FiltroMesAnoPicker.css';

const MESES = [
  { valor: 1,  nombre: 'ENE', icono: 'fas fa-snowflake' },
  { valor: 2,  nombre: 'FEB', icono: 'fas fa-heart' },
  { valor: 3,  nombre: 'MAR', icono: 'fas fa-seedling' },
  { valor: 4,  nombre: 'ABR', icono: 'fas fa-cloud-rain' },
  { valor: 5,  nombre: 'MAY', icono: 'fas fa-sun' },
  { valor: 6,  nombre: 'JUN', icono: 'fas fa-fire' },
  { valor: 7,  nombre: 'JUL', icono: 'fas fa-umbrella-beach' },
  { valor: 8,  nombre: 'AGO', icono: 'fas fa-water' },
  { valor: 9,  nombre: 'SEP', icono: 'fas fa-leaf' },
  { valor: 10, nombre: 'OCT', icono: 'fas fa-ghost' },
  { valor: 11, nombre: 'NOV', icono: 'fas fa-wind' },
  { valor: 12, nombre: 'DIC', icono: 'fas fa-gift' },
];

const NOMBRES_LARGOS = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Parsea "YYYY-MM" → { año, mes } o null
function parsear(valor) {
  if (!valor) return null;
  const [a, m] = valor.split('-');
  return { año: parseInt(a), mes: parseInt(m) };
}

// Este picker recibe valor = "YYYY-MM" | "" y llama onCambiar("YYYY-MM" | "")
export default function FiltroMesAnoPicker({ valor = '', onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const actual = new Date();
  const parsed = parsear(valor);

  const [añoVisible, setAñoVisible] = useState(parsed?.año ?? actual.getFullYear());

  const abrir = () => {
    // Sincronizar año visible con el valor actual cada vez que abre
    setAñoVisible(parsed?.año ?? actual.getFullYear());
    setAbierto(true);
  };

  const seleccionar = (mes) => {
    const nuevo = `${añoVisible}-${String(mes).padStart(2, '0')}`;
    onCambiar(nuevo);
    setAbierto(false);
  };

  const limpiar = () => {
    onCambiar('');
    setAbierto(false);
  };

  const etiquetaTrigger = parsed
    ? `${NOMBRES_LARGOS[parsed.mes]} ${parsed.año}`
    : 'Todos los meses';

  const icono = parsed
    ? MESES.find(m => m.valor === parsed.mes)?.icono ?? 'fas fa-calendar-alt'
    : 'fas fa-calendar-alt';

  return (
    <>
      <button
        type="button"
        className={`fmap-trigger ${!valor ? 'fmap-trigger--vacio' : ''}`}
        onClick={abrir}
      >
        <span className="fmap-trigger-left">
          <i className={`${icono} fmap-trigger-icon`}></i>
          <span className="fmap-trigger-label">{etiquetaTrigger}</span>
        </span>
        <i className="fas fa-chevron-down fmap-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="fmap-overlay" onClick={() => setAbierto(false)}>
          <div className="fmap-panel" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="fmap-header">
              <span className="fmap-title">
                <i className="fas fa-calendar-alt"></i> Período
              </span>
              <button type="button" className="fmap-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Todos los meses */}
            <div className="fmap-todos-wrap">
              <button
                type="button"
                className={`fmap-todos-btn ${!valor ? 'fmap-todos-btn--activo' : ''}`}
                onClick={limpiar}
              >
                <i className="fas fa-layer-group me-2"></i>Todos los Meses
                {!valor && <i className="fas fa-check ms-auto fmap-check"></i>}
              </button>
            </div>

            {/* Navegación de año */}
            <div className="fmap-año-nav">
              <button
                type="button"
                className="fmap-año-btn"
                onClick={() => setAñoVisible(a => a - 1)}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="fmap-año-label">{añoVisible}</span>
              <button
                type="button"
                className="fmap-año-btn"
                onClick={() => setAñoVisible(a => a + 1)}
                disabled={añoVisible >= actual.getFullYear()}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>

            {/* Grid de meses */}
            <div className="fmap-grid">
              {MESES.map(m => {
                const esActivo = parsed?.mes === m.valor && parsed?.año === añoVisible;
                // Bloquear meses futuros en el año actual
                const esFuturo = añoVisible === actual.getFullYear() && m.valor > actual.getMonth() + 1;
                return (
                  <button
                    key={m.valor}
                    type="button"
                    className={`fmap-item${esActivo ? ' fmap-item--activo' : ''}${esFuturo ? ' fmap-item--futuro' : ''}`}
                    onClick={() => !esFuturo && seleccionar(m.valor)}
                    disabled={esFuturo}
                  >
                    <i className={`${m.icono} fmap-item-icon`}></i>
                    <span className="fmap-item-nombre">{m.nombre}</span>
                    {esActivo && <i className="fas fa-check fmap-item-check"></i>}
                  </button>
                );
              })}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
