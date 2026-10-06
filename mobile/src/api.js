// Cliente para consumir la API REST desde la app móvil.
import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

const LLAVE_TOKEN = 'sgi_token';

export const guardarToken = (t) => SecureStore.setItemAsync(LLAVE_TOKEN, t);
export const leerToken = () => SecureStore.getItemAsync(LLAVE_TOKEN);
export const borrarToken = () => SecureStore.deleteItemAsync(LLAVE_TOKEN);

export const imagenUrl = (ruta) => (ruta ? `${API_URL}/${ruta}` : null);

export async function api(ruta, { method = 'GET', body, formData } = {}) {
  const headers = {};
  const token = await leerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}/api${ruta}`, {
      method,
      headers,
      body: formData || (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new Error(`No se pudo conectar con el servidor (${API_URL}). Revisa tu conexión.`);
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(datos.mensaje || 'Ocurrió un error');
    error.status = res.status;
    throw error;
  }
  return datos;
}

export function formatoFecha(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
