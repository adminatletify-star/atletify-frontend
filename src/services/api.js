const API_BASE_URL = import.meta.env.VITE_API_URL?.endsWith('/api') 
  ? import.meta.env.VITE_API_URL 
  : `${import.meta.env.VITE_API_URL}/api`;

// Helper para manejar respuestas del servidor
const handleResponse = async (response) => {
  if (!response.ok) {
    const text = await response.text();
    let errorData = {};
    try {
      errorData = JSON.parse(text);
    } catch (e) {
      console.error('Server error response:', text);
      throw new Error(`Error ${response.status}: ${text.substring(0, 100)}`);
    }
    // Extrae también errores de validación de ASP.NET (ValidationProblemDetails),
    // p. ej. el mensaje del filtro de groserías que llega dentro de "errors".
    const validationMsg = errorData.errors
      ? Object.values(errorData.errors).flat().find(Boolean)
      : null;
    throw new Error(errorData.mensaje || errorData.detalle || validationMsg || errorData.title || `Error ${response.status}`);
  }
  return response.json();
};

export const api = {
  // Ejercicios diccionario
  obtenerEjerciciosDiccionario: async () => {
    const response = await fetch(`${API_BASE_URL}/ejercicios-diccionario`);
    return handleResponse(response);
  },

  obtenerEjercicioDiccionario: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ejercicios-diccionario/${id}`);
    return handleResponse(response);
  },

  crearEjercicioDiccionario: async (datos) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/ejercicios-diccionario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(datos)
    });
    return handleResponse(response);
  },

  actualizarEjercicioDiccionario: async (id, datos) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/ejercicios-diccionario/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(datos)
    });
    return handleResponse(response);
  },

  eliminarEjercicioDiccionario: async (id) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/ejercicios-diccionario/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  // Plantillas de WODs (moldes reutilizables) — endpoints protegidos por rol
  crearPlantilla: async (datos) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/plantillas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    return handleResponse(response);
  },

  obtenerPlantillasBox: async (idBox) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/plantillas/box/${idBox}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  obtenerPlantilla: async (id) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/plantillas/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  aplicarPlantilla: async (id, datos) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/plantillas/${id}/aplicar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    return handleResponse(response);
  },

  actualizarPlantilla: async (id, datos) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/plantillas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(datos)
    });
    return handleResponse(response);
  },

  toggleFavoritaPlantilla: async (id, esFavorita) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/plantillas/${id}/favorita`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ esFavorita })
    });
    return handleResponse(response);
  },

  eliminarPlantilla: async (id) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/plantillas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  // === Capa social del WOD (like/dislike, comentarios, reacciones) ===
  reaccionarWod: async (idEntrenamiento, tipo) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/wod-social/${idEntrenamiento}/reaccionar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ tipo })
    });
    return handleResponse(response);
  },

  obtenerContadoresWod: async (idEntrenamiento) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/wod-social/${idEntrenamiento}/contadores`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  obtenerComentariosWod: async (idEntrenamiento, cursor = null, limit = 10) => {
    const token = localStorage.getItem('token');
    const qs = `?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await fetch(`${API_BASE_URL}/wod-social/${idEntrenamiento}/comentarios${qs}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  obtenerRespuestasComentario: async (idPadre, cursor = null, limit = 10) => {
    const token = localStorage.getItem('token');
    const qs = `?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await fetch(`${API_BASE_URL}/wod-social/comentarios/${idPadre}/respuestas${qs}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  contextoComentario: async (idComentario) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/wod-social/comentarios/${idComentario}/contexto`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  crearComentarioWod: async (idEntrenamiento, texto) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/wod-social/${idEntrenamiento}/comentarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ texto })
    });
    return handleResponse(response);
  },

  responderComentarioWod: async (idPadre, texto) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/wod-social/comentarios/${idPadre}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ texto })
    });
    return handleResponse(response);
  },

  reaccionarComentarioWod: async (idComentario, emoji) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/wod-social/comentarios/${idComentario}/reaccionar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ emoji })
    });
    return handleResponse(response);
  },

  borrarComentarioWod: async (idComentario) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/wod-social/comentarios/${idComentario}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  // Lista de quiénes reaccionaron a un comentario (estilo FB): [{ idUsuario, nombre, emoji }]
  obtenerReaccionesComentario: async (idComentario) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/wod-social/comentarios/${idComentario}/reacciones`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  // Usuarios
  obtenerUsuarios: async () => {
    const response = await fetch(`${API_BASE_URL}/usuarios`);
    return response.json();
  },

  buscarUsuario: async (correo) => {
    const usuarios = await api.obtenerUsuarios();
    return usuarios.find(u => u.correo === correo);
  },

  crearUsuario: async (usuarioData) => {
    const response = await fetch(`${API_BASE_URL}/usuarios/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioData)
    });
    return response.json();
  },

  actualizarUsuario: async (id, datos) => {
    const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    return response.json();
  },

  crearAdminBox: async (adminData) => {
    const response = await fetch(`${API_BASE_URL}/usuarios/crear-admin-box`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminData)
    });
    return handleResponse(response);
  },

  verificarUsernameDisponible: async (username) => {
    const response = await fetch(`${API_BASE_URL}/usuarios/verificar-username/${encodeURIComponent(username)}`);
    return handleResponse(response);
  },

  // Boxes
  obtenerBoxes: async () => {
    const response = await fetch(`${API_BASE_URL}/box`);
    return response.json();
  },

  obtenerBoxPorId: async (id) => {
    const response = await fetch(`${API_BASE_URL}/box/${id}`);
    return handleResponse(response);
  },

  obtenerPlanesBox: async (id) => {
    const response = await fetch(`${API_BASE_URL}/finanzas/planes/${id}`);
    return handleResponse(response);
  },

  crearBox: async (boxData) => {
    const response = await fetch(`${API_BASE_URL}/box`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boxData)
    });
    return response.json();
  },

  actualizarBox: async (id, datos) => {
    const response = await fetch(`${API_BASE_URL}/box/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    return response.json();
  },

  // Clases
  crearClase: async (claseData) => {
    const response = await fetch(`${API_BASE_URL}/clases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claseData)
    });
    return response.json();
  },

  obtenerClasesDelBox: async (idBox) => {
    const response = await fetch(`${API_BASE_URL}/clases/box/${idBox}`);
    return response.json();
  },

  obtenerClase: async (idClase) => {
    const response = await fetch(`${API_BASE_URL}/clases/${idClase}`);
    return response.json();
  },

  actualizarClase: async (idClase, datos) => {
    const response = await fetch(`${API_BASE_URL}/clases/${idClase}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    return response.json();
  },

  eliminarClase: async (idClase) => {
    const response = await fetch(`${API_BASE_URL}/clases/${idClase}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // Solicitudes de Clase
  solicitarInscripcionClase: async (idUsuario, idClase) => {
    try {
      const response = await fetch(`${API_BASE_URL}/solicitudes-clase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          IdUsuario: idUsuario,
          IdClase: idClase
        })
      });

      // Si no es 200-299, algo saliÃ³ mal
      if (!response.ok) {
        const text = await response.text();
        let errorData = {};
        try {
          errorData = JSON.parse(text);
        } catch (e) {
          console.error('Server error response:', text);
          throw new Error(`Error ${response.status}: ${text.substring(0, 100)}`);
        }
        throw new Error(errorData.mensaje || `Error ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('solicitarInscripcionClase error:', error);
      throw error;
    }
  },

  obtenerSolicitudesDeClase: async (idClase) => {
    const response = await fetch(`${API_BASE_URL}/solicitudes-clase/clase/${idClase}`);
    return response.json();
  },

  obtenerSolicitudesDelUsuario: async (idUsuario) => {
    const response = await fetch(`${API_BASE_URL}/solicitudes-clase/usuario/${idUsuario}`);
    return response.json();
  },

  aprobarSolicitud: async (idSolicitud) => {
    const response = await fetch(`${API_BASE_URL}/solicitudes-clase/${idSolicitud}/aprobar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  },

  rechazarSolicitud: async (idSolicitud) => {
    const response = await fetch(`${API_BASE_URL}/solicitudes-clase/${idSolicitud}/rechazar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  },

  cancelarSolicitud: async (idSolicitud) => {
    const response = await fetch(`${API_BASE_URL}/solicitudes-clase/${idSolicitud}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // Kids
  registrarKid: async (kidData) => {
    const response = await fetch(`${API_BASE_URL}/kids`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kidData)
    });
    return handleResponse(response);
  },

  obtenerKidsDelTutor: async (idTutor) => {
    const response = await fetch(`${API_BASE_URL}/kids/tutor/${idTutor}`);
    return response.json();
  },

  obtenerKid: async (idKid) => {
    const response = await fetch(`${API_BASE_URL}/kids/${idKid}`);
    return response.json();
  },

  actualizarKid: async (idKid, datos) => {
    const response = await fetch(`${API_BASE_URL}/kids/${idKid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    return response.json();
  },

  desactivarKid: async (idKid) => {
    const response = await fetch(`${API_BASE_URL}/kids/${idKid}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  registrarMensualidadKid: async (idKid, datos) => {
    const response = await fetch(`${API_BASE_URL}/kids/${idKid}/mensualidad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    return handleResponse(response);
  },

  solicitarClaseKid: async (idKid, idClase) => {
    const response = await fetch(`${API_BASE_URL}/kids/${idKid}/solicitar-clase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IdClase: idClase })
    });
    return handleResponse(response);
  },

  obtenerKidsDelBox: async (idBox) => {
    const response = await fetch(`${API_BASE_URL}/kids/box/${idBox}`);
    return response.json();
  },

  // Solicitudes de registro de Kids
  obtenerSolicitudesKidDelBox: async (idBox) => {
    const response = await fetch(`${API_BASE_URL}/kids/solicitudes/box/${idBox}`);
    return response.json();
  },

  obtenerSolicitudesKidDelTutor: async (idTutor) => {
    const response = await fetch(`${API_BASE_URL}/kids/solicitudes/tutor/${idTutor}`);
    return response.json();
  },

  aprobarSolicitudKid: async (idSolicitud) => {
    const response = await fetch(`${API_BASE_URL}/kids/solicitudes/${idSolicitud}/aprobar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  },

  rechazarSolicitudKid: async (idSolicitud) => {
    const response = await fetch(`${API_BASE_URL}/kids/solicitudes/${idSolicitud}/rechazar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  },

  // Mensualidades
  obtenerMiembrosConMensualidades: async (idBox) => {
    const response = await fetch(`${API_BASE_URL}/usuarios/box/${idBox}/miembros`);
    return handleResponse(response);
  },

  registrarMensualidadUsuario: async (idUsuario, datos) => {
    const response = await fetch(`${API_BASE_URL}/usuarios/${idUsuario}/mensualidad`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    return handleResponse(response);
  },

  bloquearUsuario: async (idUsuario) => {
    const response = await fetch(`${API_BASE_URL}/usuarios/${idUsuario}/bloquear`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  },

  desbloquearUsuario: async (idUsuario) => {
    const response = await fetch(`${API_BASE_URL}/usuarios/${idUsuario}/desbloquear`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  },

  obtenerKidsConMensualidades: async (idBox) => {
    const response = await fetch(`${API_BASE_URL}/kids/box/${idBox}/mensualidades`);
    return handleResponse(response);
  },



  bloquearKid: async (idKid) => {
    const response = await fetch(`${API_BASE_URL}/kids/${idKid}/bloquear`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  },

  desbloquearKid: async (idKid) => {
    const response = await fetch(`${API_BASE_URL}/kids/${idKid}/desbloquear`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    return handleResponse(response);
  },

  obtenerHistorialPagos: async (idBox) => {
    const response = await fetch(`${API_BASE_URL}/usuarios/box/${idBox}/historial-pagos`);
    return handleResponse(response);
  },

  // Pagos (tabla dedicada)
  registrarPago: async (datos) => {
    const response = await fetch(`${API_BASE_URL}/pagos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    return handleResponse(response);
  },

  obtenerPagosDelBox: async (idBox) => {
    const response = await fetch(`${API_BASE_URL}/pagos/box/${idBox}`);
    return handleResponse(response);
  },

  obtenerPagosDelUsuario: async (idUsuario) => {
    const response = await fetch(`${API_BASE_URL}/pagos/usuario/${idUsuario}`);
    return handleResponse(response);
  },

  obtenerPagosDelKid: async (idKid) => {
    const response = await fetch(`${API_BASE_URL}/pagos/kid/${idKid}`);
    return handleResponse(response);
  },

  // ============================================================
  //  GRUPOS FAMILIARES — Escuadrones de Atletas
  // ============================================================
  obtenerGruposFamiliaresPorBox: async (idBox) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/GruposFamiliares/box/${idBox}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  obtenerDetalleGrupoFamiliar: async (idGrupo) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/GruposFamiliares/${idGrupo}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  crearGrupoFamiliar: async (payload) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/GruposFamiliares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  pagarGrupoFamiliar: async (idGrupo, pago) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/GruposFamiliares/${idGrupo}/pagar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(pago)
    });
    return handleResponse(response);
  },

  // Genera el link de Stripe para que el líder pague TODO el grupo con su tarjeta (desglosado).
  checkoutStripeGrupoFamiliar: async (idGrupo, payload) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/GruposFamiliares/${idGrupo}/checkout-stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  editarMiembrosGrupoFamiliar: async (idGrupo, payload) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/GruposFamiliares/${idGrupo}/miembros`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  disolverGrupoFamiliar: async (idGrupo) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/GruposFamiliares/${idGrupo}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  },

  obtenerAtletasDisponiblesParaGrupo: async (idBox) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/GruposFamiliares/box/${idBox}/atletas-disponibles`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return handleResponse(response);
  }
};

// Alias para compatibilidad
export const API_BASE_URL_CONST = API_BASE_URL;
export const USUARIOS_ENDPOINT = `${API_BASE_URL}/usuarios`;
export const BOXES_ENDPOINT = `${API_BASE_URL}/box`;
// Agrega esto en tu archivo api.js
export const PRODUCTOS_ENDPOINT = `${API_BASE_URL_CONST}/productos`;
export const VENTAS_ENDPOINT = `${API_BASE_URL_CONST}/ventas`;
export const COMPETENCIAS_ENDPOINT = `${API_BASE_URL_CONST}/competencias`;

