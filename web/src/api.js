// Cliente para consumir la API REST del backend.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const imagenUrl = (ruta) => (ruta ? `${API_URL}/${ruta}` : null);

export function obtenerToken() {
  return localStorage.getItem('sgi_token');
}

export async function api(ruta, { method = 'GET', body, formData } = {}) {
  const headers = {};
  const token = obtenerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}/api${ruta}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  if (res.status === 401 && token) {
    localStorage.removeItem('sgi_token');
    window.location.href = '/login';
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.mensaje || 'Ocurrió un error');
  return datos;
}

// Descarga un archivo protegido (por ejemplo el CSV o el PDF de reportes)
export async function descargar(ruta, nombre) {
  const res = await fetch(`${API_URL}/api${ruta}`, { headers: { Authorization: `Bearer ${obtenerToken()}` } });
  if (!res.ok) {
    const datos = await res.json().catch(() => ({}));
    throw new Error(datos.mensaje || 'No se pudo descargar el archivo');
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatoFecha(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}
