import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import './HomeRedesContacto.css';

const API_BASE = import.meta.env.VITE_API_URL;

// Limpia handle/usuario de URL de Instagram/Facebook para mostrarlo como @usuario
function extraerHandle(url) {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const seg = u.pathname.split('/').filter(Boolean)[0];
    return seg ? `@${seg}` : u.hostname;
  } catch (e) {
    return url;
  }
}

function normalizarUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
}

export default function HomeRedesContacto() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/developer/configuracion`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled) setConfig(data); })
      .catch(() => { /* sin datos */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Construir lista solo con los que tienen valor
  const redes = [];
  if (config?.linkInstagram) {
    redes.push({
      tipo: 'instagram',
      icon: 'fab fa-instagram',
      label: 'Instagram',
      valor: extraerHandle(config.linkInstagram),
      href: normalizarUrl(config.linkInstagram),
      target: '_blank'
    });
  }
  if (config?.linkFacebook) {
    redes.push({
      tipo: 'facebook',
      icon: 'fab fa-facebook-f',
      label: 'Facebook',
      valor: extraerHandle(config.linkFacebook),
      href: normalizarUrl(config.linkFacebook),
      target: '_blank'
    });
  }
  if (config?.correoContacto) {
    redes.push({
      tipo: 'correo',
      icon: 'fas fa-envelope',
      label: 'Correo',
      valor: config.correoContacto,
      href: `mailto:${config.correoContacto}`,
      target: '_self'
    });
  }
  if (config?.telefonoSoporte) {
    redes.push({
      tipo: 'telefono',
      icon: 'fas fa-phone',
      label: 'Soporte',
      valor: config.telefonoSoporte,
      href: `tel:${config.telefonoSoporte.replace(/[^+\d]/g, '')}`,
      target: '_self'
    });
  }

  return (
    <section className="hrc-section" ref={sectionRef}>
      <div className="hrc-bg-glow" aria-hidden="true" />

      <div className="container">
        <motion.div
          className="hrc-header"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="hrc-badge">
            <span className="hrc-badge-dot" />
            CONTRATA EL SISTEMA
          </span>
          <h2 className="hrc-title">
            Lleva tu box <span className="hrc-title-slash">/</span> al siguiente nivel
          </h2>
          <p className="hrc-subtitle">
            ¿Quieres digitalizar tu CrossFit box con Atletify? Escríbenos por cualquiera
            de estos canales y agenda una demo con nuestro equipo.
          </p>
        </motion.div>

        {loading ? (
          <div className="hrc-loading">
            <i className="fas fa-circle-notch fa-spin"></i>
          </div>
        ) : redes.length === 0 ? (
          <motion.div
            className="hrc-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <i className="fas fa-handshake"></i>
            <p>Pronto habilitaremos nuestros canales de contacto. Mientras tanto, escríbenos a través del formulario de soporte.</p>
          </motion.div>
        ) : (
          <motion.div
            className="hrc-grid"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {redes.map((r, i) => (
              <motion.a
                key={r.tipo}
                href={r.href}
                target={r.target}
                rel={r.target === '_blank' ? 'noopener noreferrer' : undefined}
                className={`hrc-card hrc-card--${r.tipo}`}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
              >
                <div className="hrc-card-icon-wrap">
                  <i className={`${r.icon} hrc-card-icon`}></i>
                </div>
                <div className="hrc-card-body">
                  <div className="hrc-card-label">{r.label}</div>
                  <div className="hrc-card-valor">{r.valor}</div>
                </div>
                <i className="fas fa-arrow-right hrc-card-arrow"></i>
              </motion.a>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
