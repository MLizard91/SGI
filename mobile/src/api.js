// Cliente para consumir la API REST desde la app móvil.
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL } from './config';

const LLAVE_TOKEN = 'sgi_token';

export const guardarToken = (t) => SecureStore.setItemAsync(LLAVE_TOKEN, t);
export const leerToken = () => SecureStore.getItemAsync(LLAVE_TOKEN);
export const borrarToken = () => SecureStore.deleteItemAsync(LLAVE_TOKEN);

export const imagenUrl = (ruta) => (ruta ? `${API_URL}/${ruta}` : null);

const SIN_CONEXION = `No se pudo conectar con el servidor (${API_URL}). Revisa tu conexión.`;

function respuestaConError(status, datos) {
  const error = new Error(datos.mensaje || 'Ocurrió un error');
  error.status = status;
  return error;
}

// Envío de formularios con fotos.
// El fetch de Expo (SDK 52+) no acepta archivos como { uri, name, type },
// pero XMLHttpRequest de React Native sí, en Android y en iPhone.
function enviarFormulario(url, method, headers, formData) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.timeout = 60000;
    xhr.onload = () => {
      let datos = {};
      try { datos = JSON.parse(xhr.responseText); } catch { /* respuesta sin JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(datos);
      else reject(respuestaConError(xhr.status, datos));
    };
    xhr.onerror = () => reject(new Error(SIN_CONEXION));
    xhr.ontimeout = () => reject(new Error('El envío tardó demasiado. Intenta con menos fotos o mejor señal.'));
    xhr.send(formData);
  });
}

export async function api(ruta, { method = 'GET', body, formData } = {}) {
  const headers = {};
  const token = await leerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (formData) return enviarFormulario(`${API_URL}/api${ruta}`, method, headers, formData);
  if (body) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}/api${ruta}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(SIN_CONEXION);
  }
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw respuestaConError(res.status, datos);
  return datos;
}

// Descarga un archivo protegido (p. ej. el reporte PDF) y abre el menú para compartirlo o guardarlo.
export async function descargarYCompartir(ruta, nombre, { mimeType = 'application/pdf', UTI = 'com.adobe.pdf' } = {}) {
  const token = await leerToken();
  const destino = new File(Paths.cache, nombre);
  if (destino.exists) destino.delete();

  let archivo;
  try {
    archivo = await File.createDownloadTask(`${API_URL}/api${ruta}`, destino, {
      headers: { Authorization: `Bearer ${token}` },
    }).downloadAsync();
  } catch {
    throw new Error(SIN_CONEXION);
  }
  if (!archivo) throw new Error('La descarga se interrumpió');

  // Si el servidor respondió con un error, lo descargado es un JSON con el mensaje
  if (archivo.size < 2000) {
    const texto = await archivo.text();
    if (texto.trim().startsWith('{')) {
      archivo.delete();
      let mensaje = 'No se pudo generar el archivo';
      try { mensaje = JSON.parse(texto).mensaje || mensaje; } catch { /* sin JSON */ }
      throw new Error(mensaje);
    }
  }

  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos');
  await Sharing.shareAsync(archivo.uri, { mimeType, UTI, dialogTitle: nombre });
}

export function formatoFecha(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
