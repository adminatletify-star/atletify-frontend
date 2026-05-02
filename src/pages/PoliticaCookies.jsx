import { useNavigate, Link } from 'react-router-dom';
import '../assets/css/TerminosCondiciones.css'; // Reutilizamos el estilo legal

export default function PoliticaCookies() {
  const navigate = useNavigate();

  return (
    <div className="tc-root">
      <div className="tc-back">
        <button onClick={() => navigate(-1)} className="btn btn-link text-white text-decoration-none">
          <i className="fas fa-arrow-left fa-lg"></i> Regresar
        </button>
      </div>

      <div className="tc-container">
        <div className="tc-header text-center">
          <div className="tc-logo">
            <i className="fas fa-cookie-bite"></i>
          </div>
          <h1 className="tc-title">Política de Gestión de Cookies</h1>
          <p className="tc-subtitle">Atletify System</p>
          <span className="tc-date">Última actualización: 28 de abril de 2026</span>
        </div>

        <div className="tc-content">
          <p>En Atletify System, valoramos la transparencia y la privacidad de nuestros usuarios. Esta política explica de manera detallada qué son las cookies, cómo las utilizamos en nuestra plataforma y qué opciones tiene usted para gestionarlas.</p>

          <h3 className="tc-section-title">1. ¿Qué son las cookies?</h3>
          <p>Las cookies son pequeños archivos de datos que se descargan en su dispositivo (computadora, tablet o smartphone) al acceder a nuestra web pública o panel de administración. Estos archivos permiten que el sistema reconozca su dispositivo y almacene información sobre sus preferencias o acciones pasadas.</p>

          <h3 className="tc-section-title">2. ¿Por qué son necesarias en este proyecto?</h3>
          <p>Para que una arquitectura moderna como la nuestra (Frontend en React y Backend en .NET) funcione correctamente, las cookies actúan como el "puente" de comunicación constante. Sin ellas, el sistema no podría recordar que usted ya inició sesión y tendría que pedirle su contraseña cada vez que cambie de pestaña.</p>

          <h3 className="tc-section-title">3. Tipos de Cookies que utilizamos</h3>
          <p>Dividimos nuestras cookies en tres categorías principales para su comprensión:</p>
          
          <div className="ms-3 mb-4">
            <h5 className="text-warning mb-2"><i className="fas fa-shield-alt me-2"></i>A. Cookies Técnicas y Estrictamente Necesarias</h5>
            <p className="mb-2">Son indispensables para el funcionamiento básico del sistema.</p>
            <ul>
              <li><strong>Autenticación:</strong> Permiten mantener su sesión activa de forma segura mientras navega por el dashboard de atletas o administradores.</li>
              <li><strong>Seguridad:</strong> Ayudan a prevenir ataques maliciosos y protegen la integridad de los datos almacenados en nuestra base de datos de Supabase.</li>
              <li><strong>Preferencia de Box:</strong> Permiten recordar el "ID de Box" al que usted pertenece para mostrarle el directorio y planes correctos.</li>
            </ul>
          </div>

          <div className="ms-3 mb-4">
            <h5 className="text-info mb-2"><i className="fas fa-sliders-h me-2"></i>B. Cookies de Personalización y Funcionalidad</h5>
            <p className="mb-2">Estas cookies mejoran su experiencia al recordar sus elecciones.</p>
            <ul>
              <li><strong>Idioma y Región:</strong> Detectan su ubicación para mostrar formatos de fecha y hora locales (Cancún/Quintana Roo).</li>
              <li><strong>Estado del Panel:</strong> Recuerdan qué columnas del directorio de atletas decidió ocultar o mostrar para que no tenga que configurarlas cada vez.</li>
            </ul>
          </div>

          <div className="ms-3 mb-4">
            <h5 className="text-success mb-2"><i className="fas fa-chart-line me-2"></i>C. Cookies de Análisis (Futuras Implementaciones)</h5>
            <p>Aunque actualmente el sistema se enfoca en la gestión operativa, en el futuro podríamos utilizar herramientas para medir cuántos usuarios visitan la web pública y qué apartados son los más utilizados para mejorar la interfaz del software.</p>
          </div>

          <h3 className="tc-section-title">4. ¿Dónde se almacena esta información?</h3>
          <p>La mayoría de estas cookies se gestionan a través del navegador, pero los datos clave de usuario y configuraciones financieras se sincronizan directamente con nuestros servidores y la infraestructura de Supabase para garantizar que su expediente médico y deportivo esté siempre disponible.</p>

          <h3 className="tc-section-title">5. Control y Gestión por el Usuario</h3>
          <p>Usted tiene el control total sobre las cookies:</p>
          <ul>
            <li><strong>Configuración del Navegador:</strong> Puede configurar su navegador para bloquear o eliminar cookies. Tenga en cuenta que si bloquea las cookies técnicas, Atletify System no podrá funcionar, ya que el login y el acceso al panel de atletas requieren de estas tecnologías para validar su identidad.</li>
            <li><strong>Borrado de Datos:</strong> Puede limpiar el "Local Storage" y las cookies de su navegador en cualquier momento desde los ajustes de privacidad de su dispositivo.</li>
          </ul>

          <h3 className="tc-section-title">6. Consentimiento</h3>
          <p>Al continuar navegando en nuestra web pública o al iniciar sesión en el sistema, usted acepta el uso de las cookies mencionadas en esta política.</p>
        </div>

        <div className="tc-action-area text-center mt-5">
          <button onClick={() => navigate(-1)} className="btn btn-outline-light rounded-pill px-4">
            <i className="fas fa-arrow-left me-2"></i> Volver a la navegación
          </button>
        </div>

      </div>
    </div>
  );
}
