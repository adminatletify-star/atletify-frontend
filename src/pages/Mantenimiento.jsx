import './PagesCSS/Mantenimiento.css';

// Pantalla de Mantenimiento — diseño "Crossfit Disc Loader"
// Loader: anillos giratorios + mancuerna orbitando + disco de crossfit con texto
export default function Mantenimiento() {
  // Lee el box al que el usuario intentaba conectarse (si lo hay)
  let box = null;
  try { box = JSON.parse(localStorage.getItem('box') || 'null'); } catch (e) { box = null; }

  // Regresa al home preservando la sesión (no limpia localStorage)
  const irAlHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="mant-page">

      {/* ───────── HEADER ───────── */}
      <header className="mant-nav">
        <div className="container py-3">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <div className="mant-brand">
              {box?.logo ? (
                <span className="mant-brand-logo">
                  <img src={box.logo} alt={box.nombre || 'Box'} />
                </span>
              ) : (
                <span className="mant-brand-mark" aria-hidden="true"></span>
              )}
              <span className="mant-brand-text">
                {box?.nombre ? <span className="mant-brand-box">{box.nombre}</span> : 'BOX'}
                <span className="mant-brand-sep">&nbsp;/&nbsp;</span>
                <span className="mant-brand-plat">Atletify</span>
              </span>
            </div>
            <div className="mant-status-pill">
              <span className="mant-status-dot"></span>
              <span>Mantenimiento</span>
            </div>
          </div>
        </div>
      </header>

      {/* ───────── MAIN ───────── */}
      <main className="mant-main">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-md-10 col-lg-8">
              <div className="mant-block">

                <span className="mant-kicker">▲ Aviso del sistema</span>

                <h1 className="mant-h1">
                  En <span className="mant-slash">/</span> Mantenimiento
                </h1>

                <p className="mant-desc">
                  La plataforma se encuentra en este momento con una situación importante por
                  resolver. Nuestro equipo ya está trabajando en ello y estará lista lo antes
                  posible para que sigas disfrutando de tus entrenamientos.
                </p>

                <div className="mant-stage">
                  <div className="mant-loader" role="status" aria-label="Sistema en mantenimiento">

                    <div className="mant-sweep" aria-hidden="true"></div>

                    <div className="mant-whirl" aria-hidden="true">
                      <svg viewBox="0 0 288 288">
                        <defs>
                          <linearGradient id="fadeA" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%"   stopColor="#ff2a2a" stopOpacity="0"/>
                            <stop offset="60%"  stopColor="#ff2a2a" stopOpacity=".5"/>
                            <stop offset="100%" stopColor="#ff2a2a" stopOpacity="1"/>
                          </linearGradient>
                          <linearGradient id="fadeB" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%"   stopColor="#ececec" stopOpacity="0"/>
                            <stop offset="100%" stopColor="#ececec" stopOpacity=".75"/>
                          </linearGradient>
                          <linearGradient id="fadeC" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%"   stopColor="#ececec" stopOpacity="0"/>
                            <stop offset="100%" stopColor="#ececec" stopOpacity=".35"/>
                          </linearGradient>
                        </defs>

                        <g className="mant-ring-a" style={{ transformBox: 'fill-box' }}>
                          <circle cx="144" cy="144" r="136" fill="none" stroke="#ececec" strokeOpacity=".08" strokeWidth="1"/>
                          <path d="M 144 8 A 136 136 0 0 1 280 144"
                                fill="none" stroke="url(#fadeA)" strokeWidth="2.5" strokeLinecap="round"/>
                          <circle cx="280" cy="144" r="2.6" fill="#ff2a2a"/>
                        </g>

                        <g className="mant-ring-b" style={{ transformBox: 'fill-box' }}>
                          <circle cx="144" cy="144" r="120" fill="none"
                                  stroke="#ececec" strokeOpacity=".45" strokeWidth="1.2"
                                  strokeDasharray="2 12" strokeLinecap="round"/>
                          <path d="M 144 24 A 120 120 0 0 1 224 56"
                                fill="none" stroke="url(#fadeB)" strokeWidth="2.5" strokeLinecap="round"/>
                          <circle cx="224" cy="56" r="2" fill="#ececec"/>
                        </g>

                        <g className="mant-ring-c" style={{ transformBox: 'fill-box' }}>
                          <circle cx="144" cy="144" r="106" fill="none" stroke="#ececec" strokeOpacity=".14" strokeWidth=".8"/>
                          <path d="M 144 38 A 106 106 0 0 1 90 48"
                                fill="none" stroke="url(#fadeC)" strokeWidth="2" strokeLinecap="round"/>
                          <circle cx="90" cy="48" r="1.6" fill="#ececec" opacity=".6"/>
                        </g>

                        <g className="mant-ring-a" style={{ transformBox: 'fill-box' }}>
                          <circle cx="144" cy="280" r="1.6" fill="#ff2a2a" opacity=".8"/>
                          <circle cx="40"  cy="200" r="1.2" fill="#ececec" opacity=".5"/>
                        </g>
                      </svg>
                    </div>

                    <div className="mant-orbit" aria-hidden="true">
                      <div className="mant-dumbbell">
                        <svg viewBox="-32 -16 64 32">
                          <rect x="-22" y="-2.2" width="44" height="4.4" rx="1" fill="#ececec"/>
                          <rect x="-18" y="-5" width="3" height="10" fill="#ececec"/>
                          <rect x="15"  y="-5" width="3" height="10" fill="#ececec"/>
                          <g fill="#ececec">
                            <rect x="-30" y="-13" width="11" height="26" rx="2"/>
                            <rect x="19"  y="-13" width="11" height="26" rx="2"/>
                          </g>
                          <g fill="#ff2a2a">
                            <rect x="-27" y="-13" width="2" height="26"/>
                            <rect x="23"  y="-13" width="2" height="26"/>
                          </g>
                          <g stroke="#0a0a0c" strokeWidth="1" opacity=".5">
                            <line x1="-22" y1="-13" x2="-22" y2="13"/>
                            <line x1="22"  y1="-13" x2="22"  y2="13"/>
                          </g>
                        </svg>
                      </div>
                    </div>

                    <div className="mant-disc" aria-hidden="true">
                      <svg viewBox="-100 -100 200 200">
                        <defs>
                          <radialGradient id="discFace" cx="50%" cy="40%" r="70%">
                            <stop offset="0%"  stopColor="#2a2a30"/>
                            <stop offset="60%" stopColor="#16161a"/>
                            <stop offset="100%" stopColor="#0a0a0c"/>
                          </radialGradient>
                          <radialGradient id="discTire" cx="50%" cy="50%" r="60%">
                            <stop offset="60%" stopColor="#0a0a0c"/>
                            <stop offset="100%" stopColor="#000"/>
                          </radialGradient>
                          <path id="discTextTop"
                                d="M 0,0 m -64,0 a 64,64 0 1,1 128,0 a 64,64 0 1,1 -128,0"/>
                          <path id="discTextBottom"
                                d="M 0,0 m -50,0 a 50,50 0 1,0 100,0 a 50,50 0 1,0 -100,0"/>
                        </defs>

                        <circle cx="0" cy="0" r="92" fill="url(#discTire)"/>
                        <circle cx="0" cy="0" r="92" fill="none" stroke="#ff2a2a" strokeWidth="1.5" opacity=".9"/>
                        <circle cx="0" cy="0" r="88" fill="none" stroke="#ececec" strokeWidth=".4" opacity=".15"/>

                        <circle cx="0" cy="0" r="78" fill="url(#discFace)"/>
                        <circle cx="0" cy="0" r="78" fill="none" stroke="#ececec" strokeWidth=".8" opacity=".3"/>
                        <circle cx="0" cy="0" r="72" fill="none" stroke="#ececec" strokeWidth=".4" opacity=".15"/>

                        <g fill="#ff2a2a">
                          <g><polygon points="0,-74 -3,-68 3,-68"/></g>
                          <g transform="rotate(45)"><polygon points="0,-74 -3,-68 3,-68"/></g>
                          <g transform="rotate(90)"><polygon points="0,-74 -3,-68 3,-68"/></g>
                          <g transform="rotate(135)"><polygon points="0,-74 -3,-68 3,-68"/></g>
                          <g transform="rotate(180)"><polygon points="0,-74 -3,-68 3,-68"/></g>
                          <g transform="rotate(225)"><polygon points="0,-74 -3,-68 3,-68"/></g>
                          <g transform="rotate(270)"><polygon points="0,-74 -3,-68 3,-68"/></g>
                          <g transform="rotate(315)"><polygon points="0,-74 -3,-68 3,-68"/></g>
                        </g>

                        <g fill="#ececec">
                          <g><rect x="-1.6" y="-48" width="3.2" height="16" rx="1.6"/></g>
                          <g transform="rotate(60)"><rect x="-1.6" y="-48" width="3.2" height="16" rx="1.6"/></g>
                          <g transform="rotate(120)"><rect x="-1.6" y="-48" width="3.2" height="16" rx="1.6"/></g>
                          <g transform="rotate(180)"><rect x="-1.6" y="-48" width="3.2" height="16" rx="1.6"/></g>
                          <g transform="rotate(240)"><rect x="-1.6" y="-48" width="3.2" height="16" rx="1.6"/></g>
                          <g transform="rotate(300)"><rect x="-1.6" y="-48" width="3.2" height="16" rx="1.6"/></g>
                        </g>

                        <circle cx="0" cy="0" r="24" fill="#0a0a0c" stroke="#ff2a2a" strokeWidth="1.2"/>
                        <circle cx="0" cy="0" r="18" fill="none" stroke="#ececec" strokeWidth=".6" opacity=".4"/>
                        <circle cx="0" cy="0" r="5" fill="#ff2a2a"/>
                        <circle cx="0" cy="0" r="2.2" fill="#0a0a0c"/>

                        <text fill="#ececec"
                              fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
                              fontWeight="900" fontSize="13" letterSpacing="2.6">
                          <textPath href="#discTextTop" startOffset="25%" textAnchor="middle">
                            MANTENIMIENTO
                          </textPath>
                        </text>

                        <text fill="#ff2a2a"
                              fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
                              fontWeight="900" fontSize="9" letterSpacing="3.4">
                          <textPath href="#discTextBottom" startOffset="75%" textAnchor="middle">
                            ▲ NO REPS ▲
                          </textPath>
                        </text>
                      </svg>
                    </div>

                  </div>
                </div>

                {/* Botón para regresar al home preservando la sesión */}
                <button type="button" className="mant-back-btn" onClick={irAlHome}>
                  <i className="fas fa-arrow-left me-2"></i>
                  Regresar al inicio
                </button>

              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
