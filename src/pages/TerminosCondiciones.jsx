import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import '../assets/css/TerminosCondiciones.css';

export default function TerminosCondiciones() {
  const location = useLocation();
  const navigate = useNavigate();
  const [requiereAceptacion, setRequiereAceptacion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    // Verificar si venimos forzados desde el Login o Cadenero
    if (location.state && location.state.requiereAceptacion) {
      setRequiereAceptacion(true);
      const storedUser = JSON.parse(localStorage.getItem('usuario'));
      if (storedUser) {
        setUsuario(storedUser);
      } else {
        navigate('/login');
      }
    }
  }, [location, navigate]);

  const handleAceptar = async () => {
    if (!usuario) return;
    setLoading(true);

    try {
      const idUser = usuario.idUsuario || usuario.id || usuario.Id || usuario.IdUsuario;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/${idUser}/aceptar-terminos`, {
        method: 'PUT'
      });

      if (res.ok) {
        // 1. Actualizar el objeto en localStorage (sesión activa)
        const updatedUser = { ...usuario, aceptoTerminos: true };
        localStorage.setItem('usuario', JSON.stringify(updatedUser));

        // 2. También actualizar dentro de cuentasGuardadas para que el cambio persista
        try {
          const cuentas = JSON.parse(localStorage.getItem('cuentasGuardadas') || '[]');
          const cuentasActualizadas = cuentas.map(c => {
            const cId = c.usuario?.idUsuario || c.usuario?.id || c.usuario?.Id || c.usuario?.IdUsuario;
            if (String(cId) === String(idUser)) {
              return { ...c, usuario: { ...c.usuario, aceptoTerminos: true } };
            }
            return c;
          });
          localStorage.setItem('cuentasGuardadas', JSON.stringify(cuentasActualizadas));
        } catch (e) {
          console.warn('No se pudo actualizar cuentasGuardadas:', e);
        }

        // 3. Redirección inteligente igual que en Login
        switch (updatedUser.rol) {
          case 'Developer': navigate('/dashboard'); break;
          case 'AdminBox':
          case 'Coach': navigate('/admin-box-panel'); break;
          case 'Usuario': navigate('/sala-espera'); break;
          case 'Juez': navigate(`/juez/${updatedUser.idCompetenciaAsignada}`); break;
          default: navigate('/user-panel'); break;
        }
      } else {
        alert("Ocurrió un error al intentar aceptar los términos. Inténtalo más tarde.");
      }
    } catch (e) {
      alert("Error de conexión. Revisa tu internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tc-root">
      {!requiereAceptacion && (
        <div className="tc-back">
          <button onClick={() => navigate(-1)} className="btn btn-link text-white text-decoration-none">
            <i className="fas fa-arrow-left fa-lg"></i> Regresar
          </button>
        </div>
      )}

      <div className="tc-container">
        <div className="tc-header text-center">
          <div className="tc-logo">
            <i className="fas fa-paw"></i>
          </div>
          <h1 className="tc-title">Términos y Condiciones de Uso</h1>
          <p className="tc-subtitle">Atletify System</p>
          <span className="tc-date">Última actualización: 28 de abril de 2026</span>
        </div>

        <div className="tc-content">
          <p>Bienvenido a Atletify System, una plataforma integral de gestión deportiva desarrollada por estudiantes de la Universidad Politécnica de Quintana Roo (UPQROO). Al utilizar nuestro sistema, ya sea como Atleta, Coach, Staff o Administrador, usted acepta cumplir con los siguientes términos. Por favor, léalos con atención.</p>

          <h3 className="tc-section-title">1. Aceptación de los Términos</h3>
          <p>Al marcar la casilla "He leído y acepto los Términos y Condiciones" durante su registro manual o digital, usted establece un acuerdo legal vinculante con Atletify System. Si no está de acuerdo con alguna de estas cláusulas, no podrá completar su solicitud de inscripción ni acceder a las funciones del software.</p>

          <h3 className="tc-section-title">2. Descripción del Servicio</h3>
          <p>Atletify System es una herramienta de software diseñada para optimizar la administración de centros de entrenamiento (Boxes/Gimnasios). El sistema permite:</p>
          <ul>
            <li>Registro y control de expedientes de atletas.</li>
            <li>Gestión de suscripciones, pagos y estatus financiero ("Semáforo").</li>
            <li>Monitoreo de niveles deportivos y objetivos físicos.</li>
            <li>Almacenamiento de información médica y de contacto para casos de emergencia.</li>
          </ul>

          <h3 className="tc-section-title">3. Registro y Seguridad de la Cuenta</h3>
          <p><strong>Veracidad de datos:</strong> Usted se compromete a proporcionar información real y actualizada. El uso de nombres falsos o información de contacto errónea puede resultar en la suspensión de la cuenta.</p>
          <p><strong>Responsabilidad de Credenciales:</strong> Su usuario y contraseña son personales e intransferibles. Usted es el único responsable de cualquier actividad realizada bajo su cuenta.</p>
          <p><strong>Roles de Usuario:</strong> El acceso a ciertas funciones dependerá de su rol (Atleta, Coach o Staff). Intentar vulnerar o acceder a funciones de un rol superior (privilegios de Administrador) será motivo de baja inmediata.</p>

          <h3 className="tc-section-title">4. Condiciones de Salud y Responsabilidad Física</h3>
          <p>Dado que el sistema gestiona actividades de alto impacto físico:</p>
          <ul>
            <li><strong>Declaración de Aptitud:</strong> El usuario declara estar en condiciones físicas óptimas para realizar ejercicio.</li>
            <li><strong>Historial Médico:</strong> Es responsabilidad del atleta informar verazmente sobre lesiones, discapacidades o tipos de sangre en su expediente digital.</li>
            <li><strong>Exclusión de Responsabilidad:</strong> Atletify System es una herramienta de gestión y no sustituye el consejo médico profesional. Los desarrolladores y la institución (UPQROO) no se hacen responsables por lesiones, accidentes o problemas de salud derivados de los entrenamientos sugeridos o registrados en la plataforma.</li>
          </ul>

          <h3 className="tc-section-title">5. Gestión Financiera y Suscripciones</h3>
          <p><strong>Planes de Membresía:</strong> Los atletas aceptan los costos y vigencias de los planes asignados por el Box.</p>
          <p><strong>Suscripciones Permanentes:</strong> Los usuarios registrados como Coach o Staff cuentan con una suscripción de carácter permanente y exenta de pago, siempre que mantengan su relación laboral activa con el centro.</p>
          <p><strong>Incumplimiento de Pago:</strong> El sistema marcará automáticamente en estatus "Vencido" o "Alerta" (Color Rojo en el Semáforo) a los usuarios que no cubran su cuota, pudiendo restringirse su acceso a las instalaciones o clases.</p>

          <h3 className="tc-section-title">6. Política de Privacidad y Datos (Supabase)</h3>
          <p>Su información se almacena de forma segura en la infraestructura de Supabase.</p>
          <ul>
            <li><strong>Uso de Datos:</strong> Los datos recolectados se utilizan exclusivamente para la operación interna del Box (asistencia, cobros y seguimiento deportivo).</li>
            <li><strong>Protección:</strong> No vendemos ni compartimos su información personal con terceros ajenos al servicio de administración del gimnasio.</li>
          </ul>

          <h3 className="tc-section-title">7. Propiedad Intelectual</h3>
          <p>El diseño, código fuente, logotipos y arquitectura de Atletify System son propiedad intelectual del equipo de desarrollo de la UPQROO. Queda prohibida la reproducción, ingeniería inversa o distribución del software sin autorización expresa de los autores.</p>

          <h3 className="tc-section-title">8. Modificaciones y Cancelación</h3>
          <p>Atletify System se reserva el derecho de:</p>
          <ul>
            <li>Modificar estos términos en cualquier momento para adaptarlos a nuevas funciones.</li>
            <li>Cancelar cuentas de usuarios que infrinjan estas reglas o que realicen un uso indebido del servidor (ataques de inyección, spam, etc.).</li>
          </ul>
        </div>

        {requiereAceptacion ? (
          <div className="tc-action-area">
            <div className="tc-warning">
              <i className="fas fa-exclamation-triangle"></i>
              <span>Debes aceptar los Términos y Condiciones para continuar usando la plataforma.</span>
            </div>
            <button
              className="tc-btn-accept"
              onClick={handleAceptar}
              disabled={loading}
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin me-2"></i> Procesando...</>
              ) : (
                <><i className="fas fa-check-circle me-2"></i> He leído y acepto los Términos y Condiciones</>
              )}
            </button>
            <button
              className="tc-btn-reject mt-3"
              onClick={() => {
                localStorage.removeItem('usuario');
                localStorage.removeItem('token');
                navigate('/login');
              }}
            >
              No aceptar y cerrar sesión
            </button>
          </div>
        ) : (
          <div className="tc-action-area text-center mt-5">
            <button onClick={() => navigate(-1)} className="btn btn-outline-light rounded-pill px-4">
              <i className="fas fa-arrow-left me-2"></i> Volver al formulario
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
